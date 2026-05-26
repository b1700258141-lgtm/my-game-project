import ItemSystem from './ItemSystem';
import commissionsData from '../data/commissions.json';
import { ALCHEMY_RECIPES, getAlchemyMaterialShape } from './AlchemyMaterialShapeConfig';

const MEMORY_TEXT_FALLBACK = '这段记忆仍很模糊，需要在之后的探索中逐渐看清。';
const MATERIAL_TEXT_FALLBACK = '这份素材的来历已经记录在万事屋档案中。';
const PRODUCT_TEXT_FALLBACK = '这件炼金产物已经记录在万事屋档案中。';
const QUEST_TEXT_FALLBACK = '这项委托已经归档，详细经过可在委托记录中回顾。';
const KEY_ITEM_TEXT_FALLBACK = '这件关键物品与万事屋的旧事有关。';

const QUALITY_RANK = {
  poor: 1,
  normal: 2,
  excellent: 3,
  perfect: 4
};

const QUALITY_NAME = {
  poor: '劣等品质',
  normal: '普通品质',
  excellent: '优秀品质',
  perfect: '完美品质'
};

const ACHIEVEMENT_DEFINITIONS = {
  achievement_start_revival: {
    achievementId: 'achievement_start_revival',
    title: '万事屋复兴开启！',
    description: '开始游玩万事屋炼金物语！'
  },
  achievement_hidden_quest_solution: {
    achievementId: 'achievement_hidden_quest_solution',
    title: '原来还能这样？',
    description: '发现了隐藏的完成委托的方法'
  },
  achievement_popularity_2000: {
    achievementId: 'achievement_popularity_2000',
    title: '小有规模！',
    description: '万事屋的人气值超过了2000'
  }
};

function safeText(value, fallback = '尚未记录') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return value;
}

