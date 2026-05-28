const SPRITE_BASE = '/assets/characters/spritesheets_normalized_v3';
const PORTRAIT_BASE = '/assets/characters/portraits_cleaned_v3';

const defaultFrameConfig = {
  frameRows: 4,
  frameCols: 3,
  directions: {
    down: 0,
    left: 1,
    right: 2,
    up: 3
  },
  idleFrameIndex: 1,
  walkFrameIndices: [0, 1, 2, 1],
  scale: 0.16,
  anchor: { x: 0.5, y: 1 },
  dialoguePortraitPosition: 'left'
};

function character(config) {
  return {
    ...defaultFrameConfig,
    ...config,
    directions: config.directions || defaultFrameConfig.directions,
    anchor: config.anchor || defaultFrameConfig.anchor,
    dialoguePortraitPosition: config.dialoguePortraitPosition || defaultFrameConfig.dialoguePortraitPosition
  };
}

export const CHARACTER_ASSETS = {
  player: character({
    id: 'player',
    displayName: '主角',
    roleType: 'player / protagonist / 主角',
    portraitPath: `${PORTRAIT_BASE}/player.png`,
    spriteSheetPath: `${SPRITE_BASE}/player.png`,
    textureKey: 'character_player_sprite',
    portraitKey: 'character_player_portrait'
  }),

  visitor_teacher: character({
    id: 'visitor_teacher',
    displayName: '退休教师',
    roleType: 'teacher',
    portraitPath: `${PORTRAIT_BASE}/teacher.png`,
    spriteSheetPath: `${SPRITE_BASE}/teacher.png`,
    textureKey: 'character_teacher_sprite',
    portraitKey: 'character_teacher_portrait'
  }),

  visitor_chef: character({
    id: 'visitor_chef',
    displayName: '饭馆厨师',
    roleType: 'restaurant_chef / chef',
    portraitPath: `${PORTRAIT_BASE}/chef.png`,
    spriteSheetPath: `${SPRITE_BASE}/chef.png`,
    textureKey: 'character_chef_sprite',
    portraitKey: 'character_chef_portrait'
  }),

  visitor_courier: character({
    id: 'visitor_courier',
    displayName: '快递员',
    roleType: 'courier',
    portraitPath: `${PORTRAIT_BASE}/courier.png`,
    spriteSheetPath: `${SPRITE_BASE}/courier.png`,
    textureKey: 'character_courier_sprite',
    portraitKey: 'character_courier_portrait'
  }),

  visitor_antique: character({
    id: 'visitor_antique',
    displayName: '古玩店老板',
    roleType: 'craftsman / antique_dealer',
    portraitPath: `${PORTRAIT_BASE}/clockmaker.png`,
    spriteSheetPath: `${SPRITE_BASE}/craftsman.png`,
    textureKey: 'character_craftsman_sprite',
    portraitKey: 'character_clockmaker_portrait'
  }),

  guest_chef_digestive: character({
    id: 'guest_chef_digestive',
    displayName: '肚子很大的厨师',
    roleType: 'restaurant_chef / chef',
    portraitPath: `${PORTRAIT_BASE}/chef.png`,
    spriteSheetPath: `${SPRITE_BASE}/chef.png`,
    textureKey: 'character_chef_sprite',
    portraitKey: 'character_chef_portrait'
  }),

  guest_ring_boy: character({
    id: 'guest_ring_boy',
    displayName: '看上去有点腼腆的年轻人',
    roleType: 'businessman / office_worker',
    portraitPath: `${PORTRAIT_BASE}/office_worker.png`,
    spriteSheetPath: `${SPRITE_BASE}/office_worker.png`,
    textureKey: 'character_office_worker_sprite',
    portraitKey: 'character_office_worker_portrait'
  }),

  guest_little_girl: character({
    id: 'guest_little_girl',
    displayName: '看上去很焦急的女孩',
    roleType: 'student',
    portraitPath: `${PORTRAIT_BASE}/student.png`,
    spriteSheetPath: `${SPRITE_BASE}/student.png`,
    textureKey: 'character_student_sprite',
    portraitKey: 'character_student_portrait'
  }),

  guest_elder_lady: character({
    id: 'guest_elder_lady',
    displayName: '退休社区医生',
    roleType: 'elder_lady / doctor',
    portraitPath: `${PORTRAIT_BASE}/elder_lady.png`,
    spriteSheetPath: `${SPRITE_BASE}/elder_lady.png`,
    textureKey: 'character_elder_lady_sprite',
    portraitKey: 'character_elder_lady_portrait'
  }),

  guest_clockmaker: character({
    id: 'guest_clockmaker',
    displayName: '钟表修理店主',
    roleType: 'craftsman / clockmaker',
    portraitPath: `${PORTRAIT_BASE}/clockmaker.png`,
    spriteSheetPath: `${SPRITE_BASE}/craftsman.png`,
    textureKey: 'character_craftsman_sprite',
    portraitKey: 'character_clockmaker_portrait'
  }),

  guest_convenience_clerk: character({
    id: 'guest_convenience_clerk',
    displayName: '顶着黑眼圈的便利店员',
    roleType: 'shop_clerk',
    portraitPath: `${PORTRAIT_BASE}/restaurant_staff.png`,
    spriteSheetPath: `${SPRITE_BASE}/restaurant_staff.png`,
    textureKey: 'character_restaurant_staff_sprite',
    portraitKey: 'character_restaurant_staff_portrait'
  }),

  guest_ad_planner: character({
    id: 'guest_ad_planner',
    displayName: '精神紧绷的广告策划',
    roleType: 'businessman / office_worker',
    portraitPath: `${PORTRAIT_BASE}/office_worker.png`,
    spriteSheetPath: `${SPRITE_BASE}/office_worker.png`,
    textureKey: 'character_office_worker_sprite',
    portraitKey: 'character_office_worker_portrait'
  }),

  guest_pharmacy_clerk: character({
    id: 'guest_pharmacy_clerk',
    displayName: '戴口罩的药房店员',
    roleType: 'shop_clerk',
    portraitPath: `${PORTRAIT_BASE}/restaurant_staff.png`,
    spriteSheetPath: `${SPRITE_BASE}/restaurant_staff.png`,
    textureKey: 'character_restaurant_staff_sprite',
    portraitKey: 'character_restaurant_staff_portrait'
  }),

  guest_rideshare_driver: character({
    id: 'guest_rideshare_driver',
    displayName: '满脸疲惫的网约车司机',
    roleType: 'driver',
    portraitPath: `${PORTRAIT_BASE}/courier.png`,
    spriteSheetPath: `${SPRITE_BASE}/courier.png`,
    textureKey: 'character_courier_sprite',
    portraitKey: 'character_courier_portrait'
  }),

  guest_diner_owner: character({
    id: 'guest_diner_owner',
    displayName: '有点发愁的小饭馆老板',
    roleType: 'restaurant_owner / chef',
    portraitPath: `${PORTRAIT_BASE}/chef.png`,
    spriteSheetPath: `${SPRITE_BASE}/chef.png`,
    textureKey: 'character_chef_sprite',
    portraitKey: 'character_chef_portrait'
  }),

  guest_law_assistant: character({
    id: 'guest_law_assistant',
    displayName: '提着文件袋的律师助理',
    roleType: 'businessman / lawyer',
    portraitPath: `${PORTRAIT_BASE}/office_worker.png`,
    spriteSheetPath: `${SPRITE_BASE}/office_worker.png`,
    textureKey: 'character_office_worker_sprite',
    portraitKey: 'character_office_worker_portrait'
  })
};

