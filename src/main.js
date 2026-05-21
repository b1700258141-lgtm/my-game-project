// 游戏入口
import { Game } from 'phaser';
import config from './config.js';
import GameState from './systems/GameState.js';

// 导入所有场景
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import ShopScene from './scenes/ShopScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import MemoryScene from './scenes/MemoryScene.js';
import DayEndScene from './scenes/DayEndScene.js';
import CommissionListScene from './scenes/CommissionListScene.js';
import QuestLogScene from './scenes/QuestLogScene.js';
import InventoryScene from './scenes/InventoryScene.js';
import AlchemyScene from './scenes/AlchemyScene.js';
import FurnitureUpgradeScene from './scenes/FurnitureUpgradeScene.js';
import BookshelfArchiveScene from './scenes/BookshelfArchiveScene.js';

// 注册场景
config.scene = [
  BootScene,
  TitleScene,
  ShopScene,
  DialogueScene,
  MemoryScene,
  DayEndScene,
  CommissionListScene,
  QuestLogScene,
  InventoryScene,
  AlchemyScene,
  FurnitureUpgradeScene,
  BookshelfArchiveScene
];

// 初始化游戏状态
const gameState = new GameState();

// 启动游戏
const game = new Game(config);

// 将游戏状态挂载到全局，方便调试
window.gameState = gameState;
window.game = game;

export { game, gameState };
