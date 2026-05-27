import { GAME_STATE } from './GameState';
import { sanitizeSaveData } from '../security/dataValidator';
import { normalizeTutorialFlags } from './TutorialManager';

const SAVE_VERSION = '0.1.0';
const SAVE_SLOT_COUNT = 30;
const STORAGE_KEY_PREFIX = 'oddjobs_alchemy_save_slot_';
export const SAVE_TYPE = {
  MANUAL: 'manual',
  AUTO: 'auto'
};

function clone(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return fallback;
  }
}

function slotKey(slotIndex) {
  return `${STORAGE_KEY_PREFIX}${String(slotIndex).padStart(2, '0')}`;
}

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeArchiveData(archiveData = {}) {
  return {
    materials: archiveData.materials || {},
    products: archiveData.products || {},
    completedQuests: archiveData.completedQuests || {},
    spiritMemories: archiveData.spiritMemories || {},
    keyItems: archiveData.keyItems || {},
    achievements: archiveData.achievements || {}
  };
}

export default class SaveLoadManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.saveVersion = SAVE_VERSION;
    this.slotCount = SAVE_SLOT_COUNT;
  }

  getAllSaveSlots() {
    return Array.from({ length: this.slotCount }, (_item, index) => {
      const slotIndex = index + 1;
      const saveData = this.getSaveSlot(slotIndex);
      return {
        slotIndex,
        hasSave: Boolean(saveData),
        saveData
      };
    });
  }

  getSaveSlot(slotIndex) {
    if (!this.isValidSlot(slotIndex) || !window.localStorage) return null;

    const raw = window.localStorage.getItem(slotKey(slotIndex));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      return this.normalizeSaveData(parsed, slotIndex);
    } catch (error) {
      console.warn(`[SaveLoadManager] 存档位 ${slotIndex} 读取失败`, error);
      return null;
    }
  }

  hasSave(slotIndex) {
    return Boolean(this.getSaveSlot(slotIndex));
  }

  saveGame(slotIndex, options = {}) {
    if (!this.isValidSlot(slotIndex) || !window.localStorage) {
      return { success: false, message: '存档失败' };
    }

    try {
      const saveData = this.buildSaveData(slotIndex, {
        saveType: options.saveType || SAVE_TYPE.MANUAL,
        autoSaveReason: options.autoSaveReason || ''
      });
      window.localStorage.setItem(slotKey(slotIndex), JSON.stringify(saveData));
      return { success: true, message: '存档成功', saveData };
    } catch (error) {
      console.warn(`[SaveLoadManager] 存档位 ${slotIndex} 保存失败`, error);
      return { success: false, message: '存档失败' };
    }
  }

  autoSave(reason = 'auto') {
    if (!window.localStorage || !this.canAutoSave()) {
      return { success: false, message: '自动存档跳过' };
    }

    const slotIndex = this.findAutoSaveSlot();
    if (!slotIndex) {
      return { success: false, message: '没有可用的自动存档位' };
    }

    const result = this.saveGame(slotIndex, {
      saveType: SAVE_TYPE.AUTO,
      autoSaveReason: reason
    });

    return {
      ...result,
      slotIndex
    };
  }

  canAutoSave() {
    if (!this.gameState) return false;
    return Boolean(this.gameState.getPlayerName?.() || this.gameState.playerName);
  }

  findAutoSaveSlot() {
    const slots = this.getAllSaveSlots();
    const filledSlots = slots.filter(slot => slot.hasSave && slot.saveData);
    const latestSlot = this.getLatestSaveSlot(filledSlots);
    const startIndex = latestSlot?.slotIndex || 0;

    const emptyBelowLatest = slots.find(slot => !slot.hasSave && slot.slotIndex > startIndex);
    if (emptyBelowLatest) return emptyBelowLatest.slotIndex;

    const emptySlot = slots.find(slot => !slot.hasSave);
    if (emptySlot) return emptySlot.slotIndex;

    const oldestAutoSlot = filledSlots
      .filter(slot => slot.saveData.saveType === SAVE_TYPE.AUTO)
      .sort((a, b) => this.getSavedAtMs(a.saveData) - this.getSavedAtMs(b.saveData))[0];

    return oldestAutoSlot?.slotIndex || null;
  }

  getLatestSaveSlot(slots = null) {
    const filledSlots = slots || this.getAllSaveSlots().filter(slot => slot.hasSave && slot.saveData);
    if (!filledSlots.length) return null;
    return [...filledSlots].sort((a, b) => {
      const delta = this.getSavedAtMs(b.saveData) - this.getSavedAtMs(a.saveData);
      return delta || b.slotIndex - a.slotIndex;
    })[0];
  }

  getSavedAtMs(saveData = {}) {
    const ms = Date.parse(saveData.savedAt || '');
    return Number.isFinite(ms) ? ms : 0;
  }

  loadGame(slotIndex) {
    const saveData = this.getSaveSlot(slotIndex);
    if (!saveData) {
      return { success: false, message: '该存档位为空' };
    }

    try {
      // 安全净化：修正存档中的非法数据字段
      const sanitized = sanitizeSaveData(saveData) || saveData;
      this.applySaveData(sanitized);
      return { success: true, message: '读取成功', saveData };
    } catch (error) {
      console.warn(`[SaveLoadManager] 存档位 ${slotIndex} 读取失败`, error);
      return { success: false, message: '读取失败' };
    }
  }

  deleteSave(slotIndex) {
    if (!this.isValidSlot(slotIndex) || !window.localStorage) {
      return { success: false, message: '删除失败' };
    }
    window.localStorage.removeItem(slotKey(slotIndex));
    return { success: true, message: '删除成功' };
  }

  buildSaveData(slotIndex, options = {}) {
    const timeData = this.gameState.timeData || {};
    const archiveData = normalizeArchiveData(clone(this.gameState.archiveData, {}));
    const playerPosition = this.gameState.getPlayerPosition
      ? this.gameState.getPlayerPosition()
      : this.gameState.playerPosition;

    return {
      saveSlotIndex: slotIndex,
      saveVersion: this.saveVersion,
      saveType: options.saveType === SAVE_TYPE.AUTO ? SAVE_TYPE.AUTO : SAVE_TYPE.MANUAL,
      autoSaveReason: options.saveType === SAVE_TYPE.AUTO ? (options.autoSaveReason || 'auto') : '',
      savedAt: new Date().toISOString(),

      currentDay: normalizeNumber(timeData.currentDay, this.gameState.day || 1),
      currentHour: normalizeNumber(timeData.currentHour, 8),
      currentMinute: normalizeNumber(timeData.currentMinute, 0),

      money: normalizeNumber(this.gameState.funds, 0),
      popularity: normalizeNumber(this.gameState.popularity, 0),
      wanShiWuLevel: normalizeNumber(this.gameState.wanShiWuLevel || this.gameState.shopLevel, 1),
      shopLevel: normalizeNumber(this.gameState.shopLevel || this.gameState.wanShiWuLevel, 1),
      playerName: this.gameState.playerName || '',

      inventoryItems: clone(this.gameState.inventory, []),
      keyItems: clone(this.gameState.keyItems, []),

      quests: clone(this.gameState.acceptedCommissions, []),
      acceptedCommissions: clone(this.gameState.acceptedCommissions, []),
      completedCommissions: clone(this.gameState.completedCommissions, []),
      expiredCommissions: clone(this.gameState.expiredCommissions, []),
      completedQuestRecords: clone(archiveData.completedQuests, {}),
      currentCommissionId: this.gameState.currentCommissionId || null,
      temporaryCommissions: clone(this.gameState.temporaryCommissions, []),
      shortCommissionRefresh: clone(this.gameState.shortCommissionRefresh, null),

      archiveData,
      furnitureData: clone(this.gameState.furnitureLevels, {}),
      achievements: clone(archiveData.achievements, {}),
      dailyStats: clone(this.gameState.dailyStats, null),
      randomNpcState: clone(this.gameState.randomNpcStates, {}),
      randomNpcSpawnTimes: clone(this.gameState.randomNpcSpawnTimes, {}),
      visitedRandomNpcTypes: clone(this.gameState.visitedRandomNpcTypes, []),
      playerPosition: clone(playerPosition, null),
      currentSceneId: 'ShopScene',

      flags: clone(this.gameState.flags, {}),
      npcAffinity: clone(this.gameState.npcAffinity, {}),
      codex: clone(this.gameState.codex, []),
      alchemyRecipes: clone(this.gameState.alchemyRecipes, []),
      spiritMemories: clone(this.gameState.spiritMemories, null),
      endingFlags: clone(this.gameState.endingFlags, {}),
      todayVisitors: clone(this.gameState.todayVisitors, []),
      visitorNotificationShown: Boolean(this.gameState.visitorNotificationShown),
      dayEndSummaryShown: Boolean(this.gameState.dayEndSummaryShown),
      hasSleptToday: Boolean(this.gameState.hasSleptToday),
      lastSleepDay: this.gameState.lastSleepDay === null || this.gameState.lastSleepDay === undefined
        ? null
        : normalizeNumber(this.gameState.lastSleepDay, null),
      dailySettlementShownDay: normalizeNumber(this.gameState.dailySettlementShownDay, 0),
      hasSeenOpeningStory: Boolean(this.gameState.hasSeenOpeningStory),
      tutorialFlags: normalizeTutorialFlags(this.gameState.tutorialFlags)
    };
  }

  applySaveData(saveData) {
    const data = this.normalizeSaveData(saveData, saveData?.saveSlotIndex || 1);
    const currentDay = normalizeNumber(data.currentDay, 1);

    this.gameState.day = currentDay;
    this.gameState.funds = normalizeNumber(data.money, 0);
    this.gameState.popularity = normalizeNumber(data.popularity, 0);
    this.gameState.wanShiWuLevel = normalizeNumber(data.wanShiWuLevel || data.shopLevel, 1);
    this.gameState.shopLevel = this.gameState.wanShiWuLevel;
    this.gameState.playerName = data.playerName || '';

    this.gameState.inventory = clone(data.inventoryItems, []);
    this.gameState.keyItems = clone(data.keyItems, []);
    this.gameState.acceptedCommissions = clone(data.acceptedCommissions || data.quests, []);
    this.gameState.completedCommissions = clone(data.completedCommissions, []);
    this.gameState.expiredCommissions = clone(data.expiredCommissions, []);
    this.gameState.currentCommissionId = data.currentCommissionId || null;
    this.gameState.temporaryCommissions = clone(data.temporaryCommissions, []);
    this.gameState.shortCommissionRefresh = clone(data.shortCommissionRefresh, null);

    this.gameState.archiveData = normalizeArchiveData(clone(data.archiveData, {}));
    if (data.completedQuestRecords) {
      this.gameState.archiveData.completedQuests = clone(data.completedQuestRecords, {});
    }
    if (data.achievements) {
      this.gameState.archiveData.achievements = clone(data.achievements, {});
    }

    this.gameState.furnitureLevels = clone(data.furnitureData, {});
    this.gameState.dailyStats = clone(data.dailyStats, null);
    this.gameState.randomNpcStates = clone(data.randomNpcState, {});
    this.gameState.randomNpcSpawnTimes = clone(data.randomNpcSpawnTimes, {});
    this.gameState.visitedRandomNpcTypes = clone(data.visitedRandomNpcTypes, []);
    this.gameState.playerPosition = clone(data.playerPosition, this.gameState.playerPosition);

    this.gameState.flags = clone(data.flags, {});
    this.gameState.npcAffinity = clone(data.npcAffinity, {});
    this.gameState.codex = clone(data.codex, []);
    this.gameState.alchemyRecipes = clone(data.alchemyRecipes, []);
    this.gameState.spiritMemories = clone(data.spiritMemories, null);
    this.gameState.endingFlags = clone(data.endingFlags, {});
    this.gameState.todayVisitors = clone(data.todayVisitors, []);
    this.gameState.visitorNotificationShown = Boolean(data.visitorNotificationShown);
    this.gameState.dayEndSummaryShown = Boolean(data.dayEndSummaryShown);
    this.gameState.hasSleptToday = Boolean(data.hasSleptToday);
    this.gameState.lastSleepDay = data.lastSleepDay;
    this.gameState.dailySettlementShownDay = normalizeNumber(data.dailySettlementShownDay, data.dayEndSummaryShown ? currentDay : 0);
    this.gameState.hasSeenOpeningStory = Boolean(data.hasSeenOpeningStory);
    this.gameState.tutorialFlags = normalizeTutorialFlags(data.tutorialFlags);

    this.gameState.returnScene = 'ShopScene';
    this.gameState.pendingRewardItems = [];
    this.gameState.pendingSystemMessages = [];
    this.gameState.currentGameState = GAME_STATE.NORMAL;
    this.gameState.timeData = {
      currentDay,
      currentHour: normalizeNumber(data.currentHour, 8),
      currentMinute: normalizeNumber(data.currentMinute, 0)
    };
    this.gameState.checkWanShiWuLevelUp?.();
  }

  normalizeSaveData(rawData, fallbackSlotIndex) {
    const data = rawData || {};
    const archiveData = normalizeArchiveData(data.archiveData || {});
    const currentDay = normalizeNumber(data.currentDay ?? data.day, 1);

    return {
      ...data,
      saveSlotIndex: normalizeNumber(data.saveSlotIndex, fallbackSlotIndex),
      saveVersion: data.saveVersion || 'legacy',
      saveType: data.saveType === SAVE_TYPE.AUTO ? SAVE_TYPE.AUTO : SAVE_TYPE.MANUAL,
      autoSaveReason: typeof data.autoSaveReason === 'string' ? data.autoSaveReason : '',
      savedAt: data.savedAt || '',
      currentDay,
      currentHour: normalizeNumber(data.currentHour, 8),
      currentMinute: normalizeNumber(data.currentMinute, 0),
      money: normalizeNumber(data.money ?? data.funds, 0),
      popularity: normalizeNumber(data.popularity, 0),
      wanShiWuLevel: normalizeNumber(data.wanShiWuLevel ?? data.shopLevel, 1),
      shopLevel: normalizeNumber(data.shopLevel ?? data.wanShiWuLevel, 1),
      playerName: typeof data.playerName === 'string' ? data.playerName : '',
      inventoryItems: Array.isArray(data.inventoryItems) ? data.inventoryItems : [],
      keyItems: Array.isArray(data.keyItems) ? data.keyItems : [],
      quests: Array.isArray(data.quests) ? data.quests : [],
      acceptedCommissions: Array.isArray(data.acceptedCommissions) ? data.acceptedCommissions : data.quests || [],
      completedCommissions: Array.isArray(data.completedCommissions) ? data.completedCommissions : [],
      expiredCommissions: Array.isArray(data.expiredCommissions) ? data.expiredCommissions : [],
      completedQuestRecords: data.completedQuestRecords || archiveData.completedQuests || {},
      archiveData,
      furnitureData: data.furnitureData || {},
      achievements: data.achievements || archiveData.achievements || {},
      dailyStats: data.dailyStats || null,
      randomNpcState: data.randomNpcState || data.randomNpcStates || {},
      randomNpcSpawnTimes: data.randomNpcSpawnTimes || {},
      visitedRandomNpcTypes: Array.isArray(data.visitedRandomNpcTypes) ? data.visitedRandomNpcTypes : [],
      playerPosition: data.playerPosition || null,
      currentSceneId: data.currentSceneId || 'ShopScene',
      shortCommissionRefresh: data.shortCommissionRefresh || null,
      hasSleptToday: Boolean(data.hasSleptToday),
      lastSleepDay: data.lastSleepDay === null || data.lastSleepDay === undefined
        ? (data.hasSleptToday ? currentDay : null)
        : normalizeNumber(data.lastSleepDay, null),
      dailySettlementShownDay: normalizeNumber(data.dailySettlementShownDay, data.dayEndSummaryShown ? currentDay : 0),
      hasSeenOpeningStory: Boolean(data.hasSeenOpeningStory),
      tutorialFlags: normalizeTutorialFlags(data.tutorialFlags)
    };
  }

  isValidSlot(slotIndex) {
    return Number.isInteger(slotIndex) && slotIndex >= 1 && slotIndex <= this.slotCount;
  }

  static get slotCount() {
    return SAVE_SLOT_COUNT;
  }
}
