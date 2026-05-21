import ItemSystem from './ItemSystem';

function createEmptyStats(dayNumber) {
  return {
    dayNumber,
    visitorsMet: 0,
    visitorIdsMet: [],
    questsAccepted: 0,
    questIdsAccepted: [],
    questsCompleted: 0,
    questIdsCompleted: [],
    moneyEarned: 0,
    moneySpent: 0,
    popularityGained: 0,
    itemsGained: [],
    itemsConsumed: [],
    alchemyCount: 0,
    perfectAlchemyCount: 0,
    spiritMemoryProgressGained: 0
  };
}

function mergeItem(items, item) {
  const existing = items.find(entry => entry.itemId === item.itemId);
  if (existing) {
    existing.count += item.count;
  } else {
    items.push({ ...item });
  }
}

export default class DailyLoopManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.itemSystem = new ItemSystem();
    this.ensureStats();
  }

  ensureStats() {
    const dayNumber = this.gameState.day || 1;
    if (!this.gameState.dailyStats || this.gameState.dailyStats.dayNumber !== dayNumber) {
      this.gameState.dailyStats = createEmptyStats(dayNumber);
    }
    return this.gameState.dailyStats;
  }

  getTodayStats() {
    return this.ensureStats();
  }

  getSummary() {
    return JSON.parse(JSON.stringify(this.ensureStats()));
  }

  resetForCurrentDay() {
    this.gameState.dailyStats = createEmptyStats(this.gameState.day || 1);
    this.gameState.dayEndSummaryShown = false;
    return this.gameState.dailyStats;
  }

  recordVisitorMet(visitorId) {
    const stats = this.ensureStats();
    if (visitorId && stats.visitorIdsMet.includes(visitorId)) return;
    stats.visitorsMet += 1;
    if (visitorId) stats.visitorIdsMet.push(visitorId);
  }

  recordQuestAccepted(questId) {
    const stats = this.ensureStats();
    if (questId && stats.questIdsAccepted.includes(questId)) return;
    stats.questsAccepted += 1;
    if (questId) stats.questIdsAccepted.push(questId);
  }

  recordQuestCompleted(questId) {
    const stats = this.ensureStats();
    if (questId && stats.questIdsCompleted.includes(questId)) return;
    stats.questsCompleted += 1;
    if (questId) stats.questIdsCompleted.push(questId);
  }

  recordMoneyEarned(amount) {
    if (amount > 0) {
      this.ensureStats().moneyEarned += amount;
    }
  }

  recordMoneySpent(amount) {
    if (amount > 0) {
      this.ensureStats().moneySpent += amount;
    }
  }

  recordPopularityGained(amount) {
    if (amount > 0) {
      this.ensureStats().popularityGained += amount;
    }
  }

  recordItemGained(itemId, count = 1) {
    if (!itemId || count <= 0) return;
    const name = this.itemSystem.getItemName(itemId);
    mergeItem(this.ensureStats().itemsGained, { itemId, name, count });
  }

  recordItemConsumed(itemId, count = 1) {
    if (!itemId || count <= 0) return;
    const name = this.itemSystem.getItemName(itemId);
    mergeItem(this.ensureStats().itemsConsumed, { itemId, name, count });
  }

  recordAlchemyFinished(result) {
    const stats = this.ensureStats();
    stats.alchemyCount += 1;
    if (result?.quality === 'perfect') {
      stats.perfectAlchemyCount += 1;
    }
  }

  recordSpiritMemoryProgress(amount) {
    if (amount > 0) {
      this.ensureStats().spiritMemoryProgressGained += amount;
    }
  }

  startNextDay(timeManager) {
    this.gameState.nextDay();
    this.gameState.timeData = {
      currentDay: this.gameState.day,
      currentHour: 8,
      currentMinute: 0
    };

    if (timeManager) {
      timeManager.currentDay = this.gameState.day;
      timeManager.currentHour = 8;
      timeManager.currentMinute = 0;
      timeManager.accumulatedMs = 0;
      timeManager._lastRealTime = null;
      timeManager._syncToGameState();
    }

    return this.resetForCurrentDay();
  }
}