export const PORTRAIT_ID_TO_CHARACTER_ID = {
  portrait_player: 'player',
  portrait_teacher: 'visitor_teacher',
  portrait_chef: 'visitor_chef',
  portrait_courier: 'visitor_courier',
  portrait_antique: 'visitor_antique',
  portrait_chef_digestive: 'guest_chef_digestive',
  portrait_ring_boy: 'guest_ring_boy',
  portrait_little_girl: 'guest_little_girl',
  portrait_elder_lady: 'guest_elder_lady',
  portrait_clockmaker: 'guest_clockmaker',
  portrait_convenience_clerk: 'guest_convenience_clerk',
  portrait_ad_planner: 'guest_ad_planner',
  portrait_pharmacy_clerk: 'guest_pharmacy_clerk',
  portrait_rideshare_driver: 'guest_rideshare_driver',
  portrait_diner_owner: 'guest_diner_owner',
  portrait_law_assistant: 'guest_law_assistant'
};

export const SPEAKER_TO_CHARACTER_ID = {
  player: 'player',
  '玩家': 'player',
  '主角': 'player',
  '退休教师': 'visitor_teacher',
  '饭馆厨师': 'visitor_chef',
  '快递员': 'visitor_courier',
  '古玩店老板': 'visitor_antique',
  '肚子很大的厨师': 'guest_chef_digestive',
  '看上去有点腼腆的年轻人': 'guest_ring_boy',
  '看上去很焦急的女孩': 'guest_little_girl',
  '退休社区医生': 'guest_elder_lady',
  '钟表修理店主': 'guest_clockmaker',
  '顶着黑眼圈的便利店员': 'guest_convenience_clerk',
  '精神紧绷的广告策划': 'guest_ad_planner',
  '戴口罩的药房店员': 'guest_pharmacy_clerk',
  '满脸疲惫的网约车司机': 'guest_rideshare_driver',
  '有点发愁的小饭馆老板': 'guest_diner_owner',
  '提着文件袋的律师助理': 'guest_law_assistant'
};

export function getCharacterAsset(characterId) {
  return CHARACTER_ASSETS[characterId] || null;
}

export function getCharacterAssetByPortraitId(portraitId) {
  return CHARACTER_ASSETS[PORTRAIT_ID_TO_CHARACTER_ID[portraitId]] || null;
}

export function getCharacterAssetBySpeaker(speaker) {
  return CHARACTER_ASSETS[SPEAKER_TO_CHARACTER_ID[String(speaker || '')]] || null;
}

export function getAllUniqueCharacterAssetFiles() {
  const byTexture = new Map();
  const byPortrait = new Map();

  Object.values(CHARACTER_ASSETS).forEach((asset) => {
    if (asset.textureKey && asset.spriteSheetPath) {
      byTexture.set(asset.textureKey, asset.spriteSheetPath);
    }
    if (asset.portraitKey && asset.portraitPath) {
      byPortrait.set(asset.portraitKey, asset.portraitPath);
    }
  });

  return {
    spritesheets: [...byTexture.entries()].map(([key, path]) => ({ key, path })),
    portraits: [...byPortrait.entries()].map(([key, path]) => ({ key, path }))
  };
}
