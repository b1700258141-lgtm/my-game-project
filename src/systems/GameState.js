// 游戏状态管理
import gameConfig from '../data/gameConfig.json';
import { getWanShiWuLevelByPopularity } from './WanShiWuLevelSystem';

// 委托状态常量
export const COMMISSION_STATUS = {
  AVAILABLE: 'available',       // 未接取（存在于 commissions.json 中但玩家未接取）
  IN_PROGRESS: 'inProgress',    // 已接取 / 进行中
  SUBMITTABLE: 'submittable',   // 可提交 / 待完成确认
  COMPLETED: 'completed',       // 已完成
  EXPIRED: 'expired'            // 已过期
};

// 游戏状态常量
export const GAME_STATE = {
  NORMAL: 'normal',             // 普通探索状态
  DIALOGUE: 'dialogue',         // 对话状态
  INVENTORY: 'inventory',       // 背包界面状态
  QUEST_LIST: 'questList',      // 委托列表状态
  REWARD_POPUP: 'rewardPopup',  // 获得物品弹窗状态
  ALCHEMY: 'alchemy',           // 炼金釜状态
  DAILY_SUMMARY: 'dailySummary', // 每日结算状态
  FURNITURE_UPGRADE: 'furnitureUpgrade', // 家具升级状态
  SPIRIT_ARCHIVE: 'spiritArchive', // 精魂档案状态
  BOOKSHELF_ARCHIVE: 'bookshelfArchive', // 书架档案状态
  SLEEP_CHOICE: 'sleepChoice',  // 睡觉选择状态
  LOCATION_CHOICE: 'locationChoice', // 地点选择状态
  SHOP: 'shop',                 // 商店状态
  SAVE_LOAD: 'saveLoad',        // 存档 / 读档界面状态
  NAME_INPUT: 'nameInput',      // 主角名字输入状态
  TRANSITION: 'transition'      // 场景过渡状态
};

class GameState {
  constructor() {
    this.day = gameConfig.initial.day;
    this.funds = gameConfig.initial.funds;
    this.popularity = gameConfig.initial.popularity;
    this.wanShiWuLevel = gameConfig.initial.wanShiWuLevel || 1;
    this.shopLevel = this.wanShiWuLevel;
    this.playerName = gameConfig.initial.playerName || '';
    this.pendingSystemMessages = [];
    this.shortCommissionRefresh = null;
    
    // 剧情标记，用于控制分支
    this.flags = {};
    
    // NPC 好感度 { npcId: affinity }
    this.npcAffinity = {};
    
    // 记忆图鉴，记录已解锁的记忆
    this.codex = [];
    
    // 已收集的炼金配方
    this.alchemyRecipes = [];

    // 家具等级、每日统计与精魂记忆由对应 Manager 初始化
    this.furnitureLevels = null;
    this.dailyStats = null;
    this.spiritMemories = null;
    this.archiveData = null;
    this.dayEndSummaryShown = false;
    
    // 已完成的委托列表
    this.completedCommissions = [];
    
    // 已接受的委托列表
    this.acceptedCommissions = [];
    
    // 已过期的委托列表
    this.expiredCommissions = [];
    
    // 当前正在进行的委托 ID
    this.currentCommissionId = null;
    
    // 当天来访的 NPC 列表
    this.todayVisitors = [];
    
    // 对话来源场景（用于返回）
    this.returnScene = 'ShopScene';
    
    // 背包（普通物品和材料）— 增强数据结构
    this.inventory = [];
    
    // 关键物品列表
    this.keyItems = [];
    
    // 临时委托列表
    this.temporaryCommissions = [];
    
    // 结局相关标志
    this.endingFlags = {};

    // ========== 新增字段 ==========

    // 游戏状态机
    this.currentGameState = GAME_STATE.NORMAL;

    // 随机 NPC 状态 { visitorConfigId: state }
    this.randomNpcStates = {};

    // 待展示的获得物品（用于奖励弹窗）
    this.pendingRewardItems = [];

    // 今日来访提示是否已显示
    this.visitorNotificationShown = false;

    // 玩家在万事屋中的当前位置，用于关闭 UI 或对话后回到原地
    this.playerPosition = {
      x: gameConfig.player.startX,
      y: gameConfig.player.startY
    };

    // 游戏时间数据（由 TimeManager 管理）
    this.timeData = {
      currentDay: this.day,
      currentHour: 8,
      currentMinute: 0
    };
  }

  // ========== 游戏状态机 ==========

  setGameState(state) {
    this.currentGameState = state;
  }

  getGameState() {
    return this.currentGameState;
  }

  // 是否可以移动
  canMove() {
    return this.currentGameState === GAME_STATE.NORMAL;
  }

  // ========== 玩家位置 ==========

  setPlayerPosition(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') return;
    this.playerPosition = { x, y };
  }

