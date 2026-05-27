// 物品系统 - 管理所有物品数据
import itemsData from '../data/items.json';

export default class ItemSystem {
  constructor() {
    this.items = itemsData.items;
    this.itemTypes = itemsData.itemTypes;
  }

  // 获取物品数据
  getItem(itemId) {
    return this.items.find(item => item.id === itemId) || null;
  }

  // 获取物品名称
  getItemName(itemId) {
    const item = this.getItem(itemId);
    return item ? item.name : '未知物品';
  }

  // 获取物品描述
  getItemDescription(itemId) {
    const item = this.getItem(itemId);
    return item ? item.description : '尚未记录说明';
  }

  // 获取物品类型
  getItemType(itemId) {
    const item = this.getItem(itemId);
    return item ? item.type : null;
  }

  // 获取物品类型名称
  getItemTypeName(type) {
    return this.itemTypes[type]?.name || type;
  }

  // 检查物品是否可堆叠
  isStackable(itemId) {
    const item = this.getItem(itemId);
    return item ? (item.stackable || false) : false;
  }

  // 获取物品最大堆叠数
  getMaxStack(itemId) {
    const item = this.getItem(itemId);
    return item ? (item.maxStack || 1) : 1;
  }

  // 检查物品是否是关键物品
  isKeyItem(itemId) {
    const type = this.getItemType(itemId);
    return type === 'key_item';
  }

  // 检查物品是否是线索物品
  isClueItem(itemId) {
    const type = this.getItemType(itemId);
    return type === 'clue_item';
  }

  // 检查物品是否是炼金材料
  isAlchemyMaterial(itemId) {
    const type = this.getItemType(itemId);
    return type === 'alchemy_material';
  }

  // 检查物品是否是炼金成品
  isAlchemyProduct(itemId) {
    const type = this.getItemType(itemId);
    return type === 'alchemy_product';
  }

  // 获取物品关联的结局标志
  getRelatedEndingFlags(itemId) {
    const item = this.getItem(itemId);
    return item?.relatedEndingFlags || [];
  }

  // 获取物品的默认价格
  getDefaultPrice(itemId) {
    const item = this.getItem(itemId);
    if (!item) return 0;
    
    const typeInfo = this.itemTypes[item.type];
    return typeInfo?.defaultPrice || 0;
  }

  getItemValue(itemId) {
    const item = this.getItem(itemId);
    if (!item) return 0;
    return item.value ?? item.price ?? this.getDefaultPrice(itemId);
  }

  // 检查物品是否可交易
  canTrade(itemId) {
    const type = this.getItemType(itemId);
    return this.itemTypes[type]?.canTrade || false;
  }

  // 获取物品图标键
  getItemIcon(itemId) {
    const item = this.getItem(itemId);
    return item?.icon || 'item_default';
  }

  getItemPreviewIcon(itemId) {
    const item = this.getItem(itemId);
    return item?.previewIcon || item?.icon || '';
  }

  getItemPreviewImage(itemId) {
    const item = this.getItem(itemId);
    return item?.previewImage || '';
  }

  // 验证物品是否存在于数据中
  itemExists(itemId) {
    return this.items.some(item => item.id === itemId);
  }
}