export default class ArchiveManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.itemSystem = new ItemSystem();
    this.ensureData();
  }

  ensureData() {
    if (!this.gameState.archiveData) {
      this.gameState.archiveData = {};
    }

    const archiveData = this.gameState.archiveData;
    archiveData.materials = archiveData.materials || {};
    archiveData.products = archiveData.products || {};
    archiveData.completedQuests = archiveData.completedQuests || {};
    archiveData.spiritMemories = archiveData.spiritMemories || {};
    archiveData.keyItems = archiveData.keyItems || {};
    archiveData.achievements = archiveData.achievements || {};

    return archiveData;
  }

  getCurrentDay() {
    return this.gameState?.day || this.gameState?.timeData?.currentDay || 1;
  }

  unlockMaterial(item, discoveredFrom = 'inventory') {
    const itemId = typeof item === 'string' ? item : (item.id || item.itemId);
    if (!itemId) return null;

    const itemData = this.itemSystem.getItem(itemId) || {};
    const itemType = item.type || item.itemType || itemData.type;
    if (itemType !== 'alchemy_material') return null;

    const archiveData = this.ensureData();
    if (archiveData.materials[itemId]) {
      return archiveData.materials[itemId];
    }

    const shape = getAlchemyMaterialShape(itemId);
    const record = {
      materialId: itemId,
      materialName: safeText(item.name || item.itemName || itemData.name, itemId),
      materialType: '炼金素材',
      description: safeText(item.description || item.itemDescription || itemData.description, MATERIAL_TEXT_FALLBACK),
      shapeCells: shape ? shape.footprintCells.map(cell => [...cell]) : [],
      firstUnlockedDay: this.getCurrentDay(),
      discoveredFrom: discoveredFrom || item.sourceNpcId || 'inventory',
      isUnlocked: true
    };

    archiveData.materials[itemId] = record;
    return record;
  }

  unlockProduct(productBaseId, productName, quality = 'normal', relatedRecipeId = '', count = 1) {
    if (!productBaseId) return null;

    const archiveData = this.ensureData();
    const existing = archiveData.products[productBaseId];
    const normalizedQuality = QUALITY_RANK[quality] ? quality : 'normal';
    const recipe = ALCHEMY_RECIPES.find(item =>
      item.recipeId === relatedRecipeId || item.resultBaseItemId === productBaseId
    );
    const finalProductName = safeText(productName || recipe?.resultName, productBaseId);
    const addCount = Math.max(1, Number(count) || 1);

    if (existing) {
      existing.craftedCount += addCount;
      if (QUALITY_RANK[normalizedQuality] > QUALITY_RANK[existing.bestQualityCrafted]) {
        existing.bestQualityCrafted = normalizedQuality;
      }
      return existing;
    }

    const record = {
      productBaseId,
      productName: finalProductName,
      description: safeText(recipe?.description, PRODUCT_TEXT_FALLBACK),
      firstCraftedDay: this.getCurrentDay(),
      firstCraftedQuality: normalizedQuality,
      bestQualityCrafted: normalizedQuality,
      craftedCount: addCount,
      relatedRecipeId: relatedRecipeId || recipe?.recipeId || productBaseId,
      isUnlocked: true
    };

    archiveData.products[productBaseId] = record;
    return record;
  }

  unlockProductFromItemId(itemId, count = 1) {
    const itemData = this.itemSystem.getItem(itemId);
    if (!itemData || itemData.type !== 'alchemy_product') return null;

    const productBaseId = itemData.baseRecipeId || itemId.replace(/_(perfect|excellent|normal|poor)$/, '');
    const recipe = ALCHEMY_RECIPES.find(item =>
      item.recipeId === productBaseId || item.resultBaseItemId === productBaseId
    );
    const quality = itemData.quality || itemId.match(/_(perfect|excellent|normal|poor)$/)?.[1] || 'normal';

    return this.unlockProduct(
      productBaseId,
      recipe?.resultName || itemData.name,
      quality,
      recipe?.recipeId || productBaseId,
      count
    );
  }

  addCompletedQuestRecord(quest, options = {}) {
    const questId = quest?.id || quest?.questId;
    if (!questId) return null;

    const archiveData = this.ensureData();
    if (archiveData.completedQuests[questId]) {
      return archiveData.completedQuests[questId];
    }

    const reward = quest.reward || {};
    const record = {
      questId,
      questName: safeText(quest.title || quest.questName, questId),
      sourceNpcId: quest.clientNpcId || quest.sourceNpcId || '',
      sourceNpcName: safeText(quest.sourceNpcName || quest.clientNpcName, '委托人'),
      questType: quest.type || quest.questType || '未记录',
      completedDay: this.getCurrentDay(),
      rewardMoney: reward.funds || quest.rewardMoney || 0,
      rewardPopularity: reward.popularity || quest.rewardPopularity || 0,
      deliveredItemIds: options.deliveredItemIds || quest.deliveredItemIds || [],
      relatedMemoryIds: quest.relatedMemoryIds || [],
      description: safeText(quest.description || quest.questDescription, QUEST_TEXT_FALLBACK)
    };

    archiveData.completedQuests[questId] = record;
    return record;
  }

  unlockSpiritMemory(memory) {
    const memoryId = memory?.memoryId || memory?.id;
    if (!memoryId) return null;

    const archiveData = this.ensureData();
    const existing = archiveData.spiritMemories[memoryId] || {};
    const record = {
      memoryId,
      title: safeText(memory.title, '未命名回忆'),
      relatedNpcId: memory.relatedNpcId || memory.npcId || '',
      relatedNpcName: safeText(memory.relatedNpcName || memory.npcName, '相关来客'),
      spiritName: safeText(memory.spiritName, '未名精魂'),
      culturalTag: safeText(memory.culturalTag, '中国传统文化'),
      isUnlocked: memory.isUnlocked !== false,
      hasViewed: Boolean(memory.hasViewed || existing.hasViewed),
      memoryText: safeText(memory.memoryText, MEMORY_TEXT_FALLBACK),
      unlockedDay: memory.unlockedDay || existing.unlockedDay || this.getCurrentDay(),
      relatedKeyItemIds: memory.relatedKeyItemIds || existing.relatedKeyItemIds || []
    };

    archiveData.spiritMemories[memoryId] = record;
    return record;
  }

  markSpiritMemoryViewed(memoryId) {
    const archiveData = this.ensureData();
    const memory = archiveData.spiritMemories[memoryId];
    if (!memory) return null;
    memory.hasViewed = true;
    memory.isUnlocked = true;
    return memory;
  }

  unlockKeyItem(keyItem) {
    const keyItemId = keyItem?.keyItemId || keyItem?.id || keyItem?.itemId;
    if (!keyItemId) return null;

    const archiveData = this.ensureData();
    if (archiveData.keyItems[keyItemId]) {
      return archiveData.keyItems[keyItemId];
    }

    const itemData = this.itemSystem.getItem(keyItemId) || {};
    const record = {
      keyItemId,
      keyItemName: safeText(keyItem.keyItemName || keyItem.name || keyItem.itemName || itemData.name, keyItemId),
      description: safeText(keyItem.description || keyItem.itemDescription || itemData.description, KEY_ITEM_TEXT_FALLBACK),
      sourceType: keyItem.sourceType || 'debug',
      sourceId: keyItem.sourceId || keyItem.sourceNpcId || '',
      sourceName: safeText(keyItem.sourceName || keyItem.sourceNpcName, '未知来源'),
      acquiredDay: keyItem.acquiredDay || keyItem.obtainedAt || this.getCurrentDay(),
      culturalTag: safeText(keyItem.culturalTag, '万事屋旧事'),
      relatedMemoryId: keyItem.relatedMemoryId || '',
      isStoryCritical: Boolean(keyItem.isStoryCritical),
      isUnlocked: true
    };

    archiveData.keyItems[keyItemId] = record;
    return record;
  }

  unlockKeyItemFromMemory(memoryId, keyItemData) {
    return this.unlockKeyItem({
      ...keyItemData,
      sourceType: 'spiritMemory',
      sourceId: memoryId,
      relatedMemoryId: memoryId,
      culturalTag: keyItemData?.culturalTag || '中国传统文化'
    });
  }

  getAchievementDefinition(achievementId) {
    return ACHIEVEMENT_DEFINITIONS[achievementId] || null;
  }

  unlockAchievement(achievementId) {
    const definition = this.getAchievementDefinition(achievementId);
    if (!definition) {
      console.warn(`成就 ${achievementId} 不存在`);
      return null;
    }

    const archiveData = this.ensureData();
    if (archiveData.achievements[achievementId]) {
      return archiveData.achievements[achievementId];
    }

    const unlockedDay = this.getCurrentDay();
    const record = {
      achievementId,
      title: definition.title,
      description: definition.description,
      isUnlocked: true,
      unlockedDay,
      unlockedTimeText: `第 ${unlockedDay} 天解锁`
    };

    archiveData.achievements[achievementId] = record;
    return record;
  }

  isAchievementUnlocked(achievementId) {
    return Boolean(this.ensureData().achievements[achievementId]?.isUnlocked);
  }

  checkPopularityAchievements(currentPopularity) {
    if (Number(currentPopularity) >= 2000) {
      return this.unlockAchievement('achievement_popularity_2000');
    }
    return null;
  }

  getMaterials() {
    if (Array.isArray(this.gameState.inventory)) {
      this.gameState.inventory.forEach(item => {
        const itemData = this.itemSystem.getItem(item.id);
        if (itemData?.type === 'alchemy_material') {
          this.unlockMaterial({
            ...item,
            type: itemData.type,
            description: item.description || itemData.description
          }, item.sourceNpcId || 'inventory');
        }
      });
    }

    return Object.values(this.ensureData().materials)
      .filter(item => item.isUnlocked)
      .sort((a, b) => a.firstUnlockedDay - b.firstUnlockedDay || a.materialName.localeCompare(b.materialName));
  }

  getProducts() {
    if (Array.isArray(this.gameState.inventory)) {
      this.gameState.inventory.forEach(item => {
        const itemData = this.itemSystem.getItem(item.id);
        if (itemData?.type !== 'alchemy_product') return;

        const productBaseId = itemData.baseRecipeId || item.id.replace(/_(perfect|excellent|normal|poor)$/, '');
        if (!this.ensureData().products[productBaseId]) {
          this.unlockProductFromItemId(item.id, item.count || 1);
        }
      });
    }

    return Object.values(this.ensureData().products)
      .filter(item => item.isUnlocked)
      .sort((a, b) => a.firstCraftedDay - b.firstCraftedDay || a.productName.localeCompare(b.productName));
  }

  getCompletedQuests() {
    if (Array.isArray(this.gameState.completedCommissions)) {
      this.gameState.completedCommissions.forEach(questId => {
        if (!this.ensureData().completedQuests[questId]) {
          const quest = commissionsData.commissions.find(item => item.id === questId);
          if (quest) {
            this.addCompletedQuestRecord(quest);
          }
        }
      });
    }

    return Object.values(this.ensureData().completedQuests)
      .sort((a, b) => a.completedDay - b.completedDay || a.questName.localeCompare(b.questName));
  }

  getSpiritMemories() {
    if (this.gameState.spiritMemories) {
      Object.values(this.gameState.spiritMemories).forEach(memory => {
        if (memory?.isUnlocked) {
          this.unlockSpiritMemory(memory);
          if (memory.hasViewed) {
            this.markSpiritMemoryViewed(memory.memoryId);
          }
        }
      });
    }

    return Object.values(this.ensureData().spiritMemories)
      .filter(item => item.isUnlocked && item.hasViewed)
      .sort((a, b) => a.unlockedDay - b.unlockedDay || a.title.localeCompare(b.title));
  }

  getKeyItems() {
    if (Array.isArray(this.gameState.keyItems)) {
      this.gameState.keyItems.forEach(item => {
        const itemId = item.id || item.keyItemId;
        const itemData = this.itemSystem.getItem(itemId);
        this.unlockKeyItem({
          ...item,
          keyItemId: itemId,
          keyItemName: item.name || itemData?.name,
          description: item.description || itemData?.description,
          acquiredDay: item.obtainedAt || item.acquiredDay,
          sourceType: item.sourceType || (item.sourceNpcId ? 'npc' : 'debug'),
          sourceId: item.sourceId || item.sourceNpcId || ''
        });
      });
    }

    return Object.values(this.ensureData().keyItems)
      .filter(item => item.isUnlocked)
      .sort((a, b) => a.acquiredDay - b.acquiredDay || a.keyItemName.localeCompare(b.keyItemName));
  }

  getUnlockedAchievements() {
    return Object.values(this.ensureData().achievements)
      .filter(item => item.isUnlocked)
      .sort((a, b) => a.unlockedDay - b.unlockedDay || a.title.localeCompare(b.title));
  }

  getQualityName(quality) {
    return QUALITY_NAME[quality] || quality || '未记录';
  }
}
