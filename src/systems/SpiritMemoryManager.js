import ArchiveManager from './ArchiveManager';

const DEFAULT_MEMORY_ID = 'default_spirit_memory';
const MEMORY_TEXT_FALLBACK = '这段记忆仍很模糊，需要在之后的探索中逐渐看清。';

export default class SpiritMemoryManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.ensureData();
  }

  ensureData() {
    if (!this.gameState.spiritMemories) {
      this.gameState.spiritMemories = {
        [DEFAULT_MEMORY_ID]: {
          memoryId: DEFAULT_MEMORY_ID,
          title: '未名回忆',
          npcId: 'unknown_npc',
          relatedNpcId: 'unknown_npc',
          relatedNpcName: '相关来客',
          spiritName: '未名精魂',
          culturalTag: '中国传统文化',
          unlockProgress: 0,
          isUnlocked: false,
          hasViewed: false,
          memoryText: MEMORY_TEXT_FALLBACK,
          relatedKeyItemIds: []
        }
      };
    }

    return this.gameState.spiritMemories;
  }

  addSpiritMemoryProgress(npcId, amount) {
    const memories = this.ensureData();
    const memory = memories[DEFAULT_MEMORY_ID];
    memory.npcId = npcId || memory.npcId;
    memory.relatedNpcId = memory.npcId;
    memory.unlockProgress = Math.min(100, Math.max(0, memory.unlockProgress + amount));
    memory.isUnlocked = memory.unlockProgress >= 100;

    if (memory.isUnlocked) {
      memory.unlockedDay = memory.unlockedDay || this.gameState.day || 1;
      new ArchiveManager(this.gameState).unlockSpiritMemory(memory);
    }

    return memory;
  }

  unlockSpiritMemory(memory) {
    const memories = this.ensureData();
    const memoryId = memory.memoryId || memory.id || DEFAULT_MEMORY_ID;
    const record = {
      ...memory,
      memoryId,
      isUnlocked: true,
      hasViewed: Boolean(memory.hasViewed),
      memoryText: memory.memoryText || MEMORY_TEXT_FALLBACK,
      unlockedDay: memory.unlockedDay || this.gameState.day || 1
    };

    memories[memoryId] = record;
    new ArchiveManager(this.gameState).unlockSpiritMemory(record);
    return record;
  }

  markSpiritMemoryViewed(memoryId = DEFAULT_MEMORY_ID) {
    const memories = this.ensureData();
    const memory = memories[memoryId];
    if (!memory) return null;

    memory.isUnlocked = true;
    memory.hasViewed = true;
    memory.unlockedDay = memory.unlockedDay || this.gameState.day || 1;

    const archiveManager = new ArchiveManager(this.gameState);
    archiveManager.unlockSpiritMemory(memory);
    archiveManager.markSpiritMemoryViewed(memoryId);
    return memory;
  }

  getArchiveEntries() {
    return Object.values(this.ensureData());
  }
}
