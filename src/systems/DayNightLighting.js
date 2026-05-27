// 昼夜光照计算模块
// 根据游戏内时间（hour + minute/60）计算平滑过渡的昼夜光照参数
//
// 调试：在控制台调用 window.__debugSetGameTime(hour, minute) 设置游戏时间
// 例如: window.__debugSetGameTime(3, 30) — 设置为凌晨 3:30

/**
 * 关键时间节点的光照参数定义
 * time: 小数小时 (0~24)
 * overlayColor: 覆盖层颜色 (Phaser 整数色值)
 * overlayAlpha: 覆盖层透明度 (0~1)
 * warmth: 暖色调强度 (0~1, 叠加金色/橙色)
 * brightness: 整体亮度倍率 (0~1, 1=不变暗)
 */
const LIGHTING_KEYFRAMES = [
  // 凌晨 0:00 — 深夜最暗
  { time: 0,  overlayColor: 0x0a0a1e, overlayAlpha: 0.52, warmth: 0.0, brightness: 0.60 },
  // 凌晨 3:00 — 深夜，但比 0 点稍亮一点点
  { time: 3,  overlayColor: 0x0d0d24, overlayAlpha: 0.48, warmth: 0.0, brightness: 0.62 },
  // 早上 6:00 — 黎明，开始变亮，带冷色调
  { time: 6,  overlayColor: 0x1a1a3a, overlayAlpha: 0.28, warmth: 0.05, brightness: 0.78 },
  // 早上 8:00 — 早晨，渐渐变暖
  { time: 8,  overlayColor: 0x2a2a2a, overlayAlpha: 0.12, warmth: 0.15, brightness: 0.92 },
  // 中午 12:00 — 一天最亮，无需遮罩
  { time: 12, overlayColor: 0x000000, overlayAlpha: 0.0,  warmth: 0.10, brightness: 1.0 },
  // 下午 16:00 — 开始偏暖黄昏
  { time: 16, overlayColor: 0x1a1208, overlayAlpha: 0.08, warmth: 0.35, brightness: 0.94 },
  // 傍晚 18:00 — 明显黄昏
  { time: 18, overlayColor: 0x3a2010, overlayAlpha: 0.18, warmth: 0.55, brightness: 0.84 },
  // 晚上 19:30 — 入夜
  { time: 19.5, overlayColor: 0x18182e, overlayAlpha: 0.28, warmth: 0.20, brightness: 0.74 },
  // 晚上 21:00 — 夜晚
  { time: 21, overlayColor: 0x111128, overlayAlpha: 0.38, warmth: 0.05, brightness: 0.66 },
  // 晚上 23:00 — 深夜
  { time: 23, overlayColor: 0x0c0c20, overlayAlpha: 0.48, warmth: 0.0, brightness: 0.62 },
  // 凌晨 24:00 (= 0:00)
  { time: 24, overlayColor: 0x0a0a1e, overlayAlpha: 0.52, warmth: 0.0, brightness: 0.60 },
];

/**
 * 线性插值
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 在颜色分量级别进行插值
 * Phaser 颜色是 0xRRGGBB 格式
 */
function lerpColor(colorA, colorB, t) {
  const r1 = (colorA >> 16) & 0xff;
  const g1 = (colorA >> 8) & 0xff;
  const b1 = colorA & 0xff;
  const r2 = (colorB >> 16) & 0xff;
  const g2 = (colorB >> 8) & 0xff;
  const b2 = colorB & 0xff;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

/**
 * 根据游戏内时间计算当前光照参数
 * @param {number} hour - 当前小时 (0-23)
 * @param {number} minute - 当前分钟 (0-59)
 * @returns {{ overlayColor: number, overlayAlpha: number, warmth: number, brightness: number }}
 */
export function calculateLightingByTime(hour, minute = 0) {
  const fractional = hour + minute / 60;

  // 找到当前时间所处的两个关键帧之间
  const keyframes = LIGHTING_KEYFRAMES;
  let lower = keyframes[0];
  let upper = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (fractional >= keyframes[i].time && fractional <= keyframes[i + 1].time) {
      lower = keyframes[i];
      upper = keyframes[i + 1];
      break;
    }
  }

  const range = upper.time - lower.time;
  const t = range === 0 ? 0 : (fractional - lower.time) / range;

  return {
    overlayColor: lerpColor(lower.overlayColor, upper.overlayColor, t),
    overlayAlpha: lerp(lower.overlayAlpha, upper.overlayAlpha, t),
    warmth: lerp(lower.warmth, upper.warmth, t),
    brightness: lerp(lower.brightness, upper.brightness, t),
  };
}

/**
 * 获取当前时间段标签（用于 UI 显示）
 */
export function getDayPhaseLabel(hour) {
  if (hour >= 0 && hour < 6) return '凌晨';
  if (hour >= 6 && hour < 8) return '清晨';
  if (hour >= 8 && hour < 12) return '上午';
  if (hour >= 12 && hour < 16) return '下午';
  if (hour >= 16 && hour < 19) return '傍晚';
  if (hour >= 19 && hour < 22) return '夜晚';
  return '深夜';
}

// ========== 调试辅助 ==========
// 在控制台调用: window.__debugSetGameTime(18, 30) 设置为傍晚 18:30
// 调用: window.__debugGetLighting() 查看当前光照参数
if (typeof window !== 'undefined') {
  window.__debugSetGameTime = (hour, minute) => {
    const tm = window.gameState?.timeData;
    if (!tm) {
      console.warn('[DebugLighting] 请先进入游戏主界面');
      return;
    }
    tm.currentHour = hour;
    tm.currentMinute = minute || 0;
    console.log(`[DebugLighting] 游戏时间已设置为 ${hour}:${String(minute || 0).padStart(2, '0')}`);
    console.log('[DebugLighting] 当前光照:', calculateLightingByTime(hour, minute));
  };

  window.__debugGetLighting = () => {
    const tm = window.gameState?.timeData;
    if (!tm) {
      console.warn('[DebugLighting] 请先进入游戏主界面');
      return null;
    }
    const lighting = calculateLightingByTime(tm.currentHour, tm.currentMinute);
    console.log(`[DebugLighting] 时间: ${tm.currentHour}:${String(tm.currentMinute).padStart(2, '0')}`);
    console.log('[DebugLighting] 光照参数:', lighting);
    return lighting;
  };
}
