// BGM 管理器 - 统一管理背景音乐播放
// 与 SFX 分离，不干扰已有音效系统
// 支持淡入淡出、循环播放、场景切换

import { BGM_CONFIG, BGM_DEFAULT_VOLUME, BGM_FADE_DURATION, BGM_STORAGE_KEY } from '../data/bgmConfig.js';

class BgmManager {
  constructor() {
    // 当前播放的音频对象
    this._currentAudio = null;

    // 当前播放的 BGM key
    this._currentKey = null;
    this._targetKey = null;

    // 目标音量 (0-1)
    this._volume = BGM_DEFAULT_VOLUME;

    // 静音状态
    this._muted = false;

    // 是否正在进行淡入淡出
    this._fading = false;
    this._fadeTimer = null;

    // 用户是否已交互（浏览器自动播放限制）
    this._userInteracted = false;

    // 从 localStorage 恢复设置
    this._loadSettings();

    // 标记音频加载失败过的 key，避免重复 warning
    this._loadWarnings = {};
  }

  // ========== 播放控制 ==========

  /**
   * 播放指定 BGM。如果已有 BGM 在播放，自动切换（淡出旧 + 淡入新）。
   * @param {string} key - bgmConfig 中的键名，如 'mainMenu'、'shop'
   */
  play(key) {
    if (!key) return;

    if (this._currentKey === key && this._currentAudio) {
      if (this._currentAudio.paused && !this._muted) {
        this._currentAudio.play().catch(() => {});
      }
      return; // 同一首不重复加载或重置进度
    }

    if (this._targetKey === key) {
      return;
    }

    const path = BGM_CONFIG[key];
    if (!path) {
      if (!this._loadWarnings[key]) {
        this._loadWarnings[key] = true;
        console.warn(`[BgmManager] BGM 键名未定义: "${key}"`);
      }
      return;
    }

    this._targetKey = key;

    // 停止旧 BGM（带淡出）
    this._fadeOutAndStop(() => {
      if (this._targetKey !== key) return;
      this._startNewBgm(key, path);
    });
  }

  /** 停止当前 BGM */
  stop() {
    this._fadeOutAndStop();
  }

  /** 暂停当前 BGM（保留位置） */
  pause() {
    if (this._currentAudio && !this._currentAudio.paused) {
      this._currentAudio.pause();
    }
  }

  /** 恢复播放 */
  resume() {
    if (this._muted) return;
    if (this._currentAudio && this._currentAudio.paused) {
      this._currentAudio.play().catch(() => {});
    }
  }

  /** 切换 BGM（play 的别名，自动处理淡出淡入） */
  switchTo(key) {
    this.play(key);
  }

  getBgmKeyBySceneAndTime(scene, gameTime = {}) {
    if (scene === 'mainMenu') return 'mainMenu';
    if (scene === 'opening') return 'mainMenu';

    if (scene === 'shopMain') {
      const hour = Number.isFinite(gameTime.hour)
        ? gameTime.hour
        : Number.isFinite(gameTime.currentHour)
          ? gameTime.currentHour
          : 8;
      return hour >= 6 && hour < 19 ? 'shopDay' : 'shopNight';
    }

    return null;
  }

  syncBySceneAndTime(scene, gameTime) {
    const key = this.getBgmKeyBySceneAndTime(scene, gameTime);
    if (key) this.play(key);
    return key;
  }

  // ========== 音量控制 ==========

