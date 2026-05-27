// 游戏时间管理器 - 统一管理游戏内时间流逝
// 现实 1 分钟 = 游戏内 1 小时
// 现实 1 秒 = 游戏内 1 分钟

import { GAME_STATE } from './GameState';

class TimeManager {
  constructor(gameState) {
    this.gameState = gameState;

    // 游戏时间数据
    const savedTime = gameState?.timeData || {};
    this.currentDay = savedTime.currentDay || gameState?.day || 1;
    this.currentHour = savedTime.currentHour ?? 8;
    this.currentMinute = savedTime.currentMinute ?? 0;

    // 时间比例：现实1秒 = 游戏1分钟
    // 累积器：用毫秒累积，避免浮点误差
    this.accumulatedMs = 0;

    // 每 1000 现实毫秒 = 1 游戏分钟
    this.msPerGameMinute = 1000;

    // 是否暂停
    this.isTimePaused = false;

    // 上一次更新的现实时间戳
    this._lastRealTime = null;

    // 新一天回调列表
    this._onNewDayCallbacks = [];
    this._onTimeChangedCallbacks = [];
  }

  // ========== 核心更新 ==========

  // 每帧调用，delta 为现实毫秒
  update(deltaMs) {
    if (this.isTimePaused) {
      this._lastRealTime = null;
      return;
    }

    if (!this._lastRealTime) {
      this._lastRealTime = Date.now();
      return;
    }

    // 只在 normal 状态下流逝时间
    const currentState = this.gameState.getGameState();
    if (currentState !== GAME_STATE.NORMAL) {
      this._lastRealTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsed = now - this._lastRealTime;
    this._lastRealTime = now;

    this.accumulatedMs += elapsed;

    // 每 1000 现实毫秒 = 1 游戏分钟
    while (this.accumulatedMs >= this.msPerGameMinute) {
      this.accumulatedMs -= this.msPerGameMinute;
      this._advanceOneMinute();
    }
  }

  _advanceOneMinute() {
    const previousTime = this.getTimeData();
    this.currentMinute += 1;
    let advancedToNewDay = false;

    if (this.currentMinute >= 60) {
      this.currentMinute = 0;
      this.currentHour += 1;

      if (this.currentHour >= 24) {
        this.currentHour = 0;
        this.currentDay += 1;
        advancedToNewDay = true;
      }
    }

    // 同步到 GameState
    this._syncToGameState();
    this._triggerTimeChanged(previousTime);

    if (advancedToNewDay) {
      this._triggerNewDay();
    }
  }

  // ========== 跳过时间（睡觉等） ==========

  advanceGameTime(hours) {
    const totalMinutes = hours * 60;
    const oldDay = this.currentDay;
    const previousTime = this.getTimeData();

    this.currentMinute += totalMinutes;

    while (this.currentMinute >= 60) {
      this.currentMinute -= 60;
      this.currentHour += 1;
    }

    while (this.currentHour >= 24) {
      this.currentHour -= 24;
      this.currentDay += 1;
    }

    this._syncToGameState();
    this._triggerTimeChanged(previousTime);

    // 如果跨天了，触发新一天逻辑
    if (this.currentDay > oldDay) {
      const daysAdvanced = this.currentDay - oldDay;
      for (let i = 0; i < daysAdvanced; i++) {
        this._triggerNewDay();
      }
    }
  }

  // ========== 新一天逻辑 ==========

  _triggerNewDay() {
    // 通知所有注册的回调
    this._onNewDayCallbacks.forEach(cb => {
      try {
        cb(this.currentDay);
      } catch (e) {
        console.warn('[TimeManager] onNewDay callback error:', e);
      }
    });
  }

  onNewDay(callback) {
    this._onNewDayCallbacks.push(callback);
    return () => {
      this._onNewDayCallbacks = this._onNewDayCallbacks.filter(cb => cb !== callback);
    };
  }

  _triggerTimeChanged(previousTime = null) {
    const time = this.getTimeData();
    this._onTimeChangedCallbacks.forEach(cb => {
      try {
        cb(time, previousTime);
      } catch (e) {
        console.warn('[TimeManager] onTimeChanged callback error:', e);
      }
    });
  }

  onTimeChanged(callback) {
    this._onTimeChangedCallbacks.push(callback);
    return () => {
      this._onTimeChangedCallbacks = this._onTimeChangedCallbacks.filter(cb => cb !== callback);
    };
  }

  // ========== 同步到 GameState ==========

  _syncToGameState() {
    if (this.gameState) {
      this.gameState.day = this.currentDay;
      this.gameState.timeData = {
        currentDay: this.currentDay,
        currentHour: this.currentHour,
        currentMinute: this.currentMinute
      };
    }
  }

  // ========== 查询方法 ==========

  getTimeString() {
    const h = String(this.currentHour).padStart(2, '0');
    const m = String(this.currentMinute).padStart(2, '0');
    return `第 ${this.currentDay} 天 ${h}:${m}`;
  }

  getTimeData() {
    return {
      currentDay: this.currentDay,
      currentHour: this.currentHour,
      currentMinute: this.currentMinute,
      day: this.currentDay,
      hour: this.currentHour,
      minute: this.currentMinute
    };
  }

  getDayPhase() {
    if (this.currentHour >= 6 && this.currentHour < 18) {
      return 'day';
    }
    if (this.currentHour >= 18 && this.currentHour < 22) {
      return 'evening';
    }
    return 'night';
  }

  getDayPhaseLabel() {
    const phase = this.getDayPhase();
    const labels = {
      day: '白天',
      evening: '傍晚',
      night: '夜晚'
    };
    return labels[phase] || phase;
  }

  // 获取昼夜遮罩参数
  getDayNightOverlay() {
    const phase = this.getDayPhase();
    switch (phase) {
      case 'day':
        return { color: 0x000000, alpha: 0 };
      case 'evening':
        return { color: 0xd08770, alpha: 0.15 };
      case 'night':
        return { color: 0x1a1a2e, alpha: 0.4 };
      default:
        return { color: 0x000000, alpha: 0 };
    }
  }

  // ========== 暂停控制 ==========

  pause() {
    this.isTimePaused = true;
  }

  resume() {
    this.isTimePaused = false;
    this._lastRealTime = Date.now();
    this.accumulatedMs = 0;
  }

  // 根据游戏状态自动暂停/恢复
  updatePauseByState(state) {
    const pausedStates = [
      GAME_STATE.DIALOGUE,
      GAME_STATE.INVENTORY,
      GAME_STATE.QUEST_LIST,
      GAME_STATE.REWARD_POPUP,
      GAME_STATE.ALCHEMY,
      GAME_STATE.DAILY_SUMMARY,
      GAME_STATE.FURNITURE_UPGRADE,
      GAME_STATE.SPIRIT_ARCHIVE,
      GAME_STATE.BOOKSHELF_ARCHIVE,
      GAME_STATE.SLEEP_CHOICE,
      GAME_STATE.LOCATION_CHOICE,
      GAME_STATE.SHOP,
      GAME_STATE.SAVE_LOAD,
      GAME_STATE.NAME_INPUT,
      GAME_STATE.TRANSITION
    ];

    const shouldPause = pausedStates.includes(state);

    if (shouldPause && !this.isTimePaused) {
      this.pause();
    } else if (!shouldPause && this.isTimePaused) {
      this.resume();
    }
  }

  // ========== 重置 ==========

  reset() {
    this.currentDay = 1;
    this.currentHour = 8;
    this.currentMinute = 0;
    this.accumulatedMs = 0;
    this._lastRealTime = null;
    this.isTimePaused = false;
    this._syncToGameState();
  }
}

// 创建全局单例
let _instance = null;

export function getTimeManager(gameState) {
  if (!_instance && gameState) {
    _instance = new TimeManager(gameState);
  }
  return _instance;
}

export function resetTimeManager() {
  if (_instance) {
    _instance.reset();
  }
  _instance = null;
}

export default TimeManager;
