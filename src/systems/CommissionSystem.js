// 委托系统 - 管理所有委托的逻辑
import commissions from '../data/commissions.json';
import gameConfig from '../data/gameConfig.json';
import { COMMISSION_STATUS } from './GameState';
import InventorySystem from './InventorySystem';
import DailyLoopManager from './DailyLoopManager';
import SpiritMemoryManager from './SpiritMemoryManager';
import ArchiveManager from './ArchiveManager';
import { applyCommissionReward as applyWanShiWuCommissionReward } from './WanShiWuLevelSystem';

export default class CommissionSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.commissions = commissions.commissions.map(commission => this.normalizeCommission(commission));
  }

  normalizeCommissionType(type) {
    const raw = String(type || '').toLowerCase();
    if (raw === 'longterm' || raw === 'long' || raw === '长期') return 'longTerm';
    if (raw === 'shortterm' || raw === 'short' || raw === '短期') return 'shortTerm';
    return type || 'shortTerm';
  }

  normalizeCommission(commission) {
    const type = this.normalizeCommissionType(commission.type || commission.questType);
    return {
      ...commission,
      type,
      questType: type
    };
  }

  getAvailableDaysRemaining(commission) {
    const configured = Number(commission.availableDaysBeforeAccept);
    if (Number.isFinite(configured) && configured > 0) {
      if (commission.refreshPool) {
        return configured;
      }
      return Math.max(0, configured - ((this.gameState.day || 1) - (commission.startDay || 1)));
    }
    return Math.max(0, (commission.expireDay || this.gameState.day) - (this.gameState.day || 1) + 1);
  }

  getAcceptedDaysRemaining(commission, acceptedData = null) {
    const acceptedDay = acceptedData?.acceptedDay || this.gameState.day || 1;
    const configured = Number(acceptedData?.deadlineDaysAfterAccept || commission.deadlineDaysAfterAccept);
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(0, configured - ((this.gameState.day || 1) - acceptedDay));
    }
    return Math.max(0, (commission.expireDay || this.gameState.day) - (this.gameState.day || 1) + 1);
  }

  getDeadlineDay(commission, acceptedDay = this.gameState.day || 1) {
    const configured = Number(commission.deadlineDaysAfterAccept);
    if (Number.isFinite(configured) && configured > 0) {
      return acceptedDay + configured - 1;
    }
    return commission.expireDay || acceptedDay;
  }

  getAvailableTimeText(commission) {
    return `${this.getAvailableDaysRemaining(commission)} 天`;
  }

  getAcceptedTimeText(commission) {
    const acceptedData = this.gameState.acceptedCommissions.find(c => c.id === commission.id);
    return `${this.getAcceptedDaysRemaining(commission, acceptedData)} 天`;
  }

  // 获取当前可接取的委托列表
  getAvailableCommissions() {
    const currentDay = this.gameState.day;
    const todayShortTermPool = this.getTodayShortTermRefreshIds();
    
    return this.commissions.filter(commission => {
      // 排除已完成的
      if (this.gameState.isCommissionCompleted(commission.id)) {
        return false;
      }
      
      // 排除已接受的
      if (this.gameState.isCommissionAccepted(commission.id)) {
        return false;
      }
      
      // 检查天数范围
      if (currentDay < commission.startDay || this.getAvailableDaysRemaining(commission) <= 0) {
        return false;
      }

      if (commission.refreshPool && !todayShortTermPool.includes(commission.id)) {
        return false;
      }
      
      // 检查前置条件
      if (commission.requiredFlags && commission.requiredFlags.length > 0) {
        for (const flag of commission.requiredFlags) {
          if (!this.gameState.getFlag(flag)) {
            return false;
          }
        }
      }
      
      return true;
    }).map(commission => ({
      ...commission,
      daysRemaining: this.getAvailableDaysRemaining(commission),
      availableDaysRemaining: this.getAvailableDaysRemaining(commission),
      availableTimeText: this.getAvailableTimeText(commission)
    }));
  }

  getShortTermDailyLimit() {
    const receptionLevel = this.gameState.furnitureLevels?.reception_desk || 1;
    const table = gameConfig.commissions?.shortTermDailyRefreshLimitByReceptionDeskLevel || {};
    return table[String(receptionLevel)] || 2;
  }

  getTodayShortTermRefreshIds() {
    const currentDay = this.gameState.day || 1;
    const existing = this.gameState.shortCommissionRefresh;
    if (existing?.day === currentDay && Array.isArray(existing.ids)) {
      return existing.ids;
    }

    const candidates = this.commissions.filter(commission => {
      if (commission.type !== 'shortTerm' || !commission.refreshPool) return false;
      if (currentDay < (commission.startDay || 1)) return false;
      if (commission.poolEndDay && currentDay > commission.poolEndDay) return false;
      if (this.gameState.isCommissionCompleted(commission.id)) return false;
      if (this.gameState.isCommissionAccepted(commission.id)) return false;
      if (this.gameState.isCommissionExpired(commission.id)) return false;
      return true;
    });

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const ids = shuffled.slice(0, this.getShortTermDailyLimit()).map(commission => commission.id);
    this.gameState.shortCommissionRefresh = { day: currentDay, ids };
    return ids;
  }

  // 获取已接受的委托列表（含状态信息）
  getAcceptedCommissions() {
    return this.commissions.filter(commission => 
      this.gameState.isCommissionAccepted(commission.id)
    ).map(commission => {
      const acceptedData = this.gameState.acceptedCommissions.find(c => c.id === commission.id);
      return {
        ...commission,
        status: acceptedData?.status || COMMISSION_STATUS.IN_PROGRESS,
        acceptedDay: acceptedData?.acceptedDay || this.gameState.day,
        daysRemaining: this.getAcceptedDaysRemaining(commission, acceptedData),
        completionDaysRemaining: this.getAcceptedDaysRemaining(commission, acceptedData),
        deadlineDay: acceptedData?.deadlineDay || this.getDeadlineDay(commission, acceptedData?.acceptedDay),
        deadlineTimeText: this.getAcceptedTimeText(commission)
      };
    });
  }

  // 获取所有进行中的委托（用于 J 键委托列表）
  getInProgressCommissions() {
    return this.getAcceptedCommissions().filter(c => 
      c.status === COMMISSION_STATUS.IN_PROGRESS || c.status === COMMISSION_STATUS.SUBMITTABLE
    );
  }

  // 获取已完成的委托列表（用于书架历史记录）
  getCompletedCommissions() {
    return this.commissions.filter(commission => 
      this.gameState.isCommissionCompleted(commission.id)
    );
  }

  // 获取单个委托数据
  getCommission(commissionId) {
    return this.commissions.find(c => c.id === commissionId);
  }

  // 获取委托的 NPC 数据
  getCommissionNPC(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return null;
    
    // 从 NPC 数据中查找
    const npcs = this.getAllNPCs();
    return npcs.find(npc => npc.id === commission.clientNpcId);
  }

  // 获取所有 NPC 数据（现代职业背景）
  getAllNPCs() {
    return [
      {
        id: "guest_chef_digestive",
        name: "肚子很大的厨师",
        description: "一位在附近的城镇饭店工作的大厨。",
        position: { x: 0, y: 0 },
        color: 12549168,
        borderColor: 14124652,
        portrait: "portrait_chef_digestive"
      },
      {
        id: "guest_ring_boy",
        name: "看上去有点腼腆的年轻人",
        description: "一位年轻职员，想调查祖传戒指的来历。",
        position: { x: 0, y: 0 },
        color: 12502586,
        borderColor: 8913675,
        portrait: "portrait_ring_boy"
      },
      {
        id: "guest_elder_lady",
        name: "退休社区医生",
        description: "一位退休社区医生，带着旧照片来寻找照片中无名医者的故事。",
        position: { x: 0, y: 0 },
        color: 13952025,
        borderColor: 10535579,
        portrait: "portrait_elder_lady"
      },
      {
        id: "guest_little_girl",
        name: "看上去很焦急的女孩",
        description: "附近的小女孩，正在寻找走丢的猫小黑。",
        position: { x: 0, y: 0 },
        color: 16738858,
        borderColor: 14162421,
        portrait: "portrait_little_girl"
      },
      {
        id: "guest_convenience_clerk",
        name: "顶着黑眼圈的便利店员",
        description: "附近便利店的夜班店员，被仓库异味折磨得很想准点下班。",
        position: { x: 0, y: 0 },
        color: 7048142,
        borderColor: 9358795,
        portrait: "portrait_convenience_clerk"
      },
      {
        id: "guest_ad_planner",
        name: "精神紧绷的广告策划",
        description: "一位广告公司的策划，最近被方案修改意见追进了梦里。",
        position: { x: 0, y: 0 },
        color: 11382189,
        borderColor: 14137565,
        portrait: "portrait_ad_planner"
      },
      {
        id: "guest_pharmacy_clerk",
        name: "戴口罩的药房店员",
        description: "社区药房店员，想给展示角找一点更有话题性的样品。",
        position: { x: 0, y: 0 },
        color: 9028300,
        borderColor: 12116710,
        portrait: "portrait_pharmacy_clerk"
      },
      {
        id: "guest_rideshare_driver",
        name: "满脸疲惫的网约车司机",
        description: "一位网约车司机，正在和车内异味及乘客评分赛跑。",
        position: { x: 0, y: 0 },
        color: 11965969,
        borderColor: 15191248,
        portrait: "portrait_rideshare_driver"
      },
      {
        id: "guest_diner_owner",
        name: "有点发愁的小饭馆老板",
        description: "街角小饭馆老板，对手艺很自信，对客流量很发愁。",
        position: { x: 0, y: 0 },
        color: 12636187,
        borderColor: 16106848,
        portrait: "portrait_diner_owner"
      },
      {
        id: "guest_law_assistant",
        name: "提着文件袋的律师助理",
        description: "一位律师助理，被事务所资料室晚上的异响困扰。",
        position: { x: 0, y: 0 },
        color: 8421504,
        borderColor: 12632256,
        portrait: "portrait_law_assistant"
      },
      {
        id: "guest_clockmaker",
        name: "钟表修理店主",
        description: "街边钟表修理店的店主，带来一只总在子夜停摆的老钟。",
        position: { x: 0, y: 0 },
        color: 11487568,
        borderColor: 8692549,
        portrait: "portrait_clockmaker"
      }
    ];
  }

  // 接取委托
  acceptCommission(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return false;
    
    // 检查是否可以接取
    const available = this.getAvailableCommissions();
    if (!available.find(c => c.id === commissionId)) {
      return false;
    }
    
    // 更新游戏状态
    const acceptedDay = this.gameState.day || 1;
    this.gameState.acceptCommission(commissionId, {
      deadlineDaysAfterAccept: commission.deadlineDaysAfterAccept || null,
      deadlineDay: this.getDeadlineDay(commission, acceptedDay)
    });
    new DailyLoopManager(this.gameState).recordQuestAccepted(commissionId);
    
    return true;
  }

  // 完成委托
  completeCommission(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return false;
    
    // 检查是否已接受
    if (!this.gameState.isCommissionAccepted(commissionId)) {
      return false;
    }
    
    // 应用奖励
    const reward = commission.reward || {};
    const appliedReward = this.applyCommissionReward(reward);
    this.recordSubmissionRewardStats(commission, appliedReward);
    
    // 更新状态
    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord({
      ...commission,
      reward: appliedReward
    });
    
    return true;
  }

  recordRewardStats(commission) {
    const dailyLoop = new DailyLoopManager(this.gameState);
    const reward = commission.reward || {};
    dailyLoop.recordMoneyEarned(reward.funds || 0);
    dailyLoop.recordPopularityGained(reward.popularity || 0);
    dailyLoop.recordQuestCompleted(commission.id);

    if (typeof reward.spiritMemoryProgress === 'number') {
      dailyLoop.recordSpiritMemoryProgress(reward.spiritMemoryProgress);
      new SpiritMemoryManager(this.gameState).addSpiritMemoryProgress(
        commission.clientNpcId,
        reward.spiritMemoryProgress
      );
    }
  }

  getSubmissionReward(commission, consumedItems = []) {
    const submittedItemId = consumedItems.find(item => item?.itemId)?.itemId;
    const tierReward = submittedItemId ? commission.qualityRewards?.[submittedItemId] : null;
    return tierReward || commission.reward || {};
  }

  applyCommissionReward(reward) {
    if (!reward) return {};
    const applied = applyWanShiWuCommissionReward(
      reward.funds || 0,
      reward.popularity || 0,
      this.gameState.wanShiWuLevel || this.gameState.shopLevel || 1
    );
    const appliedReward = {
      ...reward,
      baseFunds: reward.funds || 0,
      basePopularity: reward.popularity || 0,
      funds: applied.funds,
      popularity: applied.popularity,
      rewardMultiplier: applied.multiplier
    };
    this.gameState.applyEffects({
      funds: appliedReward.funds || 0,
      popularity: appliedReward.popularity || 0,
      spiritMemoryProgress: reward.spiritMemoryProgress || 0
    });
    return appliedReward;
  }

  applyCommissionPenalty(penalty) {
    if (!penalty) return {};
    this.gameState.applyEffects({
      funds: penalty.funds || 0,
      popularity: penalty.popularity || 0
    });
    return penalty;
  }

  getTaskOptionAvailability(option, inventorySystem = new InventorySystem(this.gameState)) {
    if (Array.isArray(option.requiredItemIds) && option.requiredItemIds.length > 0) {
      const matchedItemId = option.requiredItemIds.find(itemId => inventorySystem.getItemCount(itemId) > 0);
      return {
        available: Boolean(matchedItemId),
        matchedItemId,
        reason: matchedItemId ? '' : '缺少所需物品'
      };
    }

    return { available: true, matchedItemId: null, reason: '' };
  }

  getAvailableTaskOptions(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission || !Array.isArray(commission.taskOptions)) return [];
    const inventorySystem = new InventorySystem(this.gameState);
    return commission.taskOptions
      .map(option => ({
        ...option,
        availability: this.getTaskOptionAvailability(option, inventorySystem)
      }))
      .filter(option => option.availability.available);
  }

  recordSubmissionRewardStats(commission, reward) {
    const dailyLoop = new DailyLoopManager(this.gameState);
    dailyLoop.recordMoneyEarned(reward.funds || 0);
    dailyLoop.recordPopularityGained(reward.popularity || 0);
    dailyLoop.recordQuestCompleted(commission.id);

    if (typeof reward.spiritMemoryProgress === 'number') {
      dailyLoop.recordSpiritMemoryProgress(reward.spiritMemoryProgress);
      new SpiritMemoryManager(this.gameState).addSpiritMemoryProgress(
        commission.clientNpcId,
        reward.spiritMemoryProgress
      );
    }
  }

  getRequirementStatus(commissionId) {
    const commission = this.getCommission(commissionId);
    const inventorySystem = new InventorySystem(this.gameState);
    if (!commission) {
      return { canSubmit: false, message: '委托不存在', consumedItems: [] };
    }

    if (Array.isArray(commission.requiredAnyItemIds) && commission.requiredAnyItemIds.length > 0) {
      const matchedItemId = commission.requiredAnyItemIds.find(itemId =>
        inventorySystem.getItemCount(itemId) > 0
      );
      return {
        canSubmit: Boolean(matchedItemId),
        message: matchedItemId ? '可以提交' : '缺少所需物品',
        consumedItems: matchedItemId ? [{ itemId: matchedItemId, count: 1 }] : []
      };
    }

    if (Array.isArray(commission.requiredItems) && commission.requiredItems.length > 0) {
      const missing = commission.requiredItems.find(itemId =>
        inventorySystem.getItemCount(itemId) < 1
      );
      return {
        canSubmit: !missing,
        message: missing ? '缺少所需物品' : '可以提交',
        consumedItems: missing ? [] : commission.requiredItems.map(itemId => ({ itemId, count: 1 }))
      };
    }

    return {
      canSubmit: false,
      message: commission.completionMethodText || commission.taskText || '需要进行任务',
      consumedItems: []
    };
  }

  getSubmissionItems(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return [];
    const inventorySystem = new InventorySystem(this.gameState);
    const allowedIds = Array.isArray(commission.requiredAnyItemIds)
      ? commission.requiredAnyItemIds
      : Array.isArray(commission.requiredItems)
        ? commission.requiredItems
        : [];
    return allowedIds
      .map(itemId => {
        const count = inventorySystem.getItemCount(itemId);
        if (count <= 0) return null;
        const item = inventorySystem.inventory.find(entry => entry.id === itemId);
        return {
          itemId,
          count,
          name: item?.name || inventorySystem.itemSystem.getItemName(itemId),
          quality: inventorySystem.itemSystem.getItem(itemId)?.quality || ''
        };
      })
      .filter(Boolean);
  }

  getCommissionActionType(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return 'none';
    if (Array.isArray(commission.requiredAnyItemIds) || Array.isArray(commission.requiredItems)) {
      return 'submit';
    }
    if (Array.isArray(commission.taskOptions) && commission.taskOptions.length > 0) {
      return 'taskOptions';
    }
    if (commission.completionTiers?.perfect || commission.taskText) {
      return 'instantTask';
    }
    return 'none';
  }

  // 检查并更新过期委托
  updateExpiredCommissions() {
    const currentDay = this.gameState.day;
    
    // 检查已接受但过期的委托
    const toExpire = [];
    for (const commData of this.gameState.acceptedCommissions) {
      const commission = this.getCommission(commData.id);
      if (!commission) continue;
      const deadlineDay = commData.deadlineDay || this.getDeadlineDay(commission, commData.acceptedDay);
      if (commission && currentDay > deadlineDay) {
        if (commission.failurePenalty) {
          this.applyCommissionPenalty(commission.failurePenalty);
        }
        toExpire.push(commData.id);
      }
    }
    toExpire.forEach(id => this.gameState.expireCommission(id));
  }

  // 获取委托状态文本
  getCommissionStatusText(commission) {
    const daysLeft = commission.expireDay - this.gameState.day;
    
    const type = this.normalizeCommissionType(commission.type);
    if (type === 'shortTerm') {
      if (daysLeft <= 1) return '紧急';
      if (daysLeft <= 2) return '即将过期';
      return `${daysLeft}天后过期`;
    } else {
      if (daysLeft <= 5) return '即将过期';
      return `${daysLeft}天内有效`;
    }
  }

  // 获取委托类型名称
  getCommissionTypeName(type) {
    const normalizedType = this.normalizeCommissionType(type);
    return commissions.commissionTypes[normalizedType]?.name || normalizedType;
  }

  // ========== 委托完成框架 ==========

  // 检查委托是否可完成
  checkQuestCompletion(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return false;
    return this.gameState.checkQuestCompletion(commissionId);
  }

  // 完成委托 — 必须通过此方法触发，不可自动完成
  completeQuest(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return false;

    // 检查委托状态
    const status = this.gameState.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      console.warn(`[CommissionSystem] 委托 ${commissionId} 状态为 ${status}，无法完成`);
      return false;
    }

    const reward = commission.completionTiers?.perfect || commission.reward || {};
    const appliedReward = this.applyCommissionReward(reward);
    this.recordSubmissionRewardStats(commission, appliedReward);

    // 更新状态为已完成
    const completed = this.gameState.completeQuest(commissionId);
    if (completed) {
      new ArchiveManager(this.gameState).addCompletedQuestRecord({
        ...commission,
        reward: appliedReward
      }, {
        completionResult: reward.result || 'perfect'
      });
    }
    return completed;
  }

  completeTaskOption(commissionId, optionId) {
    const commission = this.getCommission(commissionId);
    if (!commission || !Array.isArray(commission.taskOptions)) return { success: false, message: '委托选项不存在' };

    const status = this.gameState.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      return { success: false, message: '委托状态不正确' };
    }

    const option = commission.taskOptions.find(item => item.id === optionId);
    if (!option) return { success: false, message: '委托选项不存在' };

    const inventorySystem = new InventorySystem(this.gameState);
    const availability = this.getTaskOptionAvailability(option, inventorySystem);
    if (!availability.available) {
      return { success: false, message: availability.reason || '条件不足' };
    }

    const dailyLoop = new DailyLoopManager(this.gameState);
    const consumedItems = [];
    if (availability.matchedItemId) {
      if (!inventorySystem.removeItem(availability.matchedItemId, 1)) {
        return { success: false, message: '消耗物品失败' };
      }
      consumedItems.push({ itemId: availability.matchedItemId, count: 1 });
      dailyLoop.recordItemConsumed(availability.matchedItemId, 1);
    }

    if (option.costFunds) {
      if (this.gameState.funds < option.costFunds) {
        return { success: false, message: '资金不足' };
      }
      this.gameState.modifyFunds(-option.costFunds);
      dailyLoop.recordMoneySpent(option.costFunds);
    }

    const reward = option.reward || {};
    const appliedReward = this.applyCommissionReward(reward);
    this.recordSubmissionRewardStats(commission, appliedReward);

    if (option.unlockAchievementId) {
      new ArchiveManager(this.gameState).unlockAchievement(option.unlockAchievementId);
    }

    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord({
      ...commission,
      reward: appliedReward
    }, {
      deliveredItemIds: consumedItems.map(item => item.itemId),
      completionResult: option.result || 'normal'
    });

    return {
      success: true,
      message: option.successMessage || commission.taskSuccessText || `委托「${commission.title}」已完成！`,
      result: option.result || 'normal'
    };
  }

  // 提交委托 — 有交付物要求的委托在这里完成闭环
  submitQuest(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return false;

    const status = this.gameState.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      return false;
    }

    const requirement = this.getRequirementStatus(commissionId);
    if (!requirement.canSubmit) {
      return false;
    }

    const inventorySystem = new InventorySystem(this.gameState);
    const dailyLoop = new DailyLoopManager(this.gameState);

    for (const item of requirement.consumedItems) {
      const removed = inventorySystem.removeItem(item.itemId, item.count);
      if (!removed) return false;
      dailyLoop.recordItemConsumed(item.itemId, item.count);
    }

    const reward = this.getSubmissionReward(commission, requirement.consumedItems);
    const appliedReward = this.applyCommissionReward(reward);
    this.recordSubmissionRewardStats(commission, appliedReward);

    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord({
      ...commission,
      reward: appliedReward
    }, {
      deliveredItemIds: requirement.consumedItems.map(item => item.itemId),
      completionResult: reward.result || 'normal'
    });
    return true;
  }

  submitQuestWithItem(commissionId, itemId) {
    const commission = this.getCommission(commissionId);
    if (!commission) return { success: false, message: '委托不存在' };

    const status = this.gameState.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS && status !== COMMISSION_STATUS.SUBMITTABLE) {
      return { success: false, message: '委托状态不正确' };
    }

    const allowedIds = Array.isArray(commission.requiredAnyItemIds)
      ? commission.requiredAnyItemIds
      : Array.isArray(commission.requiredItems)
        ? commission.requiredItems
        : [];
    if (!allowedIds.includes(itemId)) {
      return { success: false, message: '该物品不能提交给此委托' };
    }

    const inventorySystem = new InventorySystem(this.gameState);
    if (inventorySystem.getItemCount(itemId) <= 0) {
      return { success: false, message: commission.emptySubmitMessage || '背包中没有该物品' };
    }

    if (!inventorySystem.removeItem(itemId, 1)) {
      return { success: false, message: '消耗物品失败' };
    }

    const dailyLoop = new DailyLoopManager(this.gameState);
    dailyLoop.recordItemConsumed(itemId, 1);

    const reward = this.getSubmissionReward(commission, [{ itemId, count: 1 }]);
    const appliedReward = this.applyCommissionReward(reward);
    this.recordSubmissionRewardStats(commission, appliedReward);

    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord({
      ...commission,
      reward: appliedReward
    }, {
      deliveredItemIds: [itemId],
      completionResult: reward.result || 'normal'
    });

    return {
      success: true,
      message: commission.submitSuccessText || `委托「${commission.title}」已提交！`,
      result: reward.result || 'normal',
      reward: appliedReward
    };
  }

  // 开始执行委托任务
  startQuestTask(commissionId) {
    const commission = this.getCommission(commissionId);
    if (!commission) {
      console.warn(`[CommissionSystem] 委托 ${commissionId} 不存在`);
      return;
    }
    const status = this.gameState.getCommissionStatus(commissionId);
    if (status !== COMMISSION_STATUS.IN_PROGRESS) {
      console.warn(`[CommissionSystem] 委托 ${commissionId} 状态为 ${status}，无法开始任务`);
      return;
    }
    const actionType = this.getCommissionActionType(commissionId);
    if (actionType === 'instantTask') {
      return this.completeQuest(commissionId);
    }
    return false;
  }
}
