import ArchiveManager from '../systems/ArchiveManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';

const TABS = [
  { key: 'memories', label: '回忆' },
  { key: 'materials', label: '素材图鉴' },
  { key: 'products', label: '产物图鉴' },
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

    this.tabContainer = this.add.container(-300, -190);
    this.listContainer = new ScrollableListUI(this, {
      parent: panel,
      x: -235,
      y: 112,
      width: 240,
      height: 245,
      rowHeight: 44,
      rowGap: 5
    });
    this.detailContainer = this.add.container(100, 15);
    panel.add(this.tabContainer);
    panel.add(this.detailContainer);

    panel.add(this.add.rectangle(-95, 48, 2, 335, 0x4c566a, 1));

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
        index * 31,
        tab.label,
        () => {
          this.activeTab = tab.key;
          this.selectedRecord = null;
          this.renderTabs();
          this.renderList();
        },
        isActive ? 0x5e81ac : 0x3b4252,
        140,
        28
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
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 32, isSelected ? 0x5e81ac : 0x3b4252, 0.9)
        .setStrokeStyle(1, isSelected ? 0xebcb8b : 0x4c566a)
        .setInteractive({ useHandCursor: true });
      row.add(bg);

      row.add(this.add.text(10, rowHeight / 2 - 8, safe(this.getRecordTitle(record), '未命名'), {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        wordWrap: { width: width - 28, useAdvancedWrap: true },
        maxLines: 1
      }));
      row.add(this.add.text(10, rowHeight / 2 + 8, this.getRecordSubTitle(record), {
        fontSize: '10px',
        fontFamily: 'Courier New',
        color: '#d8dee9',
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
    const title = this.add.text(-150, -178, safe(this.getRecordTitle(record), '未命名'), {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
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
        color: index === 0 ? '#d8dee9' : '#eceff4',
        wordWrap: { width: 430, useAdvancedWrap: true },
        fixedWidth: 430,
        lineSpacing: 5,
        maxLines: index === 0 ? 2 : 10
      });
      this.detailContainer.add(text);
      y += Math.max(28, text.height + 14);
    });
  }

  getDetailLines(record) {
    if (this.activeTab === 'materials') {
      return [
        `首次获得：第 ${safe(record.firstUnlockedDay, '?')} 天`,
        safe(record.description, '这份素材的来历已经记录在万事屋档案中。')
      ];
    }

    if (this.activeTab === 'products') {
      return [
        `首次制作：第 ${safe(record.firstCraftedDay, '?')} 天`,
        safe(record.description, '这件炼金产物已经记录在万事屋档案中。')
      ];
    }

    if (this.activeTab === 'achievements') {
      return [
        `解锁日期：第 ${safe(record.unlockedDay, '?')} 天`,
        safe(record.description, '这个成就已经收入万事屋档案。')
      ];
    }

    switch (this.activeTab) {
      case 'memories':
        return [
          `解锁日期：第 ${safe(record.unlockedDay, '?')} 天`,
          safe(record.memoryText, '这段记忆仍很模糊，需要在之后的探索中逐渐看清。')
        ];
      case 'quests':
        return [
          `完成日期：第 ${safe(record.completedDay, '?')} 天`,
          safe(record.description, '这项委托已经归档，详细经过可在委托记录中回顾。')
        ];
      case 'keyItems':
        return [
          `获得日期：第 ${safe(record.acquiredDay, '?')} 天`,
          safe(record.description, '这件关键物品与万事屋的旧事有关。')
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
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default BookshelfArchiveScene;
