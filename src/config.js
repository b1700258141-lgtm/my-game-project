// Phaser 游戏配置
import gameConfig from './data/gameConfig.json';

// 动态获取游戏尺寸
const GAME_WIDTH = gameConfig.display.width;
const GAME_HEIGHT = gameConfig.display.height;

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  pixelArt: true, // 像素风格
  dom: {
    createContainer: true
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: []
};

export default config;
