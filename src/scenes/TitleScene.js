// 标题场景
import { resetTimeManager } from '../systems/TimeManager';
import { getSfxManager } from '../systems/SfxManager';
import SaveLoadManager from '../systems/SaveLoadManager';
import AchievementManager from '../systems/AchievementManager';
import { getBgmManager } from '../systems/BgmManager';

class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 播放主菜单 BGM（浏览器自动播放限制下可能被拦截）
    getBgmManager().syncBySceneAndTime('mainMenu');

    // 首次点击游戏画面时解锁并重试 BGM 播放
    this.input.once('pointerdown', () => {
      getBgmManager().markUserInteracted();
      getBgmManager().syncBySceneAndTime('mainMenu');
    });

    const panelWidth = Phaser.Math.Clamp(width * 0.5, 560, 820);
    const panelHeight = Phaser.Math.Clamp(height * 0.68, 500, 620);
    const panelTop = centerY - panelHeight / 2;
    const panelBottom = centerY + panelHeight / 2;

    this.createWarmBackground(width, height);
    this.createMenuPanel(centerX, centerY, panelWidth, panelHeight);

    // 游戏标题
    this.titleText = this.add.text(centerX, panelTop + 105, '万事屋炼金物语', {
      fontSize: `${Phaser.Math.Clamp(width * 0.025, 36, 50)}px`,
      fontFamily: '"STKaiti", "KaiTi", "Microsoft YaHei", Georgia, serif',
      color: '#ffe6a8',
      fontStyle: 'bold',
      stroke: '#7b3f1f',
      strokeThickness: 5,
      shadow: {
        offsetX: 0,
        offsetY: 4,
        color: '#5f2f19',
        blur: 6,
        fill: true
      }
    }).setOrigin(0.5).setDepth(5);

    this.createTitleDecorations(centerX, panelTop + 106, panelWidth);
    this.createDivider(centerX, panelTop + 160, panelWidth * 0.62);

    // 副标题
    this.add.text(centerX, panelTop + 215, "~ Mendel's General Store ~", {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#b86b3b',
      fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(5);

    // 炼金釜图标
    this.alchemyIcon = this.createAlchemyIcon(centerX, centerY - 5);

    // 动画效果
    this.tweens.add({
      targets: this.alchemyIcon,
      scale: { from: 1, to: 1.1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 开始游戏按钮
    this.startButton = this.createButton(centerX, panelBottom - 185, '开始游戏', () => {
      this.startGame();
    });

    // 继续游戏按钮
    this.continueButton = this.createButton(centerX, panelBottom - 116, '继续游戏', () => {
      this.openLoadGame();
    });

    if (!new SaveLoadManager(window.gameState).getAllSaveSlots().some(slot => slot.hasSave)) {
      this.add.text(centerX, panelBottom - 70, '暂无存档时仍可进入读档界面查看空槽位', {
        fontSize: '12px',
        fontFamily: '"Microsoft YaHei", sans-serif',
        color: '#8b6a54'
      }).setOrigin(0.5).setAlpha(0.75).setDepth(5);
    }

    // 底部提示
    this.add.text(centerX, panelBottom - 28, '© 2026 万事屋工作室', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#7c6857'
    }).setOrigin(0.5).setAlpha(0.55).setDepth(5);

    // 键盘监听
    this.input.keyboard.on('keydown-SPACE', () => {
      this.startGame();
    });

    // 标题淡入
    this.titleText.setAlpha(0);
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 1000,
      ease: 'Power2'
    });
  }

  createWarmBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5f2e1a, 0x5f2e1a, 0xf7d69b, 0xe9a06f, 1);
    bg.fillRect(0, 0, width, height);

    const duskGlow = this.add.ellipse(width * 0.54, height * 0.4, width * 0.74, height * 0.78, 0xffd99d, 0.2);
    if (Phaser.BlendModes?.SCREEN !== undefined) {
      duskGlow.setBlendMode(Phaser.BlendModes.SCREEN);
    }

    const decor = this.add.graphics();
    decor.lineStyle(2, 0x7a4328, 0.13);
    for (let x = -40; x < width + 80; x += 72) {
      decor.beginPath();
      decor.moveTo(x, 0);
      decor.lineTo(x + 32, height);
      decor.strokePath();
    }

    // 远处现代城市剪影，让老屋和现代都市感同时存在。
    decor.fillStyle(0x5b3828, 0.18);
    const baseY = height * 0.82;
    for (let i = 0; i < 12; i += 1) {
      const buildingW = 38 + (i % 3) * 18;
      const buildingH = 70 + (i % 4) * 28;
      const x = width * 0.08 + i * (buildingW + 24);
      decor.fillRect(x, baseY - buildingH, buildingW, buildingH);
      decor.fillStyle(0xf7d9a8, 0.12);
      for (let wy = baseY - buildingH + 14; wy < baseY - 12; wy += 18) {
        decor.fillRect(x + 9, wy, 6, 8);
        decor.fillRect(x + buildingW - 16, wy, 6, 8);
      }
      decor.fillStyle(0x5b3828, 0.18);
    }

    this.createBackgroundWindow(width * 0.78, height * 0.24, 150, 108);
    this.createAlchemyCircle(width * 0.22, height * 0.72, 118, 0.13);
    this.createCherryBranch(width, height);
    this.createPetals(width, height);
  }

  createBackgroundWindow(x, y, w, h) {
    const windowG = this.add.graphics();
    windowG.lineStyle(4, 0x8a5534, 0.13);
    windowG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    windowG.lineStyle(2, 0x8a5534, 0.11);
    windowG.lineBetween(x, y - h / 2, x, y + h / 2);
    windowG.lineBetween(x - w / 2, y, x + w / 2, y);
  }

  createAlchemyCircle(x, y, radius, alpha) {
    const circle = this.add.graphics();
    circle.lineStyle(2, 0x8f5b32, alpha);
    circle.strokeCircle(x, y, radius);
    circle.strokeCircle(x, y, radius * 0.66);
    circle.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i - 90);
      const px = x + Math.cos(angle) * radius * 0.78;
      const py = y + Math.sin(angle) * radius * 0.78;
      if (i === 0) circle.moveTo(px, py);
      else circle.lineTo(px, py);
    }
    circle.closePath();
    circle.strokePath();
  }

  createCherryBranch(width) {
    const branch = this.add.graphics();
    branch.lineStyle(7, 0x5f321f, 0.34);
    branch.beginPath();
    for (let i = 0; i < 14; i += 1) {
      const t1 = i / 14;
      const t2 = (i + 1) / 14;
      const x1 = Phaser.Math.Linear(-20, width * 0.24, t1);
      const y1 = Phaser.Math.Interpolation.QuadraticBezier(t1, 88, 58, 118);
      const x2 = Phaser.Math.Linear(-20, width * 0.24, t2);
      const y2 = Phaser.Math.Interpolation.QuadraticBezier(t2, 88, 58, 118);
      branch.lineBetween(x1, y1, x2, y2);
    }
    branch.strokePath();

    for (let i = 0; i < 8; i += 1) {
      const x = 38 + i * 48;
      const y = 80 + Math.sin(i) * 22;
      this.createSakuraPetal(x, y, 0.9, 0.55);
      this.createSakuraPetal(x + 15, y + 10, 0.65, 0.42);
    }
  }

  createPetals(width, height) {
    const petals = [
      [width * 0.18, height * 0.23, 0.5],
      [width * 0.72, height * 0.18, 0.42],
      [width * 0.84, height * 0.56, 0.36],
      [width * 0.12, height * 0.58, 0.33],
      [width * 0.64, height * 0.75, 0.38]
    ];
    petals.forEach(([x, y, alpha], index) => {
      const petal = this.createSakuraPetal(x, y, 0.7, alpha);
      petal.setRotation(index * 0.7);
      this.tweens.add({
        targets: petal,
        y: y + 8,
        rotation: petal.rotation + 0.18,
        duration: 2200 + index * 320,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
  }

  createSakuraPetal(x, y, scale = 1, alpha = 1) {
    const petal = this.add.graphics({ x, y });
    petal.fillStyle(0xffc4ca, alpha);
    petal.fillEllipse(0, 0, 16 * scale, 8 * scale);
    petal.fillStyle(0xffe4e2, alpha * 0.7);
    petal.fillEllipse(-2 * scale, -1 * scale, 7 * scale, 3 * scale);
    petal.setRotation(-0.55);
    return petal;
  }

  createMenuPanel(x, y, width, height) {
    const shadow = this.add.graphics();
    shadow.fillStyle(0x5a2b18, 0.3);
    shadow.fillRoundedRect(x - width / 2 + 8, y - height / 2 + 10, width, height, 20);

    const panel = this.add.graphics();
    panel.fillStyle(0xf6d9a7, 0.9);
    panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, 20);
    panel.fillGradientStyle(0xffecd1, 0xffe2bc, 0xd99b65, 0xc47b4c, 0.82);
    panel.fillRoundedRect(x - width / 2 + 6, y - height / 2 + 6, width - 12, height - 12, 16);
    panel.lineStyle(5, 0x7b4828, 0.86);
    panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 20);
    panel.lineStyle(2, 0xffefc7, 0.8);
    panel.strokeRoundedRect(x - width / 2 + 10, y - height / 2 + 10, width - 20, height - 20, 14);

    const texture = this.add.graphics();
    texture.lineStyle(1, 0x8a5734, 0.12);
    for (let i = 0; i < 12; i += 1) {
      const yy = y - height / 2 + 34 + i * ((height - 68) / 11);
      texture.lineBetween(x - width / 2 + 34, yy, x + width / 2 - 34, yy + Math.sin(i) * 4);
    }

    this.createPanelCorner(x - width / 2 + 34, y - height / 2 + 34, 1);
    this.createPanelCorner(x + width / 2 - 34, y - height / 2 + 34, -1);
    this.createPanelCorner(x - width / 2 + 34, y + height / 2 - 34, 1, true);
    this.createPanelCorner(x + width / 2 - 34, y + height / 2 - 34, -1, true);
  }

  createPanelCorner(x, y, direction, flipY = false) {
    const corner = this.add.graphics();
    corner.fillStyle(0x8b4f2a, 0.9);
    corner.fillTriangle(x, y, x + direction * 28, y, x, y + (flipY ? -28 : 28));
    corner.fillStyle(0xffd58a, 0.35);
    corner.fillCircle(x + direction * 8, y + (flipY ? -8 : 8), 3);
  }

  createDivider(x, y, width) {
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x9a6438, 0.62);
    divider.lineBetween(x - width / 2, y, x + width / 2, y);
    divider.fillStyle(0xd38b4e, 0.8);
    divider.fillCircle(x, y, 4);
    divider.fillCircle(x - width / 2, y, 3);
    divider.fillCircle(x + width / 2, y, 3);
  }

  createTitleDecorations(centerX, y, panelWidth) {
    const left = centerX - panelWidth * 0.3;
    const right = centerX + panelWidth * 0.3;

    this.createPotionBottle(left, y + 2, 0.9);
    this.createSakuraPetal(left + 34, y - 16, 0.85, 0.9).setDepth(6);
    this.add.text(right - 24, y - 5, '✦', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#b86b3b'
    }).setOrigin(0.5).setAlpha(0.78).setDepth(6);
    this.createAlchemyCircle(right + 18, y + 2, 18, 0.45);
  }

  createPotionBottle(x, y, scale = 1) {
    const bottle = this.add.graphics({ x, y });
    bottle.fillStyle(0x6bd0b8, 0.95);
    bottle.fillRoundedRect(-9 * scale, -2 * scale, 18 * scale, 24 * scale, 6 * scale);
    bottle.fillStyle(0xfff2c4, 0.95);
    bottle.fillRect(-5 * scale, -14 * scale, 10 * scale, 14 * scale);
    bottle.fillStyle(0x8b4f2a, 0.9);
    bottle.fillRoundedRect(-7 * scale, -18 * scale, 14 * scale, 5 * scale, 2 * scale);
    bottle.fillStyle(0xeafff2, 0.42);
    bottle.fillEllipse(-3 * scale, 5 * scale, 7 * scale, 14 * scale);
    bottle.lineStyle(2, 0x5b3a2b, 0.65);
    bottle.strokeRoundedRect(-9 * scale, -2 * scale, 18 * scale, 24 * scale, 6 * scale);
    bottle.setDepth(6);
    return bottle;
  }

  createAlchemyIcon(x, y) {
    const icon = this.add.container(x, y);
    const glow = this.add.ellipse(0, 16, 130, 44, 0xffd68c, 0.2);
    const cauldron = this.add.graphics();

    cauldron.fillStyle(0x6f3f28, 1);
    cauldron.fillEllipse(0, 18, 78, 46);
    cauldron.fillStyle(0x3f291f, 1);
    cauldron.fillEllipse(0, 12, 86, 28);
    cauldron.fillStyle(0x72d7a7, 0.95);
    cauldron.fillEllipse(0, 6, 68, 18);
    cauldron.lineStyle(3, 0xffd27b, 0.8);
    cauldron.strokeEllipse(0, 6, 68, 18);
    cauldron.lineStyle(5, 0x4e2f22, 0.95);
    cauldron.lineBetween(-26, 36, -38, 54);
    cauldron.lineBetween(26, 36, 38, 54);
    cauldron.fillStyle(0xb6fff2, 0.65);
    cauldron.fillCircle(-14, -2, 5);
    cauldron.fillCircle(8, -6, 4);
    cauldron.fillCircle(23, -1, 3);

    const spoon = this.add.graphics();
    spoon.lineStyle(5, 0xf6ead2, 0.95);
    spoon.lineBetween(18, -24, 52, -9);
    spoon.fillStyle(0xf6ead2, 0.95);
    spoon.fillEllipse(55, -8, 20, 8);

    const sparkle = this.add.text(-48, -18, '✦', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#ffe6a8'
    }).setOrigin(0.5).setAlpha(0.8);

    icon.add([glow, cauldron, spoon, sparkle]);
    icon.setDepth(5);
    return icon;
  }

  createButton(x, y, text, callback) {
    const width = 190;
    const height = 54;
    const button = this.add.container(x, y).setSize(width, height).setDepth(5);
    const shadow = this.add.graphics();
    const board = this.add.graphics();
    const hitZone = this.add.zone(0, 0, width + 18, height + 14)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(0, -1, text, {
      fontSize: '24px',
      fontFamily: '"Microsoft YaHei", Georgia, serif',
      color: '#fff6dc',
      fontStyle: 'bold',
      stroke: '#5f321f',
      strokeThickness: 3
    }).setOrigin(0.5);

    const drawButton = (fill, border, yOffset = 0) => {
      shadow.clear();
      shadow.fillStyle(0x5b2f1d, 0.35);
      shadow.fillRoundedRect(-width / 2 + 4, -height / 2 + 6 + yOffset, width, height, 10);

      board.clear();
      board.fillStyle(fill, 0.98);
      board.fillRoundedRect(-width / 2, -height / 2 + yOffset, width, height, 10);
      board.lineStyle(3, border, 1);
      board.strokeRoundedRect(-width / 2, -height / 2 + yOffset, width, height, 10);
      board.lineStyle(1, 0xffe0a6, 0.42);
      board.lineBetween(-width / 2 + 18, -height / 2 + 13 + yOffset, width / 2 - 18, -height / 2 + 9 + yOffset);
      board.lineBetween(-width / 2 + 18, height / 2 - 14 + yOffset, width / 2 - 18, height / 2 - 10 + yOffset);
      label.setY(-1 + yOffset);
    };

    drawButton(0x9b5a31, 0x6b381f);
    button.add([shadow, board, label, hitZone]);

    hitZone.on('pointerover', () => {
      drawButton(0xba7040, 0xffcf7a, -2);
    });

    hitZone.on('pointerout', () => {
      drawButton(0x9b5a31, 0x6b381f);
    });

    hitZone.on('pointerdown', () => {
      drawButton(0x7f4427, 0xffbd64, 2);
    });

    hitZone.on('pointerup', () => {
      drawButton(0xba7040, 0xffcf7a, -2);
      getBgmManager().markUserInteracted();
      callback();
    });

    return button;
  }

  startGame() {
    // 淡出效果
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // 重置游戏状态
      window.gameState.reset();
      // 重置时间管理器
      resetTimeManager();
      // 重置成就追踪
      AchievementManager.resetTracking();
      // 先输入主角名字，再进入主界面
      this.scene.start('PlayerNameScene', {
        returnScene: 'ShopScene'
      });
    });
  }

  openLoadGame() {
    this.scene.start('SaveLoadScene', {
      mode: 'load',
      returnScene: 'TitleScene'
    });
  }
}

export default TitleScene;
