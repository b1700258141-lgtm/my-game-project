import InventorySystem from '../systems/InventorySystem';
import AlchemyRecipeManager from '../systems/AlchemyRecipeManager';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';
import {
  ALCHEMY_GRID_SIZE,
  getAlchemyMaterialShape
} from '../systems/AlchemyMaterialShapeConfig';
import {
  buildPlacedMaterial,
  calculateAlchemyScore,
  getQuality
} from '../systems/AlchemyScoreCalculator';

class AlchemyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AlchemyScene' });
    this.returnScene = 'ShopScene';
    this.inventorySystem = null;
    this.recipeManager = null;
    this.selectedRecipeId = null;
    this.selectedItemId = null;
    this.placedMaterials = [];
    this.gridCells = [];
    this.gridLayer = null;
    this.gridCellSize = 56;
    this.gridGap = 4;
    this.recipeList = null;
    this.materialList = null;
    this.placedList = null;
    this.detailPanel = null;
    this.toast = null;
    this.draggingItemId = null;
    this.dragPreview = null;
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
    this.selectedRecipeId = null;
    this.selectedItemId = null;
    this.placedMaterials = [];
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    window.gameState.setGameState(GAME_STATE.ALCHEMY);
    this.inventorySystem = new InventorySystem(window.gameState);
    this.recipeManager = new AlchemyRecipeManager(window.gameState);

    this.cameras.main.resetFX();
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    this.panel = this.add.container(width / 2, height / 2);
    const panelBg = this.add.rectangle(0, 0, 740, 540, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);
    this.panel.add(panelBg);

    this.panel.add(this.add.text(0, -245, '炼金釜', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.createGrid();
    this.createSidePanels();
    this.createButtons();
    this.refreshUI();

    this.input.keyboard.on('keydown-ESC', () => this.closeScene());
    this.input.on('pointermove', this.updateMaterialDrag, this);
    this.input.on('pointerup', this.finishMaterialDrag, this);
    this.cameras.main.fadeIn(200);
  }

  createGrid() {
    this.gridLayer = this.add.container(-260, -130);
    this.panel.add(this.gridLayer);

    this.panel.add(this.add.text(-260, -210, '4x4 宫格', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }).setOrigin(0.5));
  }

  createSidePanels() {
    this.panel.add(this.add.text(40, -205, '已掌握配方', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));
    this.recipeList = new ScrollableListUI(this, {
      parent: this.panel,
      x: 175,
      y: -133,
      width: 290,
      height: 118,
      rowHeight: 40,
      rowGap: 6
    });

    this.panel.add(this.add.text(40, -56, '配方素材', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));
    this.materialList = new ScrollableListUI(this, {
      parent: this.panel,
      x: 175,
      y: 13,
      width: 290,
      height: 108,
      rowHeight: 34,
      rowGap: 5
    });

    this.panel.add(this.add.text(40, 82, '已放入素材', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));
    this.placedList = new ScrollableListUI(this, {
      parent: this.panel,
      x: 175,
      y: 145,
      width: 290,
      height: 82,
      rowHeight: 28,
      rowGap: 4
    });

    this.detailPanel = this.add.container(-260, 145);
    this.panel.add(this.detailPanel);
  }

  createButtons() {
    const craftBtn = this.createButton(-80, 228, '开始炼金', () => this.tryCraft(), 0x5e81ac);
    const clearBtn = this.createButton(90, 228, '清空布局', () => {
      this.placedMaterials = [];
      this.refreshUI();
    }, 0xd08770);
    const closeBtn = this.createButton(260, 228, '关闭', () => this.closeScene(), 0xbf616a);
    this.panel.add([craftBtn, clearBtn, closeBtn]);
  }

  createButton(x, y, text, callback, color) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 130, 36, color, 0.92)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);

    btn.add(this.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5));

    bg.on('pointerover', () => bg.setAlpha(1));
    bg.on('pointerout', () => bg.setAlpha(0.92));
    bg.on('pointerdown', callback);

    return btn;
  }

  refreshUI() {
    this.renderGrid();
    this.renderRecipeScrollList();
    this.renderMaterialScrollList();
    this.renderPlacedScrollList();
    this.renderDetails();
  }

  renderGrid() {
    this.gridLayer.removeAll(true);
    this.gridCells = [];

    const scoreResult = calculateAlchemyScore(this.placedMaterials);
    const overlapKeys = new Set(scoreResult.overlapCells.map(cell => `${cell.row},${cell.col}`));
    const occupantsByCell = new Map();

    this.placedMaterials.forEach(material => {
      material.actualCells.forEach(cell => {
        const key = `${cell.row},${cell.col}`;
        if (!occupantsByCell.has(key)) {
          occupantsByCell.set(key, []);
        }
        occupantsByCell.get(key).push(material);
      });
    });

    const cellSize = this.gridCellSize;
    const gap = this.gridGap;

    for (let row = 0; row < ALCHEMY_GRID_SIZE; row += 1) {
      for (let col = 0; col < ALCHEMY_GRID_SIZE; col += 1) {
        const x = col * (cellSize + gap);
        const y = row * (cellSize + gap);
        const key = `${row},${col}`;
        const occupants = occupantsByCell.get(key) || [];
        const isOverlap = overlapKeys.has(key);
        const fill = isOverlap ? 0xbf616a : (occupants[0]?.color || 0x3b4252);
        const alpha = occupants.length > 0 ? 0.82 : 0.75;

        const cell = this.add.rectangle(x, y, cellSize, cellSize, fill, alpha)
          .setStrokeStyle(2, isOverlap ? 0xebcb8b : 0x4c566a)
          .setInteractive({ useHandCursor: true });
        this.gridLayer.add(cell);

        if (occupants.length > 0) {
          const label = occupants.length > 1
            ? `${occupants.length}x`
            : occupants[0].itemName.slice(0, 2);
          this.gridLayer.add(this.add.text(x, y, label, {
            fontSize: '13px',
            fontFamily: 'Courier New',
            color: '#ffffff',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        }
        this.gridCells.push(cell);
      }
    }
  }

  getSelectedRecipe() {
    return this.selectedRecipeId
      ? this.recipeManager.getRecipeById(this.selectedRecipeId)
      : null;
  }

  getRecipeMaxScore(recipe) {
    if (!recipe) {
      return 0;
    }

    return recipe.requiredMaterialIds.reduce((total, itemId) => {
      const shape = getAlchemyMaterialShape(itemId);
      return total + ((shape?.footprintCells.length || 0) * 2);
    }, 0);
  }

  renderRecipeScrollList() {
    const recipes = this.recipeManager.getKnownRecipeSummaries();
    this.recipeList.render(recipes, (recipe, index, width, rowHeight) => {
      const isSelected = recipe.recipeId === this.selectedRecipeId;
      const statusText = recipe.canCraft ? '可以制作' : '素材不足';
      const statusColor = recipe.canCraft ? '#a3be8c' : '#bf616a';
      const row = this.add.container(0, 0);
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 34, isSelected ? 0x5e81ac : 0x3b4252, 0.9)
        .setStrokeStyle(2, isSelected ? 0x88c0d0 : 0x4c566a)
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      row.add(this.add.text(12, rowHeight / 2 - 11, recipe.resultName, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        fontStyle: 'bold'
      }));
      row.add(this.add.text(width - 70, rowHeight / 2 - 10, statusText, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: statusColor
      }).setOrigin(0.5, 0));

      bg.on('pointerdown', () => {
        this.selectedRecipeId = recipe.recipeId;
        this.selectedItemId = null;
        this.placedMaterials = [];
        this.showToast(recipe.canCraft ? `已选择 ${recipe.resultName}` : `${recipe.resultName} 素材不足`);
        this.refreshUI();
      });

      return row;
    }, { emptyText: '暂无已掌握配方' });
  }

  renderMaterialScrollList() {
    const recipe = this.getSelectedRecipe();
    if (!recipe) {
      this.materialList.render([], () => null, {
        emptyText: '选择要制作的产物后开始炼金'
      });
      return;
    }

    const availability = this.recipeManager.getRecipeAvailability(recipe);
    this.materialList.render(availability.materialStatus, (item, index, width, rowHeight) => {
      const isSelected = item.itemId === this.selectedItemId;
      const row = this.add.container(0, 0);
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 28, isSelected ? 0x5e81ac : 0x3b4252, item.enough ? 0.88 : 0.55)
        .setStrokeStyle(2, isSelected ? 0x88c0d0 : (item.enough ? 0x4c566a : 0xbf616a))
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      row.add(this.add.text(12, rowHeight / 2 - 8, `${item.itemName} x${item.count}`, {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: item.enough ? '#eceff4' : '#bf616a'
      }));

      bg.on('pointerdown', pointer => {
        if (!item.enough) {
          this.showToast(`${item.itemName} 素材不足`);
          return;
        }
        this.beginMaterialDrag(item.itemId, pointer);
      });

      return row;
    });
  }

  renderPlacedScrollList() {
    if (this.placedMaterials.length === 0) {
      this.placedList.render([], () => null, {
        emptyText: this.selectedRecipeId ? '拖动素材到宫格放置' : '尚未选择配方'
      });
      return;
    }

    this.placedList.render(this.placedMaterials, (material, index, width, rowHeight) => {
      const label = `${material.itemName} (${material.anchorRow},${material.anchorCol})`;
      const row = this.add.container(0, 0);
      const bg = this.add.rectangle(width / 2, rowHeight / 2, width - 8, 24, 0x3b4252, 0.75)
        .setStrokeStyle(1, 0x4c566a)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(10, rowHeight / 2, label, {
        fontSize: '13px',
        fontFamily: 'Courier New',
        color: '#d8dee9'
      }).setOrigin(0, 0.5);
      row.add([bg, text]);

      bg.on('pointerdown', pointer => {
        this.beginMaterialDrag(material.itemId, pointer);
      });

      return row;
    });
  }

  renderRecipeList() {
    this.recipeList.removeAll(true);

    this.recipeList.add(this.add.text(0, -20, '已掌握配方', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));

    const recipes = this.recipeManager.getKnownRecipeSummaries();
    recipes.forEach((recipe, index) => {
      const y = 14 + index * 40;
      const isSelected = recipe.recipeId === this.selectedRecipeId;
      const statusText = recipe.canCraft ? '可以制作' : '素材不足';
      const statusColor = recipe.canCraft ? '#a3be8c' : '#bf616a';
      const row = this.add.container(0, y);
      const bg = this.add.rectangle(135, 0, 270, 34, isSelected ? 0x5e81ac : 0x3b4252, 0.9)
        .setStrokeStyle(2, isSelected ? 0x88c0d0 : 0x4c566a)
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      row.add(this.add.text(12, -11, recipe.resultName, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        fontStyle: 'bold'
      }));
      row.add(this.add.text(196, -10, statusText, {
        fontSize: '12px',
        fontFamily: 'Georgia, serif',
        color: statusColor
      }).setOrigin(0.5, 0));

      bg.on('pointerdown', () => {
        this.selectedRecipeId = recipe.recipeId;
        this.selectedItemId = null;
        this.placedMaterials = [];
        this.showToast(recipe.canCraft ? `已选择 ${recipe.resultName}` : `${recipe.resultName} 素材不足`);
        this.refreshUI();
      });

      this.recipeList.add(row);
    });
  }

  renderMaterialList() {
    this.materialList.removeAll(true);

    this.materialList.add(this.add.text(0, -20, '配方素材', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));

    const recipe = this.getSelectedRecipe();
    if (!recipe) {
      this.materialList.add(this.add.text(0, 12, '选择要制作的产物后开始炼金', {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a'
      }));
      return;
    }

    const availability = this.recipeManager.getRecipeAvailability(recipe);

    availability.materialStatus.forEach((item, index) => {
      const y = 12 + index * 34;
      const isSelected = item.itemId === this.selectedItemId;
      const row = this.add.container(0, y);
      const bg = this.add.rectangle(135, 0, 270, 28, isSelected ? 0x5e81ac : 0x3b4252, item.enough ? 0.88 : 0.55)
        .setStrokeStyle(2, isSelected ? 0x88c0d0 : (item.enough ? 0x4c566a : 0xbf616a))
        .setInteractive({ useHandCursor: true });
      row.add(bg);
      row.add(this.add.text(12, -8, `${item.itemName} x${item.count}`, {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: item.enough ? '#eceff4' : '#bf616a'
      }));

      bg.on('pointerdown', pointer => {
        if (!item.enough) {
          this.showToast(`${item.itemName} 素材不足`);
          return;
        }
        this.beginMaterialDrag(item.itemId, pointer);
      });

      this.materialList.add(row);
    });
  }

  renderPlacedList() {
    this.placedList.removeAll(true);

    this.placedList.add(this.add.text(0, -25, '已放入素材', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }));

    if (this.placedMaterials.length === 0) {
      this.placedList.add(this.add.text(0, 10, this.selectedRecipeId ? '拖动素材到宫格放置' : '尚未选择配方', {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a'
      }));
      return;
    }

    this.placedMaterials.forEach((material, index) => {
      const y = 8 + index * 28;
      const label = `${material.itemName} (${material.anchorRow},${material.anchorCol})`;
      const text = this.add.text(0, y, label, {
        fontSize: '13px',
        fontFamily: 'Courier New',
        color: '#d8dee9'
      }).setInteractive({ useHandCursor: true });

      text.on('pointerdown', pointer => {
        this.beginMaterialDrag(material.itemId, pointer);
      });

      this.placedList.add(text);
    });
  }

  renderDetails() {
    this.detailPanel.removeAll(true);

    const scoreResult = calculateAlchemyScore(this.placedMaterials);
    const recipe = this.getSelectedRecipe();
    const maxScore = recipe ? this.getRecipeMaxScore(recipe) : scoreResult.maxScore;
    const qualityResult = getQuality(scoreResult.currentScore, maxScore);
    const availability = recipe ? this.recipeManager.getRecipeAvailability(recipe) : null;
    const recipeName = recipe ? recipe.resultName : '未选择';

    const lines = [
      `目标产物：${recipeName}`,
      `材料状态：${availability ? (availability.canCraft ? '可以制作' : '素材不足') : '未选择配方'}`,
      `预计花费：${recipe?.craftHours || '待设定'} 小时`,
      `当前分数：${scoreResult.currentScore} / ${maxScore}`,
      `当前品质：${maxScore > 0 && this.placedMaterials.length > 0 ? qualityResult.qualityName : '未放入素材'}`,
      `重叠格子：${scoreResult.overlapCells.length}`
    ];

    lines.forEach((line, index) => {
      this.detailPanel.add(this.add.text(0, index * 24, line, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: index === 1 && availability && !availability.canCraft ? '#bf616a' : '#eceff4'
      }).setOrigin(0.5));
    });
  }

  placeSelectedMaterial(row, col) {
    const recipe = this.getSelectedRecipe();
    if (!recipe) {
      this.showToast('请先选择要制作的产物');
      return;
    }

    if (!this.selectedItemId) {
      this.showToast('请先选择素材');
      return;
    }

    if (!recipe.requiredMaterialIds.includes(this.selectedItemId)) {
      this.showToast('该素材不属于当前配方');
      return;
    }

    if (this.inventorySystem.getItemCount(this.selectedItemId) < 1) {
      this.showToast('素材不足');
      return;
    }

    const placed = buildPlacedMaterial(this.selectedItemId, row, col);
    if (!placed) {
      this.showToast('素材会超出炼金釜边界');
      return;
    }

    const existingIndex = this.placedMaterials.findIndex(material =>
      material.itemId === this.selectedItemId
    );

    if (existingIndex >= 0) {
      this.placedMaterials[existingIndex] = placed;
    } else {
      this.placedMaterials.push(placed);
    }

    this.refreshUI();
  }

  beginMaterialDrag(itemId, pointer) {
    this.selectedItemId = itemId;
    this.draggingItemId = itemId;
    this.refreshUI();
    this.updateMaterialDrag(pointer);
  }

  updateMaterialDrag(pointer) {
    if (!this.draggingItemId) {
      return;
    }

    const shape = getAlchemyMaterialShape(this.draggingItemId);
    if (!shape) {
      this.clearDragPreview();
      return;
    }

    const targetCell = this.getGridCellFromPointer(pointer);
    const canPlace = targetCell
      ? Boolean(buildPlacedMaterial(this.draggingItemId, targetCell.row, targetCell.col))
      : false;

    const anchor = targetCell
      ? this.getGridCellWorldCenter(targetCell.row, targetCell.col)
      : { x: pointer.x + 12, y: pointer.y + 12 };

    this.drawDragPreview(shape, anchor.x, anchor.y, targetCell ? canPlace : true);
  }

  finishMaterialDrag(pointer) {
    if (!this.draggingItemId) {
      return;
    }

    const targetCell = this.getGridCellFromPointer(pointer);
    const itemId = this.draggingItemId;
    this.clearDragPreview();
    this.draggingItemId = null;

    if (!targetCell) {
      return;
    }

    this.selectedItemId = itemId;
    this.placeSelectedMaterial(targetCell.row, targetCell.col);
  }

  clearDragPreview() {
    if (this.dragPreview) {
      this.dragPreview.destroy();
      this.dragPreview = null;
    }
  }

  drawDragPreview(shape, x, y, canPlace) {
    this.clearDragPreview();

    const color = canPlace ? shape.color : 0xbf616a;
    const strokeColor = canPlace ? 0xebcb8b : 0xffffff;
    const step = this.gridCellSize + this.gridGap;

    this.dragPreview = this.add.container(x, y).setDepth(500);
    shape.footprintCells.forEach(([row, col]) => {
      const cell = this.add.rectangle(
        col * step,
        row * step,
        this.gridCellSize,
        this.gridCellSize,
        color,
        0.48
      ).setStrokeStyle(2, strokeColor, 0.9);
      this.dragPreview.add(cell);
    });

    this.dragPreview.add(this.add.text(0, -34, shape.itemName, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: canPlace ? '#ebcb8b' : '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5));
  }

  getGridCellFromPointer(pointer) {
    const left = this.panel.x + this.gridLayer.x - (this.gridCellSize / 2);
    const top = this.panel.y + this.gridLayer.y - (this.gridCellSize / 2);
    const step = this.gridCellSize + this.gridGap;
    const localX = pointer.x - left;
    const localY = pointer.y - top;
    const col = Math.floor(localX / step);
    const row = Math.floor(localY / step);

    if (
      row < 0 ||
      row >= ALCHEMY_GRID_SIZE ||
      col < 0 ||
      col >= ALCHEMY_GRID_SIZE
    ) {
      return null;
    }

    const insideCellX = localX - (col * step);
    const insideCellY = localY - (row * step);
    if (insideCellX > this.gridCellSize || insideCellY > this.gridCellSize) {
      return null;
    }

    return { row, col };
  }

  getGridCellWorldCenter(row, col) {
    const step = this.gridCellSize + this.gridGap;
    return {
      x: this.panel.x + this.gridLayer.x + (col * step),
      y: this.panel.y + this.gridLayer.y + (row * step)
    };
  }

  tryCraft() {
    const recipe = this.getSelectedRecipe();
    if (!recipe) {
      this.showToast('请先选择要制作的产物');
      return;
    }

    const availability = this.recipeManager.getRecipeAvailability(recipe);
    if (!availability.canCraft) {
      this.showToast('素材不足');
      return;
    }

    if (this.placedMaterials.length !== recipe.requiredMaterialIds.length) {
      this.showToast('请先放入当前配方所需素材');
      return;
    }

    const result = this.recipeManager.craftSelectedRecipe(this.selectedRecipeId, this.placedMaterials);
    this.showToast(result.message);

    if (result.success) {
      this.selectedItemId = null;
      this.placedMaterials = [];
      this.refreshUI();
    }
  }

  showToast(message) {
    if (this.toast) {
      this.toast.destroy();
    }

    this.toast = this.add.container(this.cameras.main.width / 2, 72).setDepth(300);
    this.toast.add(this.add.rectangle(0, 0, 430, 42, 0x2e3440, 0.96)
      .setStrokeStyle(2, 0xebcb8b));
    this.toast.add(this.add.text(0, 0, message, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b'
    }).setOrigin(0.5));

    this.tweens.add({
      targets: this.toast,
      alpha: 0,
      y: this.toast.y - 20,
      duration: 1800,
      ease: 'Power2',
      onComplete: () => {
        if (this.toast) {
          this.toast.destroy();
          this.toast = null;
        }
      }
    });
  }

  closeScene() {
    this.clearDragPreview();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default AlchemyScene;
