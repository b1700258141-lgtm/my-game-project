import { WARM_UI, addWarmPanel } from '../ui/WarmUITheme';
import { getSfxManager } from './SfxManager';

export const DEFAULT_TUTORIAL_FLAGS = {
  counterOpened: false,
  cauldronOpened: false,
  bookshelfOpened: false,
  firstCommissionAccepted: false,
  firstVisitorNpcAppeared: false
};

const LEGACY_TUTORIAL_KEY_MAP = {
  counter: 'counterOpened',
  alchemy: 'cauldronOpened',
  bookshelf: 'bookshelfOpened',
  first_commission: 'firstCommissionAccepted',
  first_visitor: 'firstVisitorNpcAppeared'
};

export const TUTORIAL_MESSAGES = {
  counterOpened: {
    title: '柜台说明',
    text: [
      '这里是柜台。',
      '你可以在这里查看和处理客人的委托，管理万事屋的日常经营。',
      '随着游戏推进，柜台会成为你接触委托、推进事件和获得报酬的重要入口。'
    ].join('\n\n')
  },
  cauldronOpened: {
    title: '炼金釜说明',
    text: [
      '这里是炼金釜。',
      '你可以使用收集到的炼金素材制作药剂、道具和特殊物品。',
      '不同材料可能会影响炼金结果，部分委托也需要你提交特定炼金产物。'
    ].join('\n\n')
  },
  bookshelfOpened: {
    title: '书架说明',
    text: [
      '这里是书架。',
      '你可以在这里查看资料、线索、配方或与故事相关的信息。',
      '随着游戏推进，书架中可能会记录更多关于炼金术、精魂记忆和万事屋过去的内容。'
    ].join('\n\n')
  },
  firstCommissionAccepted: {
    title: '委托说明',
    text: [
      '你已经接下了第一个委托。',
      '按 J 可以打开委托列表，查看当前委托的目标、进度和完成入口。',
      '如果需要炼金素材，可以与万事屋的门互动，前往集市购买。',
      '不过，并不是所有炼金素材都能直接买到。部分特殊素材可能需要通过委托、随机来访 NPC、剧情事件或其他方式获得。'
    ].join('\n\n')
  },
  firstVisitorNpcAppeared: {
    title: '来访客人说明',
    text: [
      '有客人来到了万事屋。',
      '随机来访的 NPC 可能会带来交易、临时委托、炼金素材或关键道具。',
      '有些重要物品只能通过与来访 NPC 互动获得，这些物品可能会影响后续剧情和结局。'
    ].join('\n\n')
  }
};

const activeTutorials = new Set();

export function normalizeTutorialFlags(flags = {}) {
  const normalized = { ...DEFAULT_TUTORIAL_FLAGS };
  for (const [key, value] of Object.entries(flags || {})) {
    const mappedKey = LEGACY_TUTORIAL_KEY_MAP[key] || key;
    if (mappedKey in normalized) {
      normalized[mappedKey] = Boolean(value);
    }
  }
  return normalized;
}

export function isTutorialShown(tutorialKey) {
  const flags = normalizeTutorialFlags(window.gameState?.tutorialFlags || {});
  return Boolean(flags[tutorialKey]);
}

