// 委托系统 - 管理所有委托的逻辑
import commissions from '../data/commissions.json';
import { COMMISSION_STATUS } from './GameState';
import InventorySystem from './InventorySystem';
import DailyLoopManager from './DailyLoopManager';
import SpiritMemoryManager from './SpiritMemoryManager';
import ArchiveManager from './ArchiveManager';

export default class CommissionSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.commissions = commissions.commissions;
  }

  // 获取当前可接取的委托列表
  getAvailableCommissions() {
    const currentDay = this.gameState.day;
    
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
      if (currentDay < commission.startDay || currentDay > commission.expireDay) {
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
      daysRemaining: commission.expireDay - currentDay
    }));
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
        daysRemaining: commission.expireDay - this.gameState.day
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
        id: "guest_placeholder_customer",
        name: "占位客人",
        description: "【占位】现代职业身份，具体设定由用户填写。",
        position: { x: 0, y: 0 },
        color: 10066329,
        borderColor: 13421772,
        portrait: "portrait_placeholder_customer"
      },
      {
        id: "guest_ring_boy",
        name: "委托客人A",
        description: "【占位】现代职业身份，具体设定由用户填写。",
        position: { x: 0, y: 0 },
        color: 12502586,
        borderColor: 8913675,
        portrait: "portrait_ring_boy"
      },
      {
        id: "guest_elder_lady",
        name: "委托客人B",
        description: "【占位】现代职业身份，具体设定由用户填写。",
        position: { x: 0, y: 0 },
        color: 13952025,
        borderColor: 10535579,
        portrait: "portrait_elder_lady"
      },
      {
        id: "guest_little_girl",
        name: "委托客人C",
        description: "【占位】现代职业身份，具体设定由用户填写。",
        position: { x: 0, y: 0 },
        color: 16738858,
        borderColor: 14162421,
        portrait: "portrait_little_girl"
      },
      {
        id: "guest_clockmaker",
        name: "委托客人D",
        description: "【占位】现代职业身份，具体设定由用户填写。",
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
    this.gameState.acceptCommission(commissionId);
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
    if (commission.reward) {
      this.gameState.applyEffects(commission.reward);
      this.recordRewardStats(commission);
    }
    
    // 更新状态
    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord(commission);
    
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
      message: '完成方式待设定',
      consumedItems: []
    };
  }

  // 检查并更新过期委托
  updateExpiredCommissions() {
    const currentDay = this.gameState.day;
    
    // 检查已接受但过期的委托
    const toExpire = [];
    for (const commData of this.gameState.acceptedCommissions) {
      const commission = this.getCommission(commData.id);
      if (commission && currentDay > commission.expireDay) {
        toExpire.push(commData.id);
      }
    }
    toExpire.forEach(id => this.gameState.expireCommission(id));
  }

  // 获取委托状态文本
  getCommissionStatusText(commission) {
    const daysLeft = commission.expireDay - this.gameState.day;
    
    if (commission.type === 'short') {
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
    return commissions.commissionTypes[type]?.name || type;
  }

  // ========== 委托完成框架（占位逻辑） ==========

  // 检查委托是否可完成 — 占位，具体条件待设定
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

    // 应用奖励
    if (commission.reward) {
      this.gameState.applyEffects(commission.reward);
      this.recordRewardStats(commission);
    }

    // 更新状态为已完成
    const completed = this.gameState.completeQuest(commissionId);
    if (completed) {
      new ArchiveManager(this.gameState).addCompletedQuestRecord(commission);
    }
    return completed;
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

    if (commission.reward) {
      this.gameState.applyEffects(commission.reward);
      this.recordRewardStats(commission);
    }

    this.gameState.completeCommission(commissionId);
    new ArchiveManager(this.gameState).addCompletedQuestRecord(commission, {
      deliveredItemIds: requirement.consumedItems.map(item => item.itemId)
    });
    return true;
  }

  // 开始执行委托任务 — 占位，任务执行方式待设定
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
    console.log(`[CommissionSystem] startQuestTask(${commissionId}) — 任务执行方式待设定`);
    // TODO: 在此添加任务执行逻辑
    // 例如：打开特定场景、标记任务目标、开启追踪等
  }
}
