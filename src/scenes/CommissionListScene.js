// 委托列表场景 - 支持长期/短期委托分页
import gameConfig from '../data/gameConfig.json';
import dialogues from '../data/dialogues.json';
import CommissionSystem from '../systems/CommissionSystem';
import ScrollableListUI from '../systems/ScrollableListUI';
import { GAME_STATE } from '../systems/GameState';

class CommissionListScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CommissionListScene' });
    this.commissionSystem = null;
    this.acceptedCommissions = [];
    this.availableCommissions = [];
    this.listItems = [];
    this.currentTab = 'longTerm';
  }

  init(data) {
    this.returnScene = data.returnScene || 'ShopScene';
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 重置相机状态
    this.cameras.main.resetFX();

    // 设置游戏状态
    window.gameState.setGameState(GAME_STATE.QUEST_LIST);

    // 背景遮罩
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

    // 主面板
    const panelWidth = 700;
    const panelHeight = 520;
    this.panel = this.add.container(width / 2, height / 2);

    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);
    this.panel.add(panelBg);

    // 标题
    const title = this.add.text(0, -235, '委托列表', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panel.add(title);

    // ========== 分页标签 ==========
    this.longTabBg = this.add.rectangle(-80, -195, 140, 34, 0x5e81ac, 0.9)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    this.longTabText = this.add.text(-80, -195, '长期委托', {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.shortTabBg = this.add.rectangle(80, -195, 140, 34, 0x3b4252, 0.9)
      .setStrokeStyle(2, 0x4c566a)
      .setInteractive({ useHandCursor: true });
    this.shortTabText = this.add.text(80, -195, '短期委托', {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.panel.add([this.longTabBg, this.longTabText, this.shortTabBg, this.shortTabText]);

    // 分页点击事件
    this.longTabBg.on('pointerdown', () => {
      this.switchTab('longTerm');
    });
    this.shortTabBg.on('pointerdown', () => {
      this.switchTab('shortTerm');
    });
    this.longTabBg.on('pointerover', () => {
      if (this.currentTab !== 'longTerm') this.longTabBg.setFillStyle(0x4c566a, 0.9);
    });
    this.longTabBg.on('pointerout', () => {
      if (this.currentTab !== 'longTerm') this.longTabBg.setFillStyle(0x3b4252, 0.9);
    });
    this.shortTabBg.on('pointerover', () => {
      if (this.currentTab !== 'shortTerm') this.shortTabBg.setFillStyle(0x4c566a, 0.9);
    });
    this.shortTabBg.on('pointerout', () => {
      if (this.currentTab !== 'shortTerm') this.shortTabBg.setFillStyle(0x3b4252, 0.9);
    });

    // 委托列表容器
    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: 0,
      y: 35,
      width: 640,
      height: 330,
      rowHeight: 88,
      rowGap: 10
    });

    // 初始化委托系统
    this.commissionSystem = new CommissionSystem(window.gameState);
    
    // 加载委托
    this.loadCommissions();

    // 返回提示
    const returnHint = this.add.text(width / 2, height - 30, '按 ESC 或 点击此处 返回', {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5).setDepth(20);
    
    this.input.on('pointerdown', (pointer) => {
      if (pointer.y < 50 || pointer.y > height - 60) {
        this.returnToShop();
      }
    });

    // ESC 返回
    this.input.keyboard.on('keydown-ESC', () => {
      this.returnToShop();
    });

    // 淡入
    this.cameras.main.fadeIn(300);
  }

  // ========== 分页切换 ==========

  switchTab(tab) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;
    this.updateTabStyles();
    this.loadCommissions();
  }

  updateTabStyles() {
    if (this.currentTab === 'longTerm') {
      this.longTabBg.setFillStyle(0x5e81ac, 0.9);
      this.longTabBg.setStrokeStyle(2, 0x81a1c1);
      this.longTabText.setColor('#eceff4');
      this.shortTabBg.setFillStyle(0x3b4252, 0.9);
      this.shortTabBg.setStrokeStyle(2, 0x4c566a);
      this.shortTabText.setColor('#d8dee9');
    } else {
      this.shortTabBg.setFillStyle(0xbf616a, 0.9);
      this.shortTabBg.setStrokeStyle(2, 0xd08770);
      this.shortTabText.setColor('#eceff4');
      this.longTabBg.setFillStyle(0x3b4252, 0.9);
      this.longTabBg.setStrokeStyle(2, 0x4c566a);
      this.longTabText.setColor('#d8dee9');
    }
  }

  // ========== 加载委托 ==========

  loadCommissions() {
    if (this.listContainer instanceof ScrollableListUI) {
      this.listItems = [];
      const allAvailable = this.commissionSystem.getAvailableCommissions();
      const filtered = allAvailable.filter(c => c.type === this.currentTab);
      const tabName = this.currentTab === 'longTerm' ? '长期' : '短期';

      this.listContainer.render(filtered, (commission, index, width, rowHeight) => {
        const row = this.add.container(0, 0);
        const item = this.createCommissionItem(commission, width / 2, rowHeight / 2, index);
        row.add(item);
        this.listItems.push(item);
        return row;
      }, { emptyText: `目前没有${tabName}委托` });
      return;
    }

    this.listContainer.removeAll(true);
    this.listItems = [];

    // 获取可接取的委托，按当前分页过滤
    const allAvailable = this.commissionSystem.getAvailableCommissions();
    const filtered = allAvailable.filter(c => c.type === this.currentTab);

    if (filtered.length === 0) {
      const tabName = this.currentTab === 'longTerm' ? '长期' : '短期';
      const noComm = this.add.text(0, 0, `目前没有${tabName}委托，\n请明天再来看看。`, {
        fontSize: '18px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5);
      this.listContainer.add(noComm);
      return;
    }

    // 创建委托列表项
    const startY = -((filtered.length - 1) * 80) / 2;
    
    filtered.forEach((commission, index) => {
      const itemY = startY + index * 85;
      const item = this.createCommissionItem(commission, 0, itemY, index);
      this.listContainer.add(item);
      this.listItems.push(item);
    });
  }

  createCommissionItem(commission, x, y, index) {
    const item = this.add.container(x, y);

    const fixedBg = this.add.rectangle(0, 0, 620, 75, 0x3b4252, 0.8)
      .setStrokeStyle(2, 0x4c566a);
    item.add(fixedBg);

    const fixedTypeColor = commission.type === 'shortTerm' ? 0xbf616a : 0xa3be8c;
    const fixedTypeText = commission.type === 'shortTerm' ? '短期' : '长期';
    item.add(this.add.rectangle(-260, -22, 50, 22, fixedTypeColor, 0.8).setStrokeStyle(1, fixedTypeColor));
    item.add(this.add.text(-260, -22, fixedTypeText, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#eceff4'
    }).setOrigin(0.5));

    item.add(this.add.text(-225, -23, commission.title || '未命名委托', {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold',
      wordWrap: { width: 285, useAdvancedWrap: true },
      maxLines: 1
    }).setOrigin(0, 0.5));

    item.add(this.add.text(-280, 4, commission.description || '这项委托的详细说明已记录在柜台档案中。', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: { width: 360, useAdvancedWrap: true },
      lineSpacing: 2,
      maxLines: 2
    }).setOrigin(0, 0));

    item.add(this.add.text(95, -18, `剩余时间：${commission.availableTimeText || `${commission.daysRemaining ?? '?'} 天`}`, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#d8dee9'
    }).setOrigin(0, 0.5));

    item.add(this.add.text(95, 10, `收益：+${commission.reward.funds}资金 +${commission.reward.popularity}人气`, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#a3be8c',
      wordWrap: { width: 145, useAdvancedWrap: true },
      maxLines: 1
    }).setOrigin(0, 0.5));

    const fixedBtn = this.add.container(270, 12);
    const fixedBtnBg = this.add.rectangle(0, 0, 58, 42, 0x5e81ac, 0.9)
      .setStrokeStyle(1, 0x81a1c1);
    fixedBtn.add(fixedBtnBg);
    fixedBtn.add(this.add.text(0, 0, '接取', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5));
    fixedBtn.setSize(58, 42);
    fixedBtn.setInteractive({ useHandCursor: true });
    fixedBtn.on('pointerover', () => fixedBtnBg.setFillStyle(0x81a1c1));
    fixedBtn.on('pointerout', () => fixedBtnBg.setFillStyle(0x5e81ac));
    fixedBtn.on('pointerdown', () => this.acceptCommission(commission));
    item.add(fixedBtn);

    return item;
  }

  acceptCommission(commission) {
    const success = this.commissionSystem.acceptCommission(commission.id);
    
    if (!success) {
      this.showToast('接取失败');
      return;
    }

    this.showToast(`成功接取「${commission.title}」的委托！`);

    this.time.delayedCall(1500, () => {
      this.startCommissionDialogue(commission);
    });
  }

  startCommissionDialogue(commission) {
    if (commission.startDialogueId && dialogues.dialogues[commission.startDialogueId]) {
      this.scene.start('DialogueScene', {
        dialogueId: commission.startDialogueId,
        npcId: commission.clientNpcId,
        returnScene: 'ShopScene'
      });
    } else {
      this.scene.start('ShopScene');
    }
  }

  showToast(message) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const toast = this.add.container(width / 2, height / 2 - 50).setDepth(100);
    
    const bg = this.add.rectangle(0, 0, 350, 50, 0x2e3440, 0.95)
      .setStrokeStyle(2, 0xa3be8c);
    toast.add(bg);
    
    const text = this.add.text(0, 0, message, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c'
    }).setOrigin(0.5);
    toast.add(text);
    
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 30,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  returnToShop() {
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start('ShopScene');
  }
}

export default CommissionListScene;
