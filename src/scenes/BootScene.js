// 启动场景 - 加载基础资源
import gameConfig from '../data/gameConfig.json';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 加载像素风格占位图
    this.createPlaceholderAssets();
    
    // 显示加载进度
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x4a4a6a, 0.8);
    progressBox.fillRect(250, 270, 300, 50);
    
    const loadingText = this.add.text(400, 240, '正在初始化...', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    const percentText = this.add.text(400, 295, '0%', {
      fontSize: '18px',
      fontFamily: 'Courier New',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x88c0d0, 1);
      progressBar.fillRect(260, 280, 280 * value, 30);
      percentText.setText(Math.floor(value * 100) + '%');
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });
  }

  createPlaceholderAssets() {
    // 创建玩家占位图（像素风格方块）
    const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    playerGraphics.fillStyle(0x88c0d0);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.fillStyle(0x5e81ac);
    playerGraphics.fillRect(8, 8, 16, 16);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // 创建交互物占位图
    const objectGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    objectGraphics.fillStyle(0xd08770);
    objectGraphics.fillRect(0, 0, 48, 48);
    objectGraphics.fillStyle(0xbf616a);
    objectGraphics.fillRect(12, 12, 24, 24);
    objectGraphics.generateTexture('interactable_object', 48, 48);
    objectGraphics.destroy();

    // 创建 NPC 占位图
    const npcGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    npcGraphics.fillStyle(0xb48ead);
    npcGraphics.fillRect(0, 0, 32, 48);
    npcGraphics.fillStyle(0xa3be8c);
    npcGraphics.fillRect(8, 8, 16, 16);
    npcGraphics.generateTexture('npc', 32, 48);
    npcGraphics.destroy();
  }

  create() {
    // 加载完成后进入标题场景
    this.scene.start('TitleScene');
  }
}

export default BootScene;
