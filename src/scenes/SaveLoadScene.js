import SaveLoadManager, { SAVE_TYPE } from '../systems/SaveLoadManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { getTimeManager, resetTimeManager } from '../systems/TimeManager';
import AchievementManager from '../systems/AchievementManager';
import { getSfxManager } from '../systems/SfxManager';
import { WARM_UI, addWarmButton, addWarmPanel } from '../ui/WarmUITheme';
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

    this.add.rectangle(width / 2, height / 2, width, height, 0x1b100b, 0.78);

    this.panel = this.add.container(width / 2, height / 2);
    addWarmPanel(this, this.panel, 0, 0, 680, 560, {
      fill: WARM_UI.panel,
      border: WARM_UI.border,
      alpha: 0.98
    });

    this.panel.add(this.add.text(0, -255, this.mode === 'save' ? '保存游戏' : '读取存档', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.panel.add(this.add.rectangle(0, -222, 610, 2, WARM_UI.border));

    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: 0,
      y: 0,
      width: 600,
      height: 420,
      rowHeight: 74,
      rowGap: 2
    });

    this.prevButton = this.createButton(-210, 265, '上一页', () => this.changePage(-1), WARM_UI.border);
    this.nextButton = this.createButton(210, 265, '下一页', () => this.changePage(1), WARM_UI.border);
    this.closeButton = this.createButton(0, 265, '关闭', () => this.closeScene(), WARM_UI.warning);
    this.panel.add([this.prevButton, this.nextButton, this.closeButton]);

    this.pageText = this.add.text(0, 227, '', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: WARM_UI.textMuted
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
    const bgColor = hasSave ? WARM_UI.panelLight : WARM_UI.panelDark;
    const borderColor = hasSave ? WARM_UI.border : 0x9b7a58;

    const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 10, rowHeight - 4, bgColor, 0.9)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    row.add(bg);

    row.add(this.add.text(16, 7, `存档位 ${slot.slotIndex}`, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold'
    }));

    const isAutoSave = hasSave && slot.saveData.saveType === SAVE_TYPE.AUTO;
    const infoWidth = width - 310;
    const playerName = hasSave ? this.truncateText(slot.saveData.playerName || '未命名', 12) : '';
    const titleLine = hasSave ? `${playerName} / Lv${slot.saveData.wanShiWuLevel || 1}` : '空';
    row.add(this.add.text(145, 7, titleLine, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: hasSave ? WARM_UI.text : WARM_UI.textMuted,
      fixedWidth: infoWidth,
      maxLines: 1
    }));

    const summary = hasSave
      ? `第${slot.saveData.currentDay}天 ${this.formatClock(slot.saveData.currentHour, slot.saveData.currentMinute)} / 资金${slot.saveData.money} / 人气${slot.saveData.popularity}`
      : '';
    row.add(this.add.text(145, 25, summary, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: hasSave ? WARM_UI.text : WARM_UI.textMuted,
      fixedWidth: infoWidth,
      maxLines: 1
    }));

    const autoSaveReason = isAutoSave ? this.getAutoSaveReasonText(slot.saveData.autoSaveReason) : '';
    const typeText = isAutoSave ? `自动存档 · ${autoSaveReason}` : '';
    row.add(this.add.text(145, 42, typeText, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: isAutoSave ? WARM_UI.goldText : WARM_UI.textMuted,
      fixedWidth: infoWidth,
      maxLines: 1
    }).setAlpha(isAutoSave ? 0.82 : 0.65));

    const savedAt = hasSave ? `保存时间：${this.formatSavedAt(slot.saveData.savedAt)}` : '';
    row.add(this.add.text(145, 57, savedAt, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: WARM_UI.textMuted,
      fixedWidth: infoWidth,
      maxLines: 1
    }));

    const actionText = this.mode === 'save' ? '保存' : '读取';
    row.add(this.add.text(width - 88, rowHeight / 2, actionText, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: hasSave || this.mode === 'save' ? WARM_UI.goldText : WARM_UI.textMuted
    }).setOrigin(0.5));

    if (hasSave) {
      const deleteBtn = this.createSmallButton(width - 32, rowHeight / 2, '删', () => {
        this.showConfirm(`确定删除存档位 ${slot.slotIndex} 吗？`, '删除', () => this.deleteSlot(slot.slotIndex), WARM_UI.warning);
      }, WARM_UI.warning);
      row.add(deleteBtn);
    }

    bg.on('pointerover', () => bg.setFillStyle(hasSave ? WARM_UI.buttonHover : WARM_UI.panel));
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
    getTimeManager(window.gameState)?._syncToGameState?.();
    const result = this.manager.saveGame(slotIndex);
    if (result.success) {
      getSfxManager().confirm();
    } else {
      getSfxManager().error();
    }
    this.showToast(result.message || (result.success ? '存档成功' : '存档失败'), 900);
    if (!result.success) return;

    this.slots = this.manager.getAllSaveSlots();
    this.renderPage();
    this.time.delayedCall(700, () => this.closeScene('ShopScene'));
  }

  loadSlot(slotIndex) {
    this.hideConfirm();
    const result = this.manager.loadGame(slotIndex);
    if (result.success) {
      getSfxManager().confirm();
    } else {
      getSfxManager().error();
    }
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

  deleteSlot(slotIndex) {
    this.hideConfirm();
    const result = this.manager.deleteSave(slotIndex);
    if (result.success) {
      getSfxManager().confirm();
    } else {
      getSfxManager().error();
    }
    this.showToast(result.message || (result.success ? '删除成功' : '删除失败'), 900);
    this.slots = this.manager.getAllSaveSlots();
    this.renderPage();
  }

  changePage(delta) {
    const nextPage = Phaser.Math.Clamp(this.currentPage + delta, 1, TOTAL_PAGES);
    if (nextPage === this.currentPage) return;
    this.currentPage = nextPage;
    this.renderPage();
  }

  showConfirm(message, confirmText, onConfirm, confirmColor = WARM_UI.button) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.confirmContainer = this.add.container(width / 2, height / 2).setDepth(300);
    this.confirmContainer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
      .setInteractive());
    addWarmPanel(this, this.confirmContainer, 0, 0, 420, 180, {
      fill: WARM_UI.panelLight,
      border: WARM_UI.border,
      alpha: 0.98
    });
    this.confirmContainer.add(this.add.text(0, -40, message, {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      align: 'center',
      wordWrap: { width: 360, useAdvancedWrap: true }
    }).setOrigin(0.5));

    const confirmButton = this.createButton(-90, 48, confirmText, onConfirm, confirmColor);
    const cancelButton = this.createButton(90, 48, '取消', () => this.hideConfirm(), WARM_UI.warning);
    this.confirmContainer.add([confirmButton, cancelButton]);
  }

  hideConfirm() {
    if (!this.confirmContainer) return;
    this.confirmContainer.destroy();
    this.confirmContainer = null;
  }

  _toggleDeleteMode() {
    this.deleteMode = !this.deleteMode;
    if (this.deleteMode) {
      getSfxManager().openMenu();
      if (this.deleteButtonLabel) this.deleteButtonLabel.setText('退出删除').setColor('#ffffff');
    } else {
      getSfxManager().closeMenu();
      if (this.deleteButtonLabel) this.deleteButtonLabel.setText('删除存档').setColor('#ffcccc');
    }
    this.renderPage();
  }

  closeScene(forceReturnScene = null) {
    this.hideConfirm();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    getSfxManager().closeMenu();
    const target = forceReturnScene || this.returnScene;
    this.scene.start(target);
  }

  createButton(x, y, text, callback, color = WARM_UI.button) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 130, 38, color, 0.92)
      .setStrokeStyle(2, WARM_UI.border)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight
    }).setOrigin(0.5);
    btn.add([bg, label]);

    bg.on('pointerover', () => {
      if (btn.getData('disabled')) return;
      bg.setAlpha(1);
    });
    bg.on('pointerout', () => bg.setAlpha(btn.getData('disabled') ? 0.35 : 0.92));
    bg.on('pointerdown', () => {
      if (btn.getData('disabled')) return;
      getSfxManager().clickButton();
      callback();
    });
    return btn;
  }

  createSmallButton(x, y, text, callback, color = WARM_UI.button) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 38, 26, color, 0.92)
      .setStrokeStyle(2, WARM_UI.border)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.add([bg, label]);
    bg.on('pointerover', () => bg.setAlpha(1));
    bg.on('pointerout', () => bg.setAlpha(0.92));
    bg.on('pointerdown', () => {
      getSfxManager().clickButton();
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
    this.toast.add(this.add.rectangle(0, 0, 360, 46, WARM_UI.panelLight, 0.98)
      .setStrokeStyle(2, WARM_UI.border));
    this.toast.add(this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
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

  truncateText(text, maxLength) {
    const value = String(text || '');
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
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

  getAutoSaveReasonText(reason) {
    const map = {
      returnToMenu: '自动保存于返回主菜单时',
      beforeUnload: '系统自动保存',
      pagehide: '系统自动保存',
      visibilitychange: '系统自动保存'
    };
    return map[reason] || '系统自动保存';
  }
}

export default SaveLoadScene;
