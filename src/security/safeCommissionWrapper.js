// ============================================================
// 安全委托完成包装层
// 不修改现有委托系统，只在外部提供安全包装
// 奖励必须从委托配置读取，不允许 UI 直接传入
// ============================================================

import SecurityConfig from './securityConfig';
import securityLogger from './securityLogger';
import { checkCommissionCompletion, checkPopularityDelta, checkFundsDelta } from './behaviorGuard';
import { getCommissionRewardFromConfig, SafeNum } from './dataValidator';

/**
 * 安全完成委托的输入参数
 * @typedef {Object} SafeCompleteParams
 * @property {string} commissionId - 委托ID
 * @property {string} [selectedOptionId] - 选择的完成方式ID
 * @property {string} [selectedItemId] - 提交的物品实例ID
 * @property {object} gameState - 游戏状态引用（window.gameState）
 * @property {object} [commissionData] - 可选：已读取的委托配置数据
 */

/**
 * 安全完成委托的返回结果
 * @typedef {Object} SafeCompleteResult
 * @property {boolean} success - 是否成功
 * @property {string} message - 玩家提示
 * @property {object} [reward] - 实际发放的奖励（从配置读取）
 * @property {object} [newState] - 合并到 gameState 的安全新状态
 */

/**
 * 安全完成委托 - 包装层
 *
 * 流程：
 * 1. 校验委托ID和玩家接取状态
 * 2. 校验委托是否过期
 * 3. 校验选择的方式是否合法
 * 4. 从配置读取奖励（不受UI传入影响）
 * 5. 发放奖励（带行为检测）
 * 6. 记录安全日志
 *
 * @param {SafeCompleteParams} params
 * @returns {SafeCompleteResult}
 */
function safeCompleteCommission(params) {
  const cfg = SecurityConfig.behaviorGuard;
  if (!cfg.enabled) {
    // 安全模块关闭时返回可继续标记，由原系统处理
    return { success: true, message: '', reward: null, newState: null };
  }

  const { commissionId, selectedOptionId, selectedItemId, gameState } = params;
  if (!gameState) {
    securityLogger.error('safe_complete_no_state', { commissionId });
    return { success: false, message: '系统错误', reward: null, newState: null };
  }

  // ========== 1. 检查委托ID ==========
  if (!commissionId || typeof commissionId !== 'string') {
    securityLogger.error('safe_complete_invalid_id', { commissionId: String(commissionId) });
    return { success: false, message: '操作异常，请稍后重试。', reward: null, newState: null };
  }

  // ========== 2. 检查委托状态 ==========
  const commissionStatus = gameState.getCommissionStatus?.(commissionId) || 'available';
  const isAccepted = gameState.isCommissionAccepted?.(commissionId) || false;
  const isExpired = gameState.isCommissionExpired?.(commissionId) || false;

  const guardResult = checkCommissionCompletion({
    commissionId,
    commissionStatus,
    isAccepted,
    isExpired,
    gameState,
  });

  if (!guardResult.allowed) {
    return {
      success: false,
      message: guardResult.message,
      reward: null,
      newState: null,
    };
  }

  // ========== 3. 从配置读取奖励 ==========
  const configReward = getCommissionRewardFromConfig(commissionId, selectedOptionId);
  if (!configReward) {
    securityLogger.warn('safe_complete_no_reward_config', { commissionId, selectedOptionId });
    return { success: false, message: '操作异常，请稍后重试。', reward: null, newState: null };
  }

  // 计算最终奖励（应用万事屋等级加成）
  const baseFunds = SafeNum.nonNegInt(configReward.funds, 0);
  const basePopularity = SafeNum.nonNegInt(configReward.popularity, 0);

  // ========== 4. 奖励发放检测 ==========
  const fundsCheck = checkFundsDelta(gameState.funds, baseFunds, `commission_${commissionId}`);
  if (!fundsCheck.allowed) {
    return {
      success: false,
      message: fundsCheck.message,
      reward: null,
      newState: null,
    };
  }

  const popCheck = checkPopularityDelta(gameState.popularity, basePopularity);
  if (!popCheck.allowed) {
    return {
      success: false,
      message: popCheck.message,
      reward: null,
      newState: null,
    };
  }

  // ========== 5. 构建安全奖励 ==========
  const reward = {
    funds: baseFunds,
    popularity: basePopularity,
    result: configReward.result || 'normal',
    commissionId,
    selectedOptionId: selectedOptionId || null,
  };

  securityLogger.info('safe_complete_success', {
    commissionId,
    funds: baseFunds,
    popularity: basePopularity,
    optionId: selectedOptionId || 'default',
  });

  return {
    success: true,
    message: '',
    reward,
    newState: reward, // 调用方可据此更新 gameState
  };
}

export { safeCompleteCommission };
