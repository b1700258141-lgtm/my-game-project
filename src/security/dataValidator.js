// ============================================================
// 数据校验器 - 游戏数据交互校验
// 存档校验、委托奖励校验、背包物品数量校验
// 所有关键数值必须通过此模块校验后才能写入核心状态
// ============================================================

import SecurityConfig from './securityConfig';
import securityLogger from './securityLogger';
import gameConfig from '../data/gameConfig.json';
import commissions from '../data/commissions.json';

/**
 * 安全类型检查工具
 */
const SafeNum = {
  /** 确保值为安全整数，否则返回默认值 */
  int(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) && Number.isInteger(num) ? num : fallback;
  },
  /** 确保值为安全数字，否则返回默认值 */
  num(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
  /** 确保值为非负整数 */
  nonNegInt(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) && Number.isInteger(num) && num >= 0 ? num : fallback;
  },
};

/**
 * 合法的委托状态集合
 */
const VALID_COMMISSION_STATUSES = new Set([
  'available', 'inProgress', 'submittable', 'completed', 'expired',
]);

/**
 * 合法的品质集合
 */
const VALID_QUALITIES = new Set(['poor', 'normal', 'excellent', 'perfect']);

/**
 * 验证玩家名字
 * @param {string} name
 * @returns {string} 清理后的名字
 */
function sanitizePlayerName(name) {
  if (typeof name !== 'string') {
    securityLogger.warn('player_name_invalid_type', { type: typeof name });
    return '';
  }
  return name.trim().substring(0, 12);
}

/**
 * 验证并清理玩家状态数据
 * @param {object} state - 玩家状态对象
 * @returns {object} 净化后的状态
 */
function sanitizePlayerState(state = {}) {
  const cfg = SecurityConfig.dataValidator;
  if (!cfg.enabled) return { ...state };

  const sanitized = {
    playerName: sanitizePlayerName(state.playerName),
    funds: SafeNum.nonNegInt(state.funds, gameConfig.initial.funds),
    popularity: SafeNum.nonNegInt(state.popularity, gameConfig.initial.popularity),
    day: SafeNum.int(state.day || state.currentDay, 1),
    currentHour: SafeNum.int(state.currentHour, 8),
    currentMinute: SafeNum.int(state.currentMinute, 0),
  };

  const originalFunds = state.funds;
  const originalPop = state.popularity;

  if (originalFunds !== undefined && sanitized.funds !== Number(originalFunds)) {
    securityLogger.warn('funds_sanitized', { original: String(originalFunds), sanitized: sanitized.funds });
  }
  if (originalPop !== undefined && sanitized.popularity !== Number(originalPop)) {
    securityLogger.warn('popularity_sanitized', { original: String(originalPop), sanitized: sanitized.popularity });
  }

  return sanitized;
}

/**
 * 验证背包物品项
 * @param {object} item
 * @returns {object|null} 验证后的物品，非法则返回 null
 */
function validateInventoryItem(item) {
  if (!item || typeof item !== 'object') return null;

  const cfg = SecurityConfig.dataValidator;
  if (!cfg.enabled) return { ...item };

  const itemId = String(item.id || item.itemId || '');
  if (!itemId) {
    securityLogger.warn('inventory_item_no_id', {});
    return null;
  }

  const count = SafeNum.nonNegInt(item.count || item.itemCount || 0, 0);

  // 品质检查
  let quality = item.quality || null;
  if (quality && !VALID_QUALITIES.has(quality)) {
    securityLogger.warn('inventory_invalid_quality', { itemId, quality });
    quality = null;
  }

  return {
    id: itemId,
    itemId,
    itemName: String(item.itemName || item.name || ''),
    itemType: String(item.itemType || item.type || ''),
    count,
    quality,
    isKeyItem: Boolean(item.isKeyItem),
    sourceNpcId: String(item.sourceNpcId || ''),
    itemDescription: String(item.itemDescription || item.description || ''),
  };
}

/**
 * 验证委托数据结构
 * @param {object} commission
 * @returns {object|null} 验证后的委托对象，非法则返回 null
 */
