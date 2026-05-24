// ============================================================
// 玩家起名安全校验
// 敏感词检测、特殊字符检测、广告引流检测
// ============================================================

import SecurityConfig from './securityConfig';
import { moderateText } from './contentSafetyProvider';
import securityLogger from './securityLogger';

/**
 * 起名校验结果
 * @typedef {Object} NameValidationResult
 * @property {boolean} valid - 是否通过
 * @property {string} errorMessage - 错误提示（统一展示给玩家）
 * @property {string} sanitizedName - 清理后的名字（如果通过）
 */

const DEFAULT_REJECT_MESSAGE = '【系统】：这个名字不太合适，请换一个名字。';

/**
 * 检查字符串是否为纯数字
 */
function _isNumericOnly(str) {
  return /^\d+$/.test(str);
}

/**
 * 检查字符串是否为纯特殊符号
 */
function _isSymbolOnly(str) {
  return /^[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]+$/u.test(str);
}

/**
 * 检查是否包含广告引流内容（URL、手机号等）
 * 返回 true 表示包含广告
 */
function _containsAdvertisement(str) {
  // URL 检测
  if (/https?:\/\//i.test(str)) return true;
  if (/www\.[a-zA-Z0-9]/.test(str)) return true;
  if (/\b[a-zA-Z0-9-]+\.(com|cn|net|org|cc|xyz|top|info|me|io|co)\b/i.test(str)) return true;

  // 手机号
  if (/\b1[3-9]\d{9}\b/.test(str)) return true;

  // 邮箱
  if (/\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b/.test(str)) return true;

  // QQ 号引流（明确带QQ前缀，不区分大小写）
  const qqRegex = new RegExp('\\bqq\\s*[:：]?\\s*\\d{5,11}\\b', 'i');
  if (qqRegex.test(str)) return true;

  // 微信号引流
  const wxRegex = new RegExp('(微信|wechat|v信|wx)\\s*[:：]?\\s*[a-zA-Z0-9_-]{5,}', 'i');
  if (wxRegex.test(str)) return true;

  return false;
}

/**
 * 验证玩家名字（同步版本，适用于本地校验场景）
 * @param {string} inputName - 玩家输入的名字
 * @returns {NameValidationResult}
 */
function validatePlayerName(inputName) {
  const cfg = SecurityConfig.nameModeration;

  if (!cfg.enabled) {
    return { valid: true, errorMessage: '', sanitizedName: String(inputName).trim() };
  }

  // 1. 类型检查和 trim
  const trimmed = String(inputName || '').trim();

  // 2. 非空检查
  if (!trimmed || trimmed.length === 0) {
    securityLogger.warn('name_empty', { playerName: '' });
    return { valid: false, errorMessage: cfg.emptyMessage, sanitizedName: '' };
  }

  // 3. 长度检查（按 Unicode 字符数）
  const charCount = [...trimmed].length;
  if (charCount < cfg.minLength) {
    securityLogger.warn('name_too_short', { playerName: trimmed.substring(0, 1) + '***' });
    return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
  }
  if (charCount > cfg.maxLength) {
    securityLogger.warn('name_too_long', { playerName: trimmed.substring(0, 1) + '***' });
    return { valid: false, errorMessage: cfg.tooLongMessage, sanitizedName: '' };
  }

  // 4. 纯数字检查
  if (cfg.denyNumericOnly && _isNumericOnly(trimmed)) {
    securityLogger.warn('name_numeric_only', { playerName: trimmed.substring(0, 1) + '***' });
    return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
  }

  // 5. 纯特殊符号检查
  if (cfg.denySymbolOnly && _isSymbolOnly(trimmed)) {
    securityLogger.warn('name_symbol_only', { playerName: trimmed.substring(0, 1) + '***' });
    return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
  }

  // 6. 广告引流检测
  if (cfg.enableAdDetection && _containsAdvertisement(trimmed)) {
    securityLogger.warn('name_contains_ad', { playerName: trimmed.substring(0, 1) + '***' });
    return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
  }

  // 7. 敏感词检测
  if (cfg.enableSensitiveWordCheck) {
    const result = moderateText(trimmed, 'game_player_name');
    // 如果 Provider 返回 Promise（TMS异步），降级为本地同步判断
    if (result instanceof Promise) {
      // 异步场景：先做本地基础检查，通过则放行
      // 云端审核结果后续异步处理
      return { valid: true, errorMessage: '', sanitizedName: trimmed };
    }
    if (!result.safe) {
      securityLogger.warn('name_sensitive_word', {
        playerName: trimmed.substring(0, 1) + '***',
        reason: result.reason,
      });
      return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
    }
  }

  // 8. 通过
  securityLogger.info('name_validated', { playerName: trimmed.substring(0, 1) + '***' });
  return { valid: true, errorMessage: '', sanitizedName: trimmed };
}

/**
 * 异步验证玩家名字（支持云端审核）
 * @param {string} inputName
 * @returns {Promise<NameValidationResult>}
 */
async function validatePlayerNameAsync(inputName) {
  const cfg = SecurityConfig.nameModeration;
  if (!cfg.enabled) {
    return { valid: true, errorMessage: '', sanitizedName: String(inputName).trim() };
  }

  const trimmed = String(inputName || '').trim();

  // 基础检查（同步）
  const basicResult = validatePlayerName(inputName);
  if (!basicResult.valid) {
    return basicResult;
  }

  // 云端审核
  if (cfg.enableSensitiveWordCheck) {
    const tmsResult = await moderateText(trimmed, 'game_player_name');
    if (!tmsResult.safe) {
      securityLogger.warn('name_tms_rejected', {
        playerName: trimmed.substring(0, 1) + '***',
        reason: tmsResult.reason,
      });
      return { valid: false, errorMessage: cfg.rejectMessage, sanitizedName: '' };
    }
  }

  return { valid: true, errorMessage: '', sanitizedName: trimmed };
}

export { validatePlayerName, validatePlayerNameAsync };
export default { validatePlayerName, validatePlayerNameAsync };
