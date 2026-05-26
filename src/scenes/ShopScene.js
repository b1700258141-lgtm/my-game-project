// 万事屋主场景 - 重构版（含背包、NPC提示、奖励弹窗、时间系统、昼夜、床铺、门、商店）
import gameConfig from '../data/gameConfig.json';
import shopObjects from '../data/shopObjects.json';
import npcs from '../data/npcs.json';
import shopItemsData from '../data/shopItems.json';
import CommissionSystem from '../systems/CommissionSystem';
import VisitorSystem from '../systems/VisitorSystem';
import InventorySystem from '../systems/InventorySystem';
import ScrollableListUI from '../systems/ScrollableListUI';
import RandomNpcManager, { RANDOM_NPC_STATE } from '../systems/RandomNpcManager';
import TimeManager, { getTimeManager, resetTimeManager } from '../systems/TimeManager';
import DailyLoopManager from '../systems/DailyLoopManager';
import FurnitureUpgradeManager from '../systems/FurnitureUpgradeManager';
import SpiritMemoryManager from '../systems/SpiritMemoryManager';
import AchievementManager from '../systems/AchievementManager';
import AchievementToastUI from '../systems/AchievementToastUI';
import { GAME_STATE } from '../systems/GameState';

class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });

    this.player = null;
    this.cursors = null;
    this.wasd = null;
    this.uiGroup = null;
    this.interactionPrompt = null;
    this.nearbyObject = null;
    this.interactables = [];
    this.npcList = [];
    this.objectsConfig = shopObjects.objects;
    this.interactionDistance = shopObjects.interactionDistance || 70;

    // 委托和来访系统
    this.commissionSystem = null;
    this.visitorSystem = null;
    this.inventorySystem = null;
    this.dailyLoopManager = null;
    this.furnitureManager = null;
    this.visitorNPCs = [];

    // 奖励弹窗状态
    this.rewardPopup = null;

    // 时间管理器
    this.timeManager = null;

    // 昼夜遮罩
    this.dayNightOverlay = null;
    this.dayPhaseLabel = null;

    // 弹出 UI 容器（睡觉、地点选择、商店）
    this.popupContainer = null;

    // 商店物品数据
    this.shopItems = shopItemsData.shopItems;

    // 成就系统
    this.achievementManager = null;
    this.achievementToastUI = null;
    this.lanternDay = null;
    this.lanternNight = null;
    this.collisionZones = [];
    this.furnitureSprites = {};
    this.roomBounds = {
      left: 48,
      top: 64,
      width: 704,
      height: 480
    };
  }

  create() {
    // 重置相机状态，防止从其他场景切换回来时残留黑屏/遮罩
    this.cameras.main.resetFX();

    if (!window.gameState.getPlayerName?.()) {
      this.scene.start('PlayerNameScene', {
        returnScene: 'ShopScene'
      });
      return;
    }

    // 恢复游戏状态为正常
    window.gameState.setGameState(GAME_STATE.NORMAL);

    // 初始化系统
    this.initSystems();

    // 背景
    this.createBackground();

    // 昼夜遮罩（在背景之上、物体之下）
    this.createDayNightOverlay();

    // 创建可交互物体
    this.createInteractables();

    // 绘制场景家具和装饰贴图
    this.drawFurniture();

    // 创建来访 NPC
    this.createVisitorNPCs();

    // 创建玩家
    this.createPlayer();

    // 创建 UI
    this.createUI();

    // 创建交互提示
    this.createInteractionPrompt();

    // 设置键盘输入
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // E 键交互
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // J 键打开委托日志
    this.questLogKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);

    // B 键打开背包
    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    // U 键打开家具升级
    this.upgradeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);

    // 淡入效果
    this.cameras.main.fadeIn(500);

    // 监听 E 键
    this.interactKey.on('down', () => {
      if (!window.gameState.canMove()) return;
      if (this.nearbyObject) {
        this.interactWith(this.nearbyObject);
      }
    });

    // 监听 J 键
    this.questLogKey.on('down', () => {
      if (!window.gameState.canMove()) return;
      this.openQuestLog();
    });

    // 监听 B 键
    this.inventoryKey.on('down', () => {
      if (!window.gameState.canMove()) return;
      this.openInventory();
    });

    this.upgradeKey.on('down', () => {
      if (!window.gameState.canMove()) return;
      this.openFurnitureUpgrade();
    });

    // ========== 处理待展示的奖励物品 ==========
    this.time.delayedCall(300, () => {
      this.checkPendingRewards();
    });

    // ========== 处理来访 NPC 提示 ==========
    this.time.delayedCall(500, () => {
      this.showVisitorNotification();
    });
  }

  initSystems() {
    if (!this.commissionSystem) {
      this.commissionSystem = new CommissionSystem(window.gameState);
    }

    if (!this.visitorSystem) {
      this.visitorSystem = new VisitorSystem(window.gameState);
    }

    if (!this.inventorySystem) {
      this.inventorySystem = new InventorySystem(window.gameState);
    }

    if (!this.dailyLoopManager) {
      this.dailyLoopManager = new DailyLoopManager(window.gameState);
    }

    if (!this.furnitureManager) {
      this.furnitureManager = new FurnitureUpgradeManager(window.gameState);
    }

    new SpiritMemoryManager(window.gameState);
    this.achievementManager = new AchievementManager(window.gameState);
    this.achievementToastUI = new AchievementToastUI(this);

    // 触发"万事屋复兴开启！"成就
    const startResult = this.achievementManager.unlockAchievement('achievement_start_revival');
    if (startResult.isNew) {
      this.achievementToastUI.show({
        achievementId: 'achievement_start_revival',
        title: '万事屋复兴开启！',
        description: '开始游玩万事屋炼金物语！'
      });
    }

    // 检查人气成就
    this._checkPopularityAchievement();

    // 初始化或获取 TimeManager
    this.timeManager = getTimeManager(window.gameState);
    if (!this.timeManager) {
      this.timeManager = new TimeManager(window.gameState);
    }

    // 注册新一天回调
    this.timeManager.onNewDay((newDay) => {
      this._onNewDay(newDay);
    });
  }

  // ========== 新一天逻辑 ==========

  _onNewDay(newDay) {
    // 通知随机 NPC 管理器处理跨天逻辑
    const randomNpcManager = new RandomNpcManager(window.gameState);
    randomNpcManager.onDayChanged();

    // GameState 的 nextDay 也会处理 NPC 状态，但 TimeManager 已经推进了天数
    // 所以这里只做 NPC 状态清理和来访列表重置
    window.gameState.todayVisitors = [];
    window.gameState.visitorNotificationShown = false;

    console.log(`[ShopScene] 新一天: 第 ${newDay} 天`);
  }

  // ========== 昼夜系统 ==========

  createDayNightOverlay() {
    const width = gameConfig.display.width;
    const height = gameConfig.display.height;

    this.dayNightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(5)
      .setInteractive({ pixelPerfect: false }); // 不阻挡交互

    // 禁止遮罩拦截点击
    this.dayNightOverlay.input.enabled = false;
  }

  updateDayNight() {
    if (!this.timeManager || !this.dayNightOverlay) return;

    const overlay = this.timeManager.getDayNightOverlay();
    this.dayNightOverlay.setFillStyle(overlay.color, overlay.alpha);

    if (this.lanternDay && this.lanternNight) {
      const isNight = this.timeManager.getDayPhase() === 'night';
      this.lanternDay.setVisible(!isNight);
      this.lanternNight.setVisible(isNight);
    }
  }

  // ========== 背景 ==========

  createBackground() {
    const width = gameConfig.display.width;
    const height = gameConfig.display.height;
    const room = this.roomBounds;
    const roomRight = room.left + room.width;
    const roomBottom = room.top + room.height;
    const wallHeight = 128;
    const wallBottom = room.top + wallHeight;

    this.add.rectangle(width / 2, height / 2, width, height, 0x18131a);
    this.add.rectangle(room.left + room.width / 2, room.top + room.height / 2, room.width + 16, room.height + 16, 0x2b1d1b)
      .setStrokeStyle(4, 0x6b3f25, 0.9);

    this.add.tileSprite(room.left, room.top, room.width, wallHeight, 'sceneWarmWall')
      .setOrigin(0)
      .setDepth(0);
    this.add.tileSprite(room.left, wallBottom, room.width, room.height - wallHeight, 'sceneWoodFloor')
      .setOrigin(0)
      .setDepth(0);

    this.add.rectangle(room.left + room.width / 2, room.top + 8, room.width, 16, 0x4b2d1a, 0.24)
      .setDepth(1);
    this.add.rectangle(room.left + room.width / 2, wallBottom - 5, room.width, 10, 0x7a482d, 0.78)
      .setDepth(1);
    this.add.rectangle(room.left + room.width / 2, wallBottom + 2, room.width, 4, 0x3b2418, 0.35)
      .setDepth(1);
    this.add.rectangle(room.left + room.width / 2, roomBottom - 8, room.width, 16, 0x3d2418, 0.8);
    this.add.rectangle(room.left + 8, room.top + room.height / 2, 16, room.height, 0x3d2418, 0.75);
    this.add.rectangle(roomRight - 8, room.top + room.height / 2, 16, room.height, 0x3d2418, 0.75);

    this.createCollisionBounds();
    return;
    /*

    const W = 800, H = 600, T = 32;
    // 房间：左48 上64 宽704 高480 — 22列 x 15行 tile
    const rx = 48, ry = 64, rw = 704, rh = 480;
    const cols = Math.floor(rw / T); // 22
    const rows = Math.floor(rh / T); // 15
    const wallRows = 4; // 上方4行是墙壁

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1520);

    const atlas = 'tilesAtlas32';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = rx + c * T;
        const y = ry + r * T;
        if (r < wallRows) {
          const frame = (r + c) % 3; // 墙壁 frame 0-2
          this.add.image(x + T / 2, y + T / 2, atlas, frame).setDepth(0);
        } else {
          const frame = 6 + ((r + c) % 2); // 地板 frame 6-7
          this.add.image(x + T / 2, y + T / 2, atlas, frame).setDepth(0);
        }
      }
    }

    // 墙壁下沿 + 房间边框暗色条
    this.add.rectangle(rx + rw / 2, ry + wallRows * T, rw, 6, 0x3b2418, 0.65).setDepth(1);
    this.add.rectangle(rx + 8, ry + rh / 2, 16, rh, 0x2b1d1b, 0.55).setDepth(1);
    this.add.rectangle(rx + rw - 8, ry + rh / 2, 16, rh, 0x2b1d1b, 0.55).setDepth(1);
    this.add.rectangle(rx + rw / 2, ry + rh - 6, rw, 12, 0x2b1d1b, 0.55).setDepth(1);
  }

  */
  }

  createCollisionBounds() {
    const room = this.roomBounds;
    const bottom = room.top + room.height;
    const right = room.left + room.width;

    this.addCollisionZone(room.left + room.width / 2, room.top + 64, room.width, 128, 'wall');
    this.addCollisionZone(room.left + 16, room.top + room.height / 2, 32, room.height, 'left wall');
    this.addCollisionZone(right - 16, room.top + room.height / 2, 32, room.height, 'right wall');
    this.addCollisionZone(room.left + 16, bottom - 16, 32, 32, 'bottom wall');
    this.addCollisionZone(476, bottom - 16, 552, 32, 'bottom wall');
  }

  drawFurniture() {
    const furniture = [
      {
        id: 'door',
        imagePath: '/assets/craft_furniture_transparent/source_1x/door.png',
        key: 'craftDoor',
        x: 108,
        y: 536,
        displayWidth: 84,
        displayHeight: 80,
        anchor: { x: 0.5, y: 1 },
        zIndex: 3,
        layer: 'object',
        collision: false,
        interaction: 'door'
      },
      {
        id: 'fireplace',
        imagePath: '/assets/scene-pieces/fireplace_fancy_full2.png',
        key: 'sceneFireplace',
        x: 400,
        y: 188,
        displayWidth: 104,
        displayHeight: 104,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'wall',
        collision: true,
        interaction: null
      },
      {
        id: 'window',
        imagePath: '/assets/craft_furniture_transparent/source_1x/window.png',
        key: 'craftWindow',
        x: 508,
        y: 118,
        displayWidth: 60,
        displayHeight: 37,
        anchor: { x: 0.5, y: 0.5 },
        zIndex: 2,
        layer: 'wall',
        collision: false,
        interaction: null
      },
      {
        id: 'painting',
        imagePath: '/assets/craft_furniture_transparent/source_1x/painting.png',
        key: 'craftPainting',
        x: 240,
        y: 118,
        displayWidth: 142,
        displayHeight: 25,
        anchor: { x: 0.5, y: 0.5 },
        zIndex: 2,
        layer: 'wall',
        collision: false,
        interaction: null
      },
      {
        id: 'quest_board',
        imagePath: '/assets/craft_furniture_transparent/source_1x/quest.png',
        key: 'craftQuest',
        x: 575,
        y: 132,
        displayWidth: 42,
        displayHeight: 47,
        anchor: { x: 0.5, y: 0.5 },
        zIndex: 2,
        layer: 'wall',
        collision: false,
        interaction: 'questLog'
      },
      {
        id: 'alchemy_table',
        imagePath: '/assets/processed/furniture/cauldron_pot-stpat.png',
        key: 'craftCauldron',
        x: 154,
        y: 246,
        displayWidth: 66,
        displayHeight: 66,
        anchor: { x: 0.5, y: 1 },
        zIndex: 3,
        layer: 'object',
        collision: true,
        interaction: 'alchemy'
      },
      {
        id: 'clock',
        imagePath: '/assets/craft_furniture_transparent/source_1x/clock.png',
        key: 'craftClock',
        x: 92,
        y: 352,
        displayWidth: 34,
        displayHeight: 92,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: null
      },
      {
        id: 'fridge',
        imagePath: '/assets/craft_furniture_transparent/source_1x/fridge.png',
        key: 'craftFridge',
        x: 214,
        y: 486,
        displayWidth: 38,
        displayHeight: 78,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: 'fridge'
      },
      {
        id: 'carpet',
        imagePath: '/assets/processed/furniture/carpet.png',
        key: 'craftCarpet',
        x: 400,
        y: 328,
        displayWidth: 122,
        displayHeight: 162,
        anchor: { x: 0.5, y: 0.5 },
        zIndex: 1,
        layer: 'floor',
        collision: false,
        interaction: null
      },
      {
        id: 'desk',
        imagePath: '/assets/craft_furniture_transparent/source_1x/desk.png',
        key: 'craftDesk',
        x: 400,
        y: 528,
        displayWidth: 104,
        displayHeight: 78,
        anchor: { x: 0.5, y: 1 },
        zIndex: 3,
        layer: 'object',
        collision: true,
        interaction: 'counter'
      },
      {
        id: 'book',
        imagePath: '/assets/craft_furniture_transparent/source_1x/book.png',
        key: 'craftBook',
        x: 662,
        y: 284,
        displayWidth: 54,
        displayHeight: 82,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: 'codex'
      },
      {
        id: 'decorate2',
        imagePath: '/assets/craft_furniture_transparent/source_1x/decorate2.png',
        key: 'craftDecorate2',
        x: 604,
        y: 348,
        displayWidth: 38,
        displayHeight: 52,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: null
      },
      {
        id: 'decorate1',
        imagePath: '/assets/craft_furniture_transparent/source_1x/decorate1.png',
        key: 'craftDecorate1',
        x: 254,
        y: 410,
        displayWidth: 28,
        displayHeight: 56,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: null
      },
      {
        id: 'sofa1',
        imagePath: '/assets/craft_furniture_transparent/source_1x/sofa1.png',
        key: 'craftSofa1',
        x: 536,
        y: 438,
        displayWidth: 32,
        displayHeight: 50,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: null
      },
      {
        id: 'sofa2',
        imagePath: '/assets/craft_furniture_transparent/source_1x/sofa2.png',
        key: 'craftSofa2',
        x: 610,
        y: 404,
        displayWidth: 58,
        displayHeight: 34,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: null
      },
      {
        id: 'bed',
        imagePath: '/assets/scene-pieces/bed_fancy_brown.png',
        key: 'sceneBedImage',
        x: 672,
        y: 514,
        displayWidth: 78,
        displayHeight: 104,
        anchor: { x: 0.5, y: 1 },
        zIndex: 2,
        layer: 'object',
        collision: true,
        interaction: 'bed'
      },
      {
        id: 'lantern1',
        imagePath: '/assets/craft_furniture_transparent/source_1x/lantern1.png',
        key: 'craftLantern1',
        x: 672,
        y: 390,
        displayWidth: 22,
        displayHeight: 56,
        anchor: { x: 0.5, y: 1 },
        zIndex: 3,
        layer: 'object',
        collision: false,
        interaction: null
      },
      {
        id: 'lantern2',
        imagePath: '/assets/craft_furniture_transparent/source_1x/lantern2.png',
        key: 'craftLantern2',
        x: 672,
        y: 390,
        displayWidth: 20,
        displayHeight: 54,
        anchor: { x: 0.5, y: 1 },
        zIndex: 3,
        layer: 'object',
        collision: false,
        interaction: null
      }
    ];

    this.furnitureConfig = furniture;
    this.furnitureSprites = {};
    this.add.rectangle(154, 252, 94, 30, 0x4a2f21, 0.45).setDepth(2);

    furniture.forEach((item) => {
      const sprite = this.add.image(item.x, item.y, item.key)
        .setOrigin(item.anchor.x, item.anchor.y)
        .setDisplaySize(item.displayWidth, item.displayHeight)
        .setDepth(item.zIndex);
      sprite.sceneObjectData = item;
      this.furnitureSprites[item.id] = sprite;
      if (item.collision && !item.interaction) {
        const cx = item.x + (0.5 - item.anchor.x) * item.displayWidth;
        const cy = item.y + (0.5 - item.anchor.y) * item.displayHeight;
        this.addCollisionZone(cx, cy, item.displayWidth * 0.8, item.displayHeight * 0.65, item.id);
      }
    });

    this.add.sprite(400, 164, 'srwFire2', 0)
      .setScale(0.6)
      .setDepth(3)
      .play('srwFire2Loop');
    this.add.sprite(154, 218, 'srwFire', 0)
      .setScale(0.58)
      .setDepth(4)
      .play('srwFireLoop');

    this.lanternDay = this.furnitureSprites.lantern1?.setVisible(true) || null;
    this.lanternNight = this.furnitureSprites.lantern2?.setVisible(false) || null;
    return;
    /*

    const T = 32;
    // 辅助：按 tile 尺寸创建家具贴图
    const spr = (x, y, key, tw, th, originX, originY, depth) =>
      this.add.image(x, y, key)
        .setOrigin(originX, originY)
        .setDisplaySize(tw * T, th * T)
        .setDepth(depth);

    // 门（左下，2x3 格）
    spr(100, 538, 'furnitureDoor', 2, 3, 0.5, 1, 3);

    // 冰箱（左下区域，2x2 格）
    spr(210, 470, 'furnitureFridge', 2, 2, 0.5, 1, 2);

    // 落地钟（左侧墙面，1x3 格）
    spr(80, 320, 'furnitureClock', 1, 3, 0.5, 0.5, 2);

    // 炼金釜（左上，2x2 格）
    spr(180, 260, 'furnitureCauldron', 2, 2, 0.5, 0.8, 3);

    // 窗户（后墙上，2x1.5 格）
    spr(460, 68, 'furnitureWindow', 2, 2, 0.5, 0, 2);

    // 画（后墙，2x1 格）
    spr(240, 80, 'furniturePainting', 2, 1, 0.5, 0, 2);

    // 委托板（后墙右侧，2x2 格）
    spr(600, 68, 'furnitureQuest', 2, 2, 0.5, 0, 2);

    // 装饰品1（1x1 格）
    spr(300, 175, 'furnitureDecorate1', 1, 1, 0.5, 0.5, 2);

    // 地球仪（书架附近，1x1 格）
    spr(610, 320, 'furnitureDecorate2', 1, 1, 0.5, 0.5, 2);

    // 地毯（中央，5x4 格）
    spr(400, 300, 'furnitureCarpet', 5, 4, 0.5, 0.5, 1);

    // 柜台（中央偏下，4x2 格）
    spr(400, 445, 'furnitureDesk', 4, 2, 0.5, 1, 3);

    // 沙发1（柜台右，2x1 格）
    spr(530, 445, 'furnitureSofa1', 2, 1, 0.5, 1, 2);

    // 沙发2（沙发1右上方，2x1 格）
    spr(610, 415, 'furnitureSofa2', 2, 1, 0.5, 1, 2);

    // 书架（右上，2x3 格）
    spr(690, 245, 'furnitureBook', 2, 3, 0.5, 1, 2);

    // 床（右下，3x2 格）
    spr(690, 515, 'sceneBed', 3, 2, 0.5, 1, 2);

    // 灯笼（床上方，1x1 格，昼夜切换）
    this.lanternDay = spr(690, 445, 'furnitureLantern1', 1, 1, 0.5, 0.5, 3).setVisible(true);
    this.lanternNight = spr(690, 445, 'furnitureLantern2', 1, 1, 0.5, 0.5, 3).setVisible(false);
  }

  */
  }

  createInteractables() {
    this.interactables = [];

    this.objectsConfig.forEach((objConfig) => {
      const obj = this.add.rectangle(
        objConfig.x,
        objConfig.y,
        objConfig.width,
        objConfig.height,
        objConfig.color,
        0
      ).setStrokeStyle(2, objConfig.borderColor, 0)
       .setInteractive({ useHandCursor: true });
      obj.setDepth(4);

      obj.interactionData = {
        id: objConfig.id,
        name: objConfig.name,
        promptText: objConfig.promptText || objConfig.name,
        type: objConfig.interactionType,
        description: objConfig.description,
        borderColor: objConfig.borderColor,
        isNPC: false
      };

      obj.on('pointerover', () => {
        if (!this.nearbyObject || this.nearbyObject !== obj) {
          obj.setStrokeStyle(3, shopObjects.colors.highlight, 0.95);
          obj.setFillStyle(objConfig.borderColor, 0.08);
        }
      });

      obj.on('pointerout', () => {
        if (this.nearbyObject !== obj) {
          obj.setStrokeStyle(2, objConfig.borderColor, 0);
          obj.setFillStyle(objConfig.borderColor, 0);
        }
      });

      // 点击也可交互
      obj.on('pointerdown', () => {
        if (!window.gameState.canMove()) return;
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, obj.x, obj.y
        );
        if (distance < this.interactionDistance) {
          this.interactWith(obj);
        }
      });

      this.interactables.push(obj);
      if (objConfig.collides) {
        this.addCollisionZone(
          objConfig.x,
          objConfig.y,
          objConfig.width,
          objConfig.height,
          objConfig.name
        );
      }
    });
  }

  addCollisionZone(x, y, width, height, label) {
    const zone = this.add.rectangle(x, y, width, height, 0xff0000, 0).setVisible(false);
    zone.collisionLabel = label;
    this.physics.add.existing(zone, true);
    this.collisionZones.push(zone);
    return zone;
  }

  createVisitorNPCs() {
    this.visitorNPCs = [];

    const visitors = this.visitorSystem.getTodaysVisitors();

    visitors.forEach((visitor) => {
      const npcData = this.visitorSystem.getVisitorNPCData(visitor.npcId);
      if (!npcData) return;

      // 检查 NPC 状态 — 已对话的不再出现
      const npcState = this.visitorSystem.randomNpcManager.getNpcState(visitor.configId);
      if (npcState === RANDOM_NPC_STATE.TALKED ||
          npcState === RANDOM_NPC_STATE.LEFT ||
          npcState === RANDOM_NPC_STATE.MISSED) {
        return;
      }

      const npc = this.createVisitorNPC(npcData, visitor.position, visitor.dialogueId, visitor.configId);
      this.visitorNPCs.push(npc);
    });
  }

  createVisitorNPC(npcConfig, position, dialogueId, configId) {
    const npc = this.add.container(position.x, position.y);

    const body = this.add.rectangle(0, 0, 36, 48, npcConfig.color)
      .setStrokeStyle(2, npcConfig.borderColor);
    npc.add(body);

    const leftEye = this.add.circle(-5, -10, 3, 0xffffff);
    const rightEye = this.add.circle(5, -10, 3, 0xffffff);
    npc.add([leftEye, rightEye]);

    const nameTag = this.add.text(0, -40, npcConfig.name, {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      backgroundColor: '#2e3440',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5);
    npc.add(nameTag);

    npc.setSize(36, 48);
    npc.setInteractive({ useHandCursor: true });

    npc.npcData = {
      id: npcConfig.id,
      name: npcConfig.name,
      description: npcConfig.description,
      dialogueId: dialogueId,
      borderColor: npcConfig.borderColor,
      isNPC: true,
      isVisitor: true,
      configId: configId
    };

    npc.on('pointerover', () => {
      if (!this.nearbyObject || this.nearbyObject !== npc) {
        body.setStrokeStyle(3, shopObjects.colors.highlight);
      }
    });

    npc.on('pointerout', () => {
      if (this.nearbyObject !== npc) {
        body.setStrokeStyle(2, npcConfig.borderColor);
      }
    });

    this.tweens.add({
      targets: npc,
      y: npc.y - 3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    return npc;
  }

  createPlayer() {
    const savedPosition = window.gameState.getPlayerPosition();
    const startX = savedPosition.x;
    const startY = savedPosition.y;
    const size = gameConfig.player.size;

    this.player = this.add.container(startX, startY).setDepth(2.6);

    const playerBody = this.add.rectangle(0, 0, size, size, 0x88c0d0)
      .setStrokeStyle(2, 0x5e81ac);

    const leftEye = this.add.circle(-6, -4, 3, 0xffffff);
    const rightEye = this.add.circle(6, -4, 3, 0xffffff);
    const leftPupil = this.add.circle(-6, -4, 1.5, 0x2e3440);
    const rightPupil = this.add.circle(6, -4, 1.5, 0x2e3440);

    this.player.add([playerBody, leftEye, rightEye, leftPupil, rightPupil]);

    this.physics.world.enable(this.player, Phaser.Physics.Arcade.DYNAMIC_BODY);
    this.player.body.setSize(size - 8, size - 8);
    this.player.body.setOffset(-size / 2 + 4, -size / 2 + 4);
    this.player.body.setCollideWorldBounds(true);

    this.physics.world.setBounds(60, 96, 680, 432);
    this.collisionZones.forEach((zone) => {
      this.physics.add.collider(this.player, zone);
    });
  }

  createUI() {
    this.uiGroup = this.add.container(0, 0).setDepth(10);

    const uiBg = this.add.rectangle(700, 45, 180, 140, 0x2e3440, 0.9)
      .setStrokeStyle(2, 0x4c566a);
    this.uiGroup.add(uiBg);

    // 时间显示（整合天数+时间）
    this.timeText = this.add.text(615, 8, this._getTimeDisplayString(), {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    });
    this.uiGroup.add(this.timeText);

    // 时段标签
    this.dayPhaseText = this.add.text(615, 28, this._getDayPhaseLabel(), {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#d08770'
    });
    this.uiGroup.add(this.dayPhaseText);

    this.fundsText = this.add.text(615, 48, `资金: ${window.gameState.funds}`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
    });
    this.uiGroup.add(this.fundsText);

    this.popularityText = this.add.text(615, 68, `人气: ${window.gameState.popularity}`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#bf616a'
    });
    this.uiGroup.add(this.popularityText);

    this.shopLevelText = this.add.text(615, 88, `万事屋等级: Lv${window.gameState.wanShiWuLevel || 1}`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#ebcb8b'
    });
    this.uiGroup.add(this.shopLevelText);

    // 控制提示
    const controlHint = this.add.text(400, 575, 'WASD/方向键 移动 | E 交互 | J 委托日志 | B 背包 | U 家具升级', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5);
    this.uiGroup.add(controlHint);
  }

  _getTimeDisplayString() {
    if (!this.timeManager) return `第 1 天 08:00`;
    return this.timeManager.getTimeString();
  }

  _getDayPhaseLabel() {
    if (!this.timeManager) return '白天';
    const phase = this.timeManager.getDayPhase();
    const labels = { day: '☀ 白天', evening: '🌆 傍晚', night: '🌙 夜晚' };
    return labels[phase] || '';
  }

  createInteractionPrompt() {
    this.interactionPrompt = this.add.container(400, 500).setVisible(false).setDepth(50);

    const promptBg = this.add.rectangle(0, 0, 160, 40, shopObjects.colors.promptBg, 0.95)
      .setStrokeStyle(2, shopObjects.colors.promptBorder);
    this.interactionPrompt.add(promptBg);

    this.promptText = this.add.text(0, 0, '按 E 交互', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.interactionPrompt.add(this.promptText);
  }

  update(time, delta) {
    // 更新时间系统
    if (this.timeManager) {
      this.timeManager.updatePauseByState(window.gameState.getGameState());
      this.timeManager.update(delta);
    }

    if (
      this.timeManager &&
      this.timeManager.currentHour >= 23 &&
      !window.gameState.dayEndSummaryShown &&
      window.gameState.canMove()
    ) {
      window.gameState.dayEndSummaryShown = true;
      this.endDay();
      return;
    }

    // 只有在 normal 状态下才能移动
    if (!window.gameState.canMove()) {
      if (this.player && this.player.body) {
        this.player.body.setVelocity(0, 0);
      }
      this.updateUI();
      this.updateDayNight();
      return;
    }

    const speed = gameConfig.player.speed;
    let velocityX = 0;
    let velocityY = 0;

    if (this.wasd.left.isDown) velocityX = -speed;
    else if (this.wasd.right.isDown) velocityX = speed;

    if (this.wasd.up.isDown) velocityY = -speed;
    else if (this.wasd.down.isDown) velocityY = speed;

    if (this.cursors.left.isDown) velocityX = -speed;
    else if (this.cursors.right.isDown) velocityX = speed;

    if (this.cursors.up.isDown) velocityY = -speed;
    else if (this.cursors.down.isDown) velocityY = speed;

    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }

    this.player.body.setVelocity(velocityX, velocityY);

    this.checkNearbyInteractables();
    this.updateUI();
    this.updateDayNight();
  }

  checkNearbyInteractables() {
    let closestObject = null;
    let closestDistance = this.interactionDistance;

    this.interactables.forEach(obj => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        obj.x, obj.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = obj;
      }
    });

    // 检查来访 NPC（排除已对话的）
    this.visitorNPCs.forEach(npc => {
      if (npc.npcData && npc.npcData.configId) {
        const state = this.visitorSystem.randomNpcManager.getNpcState(npc.npcData.configId);
        if (state === RANDOM_NPC_STATE.TALKED) return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.x, npc.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestObject = npc;
      }
    });

    if (this.nearbyObject && this.nearbyObject !== closestObject) {
      this.resetObjectHighlight(this.nearbyObject);
    }

    this.nearbyObject = closestObject;

    if (closestObject) {
      this.highlightObject(closestObject);
      this.interactionPrompt.setVisible(true);
      this.interactionPrompt.setPosition(this.player.x, this.player.y - 50);

      const name = closestObject.npcData
        ? closestObject.npcData.name
        : (closestObject.interactionData.promptText || closestObject.interactionData.name);
      this.promptText.setText(`[E] ${name}`);
    } else {
      this.interactionPrompt.setVisible(false);
    }
  }

  highlightObject(obj) {
    try {
      if (obj.npcData) {
        const body = obj.list && obj.list[0];
        if (body && body.setStrokeStyle) {
          body.setStrokeStyle(3, shopObjects.colors.highlight);
        }
      } else {
        if (obj.setStrokeStyle) {
          obj.setStrokeStyle(3, shopObjects.colors.highlight, 0.95);
          obj.setFillStyle(obj.interactionData.borderColor, 0.08);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  resetObjectHighlight(obj) {
    try {
      if (obj.npcData) {
        const body = obj.list && obj.list[0];
        if (body && body.setStrokeStyle) {
          body.setStrokeStyle(2, obj.npcData.borderColor);
        }
      } else {
        if (obj.setStrokeStyle) {
          obj.setStrokeStyle(2, obj.interactionData.borderColor, 0);
          obj.setFillStyle(obj.interactionData.borderColor, 0);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  interactWith(obj) {
    if (obj.npcData) {
      this.startNPCDialogue(obj.npcData);
    } else {
      this.interactWithObject(obj);
    }
  }

  startNPCDialogue(npcData) {
    this.savePlayerPosition();
    if (npcData.isVisitor && this.dailyLoopManager) {
      this.dailyLoopManager.recordVisitorMet(npcData.configId || npcData.id);
    }
    window.gameState.setGameState(GAME_STATE.DIALOGUE);
    this.scene.start('DialogueScene', {
      dialogueId: npcData.dialogueId,
      npcId: npcData.id,
      visitorConfigId: npcData.isVisitor ? npcData.configId : null,
      returnScene: 'ShopScene'
    });
  }

  interactWithObject(obj) {
    const data = obj.interactionData;

    switch (data.type) {
      case 'counter':
        this.onCounterInteraction(data);
        break;
      case 'alchemy':
        this.onAlchemyInteraction(data);
        break;
      case 'codex':
        this.onCodexInteraction(data);
        break;
      case 'bed':
        this.onBedInteraction(data);
        break;
      case 'questLog':
        this.openQuestLog();
        break;
      case 'fridge':
        this.openInventory();
        break;
      case 'door':
        this.onDoorInteraction(data);
        break;
      default:
        this.showMessage(`与 ${data.name} 交互`);
    }
  }

  onCounterInteraction(data) {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.QUEST_LIST);
    this.scene.start('CommissionListScene', {
      returnScene: 'ShopScene'
    });
  }

  openQuestLog() {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.QUEST_LIST);
    this.scene.start('QuestLogScene', {
      returnScene: 'ShopScene'
    });
  }

  // 打开背包（B 键）
  openInventory() {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.INVENTORY);
    this.scene.start('InventoryScene', {
      returnScene: 'ShopScene'
    });
  }

  onAlchemyInteraction(data) {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.ALCHEMY);
    this.scene.start('AlchemyScene', {
      returnScene: 'ShopScene'
    });
  }

  openFurnitureUpgrade() {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.FURNITURE_UPGRADE);
    this.scene.start('FurnitureUpgradeScene', {
      returnScene: 'ShopScene'
    });
  }

  onCodexInteraction(data) {
    this.savePlayerPosition();
    window.gameState.setGameState(GAME_STATE.BOOKSHELF_ARCHIVE);
    this.scene.start('BookshelfArchiveScene', {
      returnScene: 'ShopScene'
    });
  }

  // ========== 床铺交互：睡觉选择 UI ==========

  onBedInteraction(data) {
    if (this.popupContainer) return; // 防止重复打开
    window.gameState.setGameState(GAME_STATE.SLEEP_CHOICE);
    this.showSleepChoiceUI();
  }

  showSleepChoiceUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.popupContainer = this.add.container(width / 2, height / 2).setDepth(100);

    // 遮罩
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.3);
    this.popupContainer.add(overlay);

    // 弹窗背景
    const bg = this.add.rectangle(0, 0, 340, 340, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x5e81ac);
    this.popupContainer.add(bg);

    // 标题
    const title = this.add.text(0, -140, '【床铺】', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.popupContainer.add(title);

    const desc = this.add.text(0, -110, '选择睡觉时间或保存进度', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9'
    }).setOrigin(0.5);
    this.popupContainer.add(desc);

    // 睡觉选项按钮
    const options = [
      { text: '睡 6 小时', hours: 6 },
      { text: '睡 12 小时', hours: 12 },
      { text: '睡 1 天', hours: 24 },
    ];

    options.forEach((opt, i) => {
      const y = -65 + i * 50;
      const btn = this.createPopupButton(0, y, opt.text, () => {
        this.onSleepSelected(opt.hours);
      });
      this.popupContainer.add(btn);
    });

    // 存档按钮
    const saveBtn = this.createPopupButton(0, -65 + 3 * 50, '存档', () => {
      this.openSaveLoadUI();
    }, 0xa3be8c);
    this.popupContainer.add(saveBtn);

    // 取消按钮
    const cancelBtn = this.createPopupButton(0, -65 + 4 * 50, '取消', () => {
      this.closePopup();
    }, 0xbf616a);
    this.popupContainer.add(cancelBtn);
  }

  onSleepSelected(hours) {
    this.closePopup();
    this.endDay();
  }

  openSaveLoadUI() {
    this.savePlayerPosition();
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
    window.gameState.setGameState(GAME_STATE.SAVE_LOAD);
    this.scene.start('SaveLoadScene', {
      mode: 'save',
      returnScene: 'ShopScene'
    });
  }

  // ========== 门口交互：地点选择 UI ==========

  onDoorInteraction(data) {
    if (this.popupContainer) return; // 防止重复打开
    window.gameState.setGameState(GAME_STATE.LOCATION_CHOICE);
    this.showLocationChoiceUI();
  }

  showLocationChoiceUI() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.popupContainer = this.add.container(width / 2, height / 2).setDepth(100);

    // 遮罩
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.3);
    this.popupContainer.add(overlay);

    // 弹窗背景
    const bg = this.add.rectangle(0, 0, 320, 260, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0xd08770);
    this.popupContainer.add(bg);

    // 标题
    const title = this.add.text(0, -100, '要去哪里？', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#d08770',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.popupContainer.add(title);

    // 地点选项
    const locations = [
      { text: '集市', action: () => this.onLocationSelected('market') },
      { text: '远郊', action: () => this.onLocationSelected('suburbs') },
    ];

    locations.forEach((loc, i) => {
      const y = -30 + i * 50;
      const btn = this.createPopupButton(0, y, loc.text, loc.action);
      this.popupContainer.add(btn);
    });

    // 取消按钮
    const cancelBtn = this.createPopupButton(0, -30 + 2 * 50, '取消', () => {
      this.closePopup();
    }, 0xbf616a);
    this.popupContainer.add(cancelBtn);
  }

  onLocationSelected(locationId) {
    this.closePopup();

    if (locationId === 'market') {
      this.showShopUI();
    } else if (locationId === 'suburbs') {
      this.showMessage('远郊探索系统待开发\n\n后续将开放更多玩法...');
    }
  }

  // ========== 集市商店 UI ==========

  showShopUI() {
    window.gameState.setGameState(GAME_STATE.SHOP);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.popupContainer = this.add.container(width / 2, height / 2).setDepth(100);

    // 遮罩
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.4);
    this.popupContainer.add(overlay);

    // 弹窗背景
    const panelH = 100 + this.shopItems.length * 55 + 60;
    const bg = this.add.rectangle(0, 0, 500, Math.min(panelH, 500), 0x2e3440, 0.98)
      .setStrokeStyle(3, 0xa3be8c);
    this.popupContainer.add(bg);

    // 标题
    const title = this.add.text(0, -Math.min(panelH, 500) / 2 + 30, '集市 - 炼金材料', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.popupContainer.add(title);

    // 资金显示
    this.shopFundsText = this.add.text(0, -Math.min(panelH, 500) / 2 + 55, `当前资金: ${window.gameState.funds}`, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#ebcb8b'
    }).setOrigin(0.5);
    this.popupContainer.add(this.shopFundsText);

    this.shopList = new ScrollableListUI(this, {
      parent: this.popupContainer,
      x: 0,
      y: 28,
      width: 456,
      height: Math.min(panelH, 500) - 160,
      rowHeight: 50,
      rowGap: 4
    });
    this.renderShopScrollableList();

    const closeBtn = this.createPopupButton(0, Math.min(panelH, 500) / 2 - 30, '关闭', () => {
      this.closePopup();
    }, 0xbf616a);
    this.popupContainer.add(closeBtn);
  }

  renderShopScrollableList() {
    if (!this.shopList) return;
    this.shopList.render(this.shopItems, (item, index, width, rowHeight) => {
      const row = this.add.container(0, 0);
      const rowBg = this.add.rectangle(width / 2, rowHeight / 2, width - 12, 42, 0x3b4252, 0.8)
        .setStrokeStyle(2, 0x4c566a);
      row.add(rowBg);

      row.add(this.add.text(14, rowHeight / 2 - 8, item.itemName, {
        fontSize: '15px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4'
      }));

      row.add(this.add.text(width - 160, rowHeight / 2 - 8, item.price + ' 金', {
        fontSize: '13px',
        fontFamily: 'Courier New',
        color: '#ebcb8b'
      }));

      const buyBtnBg = this.add.rectangle(width - 55, rowHeight / 2, 60, 30, 0x5e81ac, 0.9)
        .setStrokeStyle(2, 0x81a1c1)
        .setInteractive({ useHandCursor: true });
      row.add(buyBtnBg);

      row.add(this.add.text(width - 55, rowHeight / 2, '购买', {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4'
      }).setOrigin(0.5));

      buyBtnBg.on('pointerover', () => buyBtnBg.setFillStyle(0x81a1c1));
      buyBtnBg.on('pointerout', () => buyBtnBg.setFillStyle(0x5e81ac));
      buyBtnBg.on('pointerdown', () => this.buyShopItem(item));
      return row;
    }, { emptyText: '暂无商品' });
  }
  buyShopItem(shopItem) {
    const funds = window.gameState.funds;

    if (funds < shopItem.price) {
      this.showToast('资金不足！');
      return;
    }

    // 扣除资金
    window.gameState.modifyFunds(-shopItem.price);
    this.dailyLoopManager.recordMoneySpent(shopItem.price);

    // 添加物品到背包
    this.inventorySystem.addItem(shopItem.itemId, 1, 'market_shop');
    this.dailyLoopManager.recordItemGained(shopItem.itemId, 1);

    // 刷新资金显示
    this.fundsText.setText(`资金: ${window.gameState.funds}`);
    if (this.shopFundsText) {
      this.shopFundsText.setText(`当前资金: ${window.gameState.funds}`);
    }

    this.showToast(`购买成功: ${shopItem.itemName}`);
  }

  // ========== 通用弹出按钮 ==========

  createPopupButton(x, y, text, callback, color) {
    const btn = this.add.container(x, y);

    const bgColor = color || 0x5e81ac;
    const borderColor = color ? (color === 0xbf616a ? 0xd08770 : 0x81a1c1) : 0x81a1c1;

    const bg = this.add.rectangle(0, 0, 220, 38, bgColor, 0.9)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);

    const btnText = this.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5);
    btn.add(btnText);

    bg.on('pointerover', () => {
      bg.setFillStyle(borderColor);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });
    bg.on('pointerdown', () => {
      callback();
    });

    return btn;
  }

  // ========== 关闭弹出 UI ==========

  closePopup() {
    if (this.shopList) {
      this.shopList.destroy();
      this.shopList = null;
    }
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
    this.shopFundsText = null;
    window.gameState.setGameState(GAME_STATE.NORMAL);
  }

  // ========== 旧版门交互保留（已替换为地点选择） ==========
  // 原来的 endDay 功能可以通过其他方式触发

  endDay() {
    this.savePlayerPosition();
    window.gameState.dayEndSummaryShown = true;
    const summary = this.dailyLoopManager.getSummary();

    window.gameState.setGameState(GAME_STATE.DAILY_SUMMARY);
    this.scene.start('DayEndScene', { summary });
  }

  savePlayerPosition() {
    if (!this.player || !window.gameState) return;
    window.gameState.setPlayerPosition(this.player.x, this.player.y);
  }

  // ========== 来访 NPC 提示 ==========

  showVisitorNotification() {
    if (window.gameState.visitorNotificationShown) return;

    const npcsNeedingNotification = this.visitorSystem.getNpcsNeedingNotification();
    if (npcsNeedingNotification.length === 0) return;

    // 标记已提示
    npcsNeedingNotification.forEach(id => {
      this.visitorSystem.markNpcNotified(id);
    });
    window.gameState.visitorNotificationShown = true;

    // 来访提示需要玩家确认，确认前禁止移动
    window.gameState.setGameState(GAME_STATE.TRANSITION);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const notifContainer = this.add.container(width / 2, height / 2 - 80).setDepth(100);

    const bg = this.add.rectangle(0, 0, 400, 70, 0x2e3440, 0.95)
      .setStrokeStyle(3, 0xebcb8b);
    notifContainer.add(bg);

    const text = this.add.text(0, -10, '今天有客人来访，请前往接待', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    notifContainer.add(text);

    const hint = this.add.text(0, 18, '（点击任意位置关闭）', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5);
    notifContainer.add(hint);

    const closeHandler = () => {
      this.input.off('pointerdown', closeHandler);
      this.tweens.add({
        targets: notifContainer,
        alpha: 0,
        y: notifContainer.y - 30,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          notifContainer.destroy();
          window.gameState.setGameState(GAME_STATE.NORMAL);
        }
      });
    };

    this.time.delayedCall(500, () => {
      this.input.on('pointerdown', closeHandler);
    });
  }

  // ========== 奖励弹窗 ==========

  checkPendingRewards() {
    const rewards = window.gameState.getPendingRewardItems();
    if (rewards.length === 0) return;

    this.showRewardPopup(rewards);
  }

  showRewardPopup(rewards) {
    window.gameState.setGameState(GAME_STATE.REWARD_POPUP);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.rewardPopup = this.add.container(width / 2, height / 2).setDepth(200);

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.3);
    this.rewardPopup.add(overlay);

    const popupH = 80 + rewards.length * 30;
    const bg = this.add.rectangle(0, 0, 350, popupH, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0xebcb8b);
    this.rewardPopup.add(bg);

    const titleText = this.add.text(0, -popupH / 2 + 25, '获得物品', {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.rewardPopup.add(titleText);

    const divider = this.add.rectangle(0, -popupH / 2 + 45, 300, 1, 0x4c566a);
    this.rewardPopup.add(divider);

    rewards.forEach((item, i) => {
      const y = -popupH / 2 + 65 + i * 28;
      const prefix = item.isKeyItem ? '★ ' : '';
      const itemText = this.add.text(0, y, `${prefix}${item.name} x ${item.count}`, {
        fontSize: '15px',
        fontFamily: 'Georgia, serif',
        color: item.isKeyItem ? '#ebcb8b' : '#a3be8c'
      }).setOrigin(0.5);
      this.rewardPopup.add(itemText);
    });

    const closeHint = this.add.text(0, popupH / 2 - 20, '点击任意位置关闭', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5);
    this.rewardPopup.add(closeHint);

    const closeReward = () => {
      this.input.off('pointerdown', closeReward);
      window.gameState.clearPendingRewardItems();
      window.gameState.setGameState(GAME_STATE.NORMAL);
      if (this.rewardPopup) {
        this.rewardPopup.destroy();
        this.rewardPopup = null;
      }
    };

    this.time.delayedCall(300, () => {
      this.input.on('pointerdown', closeReward);
    });
  }

  showMessage(message) {
    const msgBox = this.add.container(400, 300).setDepth(100);

    const bg = this.add.rectangle(0, 0, 380, 160, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);
    msgBox.add(bg);

    const text = this.add.text(0, 0, message, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5).setWordWrapWidth(340);
    msgBox.add(text);

    const hint = this.add.text(0, 65, '(点击任意处继续)', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5);
    msgBox.add(hint);

    this.input.once('pointerdown', () => {
      msgBox.destroy();
    });
  }

  showToast(message, duration = 2000) {
    const toast = this.add.container(400, 280).setDepth(100);

    const bg = this.add.rectangle(0, 0, 350, 50, 0x2e3440, 0.95)
      .setStrokeStyle(2, 0xa3be8c);
    toast.add(bg);

    const text = this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c'
    }).setOrigin(0.5);
    toast.add(text);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 30,
      duration: duration,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  showPendingSystemMessages() {
    const messages = window.gameState.consumeSystemMessages?.() || [];
    if (messages.length === 0) return;
    this.showToast(messages[0], 2600);
  }

  updateUI() {
    // 更新时间显示
    if (this.timeText) {
      this.timeText.setText(this._getTimeDisplayString());
    }
    if (this.dayPhaseText) {
      this.dayPhaseText.setText(this._getDayPhaseLabel());
    }
    this.fundsText.setText(`资金: ${window.gameState.funds}`);
    this.popularityText.setText(`人气: ${window.gameState.popularity}`);
    if (this.shopLevelText) {
      this.shopLevelText.setText(`万事屋等级: Lv${window.gameState.wanShiWuLevel || 1}`);
    }
    this.showPendingSystemMessages();

    // 检查人气成就
    this._checkPopularityAchievement();

    // 处理待显示的成就提示队列
    this._processAchievementToastQueue();
  }

  // ========== 成就系统方法 ==========

  /**
   * 检查人气成就
   */
  _checkPopularityAchievement() {
    if (!this.achievementManager) return;
    const result = this.achievementManager.checkPopularityAchievements(window.gameState.popularity);
    if (result.isNew && result.record) {
      this.achievementToastUI.show({
        achievementId: result.record.achievementId,
        title: result.record.title,
        description: result.record.description
      });
    }
  }

  /**
   * 处理 AchievementManager 中的待显示成就队列
   */
  _processAchievementToastQueue() {
    if (!this.achievementManager || !this.achievementToastUI) return;
    while (this.achievementManager.hasPendingToasts()) {
      const toast = this.achievementManager.dequeuePendingToast();
      if (toast) {
        this.achievementToastUI.show(toast);
      }
    }
  }
}

export default ShopScene;
