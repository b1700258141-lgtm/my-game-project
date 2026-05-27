import { WARM_UI, addWarmButton, addWarmPanel, addWarmTag } from '../ui/WarmUITheme';
import FurnitureUpgradeManager from '../systems/FurnitureUpgradeManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';
import { getSfxManager } from '../systems/SfxManager';

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
    addWarmPanel(this, panel, 0, 0, 720, 540, { title: '家具升级' });

    this.fundsText = this.add.text(-320, -215, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: WARM_UI.alchemyText
    });
    panel.add(this.fundsText);

    this.shopLevelText = this.add.text(120, -215, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: WARM_UI.text
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

    const closeBtn = this.createButton(0, 240, '关闭', () => this.closeScene(), WARM_UI.warning);
    panel.add(closeBtn);

    this.input.keyboard.on('keydown-U', () => this.closeScene());
    this.input.keyboard.on('keydown-ESC', () => this.closeScene());

    this.renderScrollableList();
    this.cameras.main.fadeIn(200);
  }

  createButton(x, y, text, callback, color = WARM_UI.button) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 120, 34, color, 0.92)
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

  renderScrollableList() {
    this.fundsText.setText(`当前资金：${window.gameState.funds}`);
    this.shopLevelText.setText(`万事屋等级：${this.furnitureManager.getShopLevel()}`);

    const furnitureList = this.furnitureManager.getFurnitureList();
    this.listContainer.render(furnitureList, (item, index, width, rowHeight) => {
      const row = this.add.container(0, 0);

      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 14, 106, WARM_UI.panelLight, 0.84)
        .setStrokeStyle(2, WARM_UI.border);
      row.add(bg);

      row.add(this.add.text(20, rowHeight / 2 - 42, `${item.furnitureName} Lv.${item.level}`, {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.text,
        fontStyle: 'bold'
      }));

      row.add(this.add.text(20, rowHeight / 2 - 18, `当前：${item.currentEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        wordWrap: { width: 450, useAdvancedWrap: true }
      }));

      row.add(this.add.text(20, rowHeight / 2 + 16, `下级：${item.nextEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: item.isMaxLevel ? WARM_UI.textMuted : WARM_UI.text,
        wordWrap: { width: 450, useAdvancedWrap: true }
      }));

      const costText = item.isMaxLevel ? '最高级' : `条件：${item.nextRequirementText || `${item.nextCost}资金`}`;
      // 条件文字放在按钮正下方，与按钮居中对齐
      row.add(this.add.text(width - 65, rowHeight / 2 + 26, costText, {
        fontSize: '12px',
        fontFamily: 'Courier New',
        color: item.canAfford ? WARM_UI.alchemyText : WARM_UI.warningText,
        align: 'center',
        wordWrap: { width: 160, useAdvancedWrap: true }
      }).setOrigin(0.5));

      const btn = this.createButton(width - 65, rowHeight / 2, item.isMaxLevel ? '已满级' : '升级', () => {
        this.upgrade(item.furnitureId);
      }, item.isMaxLevel ? WARM_UI.border : WARM_UI.button);
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
    this.fundsText.setText(`当前资金：${window.gameState.funds}`);
    this.shopLevelText.setText(`万事屋等级：${this.furnitureManager.getShopLevel()}`);

    const furnitureList = this.furnitureManager.getFurnitureList();
    furnitureList.forEach((item, index) => {
      const y = -160 + index * 78;
      const row = this.add.container(0, y);

      const bg = this.add.rectangle(0, 0, 650, 66, WARM_UI.panelLight, 0.84)
        .setStrokeStyle(2, WARM_UI.border);
      row.add(bg);

      row.add(this.add.text(-300, -22, `${item.furnitureName} Lv.${item.level}`, {
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.text,
        fontStyle: 'bold'
      }));

      row.add(this.add.text(-300, 0, `当前：${item.currentEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted
      }));

      row.add(this.add.text(-300, 20, `下级：${item.nextEffect}`, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: item.isMaxLevel ? WARM_UI.textMuted : WARM_UI.text
      }));

      const costText = item.isMaxLevel ? '最高级' : `${item.nextCost} 资金`;
      row.add(this.add.text(165, -8, costText, {
        fontSize: '13px',
        fontFamily: 'Courier New',
        color: item.canAfford ? WARM_UI.alchemyText : WARM_UI.warningText
      }).setOrigin(0.5));

      const btn = this.createButton(255, 0, item.isMaxLevel ? '已满级' : '升级', () => {
        this.upgrade(item.furnitureId);
      }, item.isMaxLevel ? WARM_UI.border : WARM_UI.button);
      if (item.isMaxLevel) {
        btn.list[0].disableInteractive();
      }
      row.add(btn);

      this.listContainer.add(row);
    });
  }

  upgrade(furnitureId) {
    const result = this.furnitureManager.upgradeFurniture(furnitureId);
    if (result.success) {
      getSfxManager().confirm();
    } else {
      getSfxManager().error();
    }
    this.showToast(result.message, result.success);
    this.renderScrollableList();
  }

  showToast(message, success = true) {
    const toast = this.add.container(this.cameras.main.width / 2, 70).setDepth(300);
    toast.add(this.add.rectangle(0, 0, 360, 38, WARM_UI.panel, 0.96)
      .setStrokeStyle(2, success ? WARM_UI.alchemy : WARM_UI.warning));
    toast.add(this.add.text(0, 0, message, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: success ? WARM_UI.alchemyText : WARM_UI.warningText
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
    getSfxManager().closeMenu();
    this.scene.start(this.returnScene);
  }
}

export default FurnitureUpgradeScene;
