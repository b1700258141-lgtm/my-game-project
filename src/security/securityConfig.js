// ============================================================
// 安全配置 - 游戏安全体系的统一配置开关
// 所有安全模块均可通过此配置启用/关闭
// ============================================================

const SecurityConfig = {
  // ========== 全局开关 ==========
  /** 是否启用安全体系（总开关） */
  enabled: true,

  // ========== 玩家起名安全 ==========
  nameModeration: {
    /** 是否启用起名校验 */
    enabled: true,

    /** 名字最小长度（trim 后字符数） */
    minLength: 1,

    /** 名字最大长度（trim 后字符数，与 UI maxlength 保持一致） */
    maxLength: 12,

    /** 是否禁止纯数字 */
    denyNumericOnly: true,

    /** 是否禁止纯特殊符号 */
    denySymbolOnly: true,

    /** 是否启用敏感词检测 */
    enableSensitiveWordCheck: true,

    /** 是否启用广告/引流检测（URL、QQ号、手机号等） */
    enableAdDetection: true,

    /** 统一违规提示文案 */
    rejectMessage: '【系统】：这个名字不太合适，请换一个名字。',

    /** 空名提示 */
    emptyMessage: '【系统】：名字不能为空。',

    /** 过长提示 */
    tooLongMessage: '【系统】：名字最多 12 个字符。',
  },

  // ========== 行为检测 ==========
  behaviorGuard: {
    /** 是否启用行为检测 */
    enabled: true,

    /** 人气值单次变动上限（超过则记录警告并阻止） */
    popularityDeltaMax: 100000,

    /** 资金单次变动上限（超过则记录警告并阻止） */
    fundsDeltaMax: 1000000,

    /** 是否校验委托奖励来源合法性 */
    validateCommissionReward: true,

    /** 是否校验背包物品合法性 */
    validateInventoryItems: true,
  },

  // ========== 数据校验 ==========
  dataValidator: {
    /** 是否启用数据校验 */
    enabled: true,

    /** 是否在存档加载时执行数据净化 */
    sanitizeSaveOnLoad: true,

    /** 是否校验炼金配方合法性 */
    validateAlchemyRecipe: true,
  },

  // ========== 安全日志 ==========
  securityLogger: {
    /** 是否启用安全日志 */
    enabled: true,

    /** 日志级别: all | warn | error */
    level: 'warn',

    /** 是否将安全日志输出到浏览器控制台 */
    consoleOutput: true,
  },

  // ========== 内容安全服务 ==========
  contentSafety: {
    /** 使用哪种内容安全 Provider: local | tms | disabled */
    provider: 'local',

    /** 腾讯云 TMS 配置（占位，生产环境需通过后端代理调用） */
    tms: {
      /** TMS endpoint，由后端代理提供 */
      endpoint: '',
      /** 业务场景标识 */
      scene: 'game_player_name',
      /** 是否启用 */
      enabled: false,
      /** 注意：SecretId / SecretKey 不应出现在前端代码中 */
    },
  },

  // ========== CloudBase HTTP 云审核配置 ==========
  cloudModeration: {
    /** 是否在本地校验通过后调用云审核 */
    enabled: true,

    /** HTTP 审核接口地址（CloudBase HTTP 访问服务） */
    httpModerationUrl: 'https://wanshiwu-game-dev-d7dnulbc30e85d-1436430121.ap-shanghai.app.tcloudbase.com/moderatePlayerName',

    /** CloudBase 环境 ID（保留供参考，非敏感） */
    envId: 'wanshiwu-game-dev-d7dnulbc30e85d',

    /** 云函数名称（保留供参考） */
    functionName: 'moderatePlayerName',

    /** CloudBase 地域 */
    region: 'ap-shanghai',

    /** 是否使用 Mock 模式（true=离线本地 Mock，false=HTTP 云函数） */
    mockEnabled: false,

    /** Mock 网络延迟（毫秒） */
    mockDelayMs: 300,

    /** 云审核超时时间（毫秒，fetch 内部 8s 超时） */
    timeoutMs: 8000,

    /** 云审核不可用时的用户提示 */
    unavailableMessage: '【系统】：名字审核暂时不可用，请稍后重试。',

    /** Mock 禁止词列表（仅 Mock 模式使用） */
    mockBlockWords: ['test_block', 'badword', 'forbidden'],
  },
};

// ========== 运行时开关控制 ==========

/** 设置安全模块开关 */
export function setSecurityEnabled(enabled) {
  SecurityConfig.enabled = Boolean(enabled);
}

/** 获取当前安全配置 */
export function getSecurityConfig() {
  return SecurityConfig;
}

/** 检查安全体系是否可用 */
export function isSecurityEnabled() {
  return SecurityConfig.enabled;
}

export default SecurityConfig;
