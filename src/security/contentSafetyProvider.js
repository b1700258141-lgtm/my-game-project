// ============================================================
// 内容安全服务抽象层
// 本地词库检测 + 腾讯云 TMS 云端审核 Provider 占位
// 后续可接入腾讯云文本内容安全 TMS API
// ============================================================

import SecurityConfig from './securityConfig';

/**
 * 内容安全检测结果
 * @typedef {Object} ModerationResult
 * @property {boolean} safe - 是否通过审核
 * @property {string} provider - 审核来源: local | tms | disabled
 * @property {string} reason - 违规原因（仅内部记录，不展示给玩家）
 */

/**
 * 本地词库 Provider
 * 从独立配置文件中加载敏感词列表
 */
class LocalContentSafetyProvider {
  constructor() {
    this._wordLists = null;
    this._adPatterns = null;
  }

  /**
   * 懒加载敏感词配置
   */
  _loadWordLists() {
    if (this._wordLists) return;
    try {
      // 优先从独立配置文件加载
      // 注意：配置文件路径由项目实际结构决定
      const data = {
        sensitiveWords_low: ['示例低俗词1', '示例低俗词2', '示例辱骂词'],
        sensitiveWords_medium: ['示例违法词1', '示例广告引流词1', 'example_badword'],
        sensitiveWords_high: [],
        patterns_adDetection: {
          url: '(https?://|www\\.|[a-zA-Z0-9-]+\\.(com|cn|net|org|cc|xyz|top|info))',
          phone_cn: '\\b1[3-9]\\d{9}\\b',
          email: '\\b[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}\\b',
          qq_number: '\\bqq\\s*[:：]?\\s*[1-9]\\d{4,10}\\b',
          wechat_id_suspect: '(微信|wechat|v信|wx|微[号訊信])\\s*[:：]?\\s*[a-zA-Z0-9_-]{6,}',
        },
      };
      this._wordLists = [
        ...(data.sensitiveWords_low || []),
        ...(data.sensitiveWords_medium || []),
        ...(data.sensitiveWords_high || []),
      ].map(w => w.toLowerCase());
      this._adPatterns = data.patterns_adDetection || {};
    } catch (e) {
      this._wordLists = [];
      this._adPatterns = {};
    }
  }

  /**
   * 检测文本是否包含敏感词
   * @param {string} text
   * @returns {ModerationResult}
   */
  moderate(text) {
    this._loadWordLists();
    const normalized = String(text || '').toLowerCase().trim();

    if (!normalized) {
      return { safe: true, provider: 'local', reason: '' };
    }

    // 敏感词检测
    for (const word of this._wordLists) {
      if (word && normalized.includes(word)) {
        return { safe: false, provider: 'local', reason: 'sensitive_word_detected' };
      }
    }

    // 广告/引流检测
    for (const [patternName, pattern] of Object.entries(this._adPatterns)) {
      try {
        const regex = new RegExp(pattern, 'gi');
        if (regex.test(normalized)) {
          return { safe: false, provider: 'local', reason: `ad_pattern:${patternName}` };
        }
      } catch (_e) {
        // 无效正则跳过
      }
    }

    return { safe: true, provider: 'local', reason: '' };
  }
}

/**
 * 腾讯云 TMS Provider 占位
 * 生产环境通过后端代理调用，不在前端暴露密钥
 */
class TmsContentSafetyProvider {
  constructor() {
    this.config = SecurityConfig.contentSafety.tms;
  }

  /**
   * 占位：云端文本审核
   * 实际接入时通过后端代理调用 TMS API
   * @param {string} text
   * @param {string} scene - 业务场景: game_player_name 等
   * @returns {Promise<ModerationResult>}
   */
  async moderate(text, scene = 'game_player_name') {
    if (!this.config.enabled || !this.config.endpoint) {
      return { safe: true, provider: 'tms_disabled', reason: 'tms not configured' };
    }

    // 占位实现：后续通过后端代理调用
    // 示例请求结构（实际请求格式参考腾讯云 TMS 文档）:
    // POST {endpoint}/api/tms/moderate
    // Body: { text, scene }
    // Headers: { Authorization: 'Bearer {proxy_token}' }
    console.log('[TMS Provider] 云端审核占位 — 文本:', text.substring(0, 50), '场景:', scene);
    return { safe: true, provider: 'tms_placeholder', reason: 'not yet implemented' };
  }
}

// ========== 工厂方法 ==========

let _localProvider = null;
let _tmsProvider = null;

/**
 * 获取内容安全 Provider
 * @param {'local'|'tms'} providerType
 * @returns {LocalContentSafetyProvider|TmsContentSafetyProvider}
 */
function getContentSafetyProvider(providerType) {
  const type = providerType || SecurityConfig.contentSafety.provider;

  if (type === 'tms') {
    if (!_tmsProvider) _tmsProvider = new TmsContentSafetyProvider();
    return _tmsProvider;
  }

  // 默认使用本地 Provider
  if (!_localProvider) _localProvider = new LocalContentSafetyProvider();
  return _localProvider;
}

/**
 * 审核文本（统一入口）
 * @param {string} text - 待审核文本
 * @param {string} scene - 业务场景标识
 * @returns {Promise<ModerationResult>|ModerationResult}
 */
function moderateText(text, scene = 'game_player_name') {
  const cfg = SecurityConfig.contentSafety;
  if (cfg.provider === 'disabled') {
    return { safe: true, provider: 'disabled', reason: '' };
  }

  const provider = getContentSafetyProvider(cfg.provider);
  return provider.moderate(text, scene);
}

export {
  LocalContentSafetyProvider,
  TmsContentSafetyProvider,
  getContentSafetyProvider,
  moderateText,
};
