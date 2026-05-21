// 一天结束场景 - 显示日终结算
import { getTimeManager } from '../systems/TimeManager';
import DailyLoopManager from '../systems/DailyLoopManager';
import { GAME_STATE } from '../systems/GameState';

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

    // 重置相机状态
    this.cameras.main.resetFX();
    
    // 夜色调背景
    this.cameras.main.setBackgroundColor('#0d1117');
    
    // 星空背景
    this.createStarrySky();
    
    window.gameState.setGameState(GAME_STATE.DAILY_SUMMARY);

    this.add.text(width / 2, 70, `第 ${this.daySummary.dayNumber} 天结束`, {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const panel = this.add.container(width / 2, 300);

    const panelBg = this.add.rectangle(0, 0, 560, 380, 0x1c2128)
      .setStrokeStyle(3, 0x4c566a);
    panel.add(panelBg);

    const lines = [
      ['今日接待客人', `${this.daySummary.visitorsMet} 人`, '#d08770'],
      ['今日接取委托', `${this.daySummary.questsAccepted} 件`, '#88c0d0'],
      ['今日完成委托', `${this.daySummary.questsCompleted} 件`, '#a3be8c'],
      ['今日炼金次数', `${this.daySummary.alchemyCount} 次`, '#ebcb8b'],
      ['今日完美炼金', `${this.daySummary.perfectAlchemyCount} 次`, '#ebcb8b'],
      ['今日获得资金', `+${this.daySummary.moneyEarned}`, '#a3be8c'],
      ['今日花费资金', `-${this.daySummary.moneySpent}`, '#bf616a'],
      ['今日人气变化', `+${this.daySummary.popularityGained}`, '#b48ead'],
      ['今日获得物品', this.formatItems(this.daySummary.itemsGained), '#a3be8c'],
      ['今日消耗物品', this.formatItems(this.daySummary.itemsConsumed), '#bf616a'],
      ['古代精魂记忆进度', `+${this.daySummary.spiritMemoryProgressGained}%`, '#b48ead'],
      ['记忆内容', '待补充', '#4c566a']
    ];

    lines.forEach((line, index) => {
      const y = -165 + index * 28;
      panel.add(this.add.text(-250, y, `${line[0]}:`, {
        fontSize: '15px',
        fontFamily: 'Georgia, serif',
        color: '#d8dee9'
      }));
      panel.add(this.add.text(20, y, line[1], {
        fontSize: '15px',
        fontFamily: 'Courier New',
        color: line[2],
        wordWrap: true,
        wordWrapWidth: 230
      }));
    });

    const nextBtn = this.createButton(width / 2 - 170, 535, '进入下一天', () => this.startNextDay(), 0x5e81ac);
    const recordBtn = this.createButton(width / 2, 535, '查看今日记录', () => this.showRecordToast(), 0x4c566a);
    const closeBtn = this.createButton(width / 2 + 170, 535, '关闭返回', () => this.closeToShop(), 0xbf616a);

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

  createButton(x, y, text, callback, color) {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 140, 38, color, 0.92)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    btn.add(bg);
    btn.add(this.add.text(0, 0, text, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
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
      .setStrokeStyle(2, 0x88c0d0));
    toast.add(this.add.text(0, 0, msg, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
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
    
    // 月亮
    this.add.circle(680, 100, 40, 0xeceff4);
    this.add.circle(670, 95, 35, 0xd8dee9);
    this.add.circle(660, 90, 30, 0xeceff4);
  }

  startNextDay() {
    const tm = getTimeManager();
    new DailyLoopManager(window.gameState).startNextDay(tm);
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start('ShopScene');
  }

  closeToShop() {
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start('ShopScene');
  }
}

export default DayEndScene;
