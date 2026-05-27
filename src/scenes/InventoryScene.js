import { WARM_UI, addWarmButton, addWarmPanel, addWarmTag } from '../ui/WarmUITheme';
// 鑳屽寘鍦烘櫙 - 鎸?B 閿墦寮€/鍏抽棴锛屾樉绀虹帺瀹舵墍鏈夌墿鍝?
import InventorySystem from '../systems/InventorySystem';
import ScrollableListUI from '../systems/ScrollableListUI';
import { getSfxManager } from '../systems/SfxManager';

class InventoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InventoryScene' });
    this.inventorySystem = null;
    this.itemGroups = [];
    this.selectedItem = null;
    this.scrollOffset = 0;
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 閲嶇疆鐩告満鐘舵€?
    this.cameras.main.resetFX();

    // 鍒濆鍖栬儗鍖呯郴缁?
    this.inventorySystem = new InventorySystem(window.gameState);

    // 鍗婇€忔槑閬僵
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // 涓婚潰鏉?
    const panelWidth = 720;
    const panelHeight = 520;
    this.panel = this.add.container(width / 2, height / 2);

    addWarmPanel(this, this.panel, 0, 0, panelWidth, panelHeight, {});

    // 鏍囬
    const title = this.add.text(0, -230, '背包', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panel.add(title);

    // 鍒嗛殧绾?
    const divider = this.add.rectangle(0, -200, panelWidth - 60, 2, WARM_UI.border);
    this.panel.add(divider);

    // 宸︿晶锛氱墿鍝佸垪琛ㄥ尯鍩?
    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: -170,
      y: 15,
      width: 330,
      height: 370,
      rowHeight: 40,
      rowGap: 4
    });

    // 鍙充晶锛氱墿鍝佽鎯呭尯鍩?
    this.detailContainer = this.add.container(180, 15).setDepth(10);
    this.panel.add(this.detailContainer);

    // 鍔犺浇鐗╁搧鍒楄〃
    this.loadItems();

    // 鍏抽棴鎻愮ず
    const closeHint = this.add.text(width / 2, height - 30, '按 B / ESC / 点击空白处关闭', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: WARM_UI.textMuted
    }).setOrigin(0.5).setDepth(20);

    // B 閿叧闂?
    this.input.keyboard.on('keydown-B', () => {
      this.closeInventory();
    });

    // ESC 鍏抽棴
    this.input.keyboard.on('keydown-ESC', () => {
      this.closeInventory();
    });

    // 鐐瑰嚮绌虹櫧澶勫叧闂?
    this.input.on('pointerdown', (pointer) => {
      if (pointer.y < 50 || pointer.y > height - 50) {
        this.closeInventory();
      }
    });

    // 娣″叆
    this.cameras.main.fadeIn(200);
  }

  loadItems() {
    {
    this.detailContainer.removeAll(true);
    this.itemGroups = [];
    this.selectedItem = null;
    this.scrollOffset = 0;

    const allItems = this.inventorySystem.getAllItems();
    const keyItems = this.inventorySystem.getAllKeyItems();
    const combinedItems = [...allItems, ...keyItems];

    if (combinedItems.length === 0) {
      this.listContainer.render([], () => null, { emptyText: '背包是空的\n\n去和 NPC 对话或购买物品吧' });
      const detailHint = this.add.text(0, 0, '选择左侧物品\n查看详情', {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);
      this.detailContainer.add(detailHint);
      return;
    }

    const typeOrder = [
      { type: 'alchemy_material', label: '炼金材料' },
      { type: 'alchemy_product', label: '炼金成品' },
      { type: 'quest_item', label: '委托道具' },
      { type: 'key_item', label: '关键物品' },
      { type: 'normal_item', label: '普通物品' },
      { type: 'usable_item', label: '可用道具' },
      { type: 'clue_item', label: '线索物品' }
    ];

    const rows = [];
    let itemIndex = 0;
    typeOrder.forEach(group => {
      const groupItems = combinedItems.filter(item => this.getInventoryItemType(item) === group.type);
      if (groupItems.length === 0) return;
      rows.push({ kind: 'header', label: group.label });
      groupItems.forEach(item => {
        rows.push({ kind: 'item', item, index: itemIndex });
        itemIndex += 1;
      });
    });

    const knownTypes = new Set(typeOrder.map(group => group.type));
    const extraItems = combinedItems.filter(item => !knownTypes.has(this.getInventoryItemType(item)));
    if (extraItems.length > 0) {
      rows.push({ kind: 'header', label: '其他物品' });
      extraItems.forEach(item => {
        rows.push({ kind: 'item', item, index: itemIndex });
        itemIndex += 1;
      });
    }

    this.listContainer.render(rows, (entry, rowIndex, width, rowHeight) => {
      if (entry.kind === 'header') {
        const row = this.add.container(0, 0);
        row.add(this.add.text(10, rowHeight / 2, `【${entry.label}】`, {
          fontSize: '13px',
          fontFamily: 'Georgia, serif',
          color: WARM_UI.text,
          fontStyle: 'bold'
        }).setOrigin(0, 0.5));
        return row;
      }

      const row = this.createScrollableItemRow(entry.item, entry.index, width, rowHeight);
      this.itemGroups[entry.index] = { container: row, item: entry.item, index: entry.index };
      return row;
    });

    if (this.itemGroups.length > 0) {
      this.selectItem(0);
    }
    return;
    }

    this.listContainer.removeAll(true);
    this.detailContainer.removeAll(true);
    this.itemGroups = [];
    this.selectedItem = null;
    this.scrollOffset = 0;

    const allItems = this.inventorySystem.getAllItems();
    const keyItems = this.inventorySystem.getAllKeyItems();
    const combinedItems = [...allItems, ...keyItems];

    if (combinedItems.length === 0) {
      const noItem = this.add.text(0, 0, '背包是空的\n\n去和 NPC 对话或购买物品吧', {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);
      this.listContainer.add(noItem);

      const detailHint = this.add.text(0, 0, '选择左侧物品\n查看详情', {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);
      this.detailContainer.add(detailHint);
      return;
    }

    // 鎸夌被鍨嬪垎缁勬樉绀?
    let yOffset = -180;
    const typeOrder = [
      { type: 'alchemy_material', label: '炼金材料' },
      { type: 'alchemy_product', label: '炼金成品' },
      { type: 'quest_item', label: '委托道具' },
      { type: 'key_item', label: '关键物品' },
      { type: 'normal_item', label: '普通物品' },
      { type: 'usable_item', label: '可用道具' },
      { type: 'clue_item', label: '线索物品' }
    ];

    let itemIndex = 0;
    for (const groupDef of typeOrder) {
      const groupItems = combinedItems.filter(item => item.type === groupDef.type);
      if (groupItems.length === 0) continue;

      // 鍒嗙粍鏍囬
      const groupLabel = this.add.text(-140, yOffset, `【${groupDef.label}】`, {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.text,
        fontStyle: 'bold'
      });
      this.listContainer.add(groupLabel);
      yOffset += 22;

      for (const item of groupItems) {
        if (yOffset > 200) break; // 闃叉婧㈠嚭
        const itemRow = this.createItemRow(item, yOffset, itemIndex);
        this.listContainer.add(itemRow);
        this.itemGroups.push({ container: itemRow, item, index: itemIndex });
        yOffset += 40;
        itemIndex++;
      }

      yOffset += 8;
    }

    // 榛樿閫変腑绗竴涓?
    if (this.itemGroups.length > 0) {
      this.selectItem(0);
    }
  }

  getInventoryItemType(item) {
    const typeAliases = {
      alchemyMaterial: 'alchemy_material',
      alchemyProduct: 'alchemy_product',
      questItem: 'quest_item',
      keyItem: 'key_item',
      normalItem: 'normal_item'
    };
    const rawType = item?.itemType || item?.type;
    return typeAliases[rawType] || rawType || 'normal_item';
  }

  formatDetailValue(value, fallback = '未知') {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number' && Number.isNaN(value)) return fallback;
    return String(value);
  }

  getPreviewIconKey(item) {
    const itemId = item?.id || item?.itemId;
    const itemData = itemId ? this.inventorySystem.itemSystem.getItem(itemId) : null;
    return item?.previewIcon || itemData?.previewIcon || item?.icon || itemData?.icon || '';
  }

  getItemValueText(item) {
    const itemId = item?.id || item?.itemId;
    const value = item?.value ?? item?.price ?? (itemId ? this.inventorySystem.itemSystem.getItemValue(itemId) : 0);
    return Number(value) > 0 ? `${value} 金` : '';
  }

  addPreviewImage(iconKey, y, maxWidth = 96, maxHeight = 96) {
    if (iconKey && this.textures.exists(iconKey)) {
      const preview = this.add.image(0, y, iconKey).setOrigin(0.5);
      const source = this.textures.get(iconKey).getSourceImage();
      const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
      preview.setScale(scale);
      this.detailContainer.add(preview);
      return;
    }

    const empty = this.add.text(0, y, '暂无图片', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textMuted
    }).setOrigin(0.5);
    this.detailContainer.add(empty);
  }

  createScrollableItemRow(item, index, width, rowHeight) {
    const row = this.add.container(0, 0);
    const centerY = rowHeight / 2;

    const bg = this.add.rectangle(width / 2, centerY, width - 8, 34, WARM_UI.panelLight, 0.8)
      .setStrokeStyle(2, WARM_UI.border)
      .setInteractive({ useHandCursor: true });
    row.add(bg);

    if (item.isKeyItem) {
      row.add(this.add.rectangle(12, centerY, 8, 8, WARM_UI.gold));
    }

    row.add(this.add.text(item.isKeyItem ? 24 : 14, centerY, item.name || '未命名物品', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: width - 78, useAdvancedWrap: true }
    }).setOrigin(0, 0.5));

    row.add(this.add.text(width - 18, centerY, `x${item.count || 1}`, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: WARM_UI.alchemyText
    }).setOrigin(1, 0.5));

    bg.on('pointerover', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(WARM_UI.border, 0.8);
        bg.setStrokeStyle(2, WARM_UI.border);
      }
    });

    bg.on('pointerout', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(WARM_UI.panelLight, 0.8);
        bg.setStrokeStyle(2, WARM_UI.border);
      }
    });

    bg.on('pointerdown', () => {
      this.selectItem(index);
    });

    return row;
  }

  createItemRow(item, y, index) {
    const row = this.add.container(0, y);

    // 琛岃儗鏅?
    const bg = this.add.rectangle(0, 0, 300, 36, WARM_UI.panelLight, 0.8)
      .setStrokeStyle(2, WARM_UI.border);
    row.add(bg);

    // 鐗╁搧鍚嶇О
    const nameText = this.add.text(-130, -6, item.name, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    });
    row.add(nameText);

    // 鏁伴噺
    const countText = this.add.text(120, -6, `x${item.count || 1}`, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: WARM_UI.alchemyText
    });
    row.add(countText);

    // 鍏抽敭鐗╁搧鏍囪
    if (item.isKeyItem) {
      const keyBadge = this.add.rectangle(-140, -6, 8, 8, WARM_UI.gold);
      row.add(keyBadge);
    }

    // 浜や簰
    row.setSize(300, 36);
    row.setInteractive({ useHandCursor: true });

    row.on('pointerover', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(WARM_UI.border, 0.8);
        bg.setStrokeStyle(2, WARM_UI.border);
      }
    });

    row.on('pointerout', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(WARM_UI.panelLight, 0.8);
        bg.setStrokeStyle(2, WARM_UI.border);
      }
    });

    row.on('pointerdown', () => {
      this.selectItem(index);
    });

    return row;
  }

  selectItem(index) {
    // 鍙栨秷涔嬪墠鐨勯€変腑
    if (this.selectedItem >= 0 && this.itemGroups[this.selectedItem]) {
      const prevRow = this.itemGroups[this.selectedItem].container;
      const prevBg = prevRow.list[0];
      if (prevBg) {
        prevBg.setFillStyle(WARM_UI.panelLight, 0.8);
        prevBg.setStrokeStyle(2, WARM_UI.border);
      }
    }

    this.selectedItem = index;
    const listItem = this.itemGroups[index];
    if (!listItem) return;

    // 楂樹寒閫変腑椤?
    const curRow = listItem.container;
    const curBg = curRow.list[0];
    if (curBg) {
      curBg.setFillStyle(WARM_UI.border, 0.9);
      curBg.setStrokeStyle(2, WARM_UI.border);
    }

    getSfxManager().selectItem();

    // 鏇存柊璇︽儏
    this.showItemDetail(listItem.item);
  }

  showItemDetail(item) {
    this.detailContainer.removeAll(true);
    if (!item) return;

    // 璇︽儏鑳屾櫙
    const detailBg = this.add.rectangle(0, 0, 310, 390, WARM_UI.panelLight, 0.6)
      .setStrokeStyle(2, WARM_UI.border);
    this.detailContainer.add(detailBg);

    let yOffset = -173;

    // 鐗╁搧鍚嶇О
    const itemName = this.formatDetailValue(item.name || item.itemName, '未命名物品');
    const nameText = this.add.text(0, yOffset, itemName, {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 260, useAdvancedWrap: true },
      fixedWidth: 260,
      maxLines: 2
    }).setOrigin(0.5);
    this.detailContainer.add(nameText);
    yOffset += Math.max(35, nameText.height + 12);

    // 鍒嗛殧绾?
    const divider = this.add.rectangle(0, yOffset, 270, 1, WARM_UI.border);
    this.detailContainer.add(divider);
    yOffset += 20;

    // 绫诲瀷
    const typeLabels = {
      'alchemy_material': '炼金材料',
      'alchemy_product': '炼金成品',
      'quest_item': '委托道具',
      'key_item': '重要道具',
      'normal_item': '普通物品',
      'usable_item': '可用道具',
      'clue_item': '线索物品'
    };
    const itemType = this.getInventoryItemType(item);
    this.addDetailLine('类型', typeLabels[itemType] || itemType, yOffset, WARM_UI.goldText);
    yOffset += 26;

    // 鏁伴噺
    this.addDetailLine('数量', this.formatDetailValue(item.count ?? item.itemCount ?? 1, '1'), yOffset);
    yOffset += 26;

    const valueText = this.getItemValueText(item);
    if (valueText) {
      this.addDetailLine('价值', valueText, yOffset);
      yOffset += 26;
    }

    const quality = item.quality || this.inventorySystem.itemSystem.getItem(item.id)?.quality || '';
    if (quality) {
      const qualityLabels = {
        perfect: '完美品质',
        excellent: '优秀品质',
        normal: '普通品质',
        poor: '劣等品质'
      };
      this.addDetailLine('品质', qualityLabels[quality] || quality, yOffset, WARM_UI.alchemyText);
      yOffset += 26;
    }

    const description = this.formatDetailValue(item.description || item.itemDescription, '【素材说明待补充】');
    const descText = this.add.text(-130, yOffset, description, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textMuted,
      wordWrap: { width: 250, useAdvancedWrap: true },
      lineSpacing: 4,
      fixedWidth: 250,
      maxLines: 5
    });
    this.detailContainer.add(descText);

    const previewY = Math.min(Math.max(yOffset + descText.height + 58, 142), 174);
    this.addPreviewImage(this.getPreviewIconKey(item), previewY, 96, 96);
  }

  addDetailLine(label, value, y, valueColor) {
    const labelObj = this.add.text(-130, y, `${label}:`, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    });
    this.detailContainer.add(labelObj);

    const valueObj = this.add.text(-40, y, value, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: valueColor || WARM_UI.text,
      wordWrap: { width: 190, useAdvancedWrap: true },
      maxLines: 2
    });
    this.detailContainer.add(valueObj);
  }

  closeInventory() {
    // 鎭㈠娓告垙鐘舵€?
    window.gameState.setGameState('normal');
    getSfxManager().closeMenu();
    // 鐩存帴鍒囨崲鍥炰富鍦烘櫙
    this.scene.start(this.returnScene);
  }
}

export default InventoryScene;