  /** 设置音量 (0-1) */
  setVolume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this._currentAudio && !this._fading) {
      this._currentAudio.volume = this._muted ? 0 : this._volume;
    }
    this._saveSettings();
  }

  getVolume() {
    return this._volume;
  }

  /** 静音 */
  mute() {
    this._muted = true;
    if (this._currentAudio) {
      this._currentAudio.volume = 0;
    }
    this._saveSettings();
  }

  /** 取消静音 */
  unmute() {
    this._muted = false;
    if (this._currentAudio && !this._fading) {
      this._currentAudio.volume = this._volume;
    }
    this._saveSettings();
  }

  toggleMute() {
    if (this._muted) this.unmute();
    else this.mute();
  }

  isMuted() {
    return this._muted;
  }

  /** 标记用户已交互（绕过浏览器自动播放限制） */
  markUserInteracted() {
    this._userInteracted = true;
    if (this._currentAudio && this._currentAudio.paused && !this._muted) {
      this._currentAudio.play().catch(() => {});
    }
  }

  // ========== 内部方法 ==========

  /**
   * 加载并播放新的 BGM
   */
  _startNewBgm(key, path) {
    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = 0; // 从 0 开始淡入
    audio.preload = 'auto';

    // 加载失败处理
    audio.addEventListener('error', () => {
      if (!this._loadWarnings[key]) {
        this._loadWarnings[key] = true;
        console.warn(`[BgmManager] BGM 文件加载失败: "${path}"`);
      }
    });

    this._currentAudio = audio;
    this._currentKey = key;
    this._targetKey = null;

    // 尝试播放
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // 浏览器自动播放限制——等用户交互后再排播
      });
    }

    // 淡入
    this._fadeTo(this._muted ? 0 : this._volume);
  }

  /**
   * 淡出当前 BGM 并停止
   */
  _fadeOutAndStop(callback) {
    const audio = this._currentAudio;
    if (!audio) {
      this._currentKey = null;
      callback?.();
      return;
    }

    this._clearFadeTimer();

    const startVolume = audio.volume;
    const duration = BGM_FADE_DURATION;
    const interval = 30;
    const steps = Math.max(1, Math.ceil(duration / interval));
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    this._fading = true;

    this._fadeTimer = setInterval(() => {
      currentStep++;
      const newVol = Math.max(0, startVolume - volumeStep * currentStep);
      audio.volume = newVol;

      if (currentStep >= steps) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        audio.pause();
        audio.src = '';
        if (this._currentAudio === audio) {
          this._currentAudio = null;
          this._currentKey = null;
        }
        this._fading = false;
        callback?.();
      }
    }, interval);
  }

  /**
   * 淡入到目标音量
   */
  _fadeTo(targetVolume) {
    const audio = this._currentAudio;
    if (!audio) return;

    this._clearFadeTimer();

    const startVolume = audio.volume;
    const duration = BGM_FADE_DURATION;
    const interval = 30;
    const steps = Math.max(1, Math.ceil(duration / interval));
    const delta = targetVolume - startVolume;
    const volumeStep = delta / steps;
    let currentStep = 0;

    this._fading = true;

    this._fadeTimer = setInterval(() => {
      currentStep++;
      const newVol = startVolume + volumeStep * currentStep;
      audio.volume = Math.max(0, Math.min(1, newVol));

      if (currentStep >= steps) {
        clearInterval(this._fadeTimer);
        this._fadeTimer = null;
        audio.volume = targetVolume;
        this._fading = false;
      }
    }, interval);
  }

  _clearFadeTimer() {
    if (this._fadeTimer) {
      clearInterval(this._fadeTimer);
      this._fadeTimer = null;
    }
    this._fading = false;
  }

  // ========== 持久化 ==========

  _loadSettings() {
    try {
      const raw = window.localStorage.getItem(BGM_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.volume === 'number') {
          this._volume = Math.max(0, Math.min(1, data.volume));
        }
        if (typeof data.muted === 'boolean') {
          this._muted = data.muted;
        }
      }
    } catch (_e) {
      // 使用默认值
    }
  }

  _saveSettings() {
    try {
      window.localStorage.setItem(BGM_STORAGE_KEY, JSON.stringify({
        volume: this._volume,
        muted: this._muted,
      }));
    } catch (_e) {
      // localStorage 不可用
    }
  }
}

// 全局单例
let instance = null;

export function getBgmManager() {
  if (!instance) {
    instance = new BgmManager();
  }
  return instance;
}

export default BgmManager;
