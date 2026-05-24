// ============================================================
// CloudBase 云函数：moderatePlayerName
// 环境 ID：wanshiwu-game-dev-d7dnulbc30e85d / 地域：ap-shanghai
//
// 兼容两种调用方式：
//   A. CloudBase 控制台原生调用：event.playerName 直接可用
//   B. HTTP 访问服务 POST：event.body 为 JSON 字符串或对象
// ============================================================

const crypto = require('crypto');

// ========== CORS headers ==========

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};

// ========== 工具函数 ==========

function hashName(name) {
  return crypto.createHash('sha256').update(String(name || '')).digest('hex').substring(0, 12);
}

function logSecurity(entry) {
  const logLine = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  if (process.env.SECURITY_LOG_ENABLED !== 'false') {
    console.log(`[Security] ${logLine}`);
  }
}

/** JSON 安全解析：如果是字符串则 parse，如果是对象则返回原对象 */
function safeJsonParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try { return JSON.parse(value); } catch (_e) { return null; }
}

/** 判断是否为 HTTP 访问服务调用 */
function isHttpEvent(event) {
  return !!(event && typeof event.httpMethod === 'string');
}

/**
 * 从 event 中提取 playerName — 极大兼容多种 CloudBase HTTP 入参格式
 */
function extractPlayerName(event) {
  if (!event) return '';

  // ----- 路径 1: event 顶层直接字段 -----
  const direct = event.playerName
    || (event.data && event.data.playerName)
    || (event.query && event.query.playerName)
    || (event.params && event.params.playerName)
    || (event.queryStringParameters && event.queryStringParameters.playerName);
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  // ----- 路径 2: 解析 event.body -----
  const body = event.body;
  if (body) {
    // 2a. body 是字符串 → JSON.parse
    if (typeof body === 'string') {
      const parsed = safeJsonParse(body);
      if (parsed) {
        const fromParsed = parsed.playerName
          || (parsed.data && parsed.data.playerName)
          || (parsed.body && safeJsonParse(parsed.body) && safeJsonParse(parsed.body).playerName);
        if (typeof fromParsed === 'string' && fromParsed.trim()) {
          return fromParsed.trim();
        }
      }
    }

    // 2b. body 已经是对象（CloudBase 有时会预解析 JSON）
    if (typeof body === 'object') {
      const fromObj = body.playerName
        || (body.data && body.data.playerName);
      if (typeof fromObj === 'string' && fromObj.trim()) {
        return fromObj.trim();
      }
    }
  }

  // ----- 路径 3: 遍历 event 顶层所有 key，尝试找到 playerName -----
  for (const key of Object.keys(event)) {
    const val = event[key];
    if (typeof val === 'string' && key.toLowerCase().includes('name')) {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
    }
    // 如果值是对象，尝试从中提取
    if (val && typeof val === 'object' && val.playerName && typeof val.playerName === 'string') {
      return val.playerName.trim();
    }
  }

  return '';
}

/** 构建标准 HTTP 响应 */
function httpResponse(statusCode, body) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

// ========== 本地基础校验 ==========

const LOCAL_AD_PATTERNS = [
  { regex: /https?:\/\//i, name: 'url_http' },
  { regex: /www\.[a-zA-Z0-9]/, name: 'url_www' },
  { regex: /\b[a-zA-Z0-9-]+\.(com|cn|net|org|cc|xyz|top|info|me|io|co)\b/i, name: 'domain' },
  { regex: /\b1[3-9]\d{9}\b/, name: 'phone_cn' },
  { regex: /\b[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}\b/, name: 'email' },
];

const MOCK_BLOCK_WORDS = ['test_block', 'badword', 'forbidden'];

function localValidate(playerName) {
  if (!playerName || playerName.length === 0) {
    return { ok: false, action: 'block', message: '【系统】：名字不能为空。' };
  }
  const charCount = [...playerName].length;
  if (charCount < 1 || charCount > 12) {
    return { ok: false, action: 'block', message: '【系统】：名字长度不符合要求。' };
  }
  if (/^\d+$/.test(playerName)) {
    return { ok: false, action: 'block', message: '【系统】：这个名字不太合适，请换一个名字。' };
  }
  for (const { regex } of LOCAL_AD_PATTERNS) {
    if (regex.test(playerName)) {
      return { ok: false, action: 'block', message: '【系统】：这个名字不太合适，请换一个名字。' };
    }
  }
  return null;
}

// ========== Mock 审核 ==========

function mockModerate(playerName) {
  const lowered = playerName.toLowerCase();
  const matched = MOCK_BLOCK_WORDS.find(word => lowered.includes(word));
  logSecurity({
    action: matched ? 'mock_block' : 'mock_pass',
    nameHash: hashName(playerName),
    nameLength: playerName.length,
    mode: 'mock',
  });
  if (matched) return { ok: false, action: 'block', message: '【系统】：这个名字不太合适，请换一个名字。' };
  return { ok: true, action: 'pass' };
}

// ========== 腾讯云 TMS 审核 ==========

let _tmsClient = null;

function getTmsClient() {
  if (_tmsClient) return _tmsClient;
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs-tms');
    const TmsClient = tencentcloud.tms.v20201229.Client;
    const secretId = process.env.TC_SECRET_ID;
    const secretKey = process.env.TC_SECRET_KEY;
    const region = process.env.TC_REGION || 'ap-guangzhou';
    console.log('[moderatePlayerName] TMS credential check:', JSON.stringify({
      hasSecretId: Boolean(secretId), hasSecretKey: Boolean(secretKey), region,
      tmsEnabled: process.env.TMS_ENABLED, mockEnabled: process.env.SECURITY_CLOUD_MOCK,
    }));
    if (!secretId || !secretKey) throw new Error('TMS credentials not configured');
    _tmsClient = new TmsClient({
      credential: { secretId, secretKey }, region,
      profile: { httpProfile: { endpoint: 'tms.tencentcloudapi.com' } },
    });
    return _tmsClient;
  } catch (e) {
    console.error('[moderatePlayerName] TMS client init failed:', e.message);
    return null;
  }
}

