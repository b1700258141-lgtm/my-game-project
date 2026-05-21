// 结局系统 - 管理结局判定
import endingsData from '../data/endings.json';

export default class EndingSystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.endings = endingsData.endings || [];
  }

  // 获取所有结局
  getAllEndings() {
    return this.endings;
  }

  // 获取结局数据
  getEnding(endingId) {
    return this.endings.find(ending => ending.id === endingId) || null;
  }

  // 检查结局是否可触发
  canTriggerEnding(endingId) {
    const ending = this.getEnding(endingId);
    if (!ending) return false;

    // 检查前置条件标志
    if (ending.requiredFlags && ending.requiredFlags.length > 0) {
      for (const flag of ending.requiredFlags) {
        if (!this.gameState.getFlag(flag)) {
          return false;
        }
      }
    }

    // 检查阻止条件标志
    if (ending.blockedFlags && ending.blockedFlags.length > 0) {
      for (const flag of ending.blockedFlags) {
        if (this.gameState.getFlag(flag)) {
          return false;
        }
      }
    }

    // 检查所需关键物品
    if (ending.requiredKeyItems && ending.requiredKeyItems.length > 0) {
      for (const itemId of ending.requiredKeyItems) {
        if (!this.gameState.hasKeyItem(itemId)) {
          return false;
        }
      }
    }

    // 检查所需最小资金
    if (ending.minFunds && this.gameState.funds < ending.minFunds) {
      return false;
    }

    // 检查所需最小人气
    if (ending.minPopularity && this.gameState.popularity < ending.minPopularity) {
      return false;
    }

    return true;
  }

  // 获取所有可触发的结局
  getAvailableEndings() {
    return this.endings.filter(ending => this.canTriggerEnding(ending.id));
  }

  // 获取优先级最高的可触发结局
  getBestEnding() {
    const available = this.getAvailableEndings();
    
    if (available.length === 0) {
      return null;
    }

    // 按优先级排序
    available.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });

    return available[0];
  }

  // 检查缺失的结局条件
  getMissingEndingConditions(endingId) {
    const ending = this.getEnding(endingId);
    if (!ending) return null;

    const missing = {
      flags: [],
      keyItems: [],
      funds: false,
      popularity: false
    };

    // 检查前置条件标志
    if (ending.requiredFlags) {
      for (const flag of ending.requiredFlags) {
        if (!this.gameState.getFlag(flag)) {
          missing.flags.push(flag);
        }
      }
    }

    // 检查所需关键物品
    if (ending.requiredKeyItems) {
      for (const itemId of ending.requiredKeyItems) {
        if (!this.gameState.hasKeyItem(itemId)) {
          missing.keyItems.push(itemId);
        }
      }
    }

    // 检查资金
    if (ending.minFunds && this.gameState.funds < ending.minFunds) {
      missing.funds = true;
    }

    // 检查人气
    if (ending.minPopularity && this.gameState.popularity < ending.minPopularity) {
      missing.popularity = true;
    }

    return missing;
  }

  // 设置结局标志
  setEndingFlag(flagId, value = true) {
    this.gameState.endingFlags = this.gameState.endingFlags || {};
    this.gameState.endingFlags[flagId] = value;
  }

  // 获取结局标志
  getEndingFlag(flagId) {
    return this.gameState.endingFlags?.[flagId] || false;
  }

  // 检查结局是否已完成
  isEndingCompleted(endingId) {
    return this.getEndingFlag(`completed_${endingId}`);
  }

  // 标记结局完成
  markEndingCompleted(endingId) {
    this.setEndingFlag(`completed_${endingId}`, true);
  }

  // 在指定天数触发结局判定
  checkEndingOnDay(day) {
    // 检查是否有在该天触发的结局
    const triggeredEndings = this.endings.filter(ending => {
      if (ending.triggerDay !== day) return false;
      return this.canTriggerEnding(ending.id);
    });

    if (triggeredEndings.length > 0) {
      // 返回优先级最高的
      triggeredEndings.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      return triggeredEndings[0];
    }

    return null;
  }

  // 获取结局类型
  getEndingType(endingId) {
    const ending = this.getEnding(endingId);
    return ending?.type || 'normal';
  }

  // 判断结局是否为真结局
  isTrueEnding(endingId) {
    const ending = this.getEnding(endingId);
    return ending?.isTrueEnding || false;
  }

  // 获取结局名称
  getEndingTitle(endingId) {
    const ending = this.getEnding(endingId);
    return ending?.title || '未知结局';
  }

  // 获取结局描述
  getEndingDescription(endingId) {
    const ending = this.getEnding(endingId);
    return ending?.description || '暂无描述';
  }
}
