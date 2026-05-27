import { getSfxManager } from '../systems/SfxManager';

export const WARM_UI = {
  border: 0x3a2418,
  borderDark: 0x20130d,
  panel: 0xe6cfa8,
  panelLight: 0xf3dfb9,
  panelAlt: 0xcfa66a,
  panelDark: 0x6f4528,
  button: 0xb77a2a,
  buttonHover: 0xd1913d,
  buttonPressed: 0x8f551c,
  disabled: 0x8a775e,
  alchemy: 0x58c891,
  gold: 0xd8a843,
  warning: 0xa94b3f,
  purple: 0x6b4a7a,
  shadow: 0x1b100b,
  text: '#2B1E17',
  textMuted: '#5A402F',
  textLight: '#F7E8C8',
  paper: '#E6CFA8',
  alchemyText: '#2F8F68',
  warningText: '#A94B3F',
  goldText: '#8B5A1B'
};

export function addWarmPanel(scene, parent, x, y, width, height, options = {}) {
  const container = scene.add.container(x, y);
  const fill = options.fill ?? WARM_UI.panel;
  const stroke = options.stroke ?? WARM_UI.border;
  const alpha = options.alpha ?? 0.98;

  container.add(scene.add.rectangle(4, 6, width, height, WARM_UI.shadow, 0.3));
  container.add(scene.add.rectangle(0, 0, width, height, stroke, 1));
  container.add(scene.add.rectangle(0, 0, width - 8, height - 8, fill, alpha));
  container.add(scene.add.rectangle(0, -height / 2 + 8, width - 18, 4, WARM_UI.panelLight, 0.55));
  container.add(scene.add.rectangle(0, height / 2 - 8, width - 18, 4, WARM_UI.panelDark, 0.3));

  if (options.title) {
    container.add(scene.add.rectangle(0, -height / 2 + 24, Math.min(width - 80, 280), 34, WARM_UI.panelDark, 1)
      .setStrokeStyle(2, WARM_UI.borderDark));
    container.add(scene.add.text(0, -height / 2 + 24, options.title, {
      fontSize: options.titleSize || '22px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight,
      fontStyle: 'bold'
    }).setOrigin(0.5));
  }

  if (parent?.add) parent.add(container);
  return container;
}

export function addWarmButton(scene, parent, x, y, text, callback, options = {}) {
  const width = options.width ?? 150;
  const height = options.height ?? 38;
  const disabled = Boolean(options.disabled);
  const normal = disabled ? WARM_UI.disabled : (options.fill ?? WARM_UI.button);
  const hover = disabled ? WARM_UI.disabled : (options.hover ?? WARM_UI.buttonHover);
  const pressed = disabled ? WARM_UI.disabled : (options.pressed ?? WARM_UI.buttonPressed);
  const stroke = options.stroke ?? WARM_UI.border;

  const btn = scene.add.container(x, y);
  const shadow = scene.add.rectangle(3, 4, width, height, WARM_UI.shadow, 0.25);
  const bg = scene.add.rectangle(0, 0, width, height, normal, 0.96)
    .setStrokeStyle(2, stroke);
  const shine = scene.add.rectangle(0, -height / 2 + 5, width - 14, 3, WARM_UI.panelLight, 0.38);
  const label = scene.add.text(0, 0, text, {
    fontSize: options.fontSize || '14px',
    fontFamily: 'Georgia, serif',
    color: options.textColor || WARM_UI.textLight,
    fontStyle: options.fontStyle || 'bold',
    align: 'center',
    wordWrap: { width: width - 18, useAdvancedWrap: true },
    maxLines: 2
  }).setOrigin(0.5);

  btn.add([shadow, bg, shine, label]);
  btn._bg = bg;
  btn._label = label;
  btn._setDisabled = (value) => {
    bg.setFillStyle(value ? WARM_UI.disabled : normal);
    label.setAlpha(value ? 0.55 : 1);
    if (value) btn.disableInteractive();
    else btn.setInteractive({ useHandCursor: true });
  };

  btn.setSize(width, height);
  if (!disabled) {
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => bg.setFillStyle(hover));
    btn.on('pointerout', () => bg.setFillStyle(normal));
    btn.on('pointerdown', () => bg.setFillStyle(pressed));
    btn.on('pointerup', () => {
      bg.setFillStyle(hover);
      getSfxManager().clickButton();
      callback?.();
    });
  } else {
    label.setAlpha(0.55);
  }

  if (parent?.add) parent.add(btn);
  return btn;
}

export function addWarmTag(scene, parent, x, y, text, options = {}) {
  const width = options.width ?? 94;
  const height = options.height ?? 24;
  const fill = options.fill ?? WARM_UI.panelDark;
  const tag = scene.add.container(x, y);
  tag.add(scene.add.rectangle(0, 0, width, height, fill, 0.96)
    .setStrokeStyle(1, options.stroke ?? WARM_UI.border));
  tag.add(scene.add.text(0, 0, text, {
    fontSize: options.fontSize || '12px',
    fontFamily: options.fontFamily || 'Georgia, serif',
    color: options.color || WARM_UI.textLight,
    fontStyle: options.fontStyle || 'bold'
  }).setOrigin(0.5));
  if (parent?.add) parent.add(tag);
  return tag;
}

export function warmTextStyle(overrides = {}) {
  return {
    fontFamily: 'Georgia, serif',
    color: WARM_UI.text,
    ...overrides
  };
}
