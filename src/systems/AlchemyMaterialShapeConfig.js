export const ALCHEMY_GRID_SIZE = 4;

function createHerbalPowderShape(itemId, itemName) {
  return {
    itemId,
    itemName,
    footprintCells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0]
    ],
    color: 0xebcb8b
  };
}

export const ALCHEMY_MATERIAL_SHAPES = {
  material_carrot: {
    itemId: 'material_carrot',
    itemName: '萝卜',
    footprintCells: [
      [0, 0],
      [1, 0]
    ],
    color: 0xd08770
  },
  material_foxtail_grass: {
    itemId: 'material_foxtail_grass',
    itemName: '狗尾巴草',
    footprintCells: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1]
    ],
    color: 0xa3be8c
  },
  material_bellflower: {
    itemId: 'material_bellflower',
    itemName: '风铃草',
    footprintCells: [
      [0, 0],
      [0, 1],
      [0, 2]
    ],
    color: 0x88c0d0
  },
  material_beetle: {
    itemId: 'material_beetle',
    itemName: '甲壳虫',
    footprintCells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0]
    ],
    color: 0xb48ead
  },
  material_night_dew: {
    itemId: 'material_night_dew',
    itemName: '夜露',
    footprintCells: [
      [0, 0],
      [1, 0],
      [1, 1]
    ],
    color: 0x5e81ac
  },
  material_old_coin: {
    itemId: 'material_old_coin',
    itemName: '旧铜钱',
    footprintCells: [
      [0, 0]
    ],
    color: 0xd08770
  },
  herbal_powder_perfect: createHerbalPowderShape(
    'herbal_powder_perfect',
    '完美品质 中药粉末'
  ),
  herbal_powder_excellent: createHerbalPowderShape(
    'herbal_powder_excellent',
    '优秀品质 中药粉末'
  ),
  herbal_powder_normal: createHerbalPowderShape(
    'herbal_powder_normal',
    '普通品质 中药粉末'
  ),
  herbal_powder_poor: createHerbalPowderShape(
    'herbal_powder_poor',
    '劣等品质 中药粉末'
  )
};

export const ALCHEMY_RECIPES = [
  {
    recipeId: 'digestive_tablet',
    recipeName: '消食片',
    requiredMaterialIds: [
      'material_carrot',
      'material_foxtail_grass',
      'material_bellflower'
    ],
    resultBaseItemId: 'digestive_tablet',
    resultName: '消食片',
    knownByDefault: true
  },
  {
    recipeId: 'herbal_powder',
    recipeName: '中药粉末',
    requiredMaterialIds: [
      'material_beetle',
      'material_foxtail_grass'
    ],
    resultBaseItemId: 'herbal_powder',
    resultName: '中药粉末',
    knownByDefault: true
  },
  {
    recipeId: 'calming_incense',
    recipeName: '安神香',
    requiredMaterialIds: [
      'material_bellflower',
      'material_night_dew'
    ],
    resultBaseItemId: 'calming_incense',
    resultName: '安神香',
    knownByDefault: true
  },
  {
    recipeId: 'fortune_pill',
    recipeName: '招财丸',
    requiredMaterialIds: [
      'material_carrot',
      'material_old_coin'
    ],
    resultBaseItemId: 'fortune_pill',
    resultName: '招财丸',
    knownByDefault: true
  },
  {
    recipeId: 'cleansing_powder',
    recipeName: '驱秽粉',
    requiredMaterialIds: [
      'material_beetle',
      'material_bellflower',
      'material_foxtail_grass'
    ],
    resultBaseItemId: 'cleansing_powder',
    resultName: '驱秽粉',
    knownByDefault: true
  }
];

export const ALCHEMY_QUALITY_NAMES = {
  perfect: '完美品质',
  excellent: '优秀品质',
  normal: '普通品质',
  poor: '劣等品质'
};

export function getAlchemyMaterialShape(itemId) {
  return ALCHEMY_MATERIAL_SHAPES[itemId] || null;
}

export function getAlchemyMaterialShapes() {
  return Object.values(ALCHEMY_MATERIAL_SHAPES);
}
