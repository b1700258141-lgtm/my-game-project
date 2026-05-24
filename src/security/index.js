// ============================================================
// 安全模块统一导出入口
// 方便外部模块按需引入
// ============================================================

export { default as SecurityConfig, setSecurityEnabled, isSecurityEnabled } from './securityConfig';
export { validatePlayerName, validatePlayerNameAsync } from './nameModeration';
export { moderateText, getContentSafetyProvider } from './contentSafetyProvider';
export {
  checkPopularityDelta,
  checkFundsDelta,
  checkCommissionCompletion,
  checkInventoryItemCount,
  checkDayProgression,
} from './behaviorGuard';
export {
  sanitizePlayerName,
  sanitizePlayerState,
  validateInventoryItem,
  getCommissionRewardFromConfig,
  sanitizeSaveData,
  SafeNum,
} from './dataValidator';
export { safeCompleteCommission } from './safeCommissionWrapper';
export { default as securityLogger } from './securityLogger';
