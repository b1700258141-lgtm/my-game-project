import { WARM_UI, addWarmButton, addWarmPanel, addWarmTag } from '../ui/WarmUITheme';
import { getSfxManager } from '../systems/SfxManager';
import { GAME_STATE } from '../systems/GameState';
import { validatePlayerName } from '../security/nameModeration';
import { moderatePlayerName } from '../security/cloud/moderatePlayerNameApi';
import { getBgmManager } from '../systems/BgmManager';

class PlayerNameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayerNameScene' });
    this.returnScene = 'ShopScene';
    this.nameInput = null;
    this.toast = null;
    this.submitButton = null;
    this.submitLabel = null;
    this.isSubmitting = false;
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    window.gameState.setGameState(GAME_STATE.NAME_INPUT);

    // 播放主菜单 BGM
    getBgmManager().syncBySceneAndTime('mainMenu');

    this.add.rectangle(width / 2, height / 2, width, height, WARM_UI.shadow, 0.92);
    addWarmPanel(this, null, width / 2, height / 2, 520, 320, { title: '万事屋登记簿' });

    this.add.text(width / 2, height / 2 - 105, '请输入你的名字', {
      fontSize: '30px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 62, '1 到 12 个字符', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: WARM_UI.textMuted
    }).setOrigin(0.5);

    const inputStyle = [
      'width: 300px',
      'height: 42px',
      'font-size: 20px',
      'font-family: Georgia, serif',
      'color: #2B1E17',
      'background: #F3DFB9',
      'border: 2px solid #3A2418',
      'border-radius: 4px',
      'outline: none',
      'text-align: center',
      'padding: 0 12px'
    ].join(';');

    this.nameInput = this.add.dom(width / 2, height / 2 - 8, 'input', inputStyle);
    this.nameInput.node.setAttribute('type', 'text');
    this.nameInput.node.setAttribute('maxlength', '12');
    this.nameInput.node.setAttribute('aria-label', '主角名字');
    this.nameInput.node.value = window.gameState.getPlayerName?.() || '';

    this.submitButton = this.createButton(width / 2, height / 2 + 72, '开始经营万事屋', () => this.confirmName());
    this.submitLabel = this.submitButton?._label || null;

    this.input.keyboard.on('keydown-ENTER', () => this.confirmName());
    this.time.delayedCall(100, () => this.nameInput?.node?.focus());
  }

  createButton(x, y, text, callback) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 240, 46, WARM_UI.button, 0.94)
      .setStrokeStyle(2, WARM_UI.buttonHover)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    }).setOrigin(0.5);
    btn.add([bg, label]);
    btn._bg = bg;
    btn._label = label;
    bg.on('pointerover', () => { if (!this.isSubmitting) bg.setFillStyle(WARM_UI.buttonHover); });
    bg.on('pointerout', () => { if (!this.isSubmitting) bg.setFillStyle(WARM_UI.button); });
    bg.on('pointerdown', () => { if (!this.isSubmitting) callback(); });
    return btn;
  }

  /**
   * 纭鍚嶅瓧锛氭湰鍦版牎楠?鈫?浜戝鏍?鈫?杩涘叆娓告垙
   */
  async confirmName() {
    // 防止重复提交。
    if (this.isSubmitting) return;
    getBgmManager().markUserInteracted();
    const name = String(this.nameInput?.node?.value || '').trim();

    // ========== 绗?1 姝ワ細鏈湴鏍￠獙 ==========
    const validation = validatePlayerName(name);
    if (!validation.valid) {
      this.showToast(validation.errorMessage);
      return;
    }
    const safeName = validation.sanitizedName || name;

    // ========== 绗?2 姝ワ細浜戝鏍革紙CloudBase 浜戝嚱鏁帮級==========
    this.isSubmitting = true;
    this._setSubmittingUI(true);
    try {
      const cloudResult = await moderatePlayerName(safeName);

      // 必须 ok=true 且 action='pass' 才进入游戏。
      if (cloudResult.ok && cloudResult.action === 'pass') {
        console.log('[nameModeration] cloud function passed, entering game, nameLength:', safeName.length);
      } else {
        console.log('[nameModeration] cloud function rejected:', cloudResult.action, 'nameLength:', safeName.length);
        this.showToast(cloudResult.message || '【系统】：这个名字不太合适，请换一个名字。');
        return;
      }
    } catch (_error) {
      console.log('[nameModeration] cloud function FAILED, blocking entry, error:', _error.message);
      this.showToast('【系统】：名字审核暂时不可用，请稍后重试。');
      return;
    } finally {
      this.isSubmitting = false;
      this._setSubmittingUI(false);
    }

    // ========== 绗?3 姝ワ細閫氳繃锛岃繘鍏ユ父鎴?==========
    this._proceedToGame(safeName);
  }

  /**
   * 璁剧疆鎻愪氦涓?UI 鐘舵€?   */
  _setSubmittingUI(submitting) {
    if (this.submitLabel) {
      this.submitLabel.setText(submitting ? '正在审核名字...' : '开始经营万事屋');
    }
    if (this.submitButton?._bg) {
      this.submitButton._bg.setFillStyle(submitting ? WARM_UI.border : WARM_UI.button);
      if (!submitting) {
        this.submitButton._bg.setInteractive({ useHandCursor: true });
      } else {
        this.submitButton._bg.disableInteractive();
      }
    }
  }

  /**
   * 瀹℃牳閫氳繃鍚庤繘鍏ユ父鎴?   */
  _proceedToGame(safeName) {
    window.gameState.setPlayerName(safeName);
    try {
      window.localStorage?.setItem('oddjobs_alchemy_player_name', safeName);
    } catch (_error) {
      // localStorage is optional; formal persistence is handled by save data.
    }
    window.gameState.setGameState(GAME_STATE.NORMAL);
    // 先进入开场剧情
    this.scene.start('OpeningStoryScene', {
      playerName: safeName
    });
  }

  showToast(message) {
    if (this.toast) this.toast.destroy();
    this.toast = this.add.container(this.cameras.main.width / 2, 96).setDepth(100);
    this.toast.add(this.add.rectangle(0, 0, 420, 46, WARM_UI.panel, 0.98)
      .setStrokeStyle(2, WARM_UI.warning));
    this.toast.add(this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.warningText
    }).setOrigin(0.5));
  }
}

export default PlayerNameScene;
