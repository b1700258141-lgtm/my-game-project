// ============================================================
// 行为检测 - 异常行为识别
// 检测异常刷奖励、人气暴涨、非法委托完成等
// 不封禁玩家，仅记录警告并阻止异常操作
// ============================================================

import SecurityConfig from './securityConfig';
import securityLogger from './securityLogger';

/**
 * 行为检测结果
 * @typedef {Object} GuardResult
 * @property {boolean} allowed - 是否允许本次操作
 * @property {string} message - 玩家提示（空字符串表示无提示）
 * @property {string} reason - 内部记录原因
 * @property {string} severity - 严重程度: low | high
 */

const MSG_MILD = '【系统】：操作异常，请稍后重试。';
const MSG_SEVERE = '【系统】：检测到异常数据，已取消本次操作。';

/**
 * 检查人气值变动是否异常
 * @param {number} currentPopularity - 当前人气值
 * @param {number} delta - 变动量
 * @returns {GuardResult}
 */
function checkPopularityDelta(currentPopularity, delta) {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) return { allowed: true, message: '', reason: '', severity: 'low' };

  const current = Number(currentPopularity);
  const change = Number(delta);

  if (!Number.isFinite(current) || !Number.isFinite(change)) {
    securityLogger.error('popularity_delta_invalid', { currentPopularity: String(current), delta: String(delta) });
    return { allowed: false, message: MSG_SEVERE, reason: 'invalid_popularity_value', severity: 'high' };
  }

  if (Math.abs(change) > cfg.popularityDeltaMax) {
    securityLogger.warn('popularity_anomaly', {
      currentPopularity: current,
      delta: change,
      threshold: cfg.popularityDeltaMax,
    });
    return { allowed: false, message: MSG_SEVERE, reason: 'popularity_spike', severity: 'high' };
  }

  return { allowed: true, message: '', reason: '', severity: 'low' };
}

/**
 * 检查资金变动是否异常
 * @param {number} currentFunds - 当前资金
 * @param {number} delta - 变动量
 * @param {string} source - 来源标识
 * @returns {GuardResult}
 */
function checkFundsDelta(currentFunds, delta, source = 'unknown') {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) return { allowed: true, message: '', reason: '', severity: 'low' };

  const current = Number(currentFunds);
  const change = Number(delta);

  if (!Number.isFinite(current) || !Number.isFinite(change)) {
    securityLogger.error('funds_delta_invalid', { currentFunds: String(current), delta: String(change), source });
    return { allowed: false, message: MSG_SEVERE, reason: 'invalid_funds_value', severity: 'high' };
  }

  // 只检查增加方向的异常，正常扣钱不限制
  if (change > 0 && change > cfg.fundsDeltaMax) {
    securityLogger.warn('funds_anomaly', {
      currentFunds: current,
      delta: change,
      source,
      threshold: cfg.fundsDeltaMax,
    });
    return { allowed: false, message: MSG_SEVERE, reason: 'funds_spike', severity: 'high' };
  }

  return { allowed: true, message: '', reason: '', severity: 'low' };
}

/**
 * 检查委托完成请求是否合法
 * @param {object} params
 * @param {string} params.commissionId - 委托ID
 * @param {string} params.commissionStatus - 委托当前状态
 * @param {boolean} params.isAccepted - 是否已接取
 * @param {boolean} params.isExpired - 是否已过期
 * @param {object} params.gameState - 游戏状态引用
 * @returns {GuardResult}
 */
function checkCommissionCompletion({ commissionId, commissionStatus, isAccepted, isExpired, gameState }) {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) return { allowed: true, message: '', reason: '', severity: 'low' };

  // 检查委托ID合法性
  if (!commissionId || typeof commissionId !== 'string') {
    securityLogger.error('commission_invalid_id', { commissionId: String(commissionId) });
    return { allowed: false, message: MSG_SEVERE, reason: 'invalid_commission_id', severity: 'high' };
  }

  // 未接取
  if (!isAccepted) {
    securityLogger.warn('commission_not_accepted', { commissionId });
    return { allowed: false, message: MSG_MILD, reason: 'commission_not_accepted', severity: 'low' };
  }

  // 已过期
  if (isExpired) {
    securityLogger.warn('commission_expired', { commissionId });
    return { allowed: false, message: MSG_MILD, reason: 'commission_expired', severity: 'low' };
  }

  return { allowed: true, message: '', reason: '', severity: 'low' };
}

/**
 * 检查背包物品数量是否异常
 * @param {Array} inventory - 背包数组
 * @param {string} itemId - 物品ID
 * @param {number} count - 当前数量
 * @returns {GuardResult}
 */
function checkInventoryItemCount(inventory, itemId, count) {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) return { allowed: true, message: '', reason: '', severity: 'low' };

  const itemCount = Number(count);
  if (!Number.isFinite(itemCount) || itemCount < 0) {
    securityLogger.error('inventory_negative_count', { itemId, count: String(count) });
    return { allowed: false, message: MSG_SEVERE, reason: 'negative_item_count', severity: 'high' };
  }

  if (!Number.isInteger(itemCount)) {
    securityLogger.warn('inventory_fractional_count', { itemId, count });
    return { allowed: false, message: MSG_SEVERE, reason: 'fractional_item_count', severity: 'high' };
  }

  return { allowed: true, message: '', reason: '', severity: 'low' };
}

/**
 * 检查游戏天数是否回退
 * @param {number} currentDay - 当前天数
 * @param {number} newDay - 新天数
 * @returns {GuardResult}
 */
function checkDayProgression(currentDay, newDay) {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) return { allowed: true, message: '', reason: '', severity: 'low' };

  const current = Number(currentDay);
  const next = Number(newDay);

  if (!Number.isFinite(current) || !Number.isFinite(next)) {
    return { allowed: false, message: MSG_SEVERE, reason: 'invalid_day_value', severity: 'high' };
  }

  if (next < current) {
    securityLogger.warn('day_regression', { currentDay: current, newDay: next });
    return { allowed: false, message: MSG_SEVERE, reason: 'day_regression', severity: 'high' };
  }

  return { allowed: true, message: '', reason: '', severity: 'low' };
}

export {
  checkPopularityDelta,
  checkFundsDelta,
  checkCommissionCompletion,
  checkInventoryItemCount,
  checkDayProgression,
};
