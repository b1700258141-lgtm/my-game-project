// 统一 SFX 音效管理器
// 所有音效播放必须通过本模块调用，不分散在各组件中
// 本次只做 SFX，不做 BGM

import { SFX_CONFIG, SFX_COOLDOWN_MS, SFX_DEFAULT_VOLUME, SFX_STORAGE_KEY } from '../data/sfxConfig.js';

class SfxManager {
  constructor() {
    // 音效缓存池：key → Audio 对象
    this._cache = {};

    // 循环音效追踪：key → Audio 对象
    this._loops = {};

    // 冷却追踪：key → 上次播放时间戳
    this._lastPlayTime = {};

    // 音量 (0-1)
    this._volume = SFX_DEFAULT_VOLUME;

    // 静音状态
    this._muted = false;

    // 从 localStorage 恢复设置
    this._loadSettings();

    // 标记是否已打印过首次加载提示
    this._firstLoadMessages = {};
  }

  // ========== 基础播放 ==========

  /**
   * 播放一次性音效
   * @param {string} key - 音效键名（支持点号嵌套如 'ui.clickButton'）
   * @param {object} [options]
   * @param {number} [options.volume] - 音量倍率 (0-1)，会与全局音量相乘
   */
  play(key, options = {}) {
    if (this._muted) return;

    const path = this._resolvePath(key);
    if (!path) {
      this._warnOnce(key, '音效键名未在配置表中定义');
      return;
    }

    // 冷却检查（防止高频按钮连击爆音）
    const cooldown = SFX_COOLDOWN_MS[key.split('.').pop()] || SFX_COOLDOWN_MS[key] || 0;
    if (cooldown > 0) {
      const now = Date.now();
      const last = this._lastPlayTime[key] || 0;
      if (now - last < cooldown) return;
      this._lastPlayTime[key] = now;
    }

    // 从缓存池获取或创建 Audio 对象
    let audio = this._cache[key];
    if (!audio) {
      audio = new Audio(path);
      audio.preload = 'auto';
      this._cache[key] = audio;
    }

    const volumeMultiplier = options.volume ?? 1;
    audio.volume = Math.min(1, this._volume * volumeMultiplier);
    audio.currentTime = 0;
    audio.play().catch((_err) => {
      // 文件不存在或浏览器限制时不崩溃，仅静默
    });
  }

  // ========== 循环音效 ==========

  /**
   * 播放可停止的循环音效
   * @param {string} key - 音效键名
   * @param {object} [options]
   * @param {number} [options.volume]
   */
  startLoop(key, options = {}) {
    if (this._muted) return;

    // 如果已经在播放同名循环，先停止旧的
    this.stopLoop(key);

    const path = this._resolvePath(key);
    if (!path) {
      this._warnOnce(key, '循环音效键名未定义');
      return;
    }

    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = Math.min(1, this._volume * (options.volume ?? 1));
    this._loops[key] = audio;

    audio.play().catch((_err) => {
      delete this._loops[key];
    });
  }

