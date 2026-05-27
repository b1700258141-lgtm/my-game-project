import ArchiveManager from '../systems/ArchiveManager';
import { getSfxManager } from '../systems/SfxManager';
import ItemSystem from '../systems/ItemSystem';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';
import { WARM_UI, addWarmPanel } from '../ui/WarmUITheme';
import { showTutorialIfNeeded } from '../systems/TutorialManager';

const TABS = [
  { key: 'memories', label: '回忆' },
  { key: 'materials', label: '素材图鉴' },
  { key: 'products', label: '产物图鉴' },
  { key: 'items', label: '物品记录' },
  { key: 'quests', label: '委托记录' },
  { key: 'keyItems', label: '关键物品记录' },
  { key: 'achievements', label: '成就' }
];

function safe(value, fallback = '尚未记录') {
  if (value === null || value === undefined || value === '' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

class BookshelfArchiveScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BookshelfArchiveScene' });
    this.returnScene = 'ShopScene';
    this.archiveManager = null;
    this.itemSystem = null;
    this.activeTab = 'memories';
    this.selectedRecord = null;
    this.tabContainer = null;
    this.listContainer = null;
    this.detailContainer = null;
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.resetFX();
    window.gameState.setGameState(GAME_STATE.BOOKSHELF_ARCHIVE);
    this.archiveManager = new ArchiveManager(window.gameState);
    this.itemSystem = new ItemSystem();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    const panel = this.add.container(width / 2, height / 2);
    addWarmPanel(this, panel, 0, 0, 740, 540, {});

    this.tabContainer = this.add.container(-300, -205);
    this.listContainer = new ScrollableListUI(this, {
      parent: panel,
      x: -235,
      y: 122,
      width: 240,
      height: 225,
      rowHeight: 42,
      rowGap: 5
    });
    this.detailContainer = this.add.container(100, 15);
    panel.add(this.tabContainer);
    panel.add(this.detailContainer);

    panel.add(this.add.rectangle(-95, 48, 2, 335, WARM_UI.border, 1));

    const closeBtn = this.createButton(0, 240, '关闭', () => this.closeScene(), WARM_UI.warning, 120, 34);
    panel.add(closeBtn);

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.__tutorialModalOpen) return;
      this.closeScene();
    });
    this.renderTabs();
    this.renderList();
    this.cameras.main.fadeIn(180);
    this.time.delayedCall(120, () => {
      showTutorialIfNeeded(this, 'bookshelfOpened');
    });
  }

  createButton(x, y, text, callback, color = WARM_UI.button, width = 118, height = 32) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, color, 0.92)
      .setStrokeStyle(2, WARM_UI.buttonHover)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);
    btn.add(this.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    }).setOrigin(0.5));

    bg.on('pointerover', () => bg.setAlpha(1));
    bg.on('pointerout', () => bg.setAlpha(0.92));
    bg.on('pointerdown', callback);
    return btn;
  }

  renderTabs() {
    this.tabContainer.removeAll(true);
    TABS.forEach((tab, index) => {
      const isActive = tab.key === this.activeTab;
      const btn = this.createButton(
        0,
        index * 27,
        tab.label,
        () => {
          this.activeTab = tab.key;
          this.selectedRecord = null;
          this.renderTabs();
          this.renderList();
        },
        isActive ? WARM_UI.button : WARM_UI.panelLight,
        140,
        25
      );
      this.tabContainer.add(btn);
    });
  }

  getRecordsForActiveTab() {
    switch (this.activeTab) {
      case 'memories':
        return this.archiveManager.getSpiritMemories();
      case 'materials':
        return this.archiveManager.getMaterials();
      case 'products':
        return this.archiveManager.getProducts();
      case 'items':
        return this.archiveManager.getInventoryItemRecords();
      case 'quests':
        return this.archiveManager.getCompletedQuests();
      case 'keyItems':
        return this.archiveManager.getKeyItems();
      case 'achievements':
        return this.archiveManager.getUnlockedAchievements();
      default:
        return [];
    }
  }

  getRecordTitle(record) {
    switch (this.activeTab) {
      case 'memories':
        return record.title;
      case 'materials':
        return record.materialName;
      case 'products':
        return record.productName;
      case 'items':
        return record.itemName;
      case 'quests':
        return record.questName;
      case 'keyItems':
        return record.keyItemName;
      case 'achievements':
        return record.title;
      default:
        return '未知记录';
    }
  }

  getRecordSubTitle(record) {
    switch (this.activeTab) {
      case 'memories':
        return `第 ${safe(record.unlockedDay, '?')} 天解锁`;
      case 'materials':
        return `第 ${safe(record.firstUnlockedDay, '?')} 天解锁`;
      case 'products':
        return `制作 ${safe(record.craftedCount, 0)} 次`;
      case 'items':
        return `${safe(record.itemTypeName, '物品')} x${safe(record.count, 1)}`;
      case 'quests':
        return `第 ${safe(record.completedDay, '?')} 天完成`;
      case 'keyItems':
        return `第 ${safe(record.acquiredDay, '?')} 天获得`;
      case 'achievements':
        return `第 ${safe(record.unlockedDay, '?')} 天解锁`;
      default:
        return '';
    }
  }

  renderList() {
    this.detailContainer.removeAll(true);

    const records = this.getRecordsForActiveTab();
    if (!this.selectedRecord && records.length > 0) {
      this.selectedRecord = records[0];
    }

    if (records.length === 0) {
      const emptyText = this.activeTab === 'achievements' ? '尚未解锁成就' : '暂无记录';
      this.listContainer.render([], () => null, { emptyText });
      this.renderEmptyDetail();
      return;
    }

    this.listContainer.render(records, (record, index, width, rowHeight) => {
      const isSelected = record === this.selectedRecord;
      const row = this.add.container(0, 0);
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 32, isSelected ? WARM_UI.button : WARM_UI.panelLight, 0.9)
        .setStrokeStyle(1, isSelected ? WARM_UI.gold : WARM_UI.border)
        .setInteractive({ useHandCursor: true });
      row.add(bg);

      row.add(this.add.text(10, rowHeight / 2 - 8, safe(this.getRecordTitle(record), '未命名'), {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.text,
        wordWrap: { width: width - 28, useAdvancedWrap: true },
        maxLines: 1
      }));
      row.add(this.add.text(10, rowHeight / 2 + 8, this.getRecordSubTitle(record), {
        fontSize: '10px',
        fontFamily: 'Courier New',
        color: WARM_UI.textMuted,
        wordWrap: { width: width - 28, useAdvancedWrap: true },
        maxLines: 1
      }));

      bg.on('pointerdown', () => {
        this.selectedRecord = record;
        this.renderList();
      });
      return row;
    });

    this.renderDetail(this.selectedRecord);
  }

  renderEmptyDetail() {
    this.detailContainer.add(this.add.text(0, 0, '尚未解锁', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textMuted
    }).setOrigin(0.5));
  }

  renderDetail(record) {
    this.detailContainer.removeAll(true);
    if (!record) {
      this.renderEmptyDetail();
      return;
    }

    const lines = this.getDetailLines(record);
    const title = this.add.text(-150, -178, safe(this.getRecordTitle(record), '未命名'), {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.goldText,
      fontStyle: 'bold',
      wordWrap: { width: 430, useAdvancedWrap: true },
      fixedWidth: 430,
      maxLines: 2
    });
    this.detailContainer.add(title);

    let y = -135;
    lines.forEach((line, index) => {
      const text = this.add.text(-150, y, line, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: index === 0 ? WARM_UI.textMuted : WARM_UI.text,
        wordWrap: { width: 430, useAdvancedWrap: true },
        fixedWidth: 430,
        lineSpacing: 5,
        maxLines: index === 0 ? 2 : 8
      });
      this.detailContainer.add(text);
      y += Math.max(28, text.height + 14);
    });

    const previewY = Math.min(Math.max(y + 58, 132), 172);
    this.addRecordPreview(this.getRecordPreviewIconKey(record), 65, previewY, 120, 120);
  }

  getDetailLines(record) {
    if (this.activeTab === 'materials') {
      return [
        `类型：${safe(record.materialType, '炼金素材')}`,
        `首次获得：第 ${safe(record.firstUnlockedDay, '?')} 天`,
        safe(record.description, '【素材说明待补充】')
      ];
    }

    if (this.activeTab === 'products') {
      return [
        '类型：炼金产物',
        `首次制作：第 ${safe(record.firstCraftedDay, '?')} 天`,
        `最佳品质：${this.archiveManager.getQualityName(record.bestQualityCrafted)}`,
        safe(record.description, '【产物说明待补充】')
      ];
    }

    if (this.activeTab === 'achievements') {
      return [
        `解锁日期：第 ${safe(record.unlockedDay, '?')} 天`,
        safe(record.description, '【成就说明待补充】')
      ];
    }

    if (this.activeTab === 'items') {
      return [
        `类型：${safe(record.itemTypeName, '物品')}`,
        `数量：${safe(record.count, 1)}`,
        safe(record.description, '用途待补充')
      ];
    }

    switch (this.activeTab) {
      case 'memories':
        return [
          `解锁日期：第 ${safe(record.unlockedDay, '?')} 天`,
          safe(record.memoryText, '【古代精魂记忆文本待补充】')
        ];
      case 'quests':
        return [
          `类型：${this.formatQuestType(record.questType)}`,
          `完成日期：第 ${safe(record.completedDay, '?')} 天`,
          safe(record.description, '【委托描述待补充】')
        ];
      case 'keyItems':
        return [
          '类型：关键物品',
          `获得日期：第 ${safe(record.acquiredDay, '?')} 天`,
          `标签：${safe(record.culturalTag, '万事屋旧事')}`,
          safe(record.description, '【关键物品说明待补充】')
        ];
      default:
        return ['暂无记录'];
    }
  }

  formatQuestType(type) {
    const map = {
      long: '长期',
      longTerm: '长期',
      short: '短期',
      shortTerm: '短期'
    };
    return map[type] || safe(type);
  }

  getRecordPreviewIconKey(record) {
    if (!record) return '';
    if (record.previewIcon) return record.previewIcon;

    if (this.activeTab === 'materials') {
      return this.itemSystem.getItemPreviewIcon(record.materialId);
    }

    if (this.activeTab === 'products') {
      const item = this.itemSystem.items.find(candidate =>
        candidate.baseRecipeId === record.productBaseId || candidate.id === `${record.productBaseId}_normal`
      );
      return item?.previewIcon || item?.icon || '';
    }

    if (this.activeTab === 'keyItems') {
      return this.itemSystem.getItemPreviewIcon(record.keyItemId);
    }

    if (this.activeTab === 'items') {
      return this.itemSystem.getItemPreviewIcon(record.itemId);
    }

    if (this.activeTab === 'quests') {
      const itemId = Array.isArray(record.deliveredItemIds) ? record.deliveredItemIds[0] : '';
      return itemId ? this.itemSystem.getItemPreviewIcon(itemId) : '';
    }

    return '';
  }

  addRecordPreview(iconKey, x, y, maxWidth = 120, maxHeight = 120) {
    if (iconKey && this.textures.exists(iconKey)) {
      const image = this.add.image(x, y, iconKey).setOrigin(0.5);
      const source = this.textures.get(iconKey).getSourceImage();
      const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
      image.setScale(scale);
      this.detailContainer.add(image);
      return;
    }

    this.detailContainer.add(this.add.text(x, y, '暂无图片', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textMuted
    }).setOrigin(0.5));
  }

  formatArray(values) {
    if (!Array.isArray(values) || values.length === 0) return '无';
    return values.join('、');
  }

  formatShape(cells) {
    if (!Array.isArray(cells) || cells.length === 0) return '未记录';
    const maxRow = Math.max(...cells.map(cell => cell[0]));
    const maxCol = Math.max(...cells.map(cell => cell[1]));
    const occupied = new Set(cells.map(cell => `${cell[0]},${cell[1]}`));
    const rows = [];

    for (let row = 0; row <= maxRow; row++) {
      const rowCells = [];
      for (let col = 0; col <= maxCol; col++) {
        rowCells.push(occupied.has(`${row},${col}`) ? '1' : '0');
      }
      rows.push(rowCells.join(' '));
    }

    return rows.join('\n');
  }

  closeScene() {
    getSfxManager().closeMenu();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default BookshelfArchiveScene;