  getPlayerPosition() {
    return this.playerPosition || {
      x: gameConfig.player.startX,
      y: gameConfig.player.startY
    };
  }

  // ========== 基础方法 ==========

  // 更新天数
  nextDay() {
    // 处理随机 NPC 状态变更（未对话的 → missed，已对话的 → left）
    this._processNpcStatesOnDayChange();
    
    this.day++;
    // 清理当天的来访 NPC
    this.todayVisitors = [];
    // 重置来访提示
    this.visitorNotificationShown = false;
    // 重置游戏状态
    this.currentGameState = GAME_STATE.NORMAL;
  }

  // 处理天数变更时的 NPC 状态
  _processNpcStatesOnDayChange() {
    for (const [visitorId, state] of Object.entries(this.randomNpcStates)) {
      if (state === 'spawnedToday') {
        // 当天生成了但未对话 → 错过
        this.randomNpcStates[visitorId] = 'missed';
      } else if (state === 'talked') {
        // 已对话完毕 → 离开
        this.randomNpcStates[visitorId] = 'left';
      }
    }
  }

  // 修改资金
  modifyFunds(amount) {
    this.funds += amount;
    if (this.funds < 0) this.funds = 0;
  }

  // 修改人气
  modifyPopularity(amount) {
    this.popularity += amount;
    if (this.popularity < 0) this.popularity = 0;
    this.checkWanShiWuLevelUp();
  }

  setPlayerName(name) {
    this.playerName = String(name || '').trim();
  }

  getPlayerName() {
    return this.playerName || '';
  }

  addSystemMessage(message) {
    if (!message) return;
    this.pendingSystemMessages = this.pendingSystemMessages || [];
    this.pendingSystemMessages.push(message);
  }

  consumeSystemMessages() {
    const messages = this.pendingSystemMessages || [];
    this.pendingSystemMessages = [];
    return messages;
  }

  checkWanShiWuLevelUp() {
    const currentLevel = this.wanShiWuLevel || this.shopLevel || 1;
    const reachableLevel = getWanShiWuLevelByPopularity(this.popularity);
    if (reachableLevel > currentLevel) {
      this.wanShiWuLevel = reachableLevel;
      this.shopLevel = reachableLevel;
      this.addSystemMessage(`【系统】：万事屋等级提升至Lv${reachableLevel}！委托收益提高了。`);
      return true;
    }
    this.wanShiWuLevel = currentLevel;
    this.shopLevel = currentLevel;
    return false;
  }

  // 设置剧情标记
  setFlag(flagId, value = true) {
    this.flags[flagId] = value;
  }

  // 获取剧情标记
  getFlag(flagId) {
    return this.flags[flagId] || false;
  }

  // 增加 NPC 好感度
  addAffinity(npcId, amount) {
    if (!this.npcAffinity[npcId]) {
      this.npcAffinity[npcId] = 0;
    }
    this.npcAffinity[npcId] += amount;
  }

  // 获取 NPC 好感度
  getAffinity(npcId) {
    return this.npcAffinity[npcId] || 0;
  }

  // ========== 委托相关方法 ==========

  // 接受委托 — 存储为对象，包含状态和接取天数
  acceptCommission(commissionId, options = {}) {
    if (!this.acceptedCommissions.some(c => c.id === commissionId)) {
      this.acceptedCommissions.push({
        id: commissionId,
        status: COMMISSION_STATUS.IN_PROGRESS,
        acceptedDay: this.day,
        deadlineDaysAfterAccept: options.deadlineDaysAfterAccept || null,
        deadlineDay: options.deadlineDay || null
      });
    }
    this.currentCommissionId = commissionId;
  }

  // 完成委托 — 从已接取移到已完成
  completeCommission(commissionId) {
    const index = this.acceptedCommissions.findIndex(c => c.id === commissionId);
    if (index > -1) {
      this.acceptedCommissions.splice(index, 1);
    }
    if (!this.completedCommissions.includes(commissionId)) {
      this.completedCommissions.push(commissionId);
    }
    if (this.currentCommissionId === commissionId) {
      this.currentCommissionId = null;
    }
  }

  // 标记委托过期
  expireCommission(commissionId) {
    const index = this.acceptedCommissions.findIndex(c => c.id === commissionId);
    if (index > -1) {
      this.acceptedCommissions.splice(index, 1);
    }
    if (!this.expiredCommissions.includes(commissionId)) {
      this.expiredCommissions.push(commissionId);
    }
    if (this.currentCommissionId === commissionId) {
      this.currentCommissionId = null;
    }
  }

  // 检查委托是否已完成
  isCommissionCompleted(commissionId) {
    return this.completedCommissions.includes(commissionId);
  }

