import DailyLoopManager from './DailyLoopManager';

export const FURNITURE_CONFIGS = [
  {
    furnitureId: 'reception_desk',
    furnitureName: '接待台',
    maxLevel: 6,
    upgradeCosts: [0, 2000, 5000, 50000, 100000, 0],
    requirementsByLevel: [
      null,
      { funds: 2000 },
      { funds: 5000, popularityGreaterThan: 2000 },
      { funds: 50000 },
      { funds: 100000, popularityGreaterThan: 20000 },
      { completedCommissionId: '异次元来客' }
    ],
    effectsByLevel: [
      '初始等级（万事屋内最多同时随机来访一位npc，短期委托每日最多刷新两条）',
      '增加短期委托每日可刷新数量到5条，效果待实装',
      '万事屋可以同时随机来访3名npc，效果待实装',
      '自动接取可以直接交付的短期委托，并在每日结算时交付，效果待实装',
      '增加短期委托每日可刷新数量到10条，效果待实装',
      '接待台可以自行挑选特定npc到访万事屋，效果待实装'
    ]
  },
  {
    furnitureId: 'alchemy_cauldron',
    furnitureName: '炼金釜',
    maxLevel: 6,
    upgradeCosts: [0, 5000, 0, 200000, 300000, 1000000],
    requirementsByLevel: [
      null,
      { funds: 5000 },
      { completedCommissionId: '传承' },
      { funds: 200000 },
      { funds: 300000 },
      { funds: 1000000, keyItemId: '点石成金之心' }
    ],
    effectsByLevel: [
      '初始等级（4x4炼金宫格）',
      '扩大炼金釜至6x6炼金宫格，炼金有一定概率获得额外产物（10%），效果待实装',
      '解锁炼金触媒系统，效果待实装',
      '扩大炼金釜至8x8炼金宫格，炼金有更大概率获得额外产物（20%），效果待实装',
      '炼金有概率不消耗炼金素材（25%），效果待实装',
      '炼金术解禁，现在可以炼金出超常识的物品，效果待实装'
    ]
  },
  {
    furnitureId: 'bookshelf',
    furnitureName: '书架',
    maxLevel: 3,
    upgradeCosts: [0, 0, 0],
    requirementsByLevel: [
      null,
      { dayGreaterThanOrEqual: 365, popularityGreaterThan: 20000 },
      { perfectClear: true }
    ],
    effectsByLevel: [
      '初始等级',
      '解锁更多隐藏的彩蛋cg，效果待实装',
      '解锁作者的话，效果待实装'
    ]
  },
  {
    furnitureId: 'bed',
    furnitureName: '床',
    maxLevel: 5,
    upgradeCosts: [0, 50000, 150000, 150000, 250000],
    requirementsByLevel: [
      null,
      { funds: 50000 },
      { funds: 150000, alchemyProductBaseId: 'velvet_cloth' },
      { funds: 150000, alchemyProductBaseId: 'silk_brocade' },
      { funds: 250000, keyItemId: '天堂铺盖' }
    ],
    effectsByLevel: [
      '初始等级（基础睡觉功能）',
      '睡觉可以恢复主角精力，睡觉结束后获得炼金速度增加20%的buff，持续3次炼金，效果待实装',
      '床新增快进时间功能，可以精准快进时间到具体时间点，效果待实装',
      '床新增回溯时间的功能，可以精准回溯到某个具体的时间点，效果待实装',
      '与床交互有概率触发特殊夜晚，所有炼金产物无视条件必定是完美品质，持续12个小时，效果待实装'
    ]
  },
  {
    furnitureId: 'signboard',
    furnitureName: '门牌',
    maxLevel: 5,
    upgradeCosts: [0, 5000, 150000, 500000, 1000000],
    requirementsByLevel: [
      null,
      { funds: 5000 },
      { funds: 150000 },
      { funds: 500000 },
      { funds: 1000000 }
    ],
    effectsByLevel: [
      '初始等级（人气值获取效率1.0倍）',
      '人气值获取效率增加20%，效果待实装',
      '人气值获取效率增加30%，效果待实装',
      '人气值获取效率增加50%，效果待实装',
      '人气值获取效率最大化，增加100%，效果待实装'
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
      const nextRequirement = isMaxLevel ? null : this.getRequirementForNextLevel(config, level);
      const requirementResult = nextRequirement ? this.checkRequirement(nextRequirement) : { canUpgrade: false };
      return {
        ...config,
        level,
        isMaxLevel,
        currentEffect: config.effectsByLevel[level - 1] || '当前等级效果已记录在家具档案中',
        nextEffect: isMaxLevel ? '已达最高等级' : config.effectsByLevel[nextLevel - 1],
        nextCost: isMaxLevel ? 0 : config.upgradeCosts[level] || 0,
        nextRequirementText: nextRequirement ? this.formatRequirement(nextRequirement) : '',
        canAfford: isMaxLevel ? false : requirementResult.canUpgrade,
        unmetRequirementText: requirementResult.message || ''
      };
    });
  }

  getRequirementForNextLevel(config, currentLevel) {
    const requirement = config.requirementsByLevel?.[currentLevel];
    if (requirement) return requirement;
    return { funds: config.upgradeCosts[currentLevel] || 0 };
  }

  checkRequirement(requirement) {
    const missing = [];
    if (requirement.funds && this.gameState.funds < requirement.funds) {
      missing.push('资金不足');
    }
    if (requirement.popularityGreaterThan && this.gameState.popularity <= requirement.popularityGreaterThan) {
      missing.push(`人气需要大于 ${requirement.popularityGreaterThan}`);
    }
    if (requirement.dayGreaterThanOrEqual && this.gameState.day < requirement.dayGreaterThanOrEqual) {
      missing.push(`游戏天数需要达到 ${requirement.dayGreaterThanOrEqual} 天`);
    }
    if (requirement.completedCommissionId && !this.gameState.completedCommissions?.includes(requirement.completedCommissionId)) {
      missing.push(`需要完成委托「${requirement.completedCommissionId}」`);
    }
    if (requirement.keyItemId && !this.gameState.keyItems?.some(item => item.id === requirement.keyItemId)) {
      missing.push(`需要关键物品「${requirement.keyItemId}」`);
    }
    if (requirement.alchemyProductBaseId && !this.gameState.inventory?.some(item => item.baseRecipeId === requirement.alchemyProductBaseId || item.id?.startsWith(`${requirement.alchemyProductBaseId}_`))) {
      missing.push(`需要炼金产物「${requirement.alchemyProductBaseId}」`);
    }
    if (requirement.perfectClear) {
      missing.push('需要完美通关');
    }

    return {
      canUpgrade: missing.length === 0,
      message: missing.join('；')
    };
  }

  formatRequirement(requirement) {
    const parts = [];
    if (requirement.funds) parts.push(`${requirement.funds}资金`);
    if (requirement.popularityGreaterThan) parts.push(`人气值>${requirement.popularityGreaterThan}`);
    if (requirement.dayGreaterThanOrEqual) parts.push(`游戏天数到达${requirement.dayGreaterThanOrEqual}天以上`);
    if (requirement.completedCommissionId) parts.push(`达成委托“${requirement.completedCommissionId}”`);
    if (requirement.keyItemId) parts.push(`关键物品“${requirement.keyItemId}”`);
    if (requirement.alchemyProductBaseId) parts.push(`炼金产物“${requirement.alchemyProductBaseId}”`);
    if (requirement.perfectClear) parts.push('完美通关游戏');
    return parts.length > 0 ? parts.join('，') : '无';
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

    if (!furniture.canAfford) {
      return { success: false, message: furniture.unmetRequirementText || '升级条件不足' };
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