function validateCommission(commission) {
  if (!commission || typeof commission !== 'object') return null;

  const cfg = SecurityConfig.dataValidator;
  if (!cfg.enabled) return { ...commission };

  const id = String(commission.id || commission.commissionId || '');
  if (!id) return null;

  const status = String(commission.status || 'available');
  if (!VALID_COMMISSION_STATUSES.has(status)) {
    securityLogger.warn('commission_invalid_status', { commissionId: id, status });
    return null;
  }

  return {
    ...commission,
    id,
    status,
    acceptedDay: SafeNum.int(commission.acceptedDay, 1),
    deadlineDay: SafeNum.int(commission.deadlineDay, null),
  };
}

/**
 * 验证并读取委托的有效奖励
 * 奖励只能从委托配置读取，不能由 UI 传入
 * @param {string} commissionId - 委托ID
 * @param {string} optionId - 完成方式ID
 * @returns {object|null} 有效的奖励数据
 */
function getCommissionRewardFromConfig(commissionId, optionId) {
  const cfg = SecurityConfig.dataValidator;
  if (!cfg.enabled) return null;

  const commissionData = commissions.commissions.find(c => c.id === commissionId);
  if (!commissionData) {
    securityLogger.warn('commission_not_found', { commissionId });
    return null;
  }

  // 如果有 taskOptions，根据 optionId 查找
  if (optionId && Array.isArray(commissionData.taskOptions)) {
    const option = commissionData.taskOptions.find(o => o.id === optionId);
    if (option && option.reward) {
      const reward = {
        funds: SafeNum.nonNegInt(option.reward.funds, 0),
        popularity: SafeNum.nonNegInt(option.reward.popularity, 0),
      };
      let qualityReward = {};
      if (option.requiredItemIds && commissionData.qualityRewards) {
        qualityReward = commissionData.qualityRewards;
      }
      return { ...reward, qualityRewards: qualityReward, result: option.result || 'normal' };
    }
  }

  // 基础奖励
  const baseReward = commissionData.reward || {};
  return {
    funds: SafeNum.nonNegInt(baseReward.funds, 0),
    popularity: SafeNum.nonNegInt(baseReward.popularity, 0),
    qualityRewards: commissionData.qualityRewards || {},
    result: 'normal',
  };
}

/**
 * 净化存档数据
 * 对加载的存档进行安全检查，修正非法字段
 * @param {object} saveData - 原始存档数据
 * @returns {object} 净化后的存档
 */
function sanitizeSaveData(saveData) {
  const cfg = SecurityConfig.dataValidator;
  if (!cfg.enabled || !cfg.sanitizeSaveOnLoad) return { ...saveData };

  if (!saveData || typeof saveData !== 'object') {
    securityLogger.error('save_data_invalid', {});
    return null;
  }

  const sanitized = { ...saveData };

  // 玩家状态净化
  sanitized.money = SafeNum.nonNegInt(sanitized.money ?? sanitized.funds, gameConfig.initial.funds);
  sanitized.popularity = SafeNum.nonNegInt(sanitized.popularity, gameConfig.initial.popularity);
  sanitized.currentDay = SafeNum.int(sanitized.currentDay ?? sanitized.day, 1);
  sanitized.currentHour = SafeNum.int(sanitized.currentHour, 8);
  sanitized.currentMinute = SafeNum.int(sanitized.currentMinute, 0);

  // 背包物品净化
  if (Array.isArray(sanitized.inventoryItems)) {
    sanitized.inventoryItems = sanitized.inventoryItems
      .map(item => validateInventoryItem(item))
      .filter(Boolean);
  }

  // 委托列表净化
  if (Array.isArray(sanitized.acceptedCommissions)) {
    sanitized.acceptedCommissions = sanitized.acceptedCommissions
      .map(c => validateCommission(c))
      .filter(Boolean);
  }

  // 资金和人气重写（确保一致性）
  sanitized.funds = sanitized.money;

  // 版本号兼容
  if (!sanitized.saveVersion) {
    sanitized.saveVersion = 'legacy';
  }

  // 修正 NaN/Infinity
  const originalSave = JSON.stringify(saveData);
  const sanitizedSave = JSON.stringify(sanitized);
  if (originalSave !== sanitizedSave) {
    securityLogger.warn('save_data_sanitized', {
      saveSlotIndex: sanitized.saveSlotIndex,
      changes: 'sanitized fields corrected',
    });
  }

  return sanitized;
}

export {
  SafeNum,
  VALID_COMMISSION_STATUSES,
  VALID_QUALITIES,
  sanitizePlayerName,
  sanitizePlayerState,
  validateInventoryItem,
  validateCommission,
  getCommissionRewardFromConfig,
  sanitizeSaveData,
};
