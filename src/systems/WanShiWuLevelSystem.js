import gameConfig from '../data/gameConfig.json';

export const WAN_SHI_WU_LEVEL_CONFIG = gameConfig.wanShiWuLevels || [
  { level: 1, popularityGreaterThan: 0, commissionRewardMultiplier: 1 },
  { level: 2, popularityGreaterThan: 2000, commissionRewardMultiplier: 3 },
  { level: 3, popularityGreaterThan: 10000, commissionRewardMultiplier: 6 },
  { level: 4, popularityGreaterThan: 30000, commissionRewardMultiplier: 11 },
  { level: 5, popularityGreaterThan: 100000, commissionRewardMultiplier: 21 }
];

export function getWanShiWuLevelByPopularity(popularity) {
  const value = Number(popularity) || 0;
  return WAN_SHI_WU_LEVEL_CONFIG.reduce((level, config) => {
    if (value > config.popularityGreaterThan) {
      return Math.max(level, config.level);
    }
    return level;
  }, 1);
}

export function getCommissionRewardMultiplier(shopLevel = 1) {
  const config = WAN_SHI_WU_LEVEL_CONFIG.find(item => item.level === shopLevel);
  return config?.commissionRewardMultiplier || 1;
}

export function applyCommissionReward(baseFunds = 0, basePopularity = 0, shopLevel = 1) {
  const multiplier = getCommissionRewardMultiplier(shopLevel);
  return {
    funds: Math.round((Number(baseFunds) || 0) * multiplier),
    popularity: Math.round((Number(basePopularity) || 0) * multiplier),
    multiplier
  };
}
