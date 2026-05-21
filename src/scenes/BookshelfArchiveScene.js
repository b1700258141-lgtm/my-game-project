import ArchiveManager from '../systems/ArchiveManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';

const TABS = [
  { key: 'memories', label: '回忆' },
  { key: 'materials', label: '素材图鉴' },
  { key: 'products', label: '产物图鉴' },
  { key: 'quests', label: '委托记录' },
  { key: 'keyItems', label: '关键物品记录' }
];

function safe(value, fallback = '待补充') {
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

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    const panel = this.add.container(width / 2, height / 2);
    const panelBg = this.add.rectangle(0, 0, 740, 540, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0xebcb8b);
    panel.add(panelBg);

    panel.add(this.add.text(0, -245, '万事屋档案', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.tabContainer = this.add.container(-305, -178);
    this.listContainer = new ScrollableListUI(this, {
      parent: panel,
      x: -300,
      y: 50,
      width: 210,
      height: 350,
      rowHeight: 36,
      rowGap: 4
    });
    this.detailContainer = this.add.container(85, 15);
    panel.add(this.tabContainer);
    panel.add(this.detailContainer);

    panel.add(this.add.rectangle(-115, 5, 2, 410, 0x4c566a, 1));

    const closeBtn = this.createButton(0, 240, '关闭', () => this.closeScene(), 0xbf616a, 120, 34);
    panel.add(closeBtn);

    this.input.keyboard.on('keydown-ESC', () => this.closeScene());
    this.renderTabs();
    this.renderList();
    this.cameras.main.fadeIn(180);
  }

  createButton(x, y, text, callback, color = 0x5e81ac, width = 118, height = 32) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, height, color, 0.92)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);
    btn.add(this.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
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
        index * 38,
        tab.label,
        () => {
          this.activeTab = tab.key;
          this.selectedRecord = null;
          this.renderTabs();
          this.renderList();
        },
        isActive ? 0x5e81ac : 0x3b4252,
        140,
        30
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
      case 'quests':
        return this.archiveManager.getCompletedQuests();
      case 'keyItems':
        return this.archiveManager.getKeyItems();
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
      case 'quests':
        return record.questName;
      case 'keyItems':
        return record.keyItemName;
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
      case 'quests':
        return `第 ${safe(record.completedDay, '?')} 天完成`;
      case 'keyItems':
        return `第 ${safe(record.acquiredDay, '?')} 天获得`;
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
      this.listContainer.render([], () => null, { emptyText: '暂无记录' });
      this.renderEmptyDetail();
      return;
    }

    this.listContainer.render(records, (record, index, width, rowHeight) => {
      const isSelected = record === this.selectedRecord;
      const row = this.add.container(0, 0);
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 32, isSelected ? 0x5e81ac : 0x3b4252, 0.9)
        .setStrokeStyle(1, isSelected ? 0xebcb8b : 0x4c566a)
        .setInteractive({ useHandCursor: true });
      row.add(bg);

      row.add(this.add.text(10, rowHeight / 2 - 8, safe(this.getRecordTitle(record), '未命名'), {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4'
      }));
      row.add(this.add.text(10, rowHeight / 2 + 8, this.getRecordSubTitle(record), {
        fontSize: '10px',
        fontFamily: 'Courier New',
        color: '#d8dee9'
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
      color: '#4c566a'
    }).setOrigin(0.5));
  }

  renderDetail(record) {
    this.detailContainer.removeAll(true);
    if (!record) {
      this.renderEmptyDetail();
      return;
    }

    const lines = this.getDetailLines(record);
    this.detailContainer.add(this.add.text(-150, -178, safe(this.getRecordTitle(record), '未命名'), {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }));

    lines.forEach((line, index) => {
      this.detailContainer.add(this.add.text(-150, -135 + index * 28, line, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#d8dee9',
        wordWrap: { width: 430, useAdvancedWrap: true }
      }));
    });
  }

  getDetailLines(record) {
    switch (this.activeTab) {
      case 'memories':
        return [
          `关联 NPC：${safe(record.relatedNpcName)}`,
          `精魂名称：${safe(record.spiritName)}`,
          `文化标签：${safe(record.culturalTag)}`,
          `解锁日期：第 ${safe(record.unlockedDay, '?')} 天`,
          `回忆文本：${safe(record.memoryText, '【古代精魂记忆文本待补充】')}`
        ];
      case 'materials':
        return [
          `类型：${safe(record.materialType, '炼金素材')}`,
          `说明：${safe(record.description, '【素材说明待补充】')}`,
          `占格形状：\n${this.formatShape(record.shapeCells)}`,
          `首次获得：第 ${safe(record.firstUnlockedDay, '?')} 天`,
          `来源：${safe(record.discoveredFrom)}`
        ];
      case 'products':
        return [
          `说明：${safe(record.description, '【产物说明待补充】')}`,
          `首次制作：第 ${safe(record.firstCraftedDay, '?')} 天`,
          `首次品质：${this.archiveManager.getQualityName(record.firstCraftedQuality)}`,
          `最高品质：${this.archiveManager.getQualityName(record.bestQualityCrafted)}`,
          `制作次数：${safe(record.craftedCount, 0)}`,
          `相关配方：${safe(record.relatedRecipeId)}`
        ];
      case 'quests':
        return [
          `发布 NPC：${safe(record.sourceNpcName)}`,
          `委托类型：${this.formatQuestType(record.questType)}`,
          `完成日期：第 ${safe(record.completedDay, '?')} 天`,
          `交付物品：${this.formatArray(record.deliveredItemIds)}`,
          `获得奖励：资金 +${safe(record.rewardMoney, 0)}，人气 +${safe(record.rewardPopularity, 0)}`,
          `关联回忆：${this.formatArray(record.relatedMemoryIds)}`,
          `委托描述：${safe(record.description, '【委托描述待补充】')}`
        ];
      case 'keyItems':
        return [
          `来源：${safe(record.sourceType)} / ${safe(record.sourceName)}`,
          `获得日期：第 ${safe(record.acquiredDay, '?')} 天`,
          `文化标签：${safe(record.culturalTag)}`,
          `关联回忆：${safe(record.relatedMemoryId)}`,
          `说明文本：${safe(record.description, '【关键物品说明待补充】')}`
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

  formatArray(values) {
    if (!Array.isArray(values) || values.length === 0) return '无';
    return values.join('、');
  }

  formatShape(cells) {
    if (!Array.isArray(cells) || cells.length === 0) return '待补充';
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
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default BookshelfArchiveScene;
