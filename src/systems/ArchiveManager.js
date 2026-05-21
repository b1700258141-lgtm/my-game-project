import ItemSystem from './ItemSystem';
import commissionsData from '../data/commissions.json';
import { ALCHEMY_RECIPES, getAlchemyMaterialShape } from './AlchemyMaterialShapeConfig';

const MEMORY_TEXT_PLACEHOLDER = '【古代精魂记忆文本待补充】';
const MATERIAL_TEXT_PLACEHOLDER = '【素材说明待补充】';
const PRODUCT_TEXT_PLACEHOLDER = '【产物说明待补充】';
const QUEST_TEXT_PLACEHOLDER = '【委托描述待补充】';
const KEY_ITEM_TEXT_PLACEHOLDER = '【关键物品说明待补充】';

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

function safeText(value, fallback = '待补充') {
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
      description: safeText(item.description || item.itemDescription || itemData.description, MATERIAL_TEXT_PLACEHOLDER),
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
      description: PRODUCT_TEXT_PLACEHOLDER,
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
      sourceNpcName: safeText(quest.sourceNpcName || quest.clientNpcName, '待补充'),
      questType: quest.type || quest.questType || '待设定',
      completedDay: this.getCurrentDay(),
      rewardMoney: reward.funds || quest.rewardMoney || 0,
      rewardPopularity: reward.popularity || quest.rewardPopularity || 0,
      deliveredItemIds: options.deliveredItemIds || quest.deliveredItemIds || [],
      relatedMemoryIds: quest.relatedMemoryIds || [],
      description: safeText(quest.description || quest.questDescription, QUEST_TEXT_PLACEHOLDER)
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
      title: safeText(memory.title, '回忆占位'),
      relatedNpcId: memory.relatedNpcId || memory.npcId || '',
      relatedNpcName: safeText(memory.relatedNpcName || memory.npcName, '待补充'),
      spiritName: safeText(memory.spiritName, '精魂名称待补充'),
      culturalTag: safeText(memory.culturalTag, '待补充'),
      isUnlocked: memory.isUnlocked !== false,
      hasViewed: Boolean(memory.hasViewed || existing.hasViewed),
      memoryText: safeText(memory.memoryText, MEMORY_TEXT_PLACEHOLDER),
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
      description: safeText(keyItem.description || keyItem.itemDescription || itemData.description, KEY_ITEM_TEXT_PLACEHOLDER),
      sourceType: keyItem.sourceType || 'debug',
      sourceId: keyItem.sourceId || keyItem.sourceNpcId || '',
      sourceName: safeText(keyItem.sourceName || keyItem.sourceNpcName, '待补充'),
      acquiredDay: keyItem.acquiredDay || keyItem.obtainedAt || this.getCurrentDay(),
      culturalTag: safeText(keyItem.culturalTag, '待补充'),
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

  getQualityName(quality) {
    return QUALITY_NAME[quality] || quality || '待补充';
  }
}
