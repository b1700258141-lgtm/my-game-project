// 音效资源配置表
// 所有 .ogg 文件请放入 public/assets/audio/sfx/ 目录
// 文件不存在时 SfxManager 会输出 warning，不会导致游戏崩溃

export const SFX_CONFIG = {
  // ========== UI 交互音效 ==========
  ui: {
    openMenu: '/assets/audio/sfx/open_menu.ogg',
    closeMenu: '/assets/audio/sfx/close_menu.ogg',
    clickButton: '/assets/audio/sfx/click_button.ogg',
    hoverButton: '/assets/audio/sfx/hover_button.ogg',
    confirm: '/assets/audio/sfx/confirm.ogg',
    cancel: '/assets/audio/sfx/cancel.ogg',
    error: '/assets/audio/sfx/error.ogg',
  },

  // ========== 物品交互音效 ==========
  item: {
    buyItem: '/assets/audio/sfx/buy_item.ogg',
    buyFail: '/assets/audio/sfx/buy_fail.ogg',
    receiveItem: '/assets/audio/sfx/receive_item.ogg',
    submitItem: '/assets/audio/sfx/submit_item.ogg',
    selectItem: '/assets/audio/sfx/select_item.ogg',
    useItem: '/assets/audio/sfx/use_item.ogg',
    openInventory: '/assets/audio/sfx/open_menu.ogg',       // 复用打开菜单音效
    closeInventory: '/assets/audio/sfx/close_menu.ogg',     // 复用关闭菜单音效
  },

  // ========== 委托相关音效 ==========
  quest: {
    questAccept: '/assets/audio/sfx/quest_accept.ogg',
    questComplete: '/assets/audio/sfx/quest_complete.ogg',
    reward: '/assets/audio/sfx/reward.ogg',
  },

  // ========== 炼金相关音效 ==========
  alchemy: {
    openAlchemy: '/assets/audio/sfx/open_alchemy.ogg',
    addMaterial: '/assets/audio/sfx/add_material.ogg',
    removeMaterial: '/assets/audio/sfx/remove_material.ogg',
    alchemyStart: '/assets/audio/sfx/alchemy_start.ogg',
    alchemyLoop: '/assets/audio/sfx/alchemy_loop.ogg',
    alchemySuccess: '/assets/audio/sfx/alchemy_success.ogg',
    alchemyFail: '/assets/audio/sfx/alchemy_fail.ogg',
    highQualityResult: '/assets/audio/sfx/high_quality_result.ogg',
  },

  // ========== 剧情与精魂记忆音效 ==========
  story: {
    clueFound: '/assets/audio/sfx/clue_found.ogg',
    memoryTrigger: '/assets/audio/sfx/memory_trigger.ogg',
    keyItemGet: '/assets/audio/sfx/key_item_get.ogg',
  },
};

// 需要冷却的高频音效键名列表（防止短时间内重复播放）
export const SFX_COOLDOWN_MS = {
  clickButton: 80,
  hoverButton: 200,
  selectItem: 80,
  addMaterial: 150,
};

// 默认音量 (0-1)
export const SFX_DEFAULT_VOLUME = 0.7;

// localStorage 键名
export const SFX_STORAGE_KEY = 'oddjobs_alchemy_sfx_settings';