  // 检查委托是否已接受
  isCommissionAccepted(commissionId) {
    return this.acceptedCommissions.some(c => c.id === commissionId);
  }

  // 检查委托是否已过期
  isCommissionExpired(commissionId) {
    return this.expiredCommissions.includes(commissionId);
  }

  // ========== 委托状态管理 ==========

  getCommissionStatus(commissionId) {
    const accepted = this.acceptedCommissions.find(c => c.id === commissionId);
    if (accepted) return accepted.status;
    if (this.completedCommissions.includes(commissionId)) return COMMISSION_STATUS.COMPLETED;
    if (this.expiredCommissions.includes(commissionId)) return COMMISSION_STATUS.EXPIRED;
    return COMMISSION_STATUS.AVAILABLE;
  }

  setCommissionStatus(commissionId, status) {
    const comm = this.acceptedCommissions.find(c => c.id === commissionId);
    if (comm) {
      comm.status = status;
    }
  }

  getInProgressCommissions() {
    return this.acceptedCommissions.filter(c => c.status === COMMISSION_STATUS.IN_PROGRESS);
  }

  getSubmittableCommissions() {
    return this.acceptedCommissions.filter(c => c.status === COMMISSION_STATUS.SUBMITTABLE);
  }

  setCommissionSubmittable(commissionId) {
    this.setCommissionStatus(commissionId, COMMISSION_STATUS.SUBMITTABLE);
  }

  // ========== 委托完成框架 ==========