  /**
   * 停止指定循环音效
   * @param {string} key
   */
  stopLoop(key) {
    const audio = this._loops[key];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      delete this._loops[key];
    }
  }

  /**
   * 停止所有循环音效（切换场景、关闭 UI 时调用）
   */
  stopAllLoops() {
    for (const key of Object.keys(this._loops)) {
      this.stopLoop(key);
    }
  }

  // ========== 音量控制 ==========

  /** 设置全局音量 (0-1) */
  setVolume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    this._applyVolumeToAll();
    this._saveSettings();
  }

  getVolume() {
    return this._volume;
  }

  /** 静音 */
  mute() {
    this._muted = true;
    this.stopAllLoops();
    this._saveSettings();
  }

  /** 取消静音 */
  unmute() {
    this._muted = false;
    this._saveSettings();
  }

  toggleMute() {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  isMuted() {
    return this._muted;
  }

  // ========== 便利方法：UI ==========

  /** 点击普通按钮 */
  clickButton() { this.play('ui.clickButton'); }

  /** 确认操作 */
  confirm() { this.play('ui.confirm'); }

  /** 取消操作 */
  cancel() { this.play('ui.cancel'); }

  /** 错误提示 */
  error() { this.play('ui.error'); }

  /** 打开菜单/面板 */
  openMenu() { this.play('ui.openMenu'); }

  /** 关闭菜单/面板 */
  closeMenu() { this.play('ui.closeMenu'); }

  // ========== 便利方法：物品 ==========

  /** 购买成功 */
  buySuccess() { this.play('item.buyItem'); }

  /** 购买失败（资金不足等） */
  buyFail() { this.play('item.buyFail'); }

  /** 获得物品 */
  receiveItem() { this.play('item.receiveItem'); }

  /** 提交物品 */
  submitItem() { this.play('item.submitItem'); }

  /** 选择物品 */
  selectItem() { this.play('item.selectItem'); }

  // ========== 便利方法：委托 ==========

  /** 接受委托 */
  questAccept() { this.play('quest.questAccept'); }

  /** 委托完成 */
  questComplete() { this.play('quest.questComplete'); }

  /** 获得奖励 */
  reward() { this.play('quest.reward'); }

  // ========== 便利方法：炼金 ==========

  /** 打开炼金界面 */
  openAlchemy() { this.play('alchemy.openAlchemy'); }

  /** 放入材料 */
  addMaterial() { this.play('alchemy.addMaterial'); }

  /** 移除材料 */
  removeMaterial() { this.play('alchemy.removeMaterial'); }

  /** 开始炼金 */
  alchemyStart() { this.play('alchemy.alchemyStart'); }

  /** 炼金进行中循环 */
  startAlchemyLoop() { this.startLoop('alchemy.alchemyLoop', { volume: 0.5 }); }
  stopAlchemyLoop() { this.stopLoop('alchemy.alchemyLoop'); }

  /** 炼金成功 */
  alchemySuccess() {
    this.stopAlchemyLoop();
    this.play('alchemy.alchemySuccess');
  }

  /** 炼金失败 */
  alchemyFail() {
    this.stopAlchemyLoop();
    this.play('alchemy.alchemyFail');
  }

  /** 高品质额外提示 */
  highQualityResult() { this.play('alchemy.highQualityResult'); }

  // ========== 便利方法：剧情 ==========

  /** 发现线索 */
  clueFound() { this.play('story.clueFound'); }

  /** 触发精魂记忆 */
  memoryTrigger() { this.play('story.memoryTrigger'); }

  /** 获得关键物品 */
  keyItemGet() { this.play('story.keyItemGet'); }

  // ========== 内部方法 ==========

  /**
   * 根据点号路径解析音频文件 URL
   * @param {string} key - 如 'ui.clickButton'
   * @returns {string|null}
   */
  _resolvePath(key) {
    const parts = key.split('.');
    let node = SFX_CONFIG;
    for (const part of parts) {
      if (node && typeof node === 'object' && part in node) {
        node = node[part];
      } else {
        return null;
      }
    }
    return typeof node === 'string' ? node : null;
  }

  /**
   * 更新所有缓存 Audio 和循环 Audio 的音量
   */
  _applyVolumeToAll() {
    Object.values(this._cache).forEach(audio => {
      audio.volume = this._volume;
    });
    Object.values(this._loops).forEach(audio => {
      audio.volume = this._volume;
    });
  }

  /**
   * 从 localStorage 加载音效设置
   */
  _loadSettings() {
    try {
      const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
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
      // localStorage 不可用或数据损坏，使用默认值
    }
  }

  /**
   * 保存音效设置到 localStorage
   */
  _saveSettings() {
    try {
      window.localStorage.setItem(SFX_STORAGE_KEY, JSON.stringify({
        volume: this._volume,
        muted: this._muted,
      }));
    } catch (_e) {
      // localStorage 不可用
    }
  }

  /**
   * 首次打印一次性警告（不重复刷屏）
   * @param {string} key
   * @param {string} msg
   */
  _warnOnce(key, msg) {
    if (!this._firstLoadMessages[key]) {
      this._firstLoadMessages[key] = true;
      console.warn(`[SfxManager] ${msg}: "${key}"`);
    }
  }
}

// 全局单例
let instance = null;

export function getSfxManager() {
  if (!instance) {
    instance = new SfxManager();
  }
  return instance;
}

export default SfxManager;
