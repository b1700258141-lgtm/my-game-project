// 启动场景 - 加载所有场景资源
import gameConfig from '../data/gameConfig.json';
import itemsData from '../data/items.json';
import { getAllUniqueCharacterAssetFiles } from '../data/characterAssets.js';

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this.hasStartedTitleScene = false;
  }

  preload() {
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x4a4a6a, 0.8);
    progressBox.fillRect(250, 270, 300, 50);
    const loadingText = this.add.text(400, 240, '正在加载...', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#ffffff'
    }).setOrigin(0.5);
    const percentText = this.add.text(400, 295, '0%', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      progressBar.clear();
      progressBar.fillStyle(0x88c0d0, 1);
      progressBar.fillRect(260, 280, 280 * v, 30);
      percentText.setText(Math.floor(v * 100) + '%');

      if (v >= 1 && !this.hasStartedTitleScene) {
        window.setTimeout(() => {
          if (!this.hasStartedTitleScene && this.scene.isActive('BootScene')) {
            this.startTitleScene();
          }
        }, 800);
      }
    });
    this.load.on('complete', () => {
      progressBar.destroy(); progressBox.destroy();
      loadingText.destroy(); percentText.destroy();
      window.setTimeout(() => this.startTitleScene(), 0);
    });

    // tile 图集（SuperRetroWorld 32px tiles）
    this.load.spritesheet('tilesAtlas32', '/assets/scene-pieces/tiles_atlas32.png',
      { frameWidth: 32, frameHeight: 32 });

    // craft furniture 独立贴图
    const F = 'furniture';
    this.load.image('furnitureBook', `/assets/scene-pieces/${F}Book.png`);
    this.load.image('furnitureCarpet', `/assets/scene-pieces/${F}Carpet.png`);
    this.load.image('furnitureCauldron', `/assets/scene-pieces/${F}Cauldron.png`);
    this.load.image('furnitureClock', `/assets/scene-pieces/${F}Clock.png`);
    this.load.image('furnitureDecorate1', `/assets/scene-pieces/${F}Decorate1.png`);
    this.load.image('furnitureDecorate2', `/assets/scene-pieces/${F}Decorate2.png`);
    this.load.image('furnitureDesk', `/assets/scene-pieces/${F}Desk.png`);
    this.load.image('furnitureDoor', `/assets/scene-pieces/${F}Door.png`);
    this.load.image('furnitureFridge', `/assets/scene-pieces/${F}Fridge.png`);
    this.load.image('furniturePainting', `/assets/scene-pieces/${F}Painting.png`);
    this.load.image('furnitureQuest', `/assets/scene-pieces/${F}Quest.png`);
    this.load.image('furnitureSofa1', `/assets/scene-pieces/${F}Sofa1.png`);
    this.load.image('furnitureSofa2', `/assets/scene-pieces/${F}Sofa2.png`);
    this.load.image('furnitureLantern1', `/assets/scene-pieces/${F}Lantern1.png`);
    this.load.image('furnitureLantern2', `/assets/scene-pieces/${F}Lantern2.png`);
    this.load.image('furnitureWindow', `/assets/scene-pieces/${F}Window.png`);
    this.load.image('openingBg', '/assets/backgrounds/opening_general_store_bg.png');
    // 委托对话背景：来自 pix/万事屋内部背景.png
    this.load.image('commissionRoomBg', '/assets/backgrounds/commission_room_bg.png');

    this.loadInteriorAssets();
    this.loadItemPreviewAssets();
    this.loadCharacterAssets();
    this.createPlaceholderAssets();
  }

  loadCharacterAssets() {
    const { spritesheets, portraits } = getAllUniqueCharacterAssetFiles();
    spritesheets.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
    portraits.forEach(({ key, path }) => {
      this.load.image(key, path);
    });
  }

  loadItemPreviewAssets() {
    const loadedKeys = new Set();
    itemsData.items.forEach(item => {
      if (!item.previewIcon || !item.previewImage || loadedKeys.has(item.previewIcon)) return;
      this.load.image(item.previewIcon, item.previewImage);
      loadedKeys.add(item.previewIcon);
    });
  }

  loadInteriorAssets() {
    this.load.image('sceneWoodFloor', '/assets/scene-pieces/floor_wood_clean.png');
    this.load.image('sceneWarmWall', '/assets/scene-pieces/wall_warm_clean.png');
    this.load.image('sceneFireplace', '/assets/scene-pieces/fireplace_fancy_full2.png');
    this.load.image('sceneBedImage', '/assets/scene-pieces/bed_fancy_brown.png');

    this.load.spritesheet('srwFire', '/assets/super-retro-world/interior/animation/fire.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    this.load.spritesheet('srwFire2', '/assets/super-retro-world/interior/animation/fire2.png', {
      frameWidth: 32,
      frameHeight: 32
    });

    const transparentFurniturePath = '/assets/craft_furniture_transparent/source_1x';
    const processedFurniturePath = '/assets/processed/furniture';
    this.load.image('craftBook', `${transparentFurniturePath}/book.png`);
    this.load.image('craftCarpet', `${processedFurniturePath}/carpet.png`);
    this.load.image('craftCauldron', `${processedFurniturePath}/cauldron_pot-stpat.png`);
    this.load.image('craftClock', `${transparentFurniturePath}/clock.png`);
    this.load.image('craftDecorate1', `${transparentFurniturePath}/decorate1.png`);
    this.load.image('craftDecorate2', `${transparentFurniturePath}/decorate2.png`);
    this.load.image('craftDesk', `${transparentFurniturePath}/desk.png`);
    this.load.image('craftDoor', `${transparentFurniturePath}/door.png`);
    this.load.image('craftFridge', `${transparentFurniturePath}/fridge.png`);
    this.load.image('craftPainting', `${transparentFurniturePath}/painting.png`);
    this.load.image('craftQuest', `${transparentFurniturePath}/quest.png`);
    this.load.image('craftSofa1', `${transparentFurniturePath}/sofa1.png`);
    this.load.image('craftSofa2', `${transparentFurniturePath}/sofa2.png`);
    this.load.image('craftLantern1', `${transparentFurniturePath}/lantern1.png`);
    this.load.image('craftLantern2', `${transparentFurniturePath}/lantern2.png`);
    this.load.image('craftWindow', `${transparentFurniturePath}/window.png`);
  }

  createPlaceholderAssets() {
    const pg = this.make.graphics({ add: false });
    pg.fillStyle(0x88c0d0); pg.fillRect(0, 0, 32, 32);
    pg.fillStyle(0x5e81ac); pg.fillRect(8, 8, 16, 16);
    pg.generateTexture('player', 32, 32); pg.destroy();

    const og = this.make.graphics({ add: false });
    og.fillStyle(0xd08770); og.fillRect(0, 0, 48, 48);
    og.fillStyle(0xbf616a); og.fillRect(12, 12, 24, 24);
    og.generateTexture('interactable_object', 48, 48); og.destroy();

    const ng = this.make.graphics({ add: false });
    ng.fillStyle(0xb48ead); ng.fillRect(0, 0, 32, 48);
    ng.fillStyle(0xa3be8c); ng.fillRect(8, 8, 16, 16);
    ng.generateTexture('npc', 32, 48); ng.destroy();

    // 床铺占位贴图（3x2 tile = 96x64）
    const bg = this.make.graphics({ add: false });
    bg.fillStyle(0x8b6914); bg.fillRect(0, 0, 96, 64);
    bg.fillStyle(0xdeb887); bg.fillRect(6, 4, 84, 28);
    bg.fillStyle(0xe8d5b0); bg.fillRect(6, 8, 84, 12);
    bg.fillStyle(0x654321); bg.fillRect(0, 54, 96, 10);
    bg.generateTexture('sceneBed', 96, 64); bg.destroy();
  }

  create() {
    this.startTitleScene();
  }

  startTitleScene() {
    if (this.hasStartedTitleScene) return;
    this.hasStartedTitleScene = true;
    this.createInteriorAnimations();
    this.scene.start('TitleScene');
  }

  createInteriorAnimations() {
    if (this.textures.exists('srwFire') && !this.anims.exists('srwFireLoop')) {
      this.anims.create({
        key: 'srwFireLoop',
        frames: this.anims.generateFrameNumbers('srwFire', { start: 0, end: 2 }),
        frameRate: 7,
        repeat: -1
      });
    }

    if (this.textures.exists('srwFire2') && !this.anims.exists('srwFire2Loop')) {
      this.anims.create({
        key: 'srwFire2Loop',
        frames: this.anims.generateFrameNumbers('srwFire2', { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1
      });
    }
  }

}

export default BootScene;
