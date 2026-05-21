// 背包系统 - 管理玩家物品（增强数据结构）
import ItemSystem from './ItemSystem';
import ArchiveManager from './ArchiveManager';

export default class InventorySystem {
  constructor(gameState) {
    this.gameState = gameState;
    this.itemSystem = new ItemSystem();
  }

  // 获取背包数据
  get inventory() {
    return this.gameState.inventory || [];
  }

  // 获取关键物品数据
  get keyItems() {
    return this.gameState.keyItems || [];
  }

  // ========== 添加物品 ==========

  // 添加物品到背包（增强版 — 保存完整数据）
  addItem(itemId, count = 1, sourceNpcId = '') {
    if (!this.itemSystem.itemExists(itemId)) {
      console.warn(`物品 ${itemId} 不存在于物品数据中`);
      return false;
    }

    // 如果是关键物品
    if (this.itemSystem.isKeyItem(itemId)) {
      return this.addKeyItem(itemId, sourceNpcId);
    }

    // 检查是否可堆叠
    if (this.itemSystem.isStackable(itemId)) {
      const existingItem = this.inventory.find(item => item.id === itemId);
      
      if (existingItem) {
        const maxStack = this.itemSystem.getMaxStack(itemId);
        const totalCount = existingItem.count + count;
        
        if (totalCount <= maxStack) {
          existingItem.count = totalCount;
        } else {
          existingItem.count = maxStack;
          const overflow = totalCount - maxStack;
          if (overflow > 0) {
            this._addItemRecord(itemId, overflow, sourceNpcId);
          }
        }
      } else {
        this._addItemRecord(itemId, count, sourceNpcId);
      }
    } else {
      this._addItemRecord(itemId, 1, sourceNpcId);
    }

    this._unlockArchiveForItem(itemId, count, sourceNpcId);
    return true;
  }

  // 内部方法：添加物品记录（包含完整数据）
  _addItemRecord(itemId, count, sourceNpcId) {
    const itemData = this.itemSystem.getItem(itemId);
    this.gameState.inventory.push({
      id: itemId,
      count: count,
      name: itemData ? itemData.name : '未知物品',
      type: itemData ? itemData.type : 'normal_item',
      description: itemData ? itemData.description : '暂无描述',
      isKeyItem: false,
      sourceNpcId: sourceNpcId || ''
    });
  }

  // 添加关键物品（增强版）
  addKeyItem(itemId, sourceNpcId = '') {
    if (!this.itemSystem.itemExists(itemId)) {
      console.warn(`物品 ${itemId} 不存在于物品数据中`);
      return false;
    }

    if (this.hasKeyItem(itemId)) {
      console.warn(`关键物品 ${itemId} 已拥有`);
      return false;
    }

    this.gameState.keyItems = this.gameState.keyItems || [];
    const itemData = this.itemSystem.getItem(itemId);
    this.gameState.keyItems.push({
      id: itemId,
      obtainedAt: this.gameState.day || 1,
      name: itemData ? itemData.name : '未知物品',
      type: itemData ? itemData.type : 'key_item',
      description: itemData ? itemData.description : '暂无描述',
      isKeyItem: true,
      sourceNpcId: sourceNpcId || ''
    });

    // 设置关联的结局标志
    const endingFlags = this.itemSystem.getRelatedEndingFlags(itemId);
    for (const flag of endingFlags) {
      this.gameState.setEndingFlag(flag, true);
    }

    new ArchiveManager(this.gameState).unlockKeyItem({
      keyItemId: itemId,
      keyItemName: itemData ? itemData.name : itemId,
      description: itemData ? itemData.description : '【关键物品说明待补充】',
      sourceType: sourceNpcId ? 'npc' : 'debug',
      sourceId: sourceNpcId || '',
      sourceName: sourceNpcId || '待补充',
      acquiredDay: this.gameState.day || 1,
      culturalTag: '待补充',
      isStoryCritical: true
    });

    return true;
  }

  _unlockArchiveForItem(itemId, count = 1, sourceNpcId = '') {
    const itemData = this.itemSystem.getItem(itemId);
    if (!itemData) return;

    const archiveManager = new ArchiveManager(this.gameState);
    if (itemData.type === 'alchemy_material') {
      archiveManager.unlockMaterial({
        id: itemId,
        name: itemData.name,
        type: itemData.type,
        description: itemData.description,
        sourceNpcId
      }, sourceNpcId || 'inventory');
    }

    if (itemData.type === 'alchemy_product') {
      archiveManager.unlockProductFromItemId(itemId, count);
    }
  }

