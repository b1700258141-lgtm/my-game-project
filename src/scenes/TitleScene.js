// 标题场景
import { resetTimeManager } from '../systems/TimeManager';

class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // 标题背景
    this.add.rectangle(centerX, centerY, 800, 600, 0x1a1a2e);
    
    // 装饰线
    this.add.rectangle(centerX, 150, 500, 2, 0x4a4a6a);
    this.add.rectangle(centerX, 450, 500, 2, 0x4a4a6a);

    // 游戏标题
    this.titleText = this.add.text(centerX, 100, '万事屋炼金物语', {
      fontSize: '48px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 副标题
    this.add.text(centerX, 200, "~ Mendel's General Store ~", {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#d08770',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // 炼金锅图标（用文字模拟）
    this.alchemyIcon = this.add.text(centerX, 300, '⚗️', {
      fontSize: '64px'
    }).setOrigin(0.5);

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
    this.startButton = this.createButton(centerX, 400, '开始游戏', () => {
      this.startGame();
    });

    // 继续游戏按钮（暂时禁用）
    this.continueButton = this.createButton(centerX, 460, '继续游戏', () => {
      // TODO: 实现存档读取
    });
    this.continueButton.setAlpha(0.5);
    this.continueButton.disableInteractive();

    // 底部提示
    this.add.text(centerX, 550, '© 2026 万事屋工作室', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#4a4a6a'
    }).setOrigin(0.5);

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

  createButton(x, y, text, callback) {
    const button = this.add.text(x, y, text, {
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      color: '#ffffff',
      backgroundColor: '#4a4a6a',
      padding: { x: 30, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      button.setStyle({ backgroundColor: '#5e81ac' });
    });

    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: '#4a4a6a' });
    });

    button.on('pointerdown', () => {
      button.setStyle({ backgroundColor: '#88c0d0' });
    });

    button.on('pointerup', () => {
      button.setStyle({ backgroundColor: '#5e81ac' });
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
      // 切换到商店场景
      this.scene.start('ShopScene');
    });
  }
}

export default TitleScene;
