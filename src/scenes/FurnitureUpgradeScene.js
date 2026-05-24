import FurnitureUpgradeManager from '../systems/FurnitureUpgradeManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';

class FurnitureUpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FurnitureUpgradeScene' });
    this.returnScene = 'ShopScene';
    this.furnitureManager = null;
    this.listContainer = null;
    this.fundsText = null;
    this.shopLevelText = null;
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.resetFX();
    window.gameState.setGameState(GAME_STATE.FURNITURE_UPGRADE);
    this.furnitureManager = new FurnitureUpgradeManager(window.gameState);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    const panel = this.add.container(width / 2, height / 2);
    const panelBg = this.add.rectangle(0, 0, 720, 540, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0xebcb8b);
    panel.add(panelBg);

    panel.add(this.add.text(0, -245, '家具升级', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.fundsText = this.add.text(-320, -215, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
    });
    panel.add(this.fundsText);

    this.shopLevelText = this.add.text(120, -215, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#88c0d0'
    });
    panel.add(this.shopLevelText);

    this.listContainer = new ScrollableListUI(this, {
      parent: panel,
      x: 0,
      y: 20,
      width: 670,
      height: 365,
      rowHeight: 118,
      rowGap: 8
    });

    const closeBtn = this.createButton(0, 240, '关闭', () => this.closeScene(), 0xbf616a);
    panel.add(closeBtn);

    this.input.keyboard.on('keydown-U', () => this.closeScene());
    this.input.keyboard.on('keydown-ESC', () => this.closeScene());

    this.renderScrollableList();
    this.cameras.main.fadeIn(200);
  }

  createButton(x, y, text, callback, color = 0x5e81ac) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 120, 34, color, 0.92)
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

  renderScrollableList() {
    this.fundsText.setText(`当前资金: ${window.gameState.funds}`);
    this.shopLevelText.setText(`万事屋等级: ${this.furnitureManager.getShopLevel()}`);

    const furnitureList = this.furnitureManager.getFurnitureList();
    this.listContainer.render(furnitureList, (item, index, width, rowHeight) => {
      const row = this.add.container(0, 0);

      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 14, 106, 0x3b4252, 0.84)
        .setStrokeStyle(2, 0x4c566a);
      row.add(bg);

      row.add(this.add.text(20, rowHeight / 2 - 42, `${item.furnitureName} Lv.${item.level}`, {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        fontStyle: 'bold'
      }));

      row.add(this.add.text(20, rowHeight / 2 - 18, `当前: ${item.currentEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: '#d8dee9',
        wordWrap: { width: 450, useAdvancedWrap: true }
      }));

      row.add(this.add.text(20, rowHeight / 2 + 16, `下级: ${item.nextEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: item.isMaxLevel ? '#4c566a' : '#88c0d0',
        wordWrap: { width: 450, useAdvancedWrap: true }
      }));

      const costText = item.isMaxLevel ? '最高级' : `条件：${item.nextRequirementText || `${item.nextCost}资金`}`;
      row.add(this.add.text(width - 180, rowHeight / 2 - 16, costText, {
        fontSize: '12px',
        fontFamily: 'Courier New',
        color: item.canAfford ? '#a3be8c' : '#bf616a',
        align: 'center',
        wordWrap: { width: 150, useAdvancedWrap: true }
      }).setOrigin(0.5));

      const btn = this.createButton(width - 80, rowHeight / 2, item.isMaxLevel ? '已满级' : '升级', () => {
        this.upgrade(item.furnitureId);
      }, item.isMaxLevel ? 0x4c566a : 0x5e81ac);
      if (item.isMaxLevel) {
        btn.list[0].disableInteractive();
      }
      row.add(btn);

      return row;
    }, { emptyText: '暂无家具记录' });
  }

  renderList() {
    if (this.listContainer instanceof ScrollableListUI) {
      this.renderScrollableList();
      return;
    }
    this.listContainer.removeAll(true);
    this.fundsText.setText(`当前资金: ${window.gameState.funds}`);
    this.shopLevelText.setText(`万事屋等级: ${this.furnitureManager.getShopLevel()}`);

    const furnitureList = this.furnitureManager.getFurnitureList();
    furnitureList.forEach((item, index) => {
      const y = -160 + index * 78;
      const row = this.add.container(0, y);

      const bg = this.add.rectangle(0, 0, 650, 66, 0x3b4252, 0.84)
        .setStrokeStyle(2, 0x4c566a);
      row.add(bg);

      row.add(this.add.text(-300, -22, `${item.furnitureName} Lv.${item.level}`, {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        fontStyle: 'bold'
      }));

      row.add(this.add.text(-300, 0, `当前: ${item.currentEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: '#d8dee9'
      }));

      row.add(this.add.text(-300, 20, `下级: ${item.nextEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: item.isMaxLevel ? '#4c566a' : '#88c0d0'
      }));

      const costText = item.isMaxLevel ? '最高级' : `${item.nextCost} 金`;
      row.add(this.add.text(165, -8, costText, {
        fontSize: '13px',
        fontFamily: 'Courier New',
        color: item.canAfford ? '#a3be8c' : '#bf616a'
      }).setOrigin(0.5));

      const btn = this.createButton(255, 0, item.isMaxLevel ? '已满级' : '升级', () => {
        this.upgrade(item.furnitureId);
      }, item.isMaxLevel ? 0x4c566a : 0x5e81ac);
      if (item.isMaxLevel) {
        btn.list[0].disableInteractive();
      }
      row.add(btn);

      this.listContainer.add(row);
    });
  }

  upgrade(furnitureId) {
    const result = this.furnitureManager.upgradeFurniture(furnitureId);
    this.showToast(result.message, result.success);
    this.renderScrollableList();
  }

  showToast(message, success = true) {
    const toast = this.add.container(this.cameras.main.width / 2, 70).setDepth(300);
    toast.add(this.add.rectangle(0, 0, 360, 38, 0x2e3440, 0.96)
      .setStrokeStyle(2, success ? 0xa3be8c : 0xbf616a));
    toast.add(this.add.text(0, 0, message, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: success ? '#a3be8c' : '#bf616a'
    }).setOrigin(0.5));

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 20,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  closeScene() {
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default FurnitureUpgradeScene;
