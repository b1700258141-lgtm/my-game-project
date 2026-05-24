// 成就管理器 - 负责成就解锁逻辑、防重复、通知回调
// 不修改 GameState，不暂停时间，不阻塞玩家操作

import ArchiveManager from './ArchiveManager';

// 全局单例引用，用于存档恢复时不重复弹提示
let _lastKnownAchievementIds = null;

class AchievementManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.archiveManager = new ArchiveManager(gameState);

    // 新解锁成就回调列表
    this._onUnlockCallbacks = [];

    // 待显示的成就队列（用于 AchievementToastUI）
    this._pendingToastQueue = [];

    // 初始化：记录当前已解锁的成就（防止读档后重复弹提示）
    if (!_lastKnownAchievementIds) {
      _lastKnownAchievementIds = new Set(this._getUnlockedIds());
    }
  }

  /**
   * 解锁成就
   * @param {string} achievementId - 成就ID
   * @returns {{ record: object|null, isNew: boolean }} 解锁结果
   */
  unlockAchievement(achievementId) {
    const definition = this.archiveManager.getAchievementDefinition(achievementId);
    if (!definition) {
      console.warn(`[AchievementManager] 成就 ${achievementId} 不存在`);
      return { record: null, isNew: false };
    }

    // 检查是否已经解锁
    const wasAlreadyUnlocked = this.archiveManager.isAchievementUnlocked(achievementId);

    // 调用 ArchiveManager 的解锁方法（内部也有防重复）
    const record = this.archiveManager.unlockAchievement(achievementId);
    if (!record) {
      return { record: null, isNew: false };
    }

    // 判断是否是新解锁
    const isNew = !wasAlreadyUnlocked;

    if (isNew) {
      // 加入待显示队列
      this._pendingToastQueue.push({
        achievementId,
        title: definition.title,
        description: definition.description
      });

      // 触发回调
      this._onUnlockCallbacks.forEach(cb => {
        try {
          cb(achievementId, definition);
        } catch (e) {
          console.warn('[AchievementManager] 回调执行失败', e);
        }
      });
    }

    return { record, isNew };
  }

  /**
   * 检查人气成就
   * @param {number} currentPopularity
   */
  checkPopularityAchievements(currentPopularity) {
    if (Number(currentPopularity) >= 2000) {
      return this.unlockAchievement('achievement_popularity_2000');
    }
    return { record: null, isNew: false };
  }

  /**
   * 注册新成就解锁回调
   * @param {Function} callback - (achievementId, definition) => void
   */
  onUnlock(callback) {
    if (typeof callback === 'function') {
      this._onUnlockCallbacks.push(callback);
    }
  }

  /**
   * 获取下一个待显示的成就提示
   * @returns {object|null}
   */
  dequeuePendingToast() {
    return this._pendingToastQueue.shift() || null;
  }

  /**
   * 是否有待显示的成就提示
   */
  hasPendingToasts() {
    return this._pendingToastQueue.length > 0;
  }

  /**
   * 获取已解锁成就列表
   */
  getUnlockedAchievements() {
    return this.archiveManager.getUnlockedAchievements();
  }

  /**
   * 获取成就定义
   */
  getAchievementDefinition(achievementId) {
    return this.archiveManager.getAchievementDefinition(achievementId);
  }

  /**
   * 成就是否已解锁
   */
  isAchievementUnlocked(achievementId) {
    return this.archiveManager.isAchievementUnlocked(achievementId);
  }

  /**
   * 获取当前所有已解锁成就ID集合
   */
  _getUnlockedIds() {
    const achievements = this.archiveManager.getUnlockedAchievements();
    return achievements.map(a => a.achievementId);
  }

  /**
   * 标记存档恢复完成 - 防止读档后重复弹提示
   * 应在读档完成后调用
   */
  static markSaveLoaded() {
    const archiveManager = new ArchiveManager(window.gameState);
    const unlockedIds = archiveManager.getUnlockedAchievements().map(a => a.achievementId);
    _lastKnownAchievementIds = new Set(unlockedIds);
  }

  /**
   * 导出数据（用于存档）
   */
  exportData() {
    return this.archiveManager.ensureData().achievements || {};
  }

  /**
   * 导入数据（用于读档）- 不触发回调
   */
  importData(achievementsData) {
    if (!achievementsData || typeof achievementsData !== 'object') return;
    const archiveData = this.archiveManager.ensureData();
    archiveData.achievements = { ...achievementsData };
    // 更新已知成就列表，防止读档后弹提示
    _lastKnownAchievementIds = new Set(Object.keys(achievementsData).filter(k => achievementsData[k]?.isUnlocked));
  }

  /**
   * 重置成就追踪状态（新游戏时调用）
   */
  static resetTracking() {
    _lastKnownAchievementIds = null;
  }
}

export default AchievementManager;
