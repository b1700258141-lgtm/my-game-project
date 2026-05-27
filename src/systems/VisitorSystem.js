// 来访系统 - 管理 NPC 随机来访逻辑
import visitors from '../data/visitors.json';
import RandomNpcManager, { RANDOM_NPC_STATE } from './RandomNpcManager';

export default class VisitorSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.visitorConfigs = visitors.visitors;
    this.tempCommissionConfigs = visitors.temporaryCommissions || [];
    this.currentVisitors = []; // 当前场景中的来访 NPC
    this.randomNpcManager = new RandomNpcManager(gameState);
  }

  // 获取当天应该来访的 NPC
  getTodaysVisitors() {
    const currentDay = this.gameState.day;
    const result = [];

    for (const visitorConfig of this.visitorConfigs) {
      // 检查天数范围
      if (currentDay < visitorConfig.startDay || currentDay > visitorConfig.endDay) {
        continue;
      }

      // 如果今天已经随机判定过来访，必须保留（场景重建后也要一致）
      if (this.gameState.hasVisitorToday(visitorConfig.id)) {
        // 检查 NPC 状态 — 已对话或已离开的不应出现在场景中
        const npcState = this.randomNpcManager.getNpcState(visitorConfig.id);
        if (npcState === RANDOM_NPC_STATE.TALKED || 
            npcState === RANDOM_NPC_STATE.LEFT || 
            npcState === RANDOM_NPC_STATE.MISSED) {
          continue;
        }

        // 从已有 currentVisitors 中查找
        const alreadyVisited = this.currentVisitors.find(v => v.configId === visitorConfig.id);
        if (alreadyVisited) {
          result.push(alreadyVisited);
          continue;
        }
        // 场景重建时 currentVisitors 为空，需要根据 gameState 重新构造
        const visitor = {
          configId: visitorConfig.id,
          npcId: visitorConfig.npcId,
          dialogueId: visitorConfig.dialogueId,
          position: this.getVisitorPosition(result.length),
          items: visitorConfig.items || []
        };
        result.push(visitor);
        continue;
      }

      // 如果该 NPC 类型已经来访过，跳过
      if (this.gameState.visitedRandomNpcTypes &&
          this.gameState.visitedRandomNpcTypes.includes(visitorConfig.npcId)) {
        continue;
      }

      // 检查前置条件
      if (visitorConfig.requiredFlags && visitorConfig.requiredFlags.length > 0) {
        let meetsRequirements = true;
        for (const flag of visitorConfig.requiredFlags) {
          if (!this.gameState.getFlag(flag)) {
            meetsRequirements = false;
            break;
          }
        }
        if (!meetsRequirements) continue;
      }

      // 检查阻止条件
      if (visitorConfig.blockedFlags && visitorConfig.blockedFlags.length > 0) {
        let isBlocked = false;
        for (const flag of visitorConfig.blockedFlags) {
          if (this.gameState.getFlag(flag)) {
            isBlocked = true;
            break;
          }
        }
        if (isBlocked) continue;
      }

      // 随机判定
      if (Math.random() < visitorConfig.chance) {
        // 标记为今天已来访
        this.gameState.addTodayVisitor(visitorConfig.id);
        // 标记 NPC 状态为已出现
        this.randomNpcManager.onNpcSpawned(visitorConfig.id, this.gameState.timeData);
        // 标记该 NPC 类型已来访过（每种只出现一次）
        if (this.gameState.visitedRandomNpcTypes) {
          if (!this.gameState.visitedRandomNpcTypes.includes(visitorConfig.npcId)) {
            this.gameState.visitedRandomNpcTypes.push(visitorConfig.npcId);
          }
        } else {
          this.gameState.visitedRandomNpcTypes = [visitorConfig.npcId];
        }
        
        result.push({
          configId: visitorConfig.id,
          npcId: visitorConfig.npcId,
          dialogueId: visitorConfig.dialogueId,
          position: this.getVisitorPosition(result.length),
          items: visitorConfig.items || []
        });
      }
    }

    this.currentVisitors = result;
    return result;
  }

  // 获取来访 NPC 位置
  getVisitorPosition(index) {
    const positions = [
      { x: 550, y: 300 },
      { x: 200, y: 400 },
      { x: 350, y: 350 },
      { x: 600, y: 400 }
    ];
    return positions[index % positions.length];
  }

  // 获取来访 NPC 的数据（现代职业背景）
  getVisitorNPCData(npcId) {
    const npcData = {
      "visitor_teacher": {
        id: "visitor_teacher",
        name: "退休教师",
        description: "一位退休中小学教师，随身带着旧教案和整理好的纸袋。",
        position: { x: 0, y: 0 },
        color: 8454143,
        borderColor: 63487,
        portrait: "portrait_teacher"
      },
      "visitor_chef": {
        id: "visitor_chef",
        name: "饭馆厨师",
        description: "附近饭馆的厨师，身上带着后厨烟火气和一本老菜谱。",
        position: { x: 0, y: 0 },
        color: 13434879,
        borderColor: 11885375,
        portrait: "portrait_chef"
      },
      "visitor_courier": {
        id: "visitor_courier",
        name: "快递员",
        description: "穿着快递工作服的年轻人，熟悉附近每条小巷和门牌。",
        position: { x: 0, y: 0 },
        color: 16737894,
        borderColor: 14737633,
        portrait: "portrait_courier"
      },
      "visitor_antique": {
        id: "visitor_antique",
        name: "古玩店老板",
        description: "古玩街店铺的老板，习惯先问来路再谈价钱。",
        position: { x: 0, y: 0 },
        color: 11579568,
        borderColor: 8684678,
        portrait: "portrait_antique"
      }
    };
    
    return npcData[npcId] || null;
  }

  // 获取当前场景中的来访 NPC 列表
  getCurrentVisitors() {
    return this.currentVisitors;
  }

  // 清除当前来访 NPC
  clearCurrentVisitors() {
    this.currentVisitors = [];
  }

  // 根据 NPC ID 获取来访配置
  getVisitorByNPCId(npcId) {
    return this.currentVisitors.find(v => v.npcId === npcId);
  }

  // 获取来访者的对话 ID
  getVisitorDialogue(npcId) {
    const visitor = this.getVisitorByNPCId(npcId);
    return visitor ? visitor.dialogueId : null;
  }

  // 判断某个 NPC 是否在场景中
  isNPCInScene(npcId) {
    return this.currentVisitors.some(v => v.npcId === npcId);
  }

  // ========== NPC 对话结束后的处理 ==========

  // 对话结束后标记 NPC 已对话，并从当前列表移除
  onNpcDialogueEnd(npcId) {
    const visitor = this.currentVisitors.find(v => v.npcId === npcId);
    if (visitor) {
      this.randomNpcManager.onNpcDialogueEnd(visitor.configId);
      // 从当前场景访客中移除
      this.currentVisitors = this.currentVisitors.filter(v => v.npcId !== npcId);
    }
  }

  // ========== 来访提示相关 ==========

  // 获取需要提示的来访 NPC
  getNpcsNeedingNotification() {
    return this.randomNpcManager.getNpcsNeedingNotification();
  }

  // 标记已提示
  markNpcNotified(visitorConfigId) {
    this.randomNpcManager.markNotified(visitorConfigId);
  }

  // ========== 物品相关方法 ==========

  getVisitorItems(npcId) {
    const visitor = this.getVisitorByNPCId(npcId);
    return visitor?.items || [];
  }

  getPurchasableItems(npcId) {
    const items = this.getVisitorItems(npcId);
    return items.filter(item => item.obtainMethod === 'buy');
  }

  getExchangeableItems(npcId) {
    const items = this.getVisitorItems(npcId);
    return items.filter(item => item.obtainMethod === 'exchange');
  }

  getAffinityGiftItems(npcId) {
    const items = this.getVisitorItems(npcId);
    return items.filter(item => item.obtainMethod === 'affinity_gift');
  }

  getGiftItems(npcId) {
    const items = this.getVisitorItems(npcId);
    return items.filter(item => item.obtainMethod === 'gift');
  }

  canPurchaseItem(npcId, itemId) {
    const items = this.getPurchasableItems(npcId);
    const item = items.find(i => i.itemId === itemId);
    if (!item) return false;
    return this.gameState.funds >= item.cost;
  }

  canExchangeItem(npcId, itemId) {
    const items = this.getExchangeableItems(npcId);
    const item = items.find(i => i.itemId === itemId);
    if (!item) return false;
    return this.gameState.inventory?.some(inv => inv.id === item.requiredItem);
  }

  canReceiveAffinityGift(npcId, itemId) {
    const items = this.getAffinityGiftItems(npcId);
    const item = items.find(i => i.itemId === itemId);
    if (!item) return false;
    return this.gameState.getAffinity(npcId) >= (item.requiredAffinity || 0);
  }

  // ========== 临时委托相关方法 ==========

  getTemporaryCommissionConfig(tempCommissionId) {
    return this.tempCommissionConfigs.find(tc => tc.id === tempCommissionId) || null;
  }

  addTemporaryCommission(tempCommissionId) {
    const config = this.getTemporaryCommissionConfig(tempCommissionId);
    if (!config) return null;

    const existing = this.gameState.temporaryCommissions?.find(
      tc => tc.id === tempCommissionId && tc.status === 'available'
    );
    if (existing) return null;

    if (config.requiredFlags) {
      for (const flag of config.requiredFlags) {
        if (!this.gameState.getFlag(flag)) {
          return null;
        }
      }
    }

    const tempCommission = {
      id: tempCommissionId,
      title: config.title,
      npcId: config.npcId,
      expireDay: this.gameState.day + config.expireDays,
      requiredItems: config.requiredItems || [],
      rewardItems: config.rewardItems || [],
      rewardFunds: config.rewardFunds || 0,
      rewardPopularity: config.rewardPopularity || 0,
      description: config.description,
      status: 'available'
    };

    this.gameState.addTemporaryCommission(tempCommission);
    return tempCommission;
  }

  canCompleteTemporaryCommission(tempCommissionId) {
    const tc = this.gameState.temporaryCommissions?.find(t => t.id === tempCommissionId);
    if (!tc || tc.status !== 'available') return false;
    if (this.gameState.day > tc.expireDay) return false;

    for (const itemId of tc.requiredItems) {
      const hasItem = this.gameState.inventory?.some(inv => inv.id === itemId);
      if (!hasItem && !this.gameState.hasKeyItem(itemId)) return false;
    }

    return true;
  }

  completeTemporaryCommission(tempCommissionId) {
    const tc = this.gameState.temporaryCommissions?.find(t => t.id === tempCommissionId);
    if (!tc || tc.status !== 'available') return false;

    if (this.gameState.day > tc.expireDay) return false;

    for (const itemId of tc.requiredItems) {
      const invIndex = this.gameState.inventory?.findIndex(inv => inv.id === itemId);
      if (invIndex !== undefined && invIndex > -1) {
        this.gameState.inventory.splice(invIndex, 1);
      }
      this.gameState.removeKeyItem(itemId);
    }

    for (const itemId of tc.rewardItems) {
      this.gameState.addKeyItem(itemId);
    }

    if (tc.rewardFunds > 0) {
      this.gameState.modifyFunds(tc.rewardFunds);
    }

    if (tc.rewardPopularity > 0) {
      this.gameState.modifyPopularity(tc.rewardPopularity);
    }

    this.gameState.completeTemporaryCommission(tempCommissionId);

    return tc;
  }
}
