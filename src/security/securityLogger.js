// ============================================================
// 安全日志 - 记录安全事件，为后续日志匿名化预留接口
// 只记录必要信息，避免记录玩家完整隐私
// ============================================================

import SecurityConfig from './securityConfig';

const LOG_LEVELS = {
  all: 0,
  warn: 1,
  error: 2,
};

class SecurityLogger {
  constructor() {
    this.config = SecurityConfig.securityLogger;
  }

  /**
   * 判断是否需要记录
   */
  _shouldLog(level) {
    if (!this.config.enabled) return false;
    const minLevel = LOG_LEVELS[this.config.level] ?? LOG_LEVELS.warn;
    const currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.all;
    return currentLevel >= minLevel;
  }

  /**
   * 格式化日志输出
   * 避免记录完整的玩家隐私数据
   */
  _format(eventType, data) {
    const safeData = {};
    for (const [key, value] of Object.entries(data || {})) {
      // 脱敏处理：针对敏感字段进行截断或哈希
      if (key === 'playerName' && typeof value === 'string') {
        safeData[key] = value.length > 0 ? `${value[0]}***` : '***';
      } else if (typeof value === 'string' && value.length > 100) {
        safeData[key] = value.substring(0, 100) + '...';
      } else {
        safeData[key] = value;
      }
    }
    return {
      timestamp: new Date().toISOString(),
      eventType,
      ...safeData,
    };
  }

  /**
   * 记录警告级别日志
   * @param {string} eventType - 事件类型标识
   * @param {object} data - 事件数据（会被脱敏）
   */
  warn(eventType, data = {}) {
    if (!this._shouldLog('warn')) return;
    const entry = this._format(eventType, data);
    if (this.config.consoleOutput) {
      console.warn(`[Security] ${eventType}`, entry);
    }
  }

  /**
   * 记录错误级别日志
   * @param {string} eventType
   * @param {object} data
   */
  error(eventType, data = {}) {
    if (!this._shouldLog('error')) return;
    const entry = this._format(eventType, data);
    if (this.config.consoleOutput) {
      console.error(`[Security] ${eventType}`, entry);
    }
  }

  /**
   * 记录信息级别日志
   * @param {string} eventType
   * @param {object} data
   */
  info(eventType, data = {}) {
    if (!this._shouldLog('all')) return;
    const entry = this._format(eventType, data);
    if (this.config.consoleOutput) {
      console.info(`[Security] ${eventType}`, entry);
    }
  }

  /**
   * 预留接口：日志匿名化处理
   * 后续可接入 Has-Anonymizer 做深度脱敏
   * @param {string} rawText - 原始文本
   * @returns {string} 脱敏后文本
   */
  anonymizeText(rawText) {
    // 当前为占位实现，后续可接入 Has-Anonymizer
    if (typeof rawText !== 'string') return String(rawText);
    // 基础手机号脱敏
    let result = rawText.replace(/\b1[3-9]\d{9}\b/g, (match) => match.substring(0, 3) + '****' + match.substring(7));
    // 基础邮箱脱敏
    result = result.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '***@***.***');
    return result;
  }
}

// 单例
const securityLogger = new SecurityLogger();
export default securityLogger;
