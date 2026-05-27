import { WARM_UI, addWarmButton, addWarmPanel } from '../ui/WarmUITheme';
import { getSfxManager } from '../systems/SfxManager';
import { openingStory, systemPromptText } from '../data/openingStory';
import { getBgmManager } from '../systems/BgmManager';

// 开场白万事屋外景背景图
const OPENING_BG_PATH = '/assets/backgrounds/opening_general_store_bg.png';

// 主角立绘路径（后续替换）
const PLAYER_PORTRAIT_PATH = '/assets/portraits/player_opening.png';

// 布局常量
const PORTRAIT_AREA_W = 220;  // 左侧立绘区宽度
const DIALOG_W = 620;         // 对话框宽度
const DIALOG_H = 160;         // 对话框高度

class OpeningStoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OpeningStoryScene' });
    this.currentLine = 0;
    this.dialogContainer = null;
    this.nameText = null;
    this.textObj = null;
    this.playerName = '';
    this.isTyping = false;
    this.fullText = '';
    this._transitioning = false;
    this._inputLocked = false;
  }

  init(data = {}) {
    this.playerName = data.playerName || '店主';
    this.currentLine = 0;
    this._transitioning = false;
    this._inputLocked = false;
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // 继续使用主菜单 BGM
    getBgmManager().syncBySceneAndTime('opening');

    // 占位背景会在图片加载完成后被正式背景覆盖
    this.createPlaceholderBackground(w, h);

    // 尝试加载背景图
    this.tryLoadBgImage(w, h);

    // 左侧主角立绘预留区
    this.createPortraitPlaceholder(w, h);

    // 尝试加载立绘
    this.tryLoadPortrait(w, h);

    // 底部暖色对话框
    this.createDialogueBox(w, h);

    // 点击推进
    this.input.on('pointerdown', () => {
      if (this._inputLocked) return;
      if (this.isTyping) {
        this.textObj.setText(this.fullText);
        this.isTyping = false;
        return;
      }
      this.advanceStory();
    });

    this.showCurrentLine();
    this.cameras.main.fadeIn(400);
  }

  // ========== 背景 ==========

  createPlaceholderBackground(w, h) {
    // 黄昏旧街色
    this.add.rectangle(w / 2, h / 2, w, h, 0x121015);
    // 地面
    this.add.rectangle(w / 2, h * 0.75, w, h * 0.5, 0x1c1815);
    // 街道线
    this.add.rectangle(w / 2, h * 0.65, w, 4, 0x2a2018);
    // 店铺建筑
    this.add.rectangle(w * 0.55, h * 0.32, 200, 260, 0x1e1a18)
      .setStrokeStyle(3, 0x3a2a1a);
    // 门
    this.add.rectangle(w * 0.55, h * 0.42, 70, 130, 0x2a2016)
      .setStrokeStyle(2, 0x4a3018);
    // 门牌
    this.add.rectangle(w * 0.55, h * 0.22, 90, 26, 0x2a2016)
      .setStrokeStyle(2, 0x5a3820);
    this.add.text(w * 0.55, h * 0.22, '万事屋', {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#b8a080',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    // 灯笼光
    this.add.circle(w * 0.55 + 80, h * 0.18, 28, 0xd8a050, 0.12);
    // 星空
    for (let i = 0; i < 25; i++) {
      this.add.circle(
        Phaser.Math.Between(20, w - 20),
        Phaser.Math.Between(10, h * 0.25),
        Phaser.Math.FloatBetween(0.5, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.15, 0.5)
      );
    }
  }

  tryLoadBgImage(w, h) {
    if (this.textures.exists('openingBg')) {
      this.addOpeningBackgroundImage(w, h);
      return;
    }

    try {
      this.load.image('openingBg', OPENING_BG_PATH);
      this.load.once('filecomplete-image-openingBg', () => {
        this.addOpeningBackgroundImage(w, h);
      });
      this.load.start();
    } catch (_e) {
      // 文件不存在，使用占位背景
    }
  }

  addOpeningBackgroundImage(w, h) {
    const bg = this.add.image(w / 2, h / 2, 'openingBg');
    const coverScale = Math.max(w / bg.width, h / bg.height);
    bg.setScale(coverScale);
    bg.setDepth(0);

    // 柔和暗角提升对白可读性，同时不遮住店铺主体。
    const vignette = this.add.graphics();
    vignette.fillGradientStyle(0x2b160d, 0x2b160d, 0x120b08, 0x120b08, 0.18, 0.18, 0.32, 0.32);
    vignette.fillRect(0, 0, w, h);
    vignette.setDepth(0.2);
  }

  // ========== 立绘预留区 ==========

  createPortraitPlaceholder(w, h) {
    const portraitX = 110;
    const portraitY = h * 0.42;
    const portraitH = h * 0.52;

    // 立绘背景框（低调暗框，不干扰阅读）
    const frame = this.add.rectangle(portraitX, portraitY, PORTRAIT_AREA_W - 20, portraitH, 0x1a1818, 0.5)
      .setStrokeStyle(1, 0x3a2a18, 0.6);
    frame.setDepth(1);

    // 微弱的底部光
    this.add.ellipse(portraitX, portraitY + portraitH / 2 - 10, PORTRAIT_AREA_W - 40, 8, 0x3a2018, 0.3)
      .setDepth(1);
  }

  tryLoadPortrait(w, h) {
    if (!this.textures.exists('playerPortrait')) {
      try {
        this.load.image('playerPortrait', PLAYER_PORTRAIT_PATH);
        this.load.once('filecomplete-image-playerPortrait', () => {
          const portraitX = 110;
          const portraitY = h * 0.42;
          const maxH = h * 0.48;
          const sprite = this.add.image(portraitX, portraitY, 'playerPortrait');
          sprite.setDepth(2);
          // 等比例缩放
          const scale = Math.min(
            (PORTRAIT_AREA_W - 40) / sprite.width,
            maxH / sprite.height
          );
          sprite.setScale(scale);
        });
        this.load.start();
      } catch (_e) {
        // 文件不存在，只显示占位框
      }
    }
  }

  // ========== 对话框 ==========

  createDialogueBox(w, h) {
    // 对话框在底部，右偏避开立绘区
    const boxX = w / 2 + 30;
    const boxY = h - 95;

    this.dialogContainer = this.add.container(boxX, boxY).setDepth(50);

    addWarmPanel(this, this.dialogContainer, 0, 0, DIALOG_W, DIALOG_H, {
      alpha: 0.96,
      fill: WARM_UI.panel
    });

    // 姓名栏
    this.nameText = this.add.text(-DIALOG_W / 2 + 20, -DIALOG_H / 2 + 8, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.goldText,
      fontStyle: 'bold'
    });
    this.dialogContainer.add(this.nameText);

    // 正文（从姓名栏下方开始）
    this.textObj = this.add.text(-DIALOG_W / 2 + 20, -DIALOG_H / 2 + 32, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: DIALOG_W - 48, useAdvancedWrap: true },
      lineSpacing: 5
    });
    this.dialogContainer.add(this.textObj);

    // 继续提示
    const hint = this.add.text(DIALOG_W / 2 - 20, DIALOG_H / 2 - 16, '▼ 点击继续', {
      fontSize: '11px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textMuted
    }).setOrigin(0.5);
    this.dialogContainer.add(hint);

    this.tweens.add({
      targets: hint,
      alpha: { from: 1, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  // ========== 剧情逻辑 ==========

  showCurrentLine() {
    if (this.currentLine >= openingStory.length) {
      this.finishStory();
      return;
    }

    const line = openingStory[this.currentLine];
    let speakerName;

    if (line.speaker === 'player') {
      speakerName = this.playerName;
    } else if (line.speaker === 'npc') {
      speakerName = '早餐铺老板娘';
    } else {
      speakerName = '';
    }

    this.nameText.setText(speakerName);
    const text = line.text;
    this.fullText = text;

    if (line.speaker === 'stage') {
      this.textObj.setStyle({
        fontSize: '15px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        fontStyle: 'italic',
        wordWrap: { width: DIALOG_W - 48, useAdvancedWrap: true },
        lineSpacing: 5
      });
      this.textObj.setText(text);
    } else {
      this.textObj.setStyle({
        fontSize: '16px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.text,
        fontStyle: 'normal',
        wordWrap: { width: DIALOG_W - 48, useAdvancedWrap: true },
        lineSpacing: 5
      });
      this.typeText(text);
    }
  }

  typeText(text) {
    this.isTyping = true;
    this.textObj.setText('');
    let charIndex = 0;
    const typeDelay = 35;

    this.typeTimer = this.time.addEvent({
      delay: typeDelay,
      callback: () => {
        charIndex++;
        this.textObj.setText(text.substring(0, charIndex));
        if (charIndex >= text.length) {
          this.isTyping = false;
          if (this.typeTimer) this.typeTimer.destroy();
        }
      },
      repeat: text.length - 1
    });
  }

  advanceStory() {
    this._inputLocked = true;
    if (this.typeTimer) {
      this.typeTimer.destroy();
      this.typeTimer = null;
    }
    this.currentLine++;

    this.time.delayedCall(50, () => {
      this._inputLocked = false;
      this.showCurrentLine();
    });
  }

  // ========== 系统提示框 ==========

  finishStory() {
    if (this._transitioning) return;
    this._transitioning = true;

    if (this.typeTimer) {
      this.typeTimer.destroy();
      this.typeTimer = null;
    }

    window.gameState.hasSeenOpeningStory = true;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (this.dialogContainer) {
      this.dialogContainer.destroy();
      this.dialogContainer = null;
    }

    // 系统提示框（加高，避免文字与标题栏重叠）
    const panelW = 560;
    const panelH = 320;
    const promptContainer = this.add.container(w / 2, h / 2).setDepth(100);

    addWarmPanel(this, promptContainer, 0, 0, panelW, panelH, {
      title: '系统提示',
      fill: WARM_UI.panel
    });

    // 正文从标题栏下方开始（标题栏约在 y = -panelH/2 + 24 = -136，高度 34，底部约 -102）
    // 正文从 y = -90 开始，上方留足间距
    const msg = this.add.text(0, -70, systemPromptText, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: panelW - 80, useAdvancedWrap: true },
      lineSpacing: 8,
      align: 'center'
    }).setOrigin(0.5, 0);
    promptContainer.add(msg);

    // 确认按钮在文字下方，留足间距
    const btnY = msg.y + msg.height + 30;
    const confirmBtn = this.add.text(0, btnY, '「 确认 」', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.goldText,
      fontStyle: 'bold',
      backgroundColor: '#3a2418',
      padding: { x: 24, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerover', () => confirmBtn.setAlpha(0.85));
    confirmBtn.on('pointerout', () => confirmBtn.setAlpha(1));
    confirmBtn.on('pointerdown', () => {
      confirmBtn.disableInteractive();
      confirmBtn.setAlpha(0.6);
      this.goToShop();
    });
    promptContainer.add(confirmBtn);

    promptContainer.setAlpha(0);
    this.tweens.add({
      targets: promptContainer,
      alpha: 1,
      duration: 500
    });
  }

  goToShop() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      window.gameState.setGameState('normal');
      this.scene.start('ShopScene');
    });
  }
}

export default OpeningStoryScene;
