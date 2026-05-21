// 随机来访 NPC 管理系统 - 管理 NPC 的出现、对话、离开状态

// 随机 NPC 状态常量
export const RANDOM_NPC_STATE = {
  NOT_SPAWNED: 'notSpawned',     // 未生成
  SPAWNED_TODAY: 'spawnedToday', // 今日已出现
  TALKED: 'talked',             // 已对话
  LEFT: 'left',                 // 已离开
  MISSED: 'missed'              // 已错过（当天未对话）
};

export default class RandomNpcManager {
  constructor(gameState) {
    this.gameState = gameState;
  }

  // ========== 状态管理 ==========

  // 获取 NPC 状态
  getNpcState(visitorConfigId) {
    return this.gameState.randomNpcStates[visitorConfigId] || RANDOM_NPC_STATE.NOT_SPAWNED;
  }

  // 设置 NPC 状态
  setNpcState(visitorConfigId, state) {
    this.gameState.randomNpcStates[visitorConfigId] = state;
    console.log(`[RandomNpcManager] ${visitorConfigId} → ${state}`);
  }

  // NPC 是否在场景中可见
  isNpcVisible(visitorConfigId) {
    const state = this.getNpcState(visitorConfigId);
    return state === RANDOM_NPC_STATE.SPAWNED_TODAY;
  }

  // NPC 是否可以对话
  canTalkToNpc(visitorConfigId) {
    const state = this.getNpcState(visitorConfigId);
    return state === RANDOM_NPC_STATE.SPAWNED_TODAY;
  }

  // ========== 生命周期事件 ==========

  // NPC 生成了（出现在场景中）
  onNpcSpawned(visitorConfigId) {
    this.setNpcState(visitorConfigId, RANDOM_NPC_STATE.SPAWNED_TODAY);
  }

  // 与 NPC 对话结束
  onNpcDialogueEnd(visitorConfigId) {
    this.setNpcState(visitorConfigId, RANDOM_NPC_STATE.TALKED);
  }

  // NPC 主动离开
  onNpcLeft(visitorConfigId) {
    this.setNpcState(visitorConfigId, RANDOM_NPC_STATE.LEFT);
  }

  // ========== 天数变更 ==========

  // 处理天数变更：未对话的 NPC 变为 missed
  onDayChanged() {
    for (const [visitorId, state] of Object.entries(this.gameState.randomNpcStates)) {
      if (state === RANDOM_NPC_STATE.SPAWNED_TODAY) {
        // 当天生成了但未对话 → 错过
        this.setNpcState(visitorId, RANDOM_NPC_STATE.MISSED);
      } else if (state === RANDOM_NPC_STATE.TALKED) {
        // 已对话完毕 → 离开
        this.setNpcState(visitorId, RANDOM_NPC_STATE.LEFT);
      }
    }
  }

  // ========== 查询方法 ==========

  // 获取今日可见的 NPC 列表
  getVisibleNpcs() {
    const result = [];
    for (const [visitorId, state] of Object.entries(this.gameState.randomNpcStates)) {
      if (state === RANDOM_NPC_STATE.SPAWNED_TODAY) {
        result.push(visitorId);
      }
    }
    return result;
  }

  // 获取今日需要显示提示的 NPC（刚生成，还未提示过）
  getNpcsNeedingNotification() {
    const result = [];
    for (const [visitorId, state] of Object.entries(this.gameState.randomNpcStates)) {
      if (state === RANDOM_NPC_STATE.SPAWNED_TODAY) {
        // 检查是否已提示过
        if (!this.gameState.getFlag(`notified_${visitorId}`)) {
          result.push(visitorId);
        }
      }
    }
    return result;
  }

  // 标记 NPC 已提示
  markNotified(visitorConfigId) {
    this.gameState.setFlag(`notified_${visitorConfigId}`, true);
  }

  // 获取状态文本
  getStateText(state) {
    const texts = {
      [RANDOM_NPC_STATE.NOT_SPAWNED]: '未出现',
      [RANDOM_NPC_STATE.SPAWNED_TODAY]: '在万事屋中',
      [RANDOM_NPC_STATE.TALKED]: '已对话',
      [RANDOM_NPC_STATE.LEFT]: '已离开',
      [RANDOM_NPC_STATE.MISSED]: '已错过'
    };
    return texts[state] || state;
  }
}
