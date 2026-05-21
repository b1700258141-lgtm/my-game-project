import {
  ALCHEMY_GRID_SIZE,
  ALCHEMY_MATERIAL_SHAPES,
  ALCHEMY_QUALITY_NAMES,
  ALCHEMY_RECIPES
} from './AlchemyMaterialShapeConfig';

export function getActualCells(materialShape, anchorRow, anchorCol) {
  return materialShape.footprintCells.map(([row, col]) => ({
    row: anchorRow + row,
    col: anchorCol + col
  }));
}

export function canPlaceMaterial(materialShape, anchorRow, anchorCol, gridSize = ALCHEMY_GRID_SIZE) {
  if (!materialShape) return false;

  return getActualCells(materialShape, anchorRow, anchorCol).every(cell =>
    cell.row >= 0 &&
    cell.row < gridSize &&
    cell.col >= 0 &&
    cell.col < gridSize
  );
}

export function buildPlacedMaterial(itemId, anchorRow, anchorCol) {
  const shape = ALCHEMY_MATERIAL_SHAPES[itemId];
  if (!shape || !canPlaceMaterial(shape, anchorRow, anchorCol)) {
    return null;
  }

  return {
    itemId: shape.itemId,
    itemName: shape.itemName,
    footprintCells: shape.footprintCells,
    color: shape.color,
    anchorRow,
    anchorCol,
    actualCells: getActualCells(shape, anchorRow, anchorCol)
  };
}

export function calculateAlchemyScore(placedMaterials) {
  const cellOccupants = new Map();
  const materialCellScores = [];
  let totalMaterialCells = 0;

  placedMaterials.forEach(material => {
    material.actualCells.forEach(cell => {
      const key = `${cell.row},${cell.col}`;
      if (!cellOccupants.has(key)) {
        cellOccupants.set(key, []);
      }
      cellOccupants.get(key).push(material.itemId);
      totalMaterialCells += 1;
    });
  });

  let currentScore = 0;
  const singleOccupiedCells = [];
  const overlapCells = [];

  for (const [key, occupants] of cellOccupants.entries()) {
    const [row, col] = key.split(',').map(Number);

    if (occupants.length === 1) {
      currentScore += 2;
      singleOccupiedCells.push({ row, col, occupants: [...occupants] });
    } else {
      currentScore += 1;
      overlapCells.push({ row, col, occupants: [...occupants] });
    }
  }

  placedMaterials.forEach(material => {
    material.actualCells.forEach(cell => {
      const key = `${cell.row},${cell.col}`;
      const occupants = cellOccupants.get(key) || [];
      materialCellScores.push({
        itemId: material.itemId,
        itemName: material.itemName,
        row: cell.row,
        col: cell.col,
        score: occupants.length === 1 ? 2 : 1 / occupants.length,
        isOverlapped: occupants.length > 1
      });
    });
  });

  const maxScore = totalMaterialCells * 2;
  const scoreRatio = maxScore > 0 ? currentScore / maxScore : 0;

  return {
    currentScore,
    maxScore,
    scoreRatio,
    singleOccupiedCells,
    overlapCells,
    materialCellScores
  };
}

export function getQuality(score, maxScore) {
  if (maxScore <= 0) {
    return {
      quality: 'poor',
      qualityName: ALCHEMY_QUALITY_NAMES.poor,
      ratio: 0
    };
  }

  const ratio = score / maxScore;
  let quality = 'poor';

  if (ratio === 1) {
    quality = 'perfect';
  } else if (ratio >= 0.8) {
    quality = 'excellent';
  } else if (ratio >= 0.4) {
    quality = 'normal';
  }

  return {
    quality,
    qualityName: ALCHEMY_QUALITY_NAMES[quality],
    ratio
  };
}

export function matchRecipe(selectedMaterialIds, recipes = ALCHEMY_RECIPES) {
  const selected = [...selectedMaterialIds].sort();

  return recipes.find(recipe => {
    const required = [...recipe.requiredMaterialIds].sort();
    if (selected.length !== required.length) return false;
    return selected.every((itemId, index) => itemId === required[index]);
  }) || null;
}

export function getResultItemId(recipe, quality) {
  if (!recipe || !quality) return null;
  return `${recipe.resultBaseItemId}_${quality}`;
}

export function analyzeRecipeScoreRange(recipe) {
  const placementsByMaterial = recipe.requiredMaterialIds.map(itemId => {
    const shape = ALCHEMY_MATERIAL_SHAPES[itemId];
    const placements = [];

    for (let row = 0; row < ALCHEMY_GRID_SIZE; row += 1) {
      for (let col = 0; col < ALCHEMY_GRID_SIZE; col += 1) {
        const placed = buildPlacedMaterial(itemId, row, col);
        if (placed) {
          placements.push(placed);
        }
      }
    }

    return placements;
  });

  const possibleScores = new Set();

  function walk(index, current) {
    if (index >= placementsByMaterial.length) {
      possibleScores.add(calculateAlchemyScore(current).currentScore);
      return;
    }

    placementsByMaterial[index].forEach(placement => {
      walk(index + 1, [...current, placement]);
    });
  }

  walk(0, []);

  const sortedScores = [...possibleScores].sort((a, b) => a - b);

  return {
    possibleScores: sortedScores,
    minScore: sortedScores[0] || 0,
    maxScore: sortedScores[sortedScores.length - 1] || 0
  };
}
