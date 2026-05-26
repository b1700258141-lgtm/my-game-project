import { GAME_STATE } from '../systems/GameState';
import { validatePlayerName } from '../security/nameModeration';
import { moderatePlayerName } from '../security/cloud/moderatePlayerNameApi';

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

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    this.add.rectangle(width / 2, height / 2, 520, 320, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);

    this.add.text(width / 2, height / 2 - 105, '请输入你的名字', {
      fontSize: '30px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 62, '1 到 12 个字符', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#d8dee9'
    }).setOrigin(0.5);

    const inputStyle = [
      'width: 300px',
      'height: 42px',
      'font-size: 20px',
      'font-family: Georgia, serif',
      'color: #eceff4',
      'background: #1f2530',
      'border: 2px solid #4c566a',
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
    const bg = this.add.rectangle(0, 0, 240, 46, 0x5e81ac, 0.94)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, text, {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5);
    btn.add([bg, label]);
    btn._bg = bg;
    btn._label = label;
    bg.on('pointerover', () => { if (!this.isSubmitting) bg.setFillStyle(0x81a1c1); });
    bg.on('pointerout', () => { if (!this.isSubmitting) bg.setFillStyle(0x5e81ac); });
    bg.on('pointerdown', () => { if (!this.isSubmitting) callback(); });
    return btn;
  }

  /**
   * 确认名字：本地校验 → 云审核 → 进入游戏
   */
  async confirmName() {
    // 防重复提交
    if (this.isSubmitting) return;
    const name = String(this.nameInput?.node?.value || '').trim();

    // ========== 第 1 步：本地校验 ==========
    const validation = validatePlayerName(name);
    if (!validation.valid) {
      this.showToast(validation.errorMessage);
      return;
    }
    const safeName = validation.sanitizedName || name;

    // ========== 第 2 步：云审核（CloudBase 云函数）==========
    this.isSubmitting = true;
    this._setSubmittingUI(true);
    try {
      const cloudResult = await moderatePlayerName(safeName);

      // 必须 ok=true 且 action='pass' 才进入游戏（fail-closed）
      if (cloudResult.ok && cloudResult.action === 'pass') {
        console.log('[nameModeration] cloud function passed, entering game, nameLength:', safeName.length);
      } else {
        console.log('[nameModeration] cloud function rejected:', cloudResult.action, 'nameLength:', safeName.length);
        this.showToast(cloudResult.message || '【系统】：这个名字不太合适，请换一个名字。');
        return;
      }
    } catch (_error) {
      // 云审核异常 → 绝对不能放行（fail-closed）
      console.log('[nameModeration] cloud function FAILED, blocking entry, error:', _error.message);
      this.showToast('【系统】：名字审核暂时不可用，请稍后重试。');
      return;
    } finally {
      this.isSubmitting = false;
      this._setSubmittingUI(false);
    }

    // ========== 第 3 步：通过，进入游戏 ==========
    this._proceedToGame(safeName);
  }

  /**
   * 设置提交中 UI 状态
   */
  _setSubmittingUI(submitting) {
    if (this.submitLabel) {
      this.submitLabel.setText(submitting ? '正在审核名字...' : '开始经营万事屋');
    }
    if (this.submitButton?._bg) {
      this.submitButton._bg.setFillStyle(submitting ? 0x4c566a : 0x5e81ac);
      if (!submitting) {
        this.submitButton._bg.setInteractive({ useHandCursor: true });
      } else {
        this.submitButton._bg.disableInteractive();
      }
    }
  }

  /**
   * 审核通过后进入游戏
   */
  _proceedToGame(safeName) {
    window.gameState.setPlayerName(safeName);
    try {
      window.localStorage?.setItem('oddjobs_alchemy_player_name', safeName);
    } catch (_error) {
      // localStorage is optional; formal persistence is handled by save data.
    }
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }

  showToast(message) {
    if (this.toast) this.toast.destroy();
    this.toast = this.add.container(this.cameras.main.width / 2, 96).setDepth(100);
    this.toast.add(this.add.rectangle(0, 0, 420, 46, 0x1f2530, 0.98)
      .setStrokeStyle(2, 0xbf616a));
    this.toast.add(this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#bf616a'
    }).setOrigin(0.5));
  }
}

export default PlayerNameScene;