export function showTutorialIfNeeded(scene, tutorialKey, options = {}) {
  const normalizedKey = LEGACY_TUTORIAL_KEY_MAP[tutorialKey] || tutorialKey;
  const content = TUTORIAL_MESSAGES[normalizedKey];
  if (!scene || !content || !window.gameState) return false;

  window.gameState.tutorialFlags = normalizeTutorialFlags(window.gameState.tutorialFlags);
  if (window.gameState.tutorialFlags[normalizedKey] || activeTutorials.has(normalizedKey)) {
    return false;
  }

  activeTutorials.add(normalizedKey);
  scene.__tutorialModalOpen = true;
  getSfxManager().openMenu();

  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;
  const panelW = Math.min(580, w - 80);
  const panelH = Math.min(430, h - 80);
  const bodyW = panelW - 96;
  const bodyH = panelH - 170;
  let scrollY = 0;

  const container = scene.add.container(w / 2, h / 2).setDepth(1000);
  const overlay = scene.add.rectangle(0, 0, w, h, 0x000000, 0.42)
    .setInteractive();
  container.add(overlay);

  addWarmPanel(scene, container, 0, 0, panelW, panelH, {
    title: content.title,
    fill: WARM_UI.panel,
    alpha: 0.98
  });

  const bodyTop = -panelH / 2 + 70;
  const bodyLeft = -bodyW / 2;
  const bodyMaskShape = scene.add.graphics();
  bodyMaskShape.fillStyle(0xffffff, 1);
  bodyMaskShape.fillRect(w / 2 + bodyLeft, h / 2 + bodyTop, bodyW, bodyH);
  bodyMaskShape.setVisible(false);
  const bodyMask = bodyMaskShape.createGeometryMask();

  const bodyContainer = scene.add.container(0, bodyTop);
  const bodyText = scene.add.text(bodyLeft, 0, content.text, {
    fontSize: '16px',
    fontFamily: 'Georgia, serif',
    color: WARM_UI.text,
    wordWrap: { width: bodyW, useAdvancedWrap: true },
    lineSpacing: 8,
    align: 'left'
  }).setOrigin(0, 0);
  bodyContainer.add(bodyText);
  bodyContainer.setMask(bodyMask);
  container.add(bodyContainer);

  const maxScroll = Math.max(0, bodyText.height - bodyH);
  let scrollbarThumb = null;
  if (maxScroll > 0) {
    const trackX = panelW / 2 - 32;
    const trackY = bodyTop + bodyH / 2;
    container.add(scene.add.rectangle(trackX, trackY, 4, bodyH, WARM_UI.border, 0.35));
    const thumbH = Math.max(32, bodyH * (bodyH / bodyText.height));
    scrollbarThumb = scene.add.rectangle(trackX, bodyTop + thumbH / 2, 8, thumbH, WARM_UI.panelDark, 0.85);
    container.add(scrollbarThumb);
  }

  const updateScroll = () => {
    bodyContainer.y = bodyTop - scrollY;
    if (scrollbarThumb && maxScroll > 0) {
      const thumbRange = bodyH - scrollbarThumb.height;
      scrollbarThumb.y = bodyTop + scrollbarThumb.height / 2 + thumbRange * (scrollY / maxScroll);
    }
  };

  const wheelHandler = (_pointer, _objects, _dx, dy) => {
    if (maxScroll <= 0) return;
    scrollY = Phaser.Math.Clamp(scrollY + dy * 0.45, 0, maxScroll);
    updateScroll();
  };
  scene.input.on('wheel', wheelHandler);

  const confirmBtn = scene.add.text(0, panelH / 2 - 46, '【 知道了 】', {
    fontSize: '20px',
    fontFamily: 'Georgia, serif',
    color: WARM_UI.goldText,
    fontStyle: 'bold',
    backgroundColor: '#3a2418',
    padding: { x: 24, y: 10 }
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });

  const close = () => {
    if (!activeTutorials.has(normalizedKey)) return;
    activeTutorials.delete(normalizedKey);
    window.gameState.tutorialFlags[normalizedKey] = true;
    scene.__tutorialModalOpen = false;
    scene.input.off('wheel', wheelHandler);
    scene.input.keyboard?.off('keydown-ESC', escHandler);
    bodyMask.destroy();
    bodyMaskShape.destroy();
    getSfxManager().closeMenu();
    container.destroy();
    options.onClose?.();
  };

  confirmBtn.on('pointerover', () => confirmBtn.setAlpha(0.85));
  confirmBtn.on('pointerout', () => confirmBtn.setAlpha(1));
  confirmBtn.on('pointerdown', close);
  container.add(confirmBtn);

  const escHandler = (event) => {
    event?.stopPropagation?.();
    close();
  };
  scene.input.keyboard?.once('keydown-ESC', escHandler);

  container.setAlpha(0);
  scene.tweens.add({
    targets: container,
    alpha: 1,
    duration: 220
  });

  return true;
}

export default {
  DEFAULT_TUTORIAL_FLAGS,
  TUTORIAL_MESSAGES,
  isTutorialShown,
  normalizeTutorialFlags,
  showTutorialIfNeeded
};
