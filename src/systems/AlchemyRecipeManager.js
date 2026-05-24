import InventorySystem from './InventorySystem';
import { ALCHEMY_RECIPES } from './AlchemyMaterialShapeConfig';
import {
  calculateAlchemyScore,
  getQuality,
  getResultItemId,
  matchRecipe
} from './AlchemyScoreCalculator';
import DailyLoopManager from './DailyLoopManager';
import { getTimeManager } from './TimeManager';

export default class AlchemyRecipeManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.inventorySystem = new InventorySystem(gameState);
    this.recipes = ALCHEMY_RECIPES;
  }

  getRecipePreview(placedMaterials) {
    const recipe = matchRecipe(placedMaterials.map(material => material.itemId), this.recipes);
    return recipe;
  }

  getKnownRecipes() {
    const savedRecipeIds = Array.isArray(this.gameState.alchemyRecipes)
      ? this.gameState.alchemyRecipes
      : [];
    const defaultRecipeIds = this.recipes
      .filter(recipe => recipe.knownByDefault)
      .map(recipe => recipe.recipeId);
    const knownRecipeIds = [...new Set([...defaultRecipeIds, ...savedRecipeIds])];

    return this.recipes.filter(recipe => knownRecipeIds.includes(recipe.recipeId));
  }

  getRecipeById(recipeId) {
    return this.recipes.find(recipe => recipe.recipeId === recipeId) || null;
  }

  getRecipeAvailability(recipe) {
    const materialStatus = recipe.requiredMaterialIds.map(itemId => {
      const count = this.inventorySystem.getItemCount(itemId);
      return {
        itemId,
        count,
        enough: count >= 1,
        itemName: this.inventorySystem.itemSystem.getItemName(itemId)
      };
    });

    return {
      canCraft: materialStatus.every(item => item.enough),
      materialStatus
    };
  }

  getKnownRecipeSummaries() {
    return this.getKnownRecipes().map(recipe => ({
      ...recipe,
      ...this.getRecipeAvailability(recipe)
    }));
  }

  placedMaterialsMatchRecipe(recipe, placedMaterials) {
    const placedIds = placedMaterials.map(material => material.itemId).sort();
    const requiredIds = [...recipe.requiredMaterialIds].sort();
    if (placedIds.length !== requiredIds.length) {
      return false;
    }
    return requiredIds.every((itemId, index) => itemId === placedIds[index]);
  }

  craftSelectedRecipe(recipeId, placedMaterials) {
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: '当前配方不存在'
      };
    }

    if (!this.placedMaterialsMatchRecipe(recipe, placedMaterials)) {
      return {
        success: false,
        message: '请先放入当前配方所需素材'
      };
    }

    return this.craft(placedMaterials);
  }

  craft(placedMaterials) {
    const recipe = this.getRecipePreview(placedMaterials);
    if (!recipe) {
      return {
        success: false,
        message: '当前素材组合没有可用配方'
      };
    }

    for (const itemId of recipe.requiredMaterialIds) {
      if (this.inventorySystem.getItemCount(itemId) < 1) {
        return {
          success: false,
          message: '素材不足'
        };
      }
    }

    const scoreResult = calculateAlchemyScore(placedMaterials);
    const qualityResult = getQuality(scoreResult.currentScore, scoreResult.maxScore);
    const resultItemId = getResultItemId(recipe, qualityResult.quality);
    if (!this.inventorySystem.itemSystem.itemExists(resultItemId)) {
      return {
        success: false,
        message: '炼金产物数据缺失'
      };
    }

    for (const itemId of recipe.requiredMaterialIds) {
      const removed = this.inventorySystem.removeItem(itemId, 1);
      if (!removed) {
        return {
          success: false,
          message: '素材不足'
        };
      }
    }

    const dailyLoop = new DailyLoopManager(this.gameState);
    recipe.requiredMaterialIds.forEach(itemId => {
      dailyLoop.recordItemConsumed(itemId, 1);
    });

    const added = this.inventorySystem.addItem(resultItemId, 1, 'alchemy_cauldron');
    if (!added) {
      return {
        success: false,
        message: '炼金产物数据缺失'
      };
    }

    dailyLoop.recordItemGained(resultItemId, 1);
    dailyLoop.recordAlchemyFinished(qualityResult);
    if (recipe.craftHours) {
      getTimeManager(this.gameState)?.advanceGameTime(recipe.craftHours);
    }

    return {
      success: true,
      message: `获得 ${qualityResult.qualityName} ${recipe.resultName}`,
      recipe,
      resultItemId,
      resultName: recipe.resultName,
      ...qualityResult,
      scoreResult
    };
  }
}
