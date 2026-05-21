// 委托日志场景 - J 键打开，显示进行中的委托列表（支持长期/短期分页）
import CommissionSystem from '../systems/CommissionSystem';
import ScrollableListUI from '../systems/ScrollableListUI';
import { COMMISSION_STATUS, GAME_STATE } from '../systems/GameState';

class QuestLogScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QuestLogScene' });
    this.commissionSystem = null;
    this.listItems = [];
    this.selectedQuest = null;
    this.selectedIndex = -1;
    this.currentTab = 'long'; // 'long' 或 'short'
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

    // 半透明遮罩
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // 主面板
    const panelWidth = 720;
    const panelHeight = 520;
    this.panel = this.add.container(width / 2, height / 2);

    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2e3440, 0.98)
      .setStrokeStyle(3, 0x88c0d0);
    this.panel.add(panelBg);

    // 标题
    const title = this.add.text(0, -230, '委托日志', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.panel.add(title);

    // ========== 分页标签 ==========
    this.longTabBg = this.add.rectangle(-80, -195, 120, 30, 0x5e81ac, 0.9)
      .setStrokeStyle(2, 0x81a1c1)
      .setInteractive({ useHandCursor: true });
    this.longTabText = this.add.text(-80, -195, '长期委托', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.shortTabBg = this.add.rectangle(60, -195, 120, 30, 0x3b4252, 0.9)
      .setStrokeStyle(2, 0x4c566a)
      .setInteractive({ useHandCursor: true });
    this.shortTabText = this.add.text(60, -195, '短期委托', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.panel.add([this.longTabBg, this.longTabText, this.shortTabBg, this.shortTabText]);

    this.longTabBg.on('pointerdown', () => this.switchTab('long'));
    this.shortTabBg.on('pointerdown', () => this.switchTab('short'));
    this.longTabBg.on('pointerover', () => {
      if (this.currentTab !== 'long') this.longTabBg.setFillStyle(0x4c566a, 0.9);
    });
    this.longTabBg.on('pointerout', () => {
      if (this.currentTab !== 'long') this.longTabBg.setFillStyle(0x3b4252, 0.9);
    });
    this.shortTabBg.on('pointerover', () => {
      if (this.currentTab !== 'short') this.shortTabBg.setFillStyle(0x4c566a, 0.9);
    });
    this.shortTabBg.on('pointerout', () => {
      if (this.currentTab !== 'short') this.shortTabBg.setFillStyle(0x3b4252, 0.9);
    });

    // 左侧：委托列表
    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: -170,
      y: -20,
      width: 320,
      height: 390,
      rowHeight: 60,
      rowGap: 7
    });

    // 右侧：委托详情
    this.detailContainer = this.add.container(180, -20).setDepth(10);
    this.panel.add(this.detailContainer);

    // 初始化委托系统
    this.commissionSystem = new CommissionSystem(window.gameState);

    // 加载进行中的委托
    this.loadQuests();

    // 返回提示
    const returnHint = this.add.text(width / 2, height - 30, '按 J / ESC / 点击空白处 关闭', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5).setDepth(20);

    this.input.on('pointerdown', (pointer) => {
      if (pointer.y < 50 || pointer.y > height - 50) {
        this.closeQuestLog();
      }
    });

    this.input.keyboard.on('keydown-J', () => {
      this.closeQuestLog();
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.closeQuestLog();
    });

    this.cameras.main.fadeIn(200);
  }

  switchTab(tab) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;
    this.updateTabStyles();
    this.loadQuests();
  }

  updateTabStyles() {
    if (this.currentTab === 'long') {
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

  loadQuests() {
    if (this.listContainer instanceof ScrollableListUI) {
      this.detailContainer.removeAll(true);
      this.listItems = [];
      this.selectedQuest = null;
      this.selectedIndex = -1;

      const allInProgress = this.commissionSystem.getInProgressCommissions();
      const inProgressQuests = allInProgress.filter(q => q.type === this.currentTab);
      const tabName = this.currentTab === 'long' ? '长期' : '短期';

      this.listContainer.render(inProgressQuests, (quest, index, width, rowHeight) => {
        const row = this.add.container(0, 0);
        const item = this.createQuestItem(quest, width / 2, rowHeight / 2, index);
        row.add(item);
        this.listItems.push({ container: item, quest, index });
        return row;
      }, { emptyText: `当前没有进行中的${tabName}委托` });

      if (inProgressQuests.length > 0) {
        this.selectQuest(0);
      } else {
        const detailHint = this.add.text(0, 0, '选择左侧委托\n查看详情', {
          fontSize: '14px',
          fontFamily: 'Georgia, serif',
          color: '#4c566a',
          align: 'center',
          lineSpacing: 6
        }).setOrigin(0.5);
        this.detailContainer.add(detailHint);
      }
      return;
    }

    this.listContainer.removeAll(true);
    this.detailContainer.removeAll(true);
    this.listItems = [];
    this.selectedQuest = null;
    this.selectedIndex = -1;

    // 获取进行中和可提交的委托，按当前分页过滤
    const allInProgress = this.commissionSystem.getInProgressCommissions();
    const inProgressQuests = allInProgress.filter(q => q.type === this.currentTab);

    if (inProgressQuests.length === 0) {
      const tabName = this.currentTab === 'long' ? '长期' : '短期';
      const noQuest = this.add.text(0, 0, `当前没有进行中的${tabName}委托`, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a',
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);
      this.listContainer.add(noQuest);

      const detailHint = this.add.text(0, 0, '选择左侧委托\n查看详情', {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#4c566a',
        align: 'center',
        lineSpacing: 6
      }).setOrigin(0.5);
      this.detailContainer.add(detailHint);
      return;
    }

    const startY = -((inProgressQuests.length - 1) * 55) / 2;

    inProgressQuests.forEach((quest, index) => {
      const itemY = startY + index * 60;
      const item = this.createQuestItem(quest, itemY, index);
      this.listContainer.add(item);
      this.listItems.push({ container: item, quest, index });
    });

    if (inProgressQuests.length > 0) {
      this.selectQuest(0);
    }
  }

  createQuestItem(quest, y, index) {
    const item = this.add.container(0, y);

    const bg = this.add.rectangle(0, 0, 300, 52, 0x3b4252, 0.8)
      .setStrokeStyle(2, 0x4c566a);
    item.add(bg);

    // 委托类型标签
    const typeColor = quest.type === 'short' ? 0xbf616a : 0xa3be8c;
    const typeText = quest.type === 'short' ? '短期' : '长期';
    const typeLabel = this.add.rectangle(-120, -14, 44, 18, typeColor, 0.8)
      .setStrokeStyle(1, typeColor);
    item.add(typeLabel);
    const typeLabelText = this.add.text(-120, -14, typeText, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#eceff4'
    }).setOrigin(0.5);
    item.add(typeLabelText);

    // 委托标题
    const titleText = this.add.text(-80, -14, quest.title, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    item.add(titleText);

    // 状态文本
    const requirementStatus = this.commissionSystem.getRequirementStatus(quest.id);
    const statusText = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '可提交' : '进行中';
    const statusColor = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '#a3be8c' : '#d08770';
    const statusLabel = this.add.text(120, -14, statusText, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: statusColor
    }).setOrigin(0.5);
    item.add(statusLabel);

    // 发布 NPC
    const npcName = this.commissionSystem.getCommissionNPC(quest.id)?.name || '委托人';
    const npcLabel = this.add.text(-120, 10, `发布: ${npcName}`, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#d8dee9'
    }).setOrigin(0, 0.5);
    item.add(npcLabel);

    // 剩余时间（占位 — 不写死具体天数）
    const expireLabel = this.add.text(120, 10, '剩余时间：待设定', {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5);
    item.add(expireLabel);

    // 交互
    item.setSize(300, 52);
    item.setInteractive({ useHandCursor: true });

    item.on('pointerover', () => {
      if (this.selectedIndex !== index) {
        bg.setFillStyle(0x4c566a, 0.8);
        bg.setStrokeStyle(2, 0x88c0d0);
      }
    });

    item.on('pointerout', () => {
      if (this.selectedIndex !== index) {
        bg.setFillStyle(0x3b4252, 0.8);
        bg.setStrokeStyle(2, 0x4c566a);
      }
    });

    item.on('pointerdown', () => {
      this.selectQuest(index);
    });

    return item;
  }

  selectQuest(index) {
    if (this.selectedIndex >= 0 && this.listItems[this.selectedIndex]) {
      const prevItem = this.listItems[this.selectedIndex].container;
      const prevBg = prevItem.list[0];
      if (prevBg) {
        prevBg.setFillStyle(0x3b4252, 0.8);
        prevBg.setStrokeStyle(2, 0x4c566a);
      }
    }

    this.selectedIndex = index;
    const listItem = this.listItems[index];
    if (!listItem) return;

    this.selectedQuest = listItem.quest;

    const curItem = listItem.container;
    const curBg = curItem.list[0];
    if (curBg) {
      curBg.setFillStyle(0x4c566a, 0.9);
      curBg.setStrokeStyle(2, 0x88c0d0);
    }

    this.showQuestDetail(listItem.quest);
  }

  showQuestDetail(quest) {
    this.detailContainer.removeAll(true);
    if (!quest) return;

    const detailBg = this.add.rectangle(0, 0, 310, 400, 0x3b4252, 0.6)
      .setStrokeStyle(2, 0x4c566a);
    this.detailContainer.add(detailBg);

    let yOffset = -170;

    const titleText = this.add.text(0, yOffset, quest.title, {
      fontSize: '20px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.detailContainer.add(titleText);
    yOffset += 35;

    const divider = this.add.rectangle(0, yOffset, 270, 1, 0x4c566a);
    this.detailContainer.add(divider);
    yOffset += 20;

    // 类型
    const typeText = quest.type === 'short' ? '短期委托' : '长期委托';
    const typeColor = quest.type === 'short' ? '#bf616a' : '#a3be8c';
    this.addDetailLine('类型', typeText, yOffset, typeColor);
    yOffset += 28;

    // 发布 NPC
    const npcName = this.commissionSystem.getCommissionNPC(quest.id)?.name || '委托人';
    this.addDetailLine('发布者', npcName, yOffset);
    yOffset += 28;

    // 状态
    const requirementStatus = this.commissionSystem.getRequirementStatus(quest.id);
    const statusText = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '可提交' : '进行中';
    const statusColor = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '#a3be8c' : '#d08770';
    this.addDetailLine('状态', statusText, yOffset, statusColor);
    yOffset += 28;

    // 剩余过期时间 — 显示"待设定"
    this.addDetailLine('剩余时间', '待设定', yOffset, '#4c566a');
    yOffset += 28;

    // 接取天数
    this.addDetailLine('接取日期', `第 ${quest.acceptedDay || '?'} 天`, yOffset);
    yOffset += 35;

    // 描述
    const descLabel = this.add.text(-130, yOffset, '描述:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    });
    this.detailContainer.add(descLabel);
    yOffset += 20;

    const descText = this.add.text(-130, yOffset, quest.description || '暂无描述', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: true,
      wordWrapWidth: 260,
      lineSpacing: 4
    });
    this.detailContainer.add(descText);
    yOffset += Math.min(descText.height + 20, 80);

    // 任务目标
    const objLabel = this.add.text(-130, yOffset, '任务目标:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    });
    this.detailContainer.add(objLabel);
    yOffset += 20;

    const targetText = quest.requiredItemText || '【任务目标待设定】';
    const objText = this.add.text(-130, yOffset, targetText, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: requirementStatus.canSubmit ? '#a3be8c' : '#4c566a'
    });
    this.detailContainer.add(objText);
    yOffset += 30;

    // "进行任务"按钮
    const btn = this.add.container(0, yOffset + 15);
    const btnBg = this.add.rectangle(0, 0, 160, 36, 0x5e81ac, 0.9)
      .setStrokeStyle(2, 0x81a1c1);
    btn.add(btnBg);

    const btnText = this.add.text(0, 0, requirementStatus.canSubmit ? '提交委托' : '进行任务', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0.5);
    btn.add(btnText);

    btn.setSize(160, 36);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnBg.setFillStyle(0x81a1c1);
    });

    btn.on('pointerout', () => {
      btnBg.setFillStyle(0x5e81ac);
    });

    btn.on('pointerdown', () => {
      this.onQuestAction(quest);
    });

    this.detailContainer.add(btn);
  }

  addDetailLine(label, value, y, valueColor) {
    const labelObj = this.add.text(-130, y, `${label}:`, {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    });
    this.detailContainer.add(labelObj);

    const valueObj = this.add.text(-40, y, value, {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: valueColor || '#eceff4'
    });
    this.detailContainer.add(valueObj);
  }

  onQuestAction(quest) {
    const requirementStatus = this.commissionSystem.getRequirementStatus(quest.id);
    if (quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit) {
      const success = this.commissionSystem.submitQuest(quest.id);
      if (success) {
        this.showToast(`委托「${quest.title}」已提交！`);
        this.time.delayedCall(800, () => {
          this.loadQuests();
        });
      } else {
        this.showToast(requirementStatus.message || '提交失败，请检查委托状态');
      }
    } else {
      this.commissionSystem.startQuestTask(quest.id);
      this.showToast(`委托「${quest.title}」— 任务执行方式待设定`);
    }
  }

  showToast(message) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const toast = this.add.container(width / 2, height / 2 - 80).setDepth(100);

    const bg = this.add.rectangle(0, 0, 380, 45, 0x2e3440, 0.95)
      .setStrokeStyle(2, 0xa3be8c);
    toast.add(bg);

    const text = this.add.text(0, 0, message, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c',
      wordWrap: true,
      wordWrapWidth: 350
    }).setOrigin(0.5);
    toast.add(text);

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 30,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  closeQuestLog() {
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default QuestLogScene;