  checkQuestCompletion(commissionId) {
    const status = this.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      return false;
    }
    console.log(`[QuestSystem] checkQuestCompletion(${commissionId}) — 完成条件待设定`);
    return false;
  }

  completeQuest(commissionId) {
    const status = this.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      console.warn(`[QuestSystem] 无法完成委托 ${commissionId}，当前状态: ${status}`);
      return false;
    }
    this.completeCommission(commissionId);
    console.log(`[QuestSystem] 委托 ${commissionId} 已完成`);
    return true;
  }

  submitQuest(commissionId) {
    const status = this.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.SUBMITTABLE) {
      console.warn(`[QuestSystem] 无法提交委托 ${commissionId}，当前状态: ${status}，需要先设为 submittable`);
      return false;
    }
    console.log(`[QuestSystem] submitQuest(${commissionId}) — 提交方式待设定`);
    return this.completeQuest(commissionId);
  }

  // ========== 来访相关方法 ==========

  addTodayVisitor(npcId) {
    if (!this.todayVisitors.includes(npcId)) {
      this.todayVisitors.push(npcId);
    }
  }

  hasVisitorToday(npcId) {
    return this.todayVisitors.includes(npcId);
  }

  // ========== 效果应用 ==========

  applyEffects(effects) {
    if (!effects) return;

    // 处理资金变化
    if (typeof effects.funds === 'number') {
      this.modifyFunds(effects.funds);
    }

    // 处理人气变化
    if (typeof effects.popularity === 'number') {
      this.modifyPopularity(effects.popularity);
    }

    // 处理剧情标记
    if (effects.flags) {
      for (const [flagId, value] of Object.entries(effects.flags)) {
        this.setFlag(flagId, value);
      }
    }

    // 处理 NPC 好感度
    if (effects.npcAffinity) {
      for (const [npcId, amount] of Object.entries(effects.npcAffinity)) {
        this.addAffinity(npcId, amount);
      }
    }

    // 处理记忆解锁
    if (effects.unlockMemory) {
      if (Array.isArray(effects.unlockMemory)) {
        effects.unlockMemory.forEach(id => this.unlockMemory(id));
      } else {
        this.unlockMemory(effects.unlockMemory);
      }
    }

    // 处理配方解锁
    if (effects.unlockRecipe) {
      if (Array.isArray(effects.unlockRecipe)) {
        effects.unlockRecipe.forEach(id => this.unlockRecipe(id));
      } else {
        this.unlockRecipe(effects.unlockRecipe);
      }
    }

    // 处理委托完成 — 改为标记为可提交，不自动完成
    if (effects.completeCommission) {
      const commissionId = effects.completeCommission;
      if (this.isCommissionAccepted(commissionId)) {
        this.setCommissionSubmittable(commissionId);
      }
    }

    // 处理添加物品（普通物品）— 标记待处理，由 InventorySystem 执行
    if (effects.addItem) {
      this._pendingAddItem = effects.addItem;
    }

    // 处理添加关键物品
    if (effects.addKeyItem) {
      this.addKeyItem(effects.addKeyItem);
    }

    // 处理移除物品
    if (effects.removeItem) {
      this._pendingRemoveItem = effects.removeItem;
    }

    // 处理结局标志
    if (effects.setEndingFlag) {
      this.setEndingFlag(effects.setEndingFlag, true);
    }

    // 处理临时委托
    if (effects.startTemporaryCommission) {
      this._pendingTempCommission = effects.startTemporaryCommission;
    }
  }

  // 解锁炼金配方
  unlockRecipe(recipeId) {
    if (!this.alchemyRecipes.includes(recipeId)) {
      this.alchemyRecipes.push(recipeId);
    }
  }

  // 解锁记忆
  unlockMemory(memoryId) {
    if (!this.codex.includes(memoryId)) {
      this.codex.push(memoryId);
    }
  }

  // ========== 物品相关方法 ==========

  hasKeyItem(itemId) {
    return this.keyItems.some(item => item.id === itemId);
  }

  addKeyItem(itemId, sourceNpcId = '') {
    if (!this.hasKeyItem(itemId)) {
      this.keyItems.push({
        id: itemId,
        obtainedAt: this.day,
        sourceNpcId: sourceNpcId
      });
    }
  }

  removeKeyItem(itemId) {
    const index = this.keyItems.findIndex(item => item.id === itemId);
    if (index > -1) {
      this.keyItems.splice(index, 1);
      return true;
    }
    return false;
  }

  // ========== 待展示奖励物品 ==========

  setPendingRewardItems(items) {
    this.pendingRewardItems = items || [];
  }

  getPendingRewardItems() {
    return this.pendingRewardItems;
  }

  clearPendingRewardItems() {
    this.pendingRewardItems = [];
  }

  // ========== 临时委托相关方法 ==========

  addTemporaryCommission(tempCommission) {
    this.temporaryCommissions.push({
      ...tempCommission,
      startDay: this.day,
      status: 'available'
    });
  }

  getAvailableTemporaryCommissions() {
    return this.temporaryCommissions.filter(tc => {
      if (tc.status !== 'available') return false;
      if (this.day > tc.expireDay) {
        tc.status = 'expired';
        return false;
      }
      return true;
    });
  }

  completeTemporaryCommission(tempCommissionId) {
    const tc = this.temporaryCommissions.find(t => t.id === tempCommissionId);
    if (tc && tc.status === 'available') {
      tc.status = 'completed';
      return tc;
    }
    return null;
  }

  updateExpiredTemporaryCommissions() {
    for (const tc of this.temporaryCommissions) {
      if (tc.status === 'available' && this.day > tc.expireDay) {
        tc.status = 'expired';
      }
    }
  }

  // ========== 结局标志相关方法 ==========

  setEndingFlag(flagId, value = true) {
    this.endingFlags[flagId] = value;
  }

  getEndingFlag(flagId) {
    return this.endingFlags[flagId] || false;
  }

  // ========== 场景返回 ==========

  setReturnScene(sceneName) {
    this.returnScene = sceneName || 'ShopScene';
  }

  getReturnScene() {
    return this.returnScene;
  }

  // ========== 游戏重置 ==========

  reset() {
    this.day = gameConfig.initial.day;
    this.funds = gameConfig.initial.funds;
    this.popularity = gameConfig.initial.popularity;
    this.wanShiWuLevel = gameConfig.initial.wanShiWuLevel || 1;
    this.shopLevel = this.wanShiWuLevel;
    this.playerName = gameConfig.initial.playerName || '';
    this.pendingSystemMessages = [];
    this.shortCommissionRefresh = null;
    this.flags = {};
    this.npcAffinity = {};
    this.codex = [];
    this.alchemyRecipes = [];
    this.furnitureLevels = null;
    this.dailyStats = null;
    this.spiritMemories = null;
    this.archiveData = null;
    this.dayEndSummaryShown = false;
    this.completedCommissions = [];
    this.acceptedCommissions = [];
    this.expiredCommissions = [];
    this.currentCommissionId = null;
    this.todayVisitors = [];
    this.returnScene = 'ShopScene';
    this.inventory = [];
    this.keyItems = [];
    this.temporaryCommissions = [];
    this.endingFlags = {};
    this.currentGameState = GAME_STATE.NORMAL;
    this.randomNpcStates = {};
    this.pendingRewardItems = [];
    this.visitorNotificationShown = false;
    this.playerPosition = {
      x: gameConfig.player.startX,
      y: gameConfig.player.startY
    };
    this.timeData = {
      currentDay: this.day,
      currentHour: 8,
      currentMinute: 0
    };
    this.checkWanShiWuLevelUp();
  }
  getSummary() {
    return {
      day: this.day,
      funds: this.funds,
      popularity: this.popularity,
      wanShiWuLevel: this.wanShiWuLevel,
      playerName: this.playerName,
      acceptedCommissions: this.acceptedCommissions,
      completedCommissions: this.completedCommissions,
      codexCount: this.codex.length,
      recipeCount: this.alchemyRecipes.length,
      gameState: this.currentGameState,
      inventoryCount: this.inventory.length
    };
  }
}

export default GameState;
