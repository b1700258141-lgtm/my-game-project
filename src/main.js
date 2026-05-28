// 游戏入口
import { Game } from 'phaser';
import config from './config.js';
import GameState from './systems/GameState.js';
import SaveLoadManager from './systems/SaveLoadManager.js';
import { getTimeManager } from './systems/TimeManager.js';

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
import SaveLoadScene from './scenes/SaveLoadScene.js';
import PlayerNameScene from './scenes/PlayerNameScene.js';
import OpeningStoryScene from './scenes/OpeningStoryScene.js';

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
  BookshelfArchiveScene,
  SaveLoadScene,
  PlayerNameScene,
  OpeningStoryScene
];

// 初始化游戏状态
const gameState = new GameState();

// 启动游戏
const game = new Game(config);

// 将游戏状态挂载到全局，方便调试
window.gameState = gameState;
window.game = game;

function shouldAutoSaveOnPageExit() {
  if (!window.gameState?.getPlayerName?.()) return false;

  const activeSceneKeys = window.game?.scene?.getScenes(true)?.map(scene => scene.scene.key) || [];
  const activeSaveLoadScene = window.game?.scene?.getScene?.('SaveLoadScene');
  if (activeSceneKeys.includes('SaveLoadScene') && activeSaveLoadScene?.returnScene === 'TitleScene') {
    return false;
  }

  const titleOnly = activeSceneKeys.length > 0 && activeSceneKeys.every(key => (
    key === 'BootScene' ||
    key === 'TitleScene' ||
    key === 'PlayerNameScene' ||
    key === 'OpeningStoryScene'
  ));

  return !titleOnly;
}

function autoSaveOnPageExit(reason) {
  if (!shouldAutoSaveOnPageExit()) return;

  const now = Date.now();
  if (window.__oddJobsLastAutoSaveAt && now - window.__oddJobsLastAutoSaveAt < 1500) {
    return;
  }
  window.__oddJobsLastAutoSaveAt = now;

  try {
    getTimeManager(window.gameState)?._syncToGameState?.();
    new SaveLoadManager(window.gameState).autoSave(reason);
  } catch (error) {
    console.warn('[AutoSave] 页面退出自动存档失败:', error);
  }
}

window.addEventListener('beforeunload', () => {
  autoSaveOnPageExit('beforeUnload');
});

window.addEventListener('pagehide', () => {
  autoSaveOnPageExit('pagehide');
});

// 注意：不再监听 visibilitychange，切换标签页不应触发自动存档

export { game, gameState };
