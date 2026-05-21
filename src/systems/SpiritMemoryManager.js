import ArchiveManager from './ArchiveManager';

const PLACEHOLDER_MEMORY_ID = 'placeholder_spirit_memory';
const MEMORY_TEXT_PLACEHOLDER = '【古代精魂记忆文本待补充】';

export default class SpiritMemoryManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.ensureData();
  }

  ensureData() {
    if (!this.gameState.spiritMemories) {
      this.gameState.spiritMemories = {
        [PLACEHOLDER_MEMORY_ID]: {
          memoryId: PLACEHOLDER_MEMORY_ID,
          title: '回忆占位',
          npcId: 'placeholder_npc',
          relatedNpcId: 'placeholder_npc',
          relatedNpcName: '占位 NPC',
          spiritName: '精魂名称待补充',
          culturalTag: '待补充',
          unlockProgress: 0,
          isUnlocked: false,
          hasViewed: false,
          memoryText: MEMORY_TEXT_PLACEHOLDER,
          relatedKeyItemIds: []
        }
      };
    }

    return this.gameState.spiritMemories;
  }

  addSpiritMemoryProgress(npcId, amount) {
    const memories = this.ensureData();
    const memory = memories[PLACEHOLDER_MEMORY_ID];
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
    const memoryId = memory.memoryId || memory.id || PLACEHOLDER_MEMORY_ID;
    const record = {
      ...memory,
      memoryId,
      isUnlocked: true,
      hasViewed: Boolean(memory.hasViewed),
      memoryText: memory.memoryText || MEMORY_TEXT_PLACEHOLDER,
      unlockedDay: memory.unlockedDay || this.gameState.day || 1
    };

    memories[memoryId] = record;
    new ArchiveManager(this.gameState).unlockSpiritMemory(record);
    return record;
  }

  markSpiritMemoryViewed(memoryId = PLACEHOLDER_MEMORY_ID) {
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