  // ========== 移除物品 ==========

  removeItem(itemId, count = 1) {
    if (this.itemSystem.isKeyItem(itemId)) {
      return this.removeKeyItem(itemId);
    }

    const itemIndex = this.inventory.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return false;
    }

    const item = this.inventory[itemIndex];
    
    if (item.count <= count) {
      this.gameState.inventory.splice(itemIndex, 1);
    } else {
      item.count -= count;
    }

    return true;
  }

  removeKeyItem(itemId) {
    this.gameState.keyItems = this.gameState.keyItems || [];
    const index = this.gameState.keyItems.findIndex(item => item.id === itemId);
    
    if (index === -1) {
      return false;
    }

    this.gameState.keyItems.splice(index, 1);
    return true;
  }

  // ========== 查询方法 ==========

  hasItem(itemId) {
    if (this.itemSystem.isKeyItem(itemId)) {
      return this.hasKeyItem(itemId);
    }
    return this.inventory.some(item => item.id === itemId && item.count > 0);
  }

  hasKeyItem(itemId) {
    this.gameState.keyItems = this.gameState.keyItems || [];
    return this.gameState.keyItems.some(item => item.id === itemId);
  }

  getItemCount(itemId) {
    if (this.itemSystem.isKeyItem(itemId)) {
      return this.hasKeyItem(itemId) ? 1 : 0;
    }
    const item = this.inventory.find(item => item.id === itemId);
    return item ? item.count : 0;
  }

  // 获取背包中所有物品（包含完整数据）
  getAllItems() {
    return this.inventory.map(item => ({
      id: item.id,
      name: item.name || this.itemSystem.getItemName(item.id),
      type: item.type || this.itemSystem.getItemType(item.id),
      description: item.description || this.itemSystem.getItemDescription(item.id),
      count: item.count,
      isKeyItem: false,
      sourceNpcId: item.sourceNpcId || ''
    }));
  }

  // 获取所有关键物品（包含完整数据）
  getAllKeyItems() {
    return (this.gameState.keyItems || []).map(item => ({
      id: item.id,
      name: item.name || this.itemSystem.getItemName(item.id),
      type: item.type || this.itemSystem.getItemType(item.id),
      description: item.description || this.itemSystem.getItemDescription(item.id),
      obtainedAt: item.obtainedAt,
      isKeyItem: true,
      sourceNpcId: item.sourceNpcId || ''
    }));
  }

  // 按类型获取物品
  getItemsByType(type) {
    return this.getAllItems().filter(item => item.type === type);
  }

  // 按物品类型分类获取（用于背包 UI 分组显示）
  getItemsGroupedByType() {
    const groups = {
      alchemy_material: { label: '炼金材料', items: [] },
      alchemy_product: { label: '炼金成品', items: [] },
      quest_item: { label: '委托道具', items: [] },
      normal_item: { label: '普通物品', items: [] },
      usable_item: { label: '可用道具', items: [] },
      clue_item: { label: '线索物品', items: [] }
    };

    this.getAllItems().forEach(item => {
      if (groups[item.type]) {
        groups[item.type].items.push(item);
      } else {
        // 未知类型放入普通物品
        if (!groups[item.type]) {
          groups[item.type] = { label: item.type, items: [] };
        }
        groups[item.type].items.push(item);
      }
    });

    return groups;
  }

  // 获取炼金材料
  getAlchemyMaterials() {
    return this.getItemsByType('alchemy_material');
  }

  // 获取炼金成品
  getAlchemyProducts() {
    return this.getItemsByType('alchemy_product');
  }

  // 背包是否为空
  isEmpty() {
    return this.inventory.length === 0 && (this.gameState.keyItems || []).length === 0;
  }

  // 获取背包物品总数（按堆叠计算）
  getTotalItemCount() {
    return this.inventory.reduce((total, item) => total + item.count, 0);
  }

  // 清空背包
  clear() {
    this.gameState.inventory = [];
  }

  // 清空关键物品
  clearKeyItems() {
    this.gameState.keyItems = [];
  }
}