async function tmsModerate(playerName) {
  const client = getTmsClient();
  if (!client) {
    const isMockFallback = process.env.SECURITY_CLOUD_MOCK === 'true';
    if (isMockFallback) {
      logSecurity({ action: 'tms_fallback_mock', nameHash: hashName(playerName), nameLength: playerName.length, reason: 'tms_client_unavailable' });
      return mockModerate(playerName);
    }
    return { ok: false, action: 'review', message: '【系统】：名字审核暂时不可用，请稍后重试。' };
  }
  try {
    const response = await client.TextModeration({
      Content: Buffer.from(playerName).toString('base64'),
      BizType: process.env.TMS_BIZ_TYPE || '',
    });
    logSecurity({ action: 'tms_called', nameHash: hashName(playerName), nameLength: playerName.length, suggestion: response.Suggestion, label: response.Label || '', mode: 'tms' });
    if (response.Suggestion === 'Pass') return { ok: true, action: 'pass' };
    if (response.Suggestion === 'Block') return { ok: false, action: 'block', message: '【系统】：这个名字不太合适，请换一个名字。' };
    return { ok: false, action: 'review', message: '【系统】：这个名字不太合适，请换一个名字。' };
  } catch (error) {
    console.error('[moderatePlayerName] TMS API call failed:', error.message);
    const isMockFallback = process.env.SECURITY_CLOUD_MOCK === 'true';
    if (isMockFallback) {
      logSecurity({ action: 'tms_error_fallback_mock', nameHash: hashName(playerName), error: error.message });
      return mockModerate(playerName);
    }
    return { ok: false, action: 'review', message: '【系统】：名字审核暂时不可用，请稍后重试。' };
  }
}

// ========== 核心审核逻辑 ==========

async function doModerate(playerName, userId) {
  const localResult = localValidate(playerName);
  if (localResult) {
    logSecurity({ action: 'local_block', nameHash: hashName(playerName), nameLength: playerName.length, userId: userId || undefined });
    return localResult;
  }
  const useMock = process.env.SECURITY_CLOUD_MOCK === 'true';
  const useTms = process.env.TMS_ENABLED === 'true';
  if (useTms && !useMock) return await tmsModerate(playerName);
  return mockModerate(playerName);
}

// ========== 云函数入口 ==========

exports.main = async (event, context) => {
  // CORS 预检
  if (isHttpEvent(event) && event.httpMethod === 'OPTIONS') {
    return httpResponse(204, {});
  }

  const playerName = extractPlayerName(event);

  // 诊断日志：打印 event 结构（不打印敏感内容）
  console.log('[moderatePlayerName] event debug:', JSON.stringify({
    eventKeys: Object.keys(event || {}),
    hasBody: Boolean(event && event.body),
    bodyType: typeof (event && event.body),
    bodyLength: (event && typeof event.body === 'string') ? event.body.length : 'N/A',
    bodyKeys: (event && event.body && typeof event.body === 'object' && !Array.isArray(event.body)) ? Object.keys(event.body) : 'N/A',
    hasQueryStringParameters: Boolean(event && event.queryStringParameters),
    hasData: Boolean(event && event.data),
    hasHttpMethod: Boolean(event && event.httpMethod),
    httpMethod: event && event.httpMethod,
    extractedNameLength: playerName.length,
  }));

  const userId = isHttpEvent(event) ? '' : (event?.userId || '');
  const result = await doModerate(playerName, userId);

  if (isHttpEvent(event)) return httpResponse(200, result);
  return result;
};
