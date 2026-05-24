// ============================================================
// CloudBase 客户端 - 懒加载单例
// 不包含任何密钥，仅使用环境 ID（非敏感信息）
// 提供统一 callFunction 接口封装
// ============================================================

import SecurityConfig from '../securityConfig';

let _appInstance = null;
let _initPromise = null;

/**
 * 获取 CloudBase 应用实例（懒加载单例）
 * 使用匿名登录，无需用户身份认证
 */
function getCloudBaseApp() {
  if (_appInstance) return _appInstance;

  if (!_initPromise) {
    _initPromise = _initCloudBase();
  }
  return _initPromise;
}

async function _initCloudBase() {
  const cfg = SecurityConfig.cloudModeration;
  // 动态导入 CloudBase SDK（减小初始包体积）
  const cloudbase = await import('@cloudbase/js-sdk');

  const app = cloudbase.default.init({
    env: cfg.envId,
  });

  // 匿名登录
  const auth = app.auth();
  try {
    await auth.anonymousAuthProvider().signIn();
    console.log('[CloudBase] 匿名登录成功');
  } catch (e) {
    // 匿名登录失败不阻塞流程（云函数可能配置为允许未登录访问）
    console.warn('[CloudBase] 匿名登录失败，尝试未认证调用:', e.message);
  }

  _appInstance = app;
  return app;
}

/**
 * 调用 CloudBase 云函数
 * @param {string} functionName - 云函数名称
 * @param {object} data - 传入参数
 * @param {number} timeoutMs - 超时时间（毫秒）
 * @returns {Promise<object>} 云函数返回结果
 */
async function callCloudFunction(functionName, data = {}, timeoutMs = 5000) {
  console.log('[CloudBase] callFunction starting:', functionName);

  const timeoutPromise = new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error('CloudBase call timeout')), timeoutMs);
  });

  const callPromise = (async () => {
    const app = await getCloudBaseApp();
    console.log('[CloudBase] calling function:', functionName);
    const result = await app.callFunction({
      name: functionName,
      data,
    });
    console.log('[CloudBase] function returned, result keys:', Object.keys(result.result || {}));
    return result.result;
  })();

  return Promise.race([callPromise, timeoutPromise]);
}

export { getCloudBaseApp, callCloudFunction };
