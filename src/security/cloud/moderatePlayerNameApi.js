// ============================================================
// 云审核客户端 - 统一入口（HTTP fetch 方案）
// 优先 HTTP 云函数 → 失败不进入游戏（fail-closed）
// Mock 仅配置明确开启时使用，默认必须走 HTTP 接口
// 不包含任何密钥，不引入腾讯云 TMS SDK / CloudBase Web SDK
// ============================================================

import SecurityConfig from '../securityConfig';
import securityLogger from '../securityLogger';

const MOCK_BLOCK_WORDS = SecurityConfig.cloudModeration.mockBlockWords;

// ========== Mock 审核（仅开发/离线模式使用）==========

function moderatePlayerNameMock(playerName) {
  return new Promise((resolve) => {
    const trimmed = String(playerName || '').trim();
    setTimeout(() => {
      const lowered = trimmed.toLowerCase();
      const matched = MOCK_BLOCK_WORDS.find(word => lowered.includes(word));
      if (matched) {
        console.log('[nameModeration] mock blocked, nameLength:', trimmed.length);
        securityLogger.warn('mock_moderation_blocked', { nameLength: trimmed.length, mode: 'mock' });
        resolve({ ok: false, action: 'block', message: '【系统】：这个名字不太合适，请换一个名字。' });
        return;
      }
      console.log('[nameModeration] mock passed, nameLength:', trimmed.length);
      securityLogger.info('mock_moderation_passed', { nameLength: trimmed.length, mode: 'mock' });
      resolve({ ok: true, action: 'pass' });
    }, SecurityConfig.cloudModeration.mockDelayMs);
  });
}

// ========== HTTP fetch 调用 ==========

/**
 * 通过 HTTP POST 调用 CloudBase 云函数
 * 使用 AbortController 8 秒超时
 * @param {string} playerName - 已被本地校验清理过的名字
 * @returns {Promise<{ ok: boolean, action: string, message?: string }>}
 */
async function moderatePlayerNameByCloud(playerName) {
  const cfg = SecurityConfig.cloudModeration;
  const trimmed = String(playerName || '').trim();
  const url = cfg.httpModerationUrl;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    console.log('[nameModeration] sending HTTP moderation request:', {
      url,
      nameLength: trimmed.length,
      hasName: trimmed.length > 0,
      body: JSON.stringify({ playerName: trimmed }).substring(0, 50),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: trimmed }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null);

    console.log('[nameModeration] HTTP moderation response:', {
      status: response.status,
      ok: result?.ok,
      action: result?.action,
    });

    if (!response.ok || !result) {
      return {
        ok: false,
        action: 'review',
        message: '【系统】：名字审核暂时不可用，请稍后重试。',
      };
    }

    securityLogger.info('http_moderation_result', {
      nameLength: trimmed.length,
      action: result.action,
      ok: result.ok,
      mode: 'http',
    });

    return {
      ok: result.ok === true,
      action: result.action || 'review',
      message: result.message,
    };
  } catch (error) {
    console.error('[nameModeration] HTTP moderation failed:', {
      message: error?.message,
      name: error?.name,
    });

    return {
      ok: false,
      action: 'review',
      message: '【系统】：名字审核暂时不可用，请稍后重试。',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ========== 统一入口 ==========

/**
 * 统一云审核入口
 * - mockEnabled=true → 本地 Mock（仅开发/离线）
 * - mockEnabled=false → HTTP POST 调用云函数（fail-closed）
 *
 * @param {string} playerName - 已被本地校验清理过的名字
 * @returns {Promise<{ ok: boolean, action: string, message?: string }>}
 */
async function moderatePlayerName(playerName) {
  const cfg = SecurityConfig.cloudModeration;
  if (!cfg.enabled) {
    return { ok: true, action: 'pass' };
  }

  // Mock 模式（仅配置明确开启时）
  if (cfg.mockEnabled) {
    console.log('[nameModeration] using MOCK mode');
    return moderatePlayerNameMock(playerName);
  }

  // HTTP 云函数调用 — fail-closed
  console.log('[nameModeration] local validation passed, calling HTTP moderation, nameLength:', String(playerName).length);
  return await moderatePlayerNameByCloud(playerName);
}

export {
  moderatePlayerName,
  moderatePlayerNameMock,
  moderatePlayerNameByCloud,
  MOCK_BLOCK_WORDS,
};
