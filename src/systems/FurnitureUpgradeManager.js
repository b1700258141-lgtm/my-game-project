import DailyLoopManager from './DailyLoopManager';

export const FURNITURE_CONFIGS = [
  {
    furnitureId: 'reception_desk',
    furnitureName: '接待台',
    maxLevel: 3,
    upgradeCosts: [0, 100, 300],
    effectsByLevel: [
      '每日最多 1 位来客',
      '每日最多 2 位来客',
      '特殊来客概率提升，待实装'
    ]
  },
  {
    furnitureId: 'alchemy_cauldron',
    furnitureName: '炼金釜',
    maxLevel: 3,
    upgradeCosts: [0, 120, 320],
    effectsByLevel: [
      '4x4 炼金宫格',
      '炼金评分加成 +5%，效果待实装',
      '特殊格子或 5x5 宫格，待实装'
    ]
  },
  {
    furnitureId: 'bookshelf',
    furnitureName: '书架',
    maxLevel: 3,
    upgradeCosts: [0, 90, 260],
    effectsByLevel: [
      '查看已完成委托',
      '查看 NPC 档案，内容待补充',
      '查看古代精魂记忆档案，内容待补充'
    ]
  },
  {
    furnitureId: 'bed',
    furnitureName: '床',
    maxLevel: 3,
    upgradeCosts: [0, 80, 220],
    effectsByLevel: [
      '可睡觉进入每日结算',
      '睡觉后额外恢复状态，当前先占位',
      '睡觉后提高第二天来客概率，当前先占位'
    ]
  },
  {
    furnitureId: 'signboard',
    furnitureName: '门牌',
    maxLevel: 3,
    upgradeCosts: [0, 100, 280],
    effectsByLevel: [
      '基础人气',
      '人气获取 +10%，效果待实装',
      '随机来客概率增加，待实装'
    ]
  }
];

export default class FurnitureUpgradeManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.ensureFurnitureData();
  }

  ensureFurnitureData() {
    if (!this.gameState.furnitureLevels) {
      this.gameState.furnitureLevels = {};
    }

    FURNITURE_CONFIGS.forEach(config => {
      if (!this.gameState.furnitureLevels[config.furnitureId]) {
        this.gameState.furnitureLevels[config.furnitureId] = 1;
      }
    });

    return this.gameState.furnitureLevels;
  }

  getFurnitureList() {
    this.ensureFurnitureData();
    return FURNITURE_CONFIGS.map(config => {
      const level = this.gameState.furnitureLevels[config.furnitureId] || 1;
      const isMaxLevel = level >= config.maxLevel;
      const nextLevel = Math.min(level + 1, config.maxLevel);
      return {
        ...config,
        level,
        isMaxLevel,
        currentEffect: config.effectsByLevel[level - 1] || '效果待补充',
        nextEffect: isMaxLevel ? '已达最高等级' : config.effectsByLevel[nextLevel - 1],
        nextCost: isMaxLevel ? 0 : config.upgradeCosts[level] || 0,
        canAfford: isMaxLevel ? false : this.gameState.funds >= (config.upgradeCosts[level] || 0)
      };
    });
  }

  getShopLevel() {
    const list = this.getFurnitureList();
    const totalLevel = list.reduce((sum, item) => sum + item.level, 0);
    return Math.max(1, Math.floor(totalLevel / list.length));
  }

  upgradeFurniture(furnitureId) {
    const furniture = this.getFurnitureList().find(item => item.furnitureId === furnitureId);
    if (!furniture) {
      return { success: false, message: '家具不存在' };
    }

    if (furniture.isMaxLevel) {
      return { success: false, message: '已达最高等级' };
    }

    if (this.gameState.funds < furniture.nextCost) {
      return { success: false, message: '资金不足' };
    }

    this.gameState.modifyFunds(-furniture.nextCost);
    this.gameState.furnitureLevels[furnitureId] = furniture.level + 1;

    const dailyLoop = new DailyLoopManager(this.gameState);
    dailyLoop.recordMoneySpent(furniture.nextCost);

    return {
      success: true,
      message: `${furniture.furnitureName} 升级成功`,
      furnitureId,
      level: furniture.level + 1
    };
  }
}
