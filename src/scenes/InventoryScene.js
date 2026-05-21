// 背包场景 - 按 B 键打开/关闭，显示玩家所有物品
import InventorySystem from '../systems/InventorySystem';

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

    // 重置相机状态
    this.cameras.main.resetFX();

    // 初始化背包系统
    this.inventorySystem = new InventorySystem(window.gameState);

    // 半透明遮罩
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // 主面板
    const panelWidth = 720;
    const panelHeight = 520;
    this.panel = this.add.container(width / 2, height / 2);

    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);
    this.panel.add(panelBg);

    // 标题
    const title = this.add.text(0, -230, '背包', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panel.add(title);

    // 分隔线
    const divider = this.add.rectangle(0, -200, panelWidth - 60, 2, 0x4c566a);
    this.panel.add(divider);

    // 左侧：物品列表区域
    this.listContainer = this.add.container(-170, -20).setDepth(10);
    this.panel.add(this.listContainer);

    // 右侧：物品详情区域
    this.detailContainer = this.add.container(180, -20).setDepth(10);
    this.panel.add(this.detailContainer);

    // 加载物品列表
    this.loadItems();

    // 关闭提示
    const closeHint = this.add.text(width / 2, height - 30, '按 B / ESC / 点击空白处 关闭', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5).setDepth(20);

    // B 键关闭
    this.input.keyboard.on('keydown-B', () => {
      this.closeInventory();
    });

    // ESC 关闭
    this.input.keyboard.on('keydown-ESC', () => {
      this.closeInventory();
    });

    // 点击空白处关闭
    this.input.on('pointerdown', (pointer) => {
      if (pointer.y < 50 || pointer.y > height - 50) {
        this.closeInventory();
      }
    });

    // 淡入
    this.cameras.main.fadeIn(200);
  }

  loadItems() {
    this.listContainer.removeAll(true);
    this.detailContainer.removeAll(true);
    this.itemGroups = [];
    this.selectedItem = null;
    this.scrollOffset = 0;

    const allItems = this.inventorySystem.getAllItems();
    const keyItems = this.inventorySystem.getAllKeyItems();
    const combinedItems = [...allItems, ...keyItems];

    if (combinedItems.length === 0) {
      const noItem = this.add.text(0, 0, '背包是空的\n\n去和NPC对话或购买物品吧', {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);
      this.listContainer.add(noItem);

      const detailHint = this.add.text(0, 0, '选择左侧物品\n查看详情', {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a',
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);
      this.detailContainer.add(detailHint);
      return;
    }

    // 按类型分组显示
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

      // 分组标题
      const groupLabel = this.add.text(-140, yOffset, `【${groupDef.label}】`, {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#88c0d0',
        fontStyle: 'bold'
      });
      this.listContainer.add(groupLabel);
      yOffset += 22;

      for (const item of groupItems) {
        if (yOffset > 200) break; // 防止溢出
        const itemRow = this.createItemRow(item, yOffset, itemIndex);
        this.listContainer.add(itemRow);
        this.itemGroups.push({ container: itemRow, item, index: itemIndex });
        yOffset += 40;
        itemIndex++;
      }

      yOffset += 8;
    }

    // 默认选中第一个
    if (this.itemGroups.length > 0) {
      this.selectItem(0);
    }
  }

  createItemRow(item, y, index) {
    const row = this.add.container(0, y);

    // 行背景
    const bg = this.add.rectangle(0, 0, 300, 36, 0x3b4252, 0.8)
      .setStrokeStyle(2, 0x4c566a);
    row.add(bg);

    // 物品名称
    const nameText = this.add.text(-130, -6, item.name, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    });
    row.add(nameText);

    // 数量
    const countText = this.add.text(120, -6, `x${item.count || 1}`, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
    });
    row.add(countText);

    // 关键物品标记
    if (item.isKeyItem) {
      const keyBadge = this.add.rectangle(-140, -6, 8, 8, 0xebcb8b);
      row.add(keyBadge);
    }

    // 交互
    row.setSize(300, 36);
    row.setInteractive({ useHandCursor: true });

    row.on('pointerover', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(0x4c566a, 0.8);
        bg.setStrokeStyle(2, 0x88c0d0);
      }
    });

    row.on('pointerout', () => {
      if (this.selectedItem !== index) {
        bg.setFillStyle(0x3b4252, 0.8);
        bg.setStrokeStyle(2, 0x4c566a);
      }
    });

    row.on('pointerdown', () => {
      this.selectItem(index);
    });

    return row;
  }

  selectItem(index) {
    // 取消之前的选中
    if (this.selectedItem >= 0 && this.itemGroups[this.selectedItem]) {
      const prevRow = this.itemGroups[this.selectedItem].container;
      const prevBg = prevRow.list[0];
      if (prevBg) {
        prevBg.setFillStyle(0x3b4252, 0.8);
        prevBg.setStrokeStyle(2, 0x4c566a);
      }
    }

    this.selectedItem = index;
    const listItem = this.itemGroups[index];
    if (!listItem) return;

    // 高亮选中项
    const curRow = listItem.container;
    const curBg = curRow.list[0];
    if (curBg) {
      curBg.setFillStyle(0x4c566a, 0.9);
      curBg.setStrokeStyle(2, 0x88c0d0);
    }

    // 更新详情
    this.showItemDetail(listItem.item);
  }

  showItemDetail(item) {
    this.detailContainer.removeAll(true);
    if (!item) return;

    // 详情背景
    const detailBg = this.add.rectangle(0, 0, 310, 400, 0x3b4252, 0.6)
      .setStrokeStyle(2, 0x4c566a);
    this.detailContainer.add(detailBg);

    let yOffset = -170;

    // 物品名称
    const nameText = this.add.text(0, yOffset, item.name, {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.detailContainer.add(nameText);
    yOffset += 35;

    // 分隔线
    const divider = this.add.rectangle(0, yOffset, 270, 1, 0x4c566a);
    this.detailContainer.add(divider);
    yOffset += 20;

    // 类型
    const typeLabels = {
      'alchemy_material': '炼金材料',
      'alchemy_product': '炼金成品',
      'quest_item': '委托道具',
      'key_item': '关键物品',
      'normal_item': '普通物品',
      'usable_item': '可用道具',
      'clue_item': '线索物品'
    };
    this.addDetailLine('类型', typeLabels[item.type] || item.type, yOffset, '#d08770');
    yOffset += 26;

    // 数量
    this.addDetailLine('数量', `${item.count || 1}`, yOffset);
    yOffset += 26;

    // 来源 NPC
    const sourceNpc = item.sourceNpcId || '未知';
    this.addDetailLine('来源', sourceNpc, yOffset, '#b48ead');
    yOffset += 26;

    // 是否关键物品
    this.addDetailLine('关键物品', item.isKeyItem ? '是' : '否', yOffset, item.isKeyItem ? '#ebcb8b' : '#4c566a');
    yOffset += 35;

    // 描述
    const descLabel = this.add.text(-130, yOffset, '描述:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    });
    this.detailContainer.add(descLabel);
    yOffset += 20;

    const descText = this.add.text(-130, yOffset, item.description || '暂无描述', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: true,
      wordWrapWidth: 260,
      lineSpacing: 4
    });
    this.detailContainer.add(descText);
  }

  addDetailLine(label, value, y, valueColor) {
    const labelObj = this.add.text(-130, y, `${label}:`, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    });
    this.detailContainer.add(labelObj);

    const valueObj = this.add.text(-40, y, value, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: valueColor || '#eceff4'
    });
    this.detailContainer.add(valueObj);
  }

  closeInventory() {
    // 恢复游戏状态
    window.gameState.setGameState('normal');
    // 直接切换回主场景
    this.scene.start(this.returnScene);
  }
}

export default InventoryScene;
