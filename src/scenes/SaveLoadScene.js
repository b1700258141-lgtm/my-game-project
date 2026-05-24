import SaveLoadManager from '../systems/SaveLoadManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { resetTimeManager } from '../systems/TimeManager';
import AchievementManager from '../systems/AchievementManager';
import { GAME_STATE } from '../systems/GameState';

const SLOTS_PER_PAGE = 10;
const TOTAL_PAGES = 3;

class SaveLoadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SaveLoadScene' });
    this.mode = 'save';
    this.returnScene = 'ShopScene';
    this.manager = null;
    this.currentPage = 1;
    this.slots = [];
    this.listContainer = null;
    this.pageText = null;
    this.confirmContainer = null;
    this.toast = null;
  }

  init(data) {
    this.mode = data.mode === 'load' ? 'load' : 'save';
    this.returnScene = data.returnScene || (this.mode === 'load' ? 'TitleScene' : 'ShopScene');
    this.currentPage = 1;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.resetFX();
    window.gameState.setGameState(GAME_STATE.SAVE_LOAD);
    this.manager = new SaveLoadManager(window.gameState);
    this.slots = this.manager.getAllSaveSlots();

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1117, 0.94);

    this.panel = this.add.container(width / 2, height / 2);
    this.panel.add(this.add.rectangle(0, 0, 680, 560, 0x2e3440, 0.98)
      .setStrokeStyle(3, this.mode === 'save' ? 0xa3be8c : 0x88c0d0));

    this.panel.add(this.add.text(0, -255, this.mode === 'save' ? '保存游戏' : '读取存档', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: this.mode === 'save' ? '#a3be8c' : '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.panel.add(this.add.rectangle(0, -222, 610, 2, 0x4c566a));

    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: 0,
      y: 0,
      width: 600,
      height: 420,
      rowHeight: 40,
      rowGap: 2
    });

    this.prevButton = this.createButton(-210, 255, '上一页', () => this.changePage(-1), 0x4c566a);
    this.nextButton = this.createButton(210, 255, '下一页', () => this.changePage(1), 0x4c566a);
    this.closeButton = this.createButton(0, 255, '关闭', () => this.closeScene(), 0xbf616a);
    this.panel.add([this.prevButton, this.nextButton, this.closeButton]);

    this.pageText = this.add.text(0, 217, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#d8dee9'
    }).setOrigin(0.5);
    this.panel.add(this.pageText);

    this.input.keyboard.on('keydown-ESC', () => this.closeScene());
    this.renderPage();
    this.cameras.main.fadeIn(150);
  }

  renderPage() {
    const startIndex = (this.currentPage - 1) * SLOTS_PER_PAGE;
    const pageSlots = this.slots.slice(startIndex, startIndex + SLOTS_PER_PAGE);

    this.listContainer.render(pageSlots, (slot, _index, width, rowHeight) => {
      return this.createSlotRow(slot, width, rowHeight);
    }, { emptyText: this.mode === 'load' ? '暂无存档' : '暂无存档位' });

    this.pageText.setText(`第 ${this.currentPage} / ${TOTAL_PAGES} 页`);
    this.setButtonEnabled(this.prevButton, this.currentPage > 1);
    this.setButtonEnabled(this.nextButton, this.currentPage < TOTAL_PAGES);
  }

  createSlotRow(slot, width, rowHeight) {
    const row = this.add.container(0, 0);
    const hasSave = slot.hasSave && slot.saveData;
    const bgColor = hasSave ? 0x3b4252 : 0x232a36;
    const borderColor = hasSave ? 0x88c0d0 : 0x4c566a;

    const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 10, rowHeight - 4, bgColor, 0.9)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    row.add(bg);

    row.add(this.add.text(16, 7, `存档位 ${slot.slotIndex}`, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));

    const summary = hasSave
      ? `第${slot.saveData.currentDay}天 ${this.formatClock(slot.saveData.currentHour, slot.saveData.currentMinute)} / ${slot.saveData.playerName || '未命名'} / Lv${slot.saveData.wanShiWuLevel || 1} / 资${slot.saveData.money} / 人气${slot.saveData.popularity}`
      : '空';
    row.add(this.add.text(145, 7, summary, {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: hasSave ? '#d8dee9' : '#6b7280'
    }));

    const savedAt = hasSave ? `保存时间：${this.formatSavedAt(slot.saveData.savedAt)}` : '';
    row.add(this.add.text(145, 22, savedAt, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
    }));

    const actionText = this.mode === 'save' ? '保存' : '读取';
    row.add(this.add.text(width - 42, rowHeight / 2, actionText, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: hasSave || this.mode === 'save' ? '#ebcb8b' : '#6b7280'
    }).setOrigin(0.5));

    bg.on('pointerover', () => bg.setFillStyle(hasSave ? 0x434c5e : 0x2e3440));
    bg.on('pointerout', () => bg.setFillStyle(bgColor));
    bg.on('pointerdown', () => this.onSlotSelected(slot));

    return row;
  }

  onSlotSelected(slot) {
    if (this.confirmContainer) return;

    if (this.mode === 'save') {
      if (slot.hasSave) {
        this.showConfirm('该存档位已有存档，是否覆盖？', '确认覆盖', () => this.saveSlot(slot.slotIndex));
      } else {
        this.saveSlot(slot.slotIndex);
      }
      return;
    }

    if (!slot.hasSave) {
      this.showToast('该存档位为空', 1600);
      return;
    }

    this.showConfirm('是否读取该存档？', '读取', () => this.loadSlot(slot.slotIndex));
  }

  saveSlot(slotIndex) {
    this.hideConfirm();
    const result = this.manager.saveGame(slotIndex);
    this.showToast(result.message || (result.success ? '存档成功' : '存档失败'), 900);
    if (!result.success) return;

    this.slots = this.manager.getAllSaveSlots();
    this.renderPage();
    this.time.delayedCall(700, () => this.closeScene('ShopScene'));
  }

  loadSlot(slotIndex) {
    this.hideConfirm();
    const result = this.manager.loadGame(slotIndex);
    this.showToast(result.message || (result.success ? '读取成功' : '读取失败'), 900);
    if (!result.success) return;

    resetTimeManager();
    // 标记存档恢复完成，防止读档后成就重复弹提示
    AchievementManager.markSaveLoaded();
    this.time.delayedCall(650, () => {
      window.gameState.setGameState(GAME_STATE.NORMAL);
      if (!window.gameState.getPlayerName?.()) {
        this.scene.start('PlayerNameScene', {
          returnScene: 'ShopScene'
        });
        return;
      }
      this.scene.start('ShopScene');
    });
  }

  changePage(delta) {
    const nextPage = Phaser.Math.Clamp(this.currentPage + delta, 1, TOTAL_PAGES);
    if (nextPage === this.currentPage) return;
    this.currentPage = nextPage;
    this.renderPage();
  }

  showConfirm(message, confirmText, onConfirm) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.confirmContainer = this.add.container(width / 2, height / 2).setDepth(300);
    this.confirmContainer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
      .setInteractive());
    this.confirmContainer.add(this.add.rectangle(0, 0, 420, 180, 0x1f2530, 0.98)
      .setStrokeStyle(3, 0xebcb8b));
    this.confirmContainer.add(this.add.text(0, -40, message, {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      align: 'center',
      wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5));

    const confirmButton = this.createButton(-90, 48, confirmText, onConfirm, 0x5e81ac);
    const cancelButton = this.createButton(90, 48, '取消', () => this.hideConfirm(), 0xbf616a);
    this.confirmContainer.add([confirmButton, cancelButton]);
  }

  hideConfirm() {
    if (!this.confirmContainer) return;
    this.confirmContainer.destroy();
    this.confirmContainer = null;
  }

  closeScene(forceReturnScene = null) {
    this.hideConfirm();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    const target = forceReturnScene || this.returnScene;
    this.scene.start(target);
  }

  createButton(x, y, text, callback, color = 0x5e81ac) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 130, 38, color, 0.92)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5);
    btn.add([bg, label]);

    bg.on('pointerover', () => {
      if (btn.getData('disabled')) return;
      bg.setAlpha(1);
    });
    bg.on('pointerout', () => bg.setAlpha(btn.getData('disabled') ? 0.35 : 0.92));
    bg.on('pointerdown', () => {
      if (btn.getData('disabled')) return;
      callback();
    });
    return btn;
  }

  setButtonEnabled(button, enabled) {
    button.setData('disabled', !enabled);
    button.setAlpha(enabled ? 1 : 0.35);
  }

  showToast(message, duration = 1500) {
    if (this.toast) this.toast.destroy();
    this.toast = this.add.container(this.cameras.main.width / 2, 38).setDepth(400);
    this.toast.add(this.add.rectangle(0, 0, 360, 46, 0x1f2530, 0.98)
      .setStrokeStyle(2, 0xa3be8c));
    this.toast.add(this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c'
    }).setOrigin(0.5));

    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      y: this.toast.y - 24,
      duration,
      ease: 'Power2',
      onComplete: () => {
        if (this.toast) {
          this.toast.destroy();
          this.toast = null;
        }
      }
    });
  }

  formatClock(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  formatSavedAt(value) {
    if (!value) return '未知';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }
}

export default SaveLoadScene;
