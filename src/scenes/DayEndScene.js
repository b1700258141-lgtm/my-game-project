import { WARM_UI, addWarmButton, addWarmPanel, addWarmTag } from '../ui/WarmUITheme';
// 涓€澶╃粨鏉熷満鏅?
import { getTimeManager } from '../systems/TimeManager';
import DailyLoopManager from '../systems/DailyLoopManager';
import { GAME_STATE } from '../systems/GameState';
import { getSfxManager } from '../systems/SfxManager';

class DayEndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DayEndScene' });
    this.daySummary = null;
  }

  init(data) {
    this.daySummary = data.summary || {
      dayNumber: 1,
      visitorsMet: 0,
      questsAccepted: 0,
      questsCompleted: 0,
      moneyEarned: 0,
      moneySpent: 0,
      popularityGained: 0,
      itemsGained: [],
      itemsConsumed: [],
      alchemyCount: 0,
      perfectAlchemyCount: 0,
      spiritMemoryProgressGained: 0
    };
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 閲嶇疆鐩告満鐘舵€?
    this.cameras.main.resetFX();
    
    // 澶滆壊璋冭儗鏅?
    this.cameras.main.setBackgroundColor('#0d1117');
    
    // 鏄熺┖鑳屾櫙
    this.createStarrySky();
    
    window.gameState.setGameState(GAME_STATE.DAILY_SUMMARY);

    this.add.text(width / 2, 120, `第 ${this.daySummary.dayNumber} 天结束`, {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#e0d4b8',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const panel = this.add.container(width / 2, 340);

    addWarmPanel(this, panel, 0, 0, 600, 350, { title: '今日账本' });

    const lines = [
      ['今日接待客人', `${this.daySummary.visitorsMet} 人`, WARM_UI.goldText],
      ['今日接取委托', `${this.daySummary.questsAccepted} 件`, WARM_UI.text],
      ['今日完成委托', `${this.daySummary.questsCompleted} 件`, WARM_UI.alchemyText],
      ['今日炼金次数', `${this.daySummary.alchemyCount} 次`, WARM_UI.goldText],
      ['今日完美炼金', `${this.daySummary.perfectAlchemyCount} 次`, WARM_UI.goldText],
      ['今日获得资金', `+${this.daySummary.moneyEarned}`, WARM_UI.alchemyText],
      ['今日花费资金', `-${this.daySummary.moneySpent}`, WARM_UI.warningText],
      ['今日人气变化', `+${this.daySummary.popularityGained}`, '#6B4A7A'],
      ['今日获得物品', this.formatItems(this.daySummary.itemsGained), WARM_UI.alchemyText],
      ['今日消耗物品', this.formatItems(this.daySummary.itemsConsumed), WARM_UI.warningText]
    ];

    const viewport = {
      x: width / 2 - 270,
      y: 210,
      width: 540,
      height: 240
    };
    const content = this.add.container(0, 0);
    panel.add(content);

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
    content.setMask(maskShape.createGeometryMask());

    // viewport 相对面板: y=-130 到 y=110, content 从此范围内开始
    let contentY = -118;
    lines.forEach((line) => {
      const label = this.add.text(-260, contentY, `${line[0]}:`, {
        fontSize: '15px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted
      });
      const value = this.add.text(-78, contentY, line[1], {
        fontSize: '15px',
        fontFamily: 'Courier New',
        color: line[2],
        wordWrap: { width: 322, useAdvancedWrap: true },
        fixedWidth: 322,
        lineSpacing: 5
      });
      content.add([label, value]);
      contentY += Math.max(26, value.height + 11);
    });
    this.setupSummaryScroll(panel, content, contentY, viewport.height);

    this.createButton(width / 2 - 170, 550, '进入下一天', () => this.startNextDay(), WARM_UI.button);
    this.createButtonWithTextColor(width / 2, 550, '查看今日记录', () => this.showRecordToast(), WARM_UI.border, '#e0d4b8');
    this.createButton(width / 2 + 170, 550, '关闭返回', () => this.closeToShop(), WARM_UI.warning);

    panel.setAlpha(0);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
  }

  formatItems(items) {
    if (!items || items.length === 0) return '无';
    return items.map(item => `${item.name} x${item.count}`).join('、');
  }

  setupSummaryScroll(panel, content, contentBottom, viewportHeight) {
    const contentTop = -118;
    const visibleBottom = contentTop + viewportHeight - 10;
    const maxScroll = Math.max(0, contentBottom - visibleBottom);
    if (maxScroll <= 0) return;

    let scrollOffset = 0;
    const track = this.add.rectangle(278, 0, 6, viewportHeight - 20, WARM_UI.panel, 0.9)
      .setStrokeStyle(1, WARM_UI.border);
    const thumbHeight = Math.max(44, (viewportHeight - 20) * ((viewportHeight - 20) / (contentBottom - contentTop)));
    const thumb = this.add.rectangle(278, -(viewportHeight - 20) / 2 + thumbHeight / 2, 6, thumbHeight, WARM_UI.border, 0.95);
    panel.add([track, thumb]);

    const updateScroll = (delta) => {
      scrollOffset = Phaser.Math.Clamp(scrollOffset + delta, 0, maxScroll);
      content.y = -scrollOffset;
      const travel = viewportHeight - 20 - thumbHeight;
      thumb.y = -(viewportHeight - 20) / 2 + thumbHeight / 2 + travel * (scrollOffset / maxScroll);
    };

    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      updateScroll(dy > 0 ? 28 : -28);
    });

    thumb.setInteractive({ useHandCursor: true });
    this.input.setDraggable(thumb);
    thumb.on('drag', (_pointer, _dragX, dragY) => {
      const minY = -(viewportHeight - 20) / 2 + thumbHeight / 2;
      const maxY = (viewportHeight - 20) / 2 - thumbHeight / 2;
      thumb.y = Phaser.Math.Clamp(dragY, minY, maxY);
      const ratio = maxY === minY ? 0 : (thumb.y - minY) / (maxY - minY);
      scrollOffset = ratio * maxScroll;
      content.y = -scrollOffset;
    });
  }

  createButton(x, y, text, callback, color) {
    return this.createButtonWithTextColor(x, y, text, callback, color, WARM_UI.text);
  }

  createButtonWithTextColor(x, y, text, callback, color, textColor) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 140, 38, color, 0.92)
      .setStrokeStyle(2, WARM_UI.buttonHover)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);
    btn.add(this.add.text(0, 0, text, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: textColor
    }).setOrigin(0.5));
    bg.on('pointerover', () => bg.setAlpha(1));
    bg.on('pointerout', () => bg.setAlpha(0.92));
    bg.on('pointerdown', callback);
    return btn;
  }

  showRecordToast() {
    const msg = `今日记录：接待 ${this.daySummary.visitorsMet} 人，完成委托 ${this.daySummary.questsCompleted} 件，炼金 ${this.daySummary.alchemyCount} 次`;
    const toast = this.add.container(this.cameras.main.width / 2, 130).setDepth(200);
    toast.add(this.add.rectangle(0, 0, 520, 42, 0x1c2128, 0.98)
      .setStrokeStyle(2, WARM_UI.border));
    toast.add(this.add.text(0, 0, msg, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    }).setOrigin(0.5));
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 20,
      duration: 1800,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  createStarrySky() {
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(0, 600);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: 0.1 },
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }
    
    // 鏈堜寒
    this.add.circle(680, 100, 40, 0xeceff4);
    this.add.circle(670, 95, 35, 0xd8dee9);
    this.add.circle(660, 90, 30, 0xeceff4);
  }

  startNextDay() {
    getSfxManager().confirm();
    const tm = getTimeManager();
    new DailyLoopManager(window.gameState).startNextDay(tm);
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start('ShopScene');
  }

  closeToShop() {
    getSfxManager().closeMenu();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start('ShopScene');
  }
}

export default DayEndScene;
