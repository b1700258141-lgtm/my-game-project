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
    this.currentTab = 'longTerm';
    this.submitContainer = null;
    this.submitList = null;
    this.taskOptionContainer = null;
    this.taskOptionList = null;
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

    this.longTabBg.on('pointerdown', () => this.switchTab('longTerm'));
    this.shortTabBg.on('pointerdown', () => this.switchTab('shortTerm'));
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

    // 左侧：委托列表
    this.listContainer = new ScrollableListUI(this, {
      parent: this.panel,
      x: -180,
      y: 45,
      width: 300,
      height: 330,
      rowHeight: 66,
      rowGap: 8
    });

    // 右侧：委托详情
    this.detailContainer = this.add.container(180, 45).setDepth(10);
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

  loadQuests() {
    if (this.listContainer instanceof ScrollableListUI) {
      this.detailContainer.removeAll(true);
      this.listItems = [];
      this.selectedQuest = null;
      this.selectedIndex = -1;

      const allInProgress = this.commissionSystem.getInProgressCommissions();
      const inProgressQuests = allInProgress.filter(q => q.type === this.currentTab);
      const tabName = this.currentTab === 'longTerm' ? '长期' : '短期';

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
      const tabName = this.currentTab === 'longTerm' ? '长期' : '短期';
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
      const item = this.createQuestItem(quest, 0, itemY, index);
      this.listContainer.add(item);
      this.listItems.push({ container: item, quest, index });
    });

    if (inProgressQuests.length > 0) {
      this.selectQuest(0);
    }
  }

  createQuestItem(quest, x, y, index) {
    const item = this.add.container(x, y);

    const fixedBg = this.add.rectangle(0, 0, 280, 58, 0x3b4252, 0.8)
      .setStrokeStyle(2, 0x4c566a);
    item.add(fixedBg);

    const fixedTypeColor = quest.type === 'shortTerm' ? 0xbf616a : 0xa3be8c;
    const fixedTypeText = quest.type === 'shortTerm' ? '短期' : '长期';
    item.add(this.add.rectangle(-112, -15, 44, 18, fixedTypeColor, 0.8).setStrokeStyle(1, fixedTypeColor));
    item.add(this.add.text(-112, -15, fixedTypeText, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#eceff4'
    }).setOrigin(0.5));

    item.add(this.add.text(-84, -15, quest.title || '未命名委托', {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold',
      wordWrap: { width: 130, useAdvancedWrap: true },
      maxLines: 1
    }).setOrigin(0, 0.5));

    const requirementStatus = this.commissionSystem.getRequirementStatus(quest.id);
    const fixedStatusText = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '可提交' : '进行中';
    const fixedStatusColor = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '#a3be8c' : '#d08770';
    item.add(this.add.text(86, -15, fixedStatusText, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: fixedStatusColor
    }).setOrigin(0.5));

    const npcName = this.commissionSystem.getCommissionNPC(quest.id)?.name || '委托人';
    item.add(this.add.text(-124, 12, `发布：${npcName}`, {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#d8dee9',
      wordWrap: { width: 145, useAdvancedWrap: true },
      maxLines: 1
    }).setOrigin(0, 0.5));

    item.add(this.add.text(40, 12, `限时：${quest.deadlineTimeText || `${quest.completionDaysRemaining ?? '?'} 天`}`, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#d8dee9'
    }).setOrigin(0, 0.5));

    item.setSize(280, 58);
    item.setInteractive({ useHandCursor: true });
    item.on('pointerover', () => {
      if (this.selectedIndex !== index) {
        fixedBg.setFillStyle(0x4c566a, 0.8);
        fixedBg.setStrokeStyle(2, 0x88c0d0);
      }
    });
    item.on('pointerout', () => {
      if (this.selectedIndex !== index) {
        fixedBg.setFillStyle(0x3b4252, 0.8);
        fixedBg.setStrokeStyle(2, 0x4c566a);
      }
    });
    item.on('pointerdown', () => this.selectQuest(index));

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
    {

    const detailBg = this.add.rectangle(0, 0, 330, 370, 0x3b4252, 0.6)
      .setStrokeStyle(2, 0x4c566a);
    this.detailContainer.add(detailBg);

    this.detailContainer.add(this.add.text(0, -140, quest.title || '未命名委托', {
      fontSize: '19px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold',
      wordWrap: { width: 280, useAdvancedWrap: true },
      align: 'center',
      maxLines: 2
    }).setOrigin(0.5));
    this.detailContainer.add(this.add.rectangle(0, -112, 285, 1, 0x4c566a));

    const requirementStatus = this.commissionSystem.getRequirementStatus(quest.id);
    const typeText = quest.type === 'shortTerm' ? '短期委托' : '长期委托';
    const typeColor = quest.type === 'shortTerm' ? '#bf616a' : '#a3be8c';
    const npcName = this.commissionSystem.getCommissionNPC(quest.id)?.name || '委托人';
    const statusText = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '可提交' : '进行中';
    const statusColor = quest.status === COMMISSION_STATUS.SUBMITTABLE || requirementStatus.canSubmit ? '#a3be8c' : '#d08770';

    this.addDetailLine('类型', typeText, -92, typeColor);
    this.addDetailLine('发布者', npcName, -66);
    this.addDetailLine('状态', statusText, -40, statusColor);
    this.addDetailLine('完成限时', quest.deadlineTimeText || `${quest.completionDaysRemaining ?? '?'} 天`, -14, '#d8dee9');

    this.detailContainer.add(this.add.text(-135, 18, '委托描述:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    }));
    this.detailContainer.add(this.add.text(-135, 40, quest.description || '【委托描述待补充】', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: { width: 270, useAdvancedWrap: true },
      lineSpacing: 4,
      maxLines: 3
    }));

    this.detailContainer.add(this.add.text(-135, 98, '任务目标:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    }));
    this.detailContainer.add(this.add.text(-60, 98, quest.requiredItemText || '【任务目标待补充】', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: requirementStatus.canSubmit ? '#a3be8c' : '#4c566a',
      wordWrap: { width: 195, useAdvancedWrap: true },
      maxLines: 2
    }));

    this.detailContainer.add(this.add.text(-135, 126, '完成方式:', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0'
    }));
    this.detailContainer.add(this.add.text(-60, 126, quest.completionMethodText || quest.taskText || '按任务目标进行', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: { width: 195, useAdvancedWrap: true },
      maxLines: 2
    }));

    this.renderActionButtons(quest, requirementStatus);

    return;
    }

    const legacyDetailBg = this.add.rectangle(0, 0, 310, 400, 0x3b4252, 0.6)
      .setStrokeStyle(2, 0x4c566a);
    this.detailContainer.add(legacyDetailBg);
  }

  renderActionButtons(quest, requirementStatus) {
    const actionType = this.commissionSystem.getCommissionActionType(quest.id);

    if (actionType === 'taskOptions') {
      const btn = this.createActionButton(0, 158, '进行任务', () => this.showTaskOptionList(quest), 160);
      this.detailContainer.add(btn);
      return;
    }

    const buttonText = actionType === 'submit' ? '前往完成' : '进行任务';
    const btn = this.createActionButton(0, 158, buttonText, () => this.onQuestAction(quest), 160);
    this.detailContainer.add(btn);
  }

  createActionButton(x, y, text, callback, width = 150, height = 40) {
    const btn = this.add.container(x, y);
    const btnBg = this.add.rectangle(0, 0, width, height, 0x5e81ac, 0.9)
      .setStrokeStyle(2, 0x81a1c1);
    btn.add(btnBg);
    btn.add(this.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      wordWrap: { width: width - 20, useAdvancedWrap: true },
      maxLines: 2
    }).setOrigin(0.5));
    btn.setSize(width, height);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btnBg.setFillStyle(0x81a1c1));
    btn.on('pointerout', () => btnBg.setFillStyle(0x5e81ac));
    btn.on('pointerdown', callback);
    return btn;
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
    const actionType = this.commissionSystem.getCommissionActionType(quest.id);
    if (actionType === 'submit') {
      this.showSubmitItemList(quest);
    } else {
      if (actionType === 'taskOptions') {
        this.showTaskOptionList(quest);
        return;
      }
      const success = this.commissionSystem.startQuestTask(quest.id);
      this.showToast(success ? `委托「${quest.title}」已完成！` : (requirementStatus.message || '暂时无法进行任务'));
      if (success) {
        this.showPendingSystemMessages();
        this.time.delayedCall(800, () => {
          this.loadQuests();
        });
      }
    }
  }

  showTaskOptionList(quest) {
    if (this.taskOptionContainer) return;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const options = this.commissionSystem.getAvailableTaskOptions(quest.id);

    this.taskOptionContainer = this.add.container(width / 2, height / 2).setDepth(250);
    this.taskOptionContainer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.42)
      .setInteractive());
    this.taskOptionContainer.add(this.add.rectangle(0, 0, 560, 380, 0x1f2530, 0.98)
      .setStrokeStyle(3, 0x88c0d0));
    this.taskOptionContainer.add(this.add.text(0, -160, '选择完成方式', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.taskOptionList = new ScrollableListUI(this, {
      parent: this.taskOptionContainer,
      x: 0,
      y: 4,
      width: 490,
      height: 240,
      rowHeight: 58,
      rowGap: 6
    });

    this.taskOptionList.render(options, (option, _index, listWidth, rowHeight) => {
      const row = this.add.container(0, 0);
      const rowBg = this.add.rectangle(listWidth / 2, rowHeight / 2, listWidth - 12, 52, 0x3b4252, 0.88)
        .setStrokeStyle(2, 0x4c566a);
      row.add(rowBg);
      row.add(this.add.text(18, rowHeight / 2 - 16, option.text, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        wordWrap: { width: 330, useAdvancedWrap: true },
        maxLines: 2
      }));
      const btn = this.add.container(listWidth - 64, rowHeight / 2);
      const btnBg = this.add.rectangle(0, 0, 72, 34, 0x5e81ac, 0.95)
        .setStrokeStyle(2, 0x81a1c1)
        .setInteractive({ useHandCursor: true });
      btn.add(btnBg);
      btn.add(this.add.text(0, 0, '执行', {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4'
      }).setOrigin(0.5));
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x81a1c1));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x5e81ac));
      btnBg.on('pointerdown', () => this.completeTaskOption(quest, option.id));
      row.add(btn);
      return row;
    }, { emptyText: '当前没有可用完成方式' });

    const closeBtn = this.createActionButton(0, 162, '返回委托日志', () => this.closeTaskOptionList(), 170, 38);
    this.taskOptionContainer.add(closeBtn);
  }

  completeTaskOption(quest, optionId) {
    const result = this.commissionSystem.completeTaskOption(quest.id, optionId);
    this.closeTaskOptionList();
    this.showToast(result.message || (result.success ? '委托已完成' : '完成失败'));
    if (result.success) {
      this.showPendingSystemMessages();
      this.time.delayedCall(800, () => this.loadQuests());
    }
  }

  closeTaskOptionList() {
    if (this.taskOptionList) {
      this.taskOptionList.destroy();
      this.taskOptionList = null;
    }
    if (this.taskOptionContainer) {
      this.taskOptionContainer.destroy();
      this.taskOptionContainer = null;
    }
  }

  showSubmitItemList(quest) {
    if (this.submitContainer) return;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const items = this.commissionSystem.getSubmissionItems(quest.id);

    this.submitContainer = this.add.container(width / 2, height / 2).setDepth(250);
    this.submitContainer.add(this.add.rectangle(0, 0, width, height, 0x000000, 0.42)
      .setInteractive());
    this.submitContainer.add(this.add.rectangle(0, 0, 520, 360, 0x1f2530, 0.98)
      .setStrokeStyle(3, 0x88c0d0));
    this.submitContainer.add(this.add.text(0, -150, '选择提交物品', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5));
    this.submitContainer.add(this.add.text(0, -122, quest.requiredItemText || '选择背包中的对应物品', {
      fontSize: '13px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9',
      wordWrap: { width: 430, useAdvancedWrap: true },
      align: 'center'
    }).setOrigin(0.5));

    this.submitList = new ScrollableListUI(this, {
      parent: this.submitContainer,
      x: 0,
      y: 12,
      width: 450,
      height: 210,
      rowHeight: 52,
      rowGap: 6
    });

    this.submitList.render(items, (item, _index, listWidth, rowHeight) => {
      const row = this.add.container(0, 0);
      const rowBg = this.add.rectangle(listWidth / 2, rowHeight / 2, listWidth - 12, 46, 0x3b4252, 0.88)
        .setStrokeStyle(2, 0x4c566a);
      row.add(rowBg);
      row.add(this.add.text(18, rowHeight / 2 - 8, `${item.name} x${item.count}`, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4',
        wordWrap: { width: 295, useAdvancedWrap: true },
        maxLines: 2
      }));
      const btn = this.add.container(listWidth - 58, rowHeight / 2);
      const btnBg = this.add.rectangle(0, 0, 64, 32, 0x5e81ac, 0.95)
        .setStrokeStyle(2, 0x81a1c1)
        .setInteractive({ useHandCursor: true });
      btn.add(btnBg);
      btn.add(this.add.text(0, 0, '提交', {
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
        color: '#eceff4'
      }).setOrigin(0.5));
      btnBg.on('pointerover', () => btnBg.setFillStyle(0x81a1c1));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x5e81ac));
      btnBg.on('pointerdown', () => this.submitSelectedItem(quest, item.itemId));
      row.add(btn);
      return row;
    }, { emptyText: quest.emptySubmitMessage || '背包中没有可提交的物品' });

    const closeBtn = this.createActionButton(0, 152, '返回委托日志', () => this.closeSubmitItemList(), 170, 38);
    this.submitContainer.add(closeBtn);
  }

  submitSelectedItem(quest, itemId) {
    const result = this.commissionSystem.submitQuestWithItem(quest.id, itemId);
    this.closeSubmitItemList();
    this.showToast(result.message || (result.success ? '委托已提交' : '提交失败'));
    if (result.success) {
      this.showPendingSystemMessages();
      this.time.delayedCall(800, () => this.loadQuests());
    }
  }

  closeSubmitItemList() {
    if (this.submitList) {
      this.submitList.destroy();
      this.submitList = null;
    }
    if (this.submitContainer) {
      this.submitContainer.destroy();
      this.submitContainer = null;
    }
  }

  showPendingSystemMessages() {
    const messages = window.gameState.consumeSystemMessages?.() || [];
    if (messages.length > 0) {
      this.time.delayedCall(250, () => this.showToast(messages[0], 2600));
    }
  }

  showToast(message, duration = 2000) {
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
      duration,
      ease: 'Power2',
      onComplete: () => toast.destroy()
    });
  }

  closeQuestLog() {
    this.closeSubmitItemList();
    this.closeTaskOptionList();
    window.gameState.setGameState(GAME_STATE.NORMAL);
    this.scene.start(this.returnScene);
  }
}

export default QuestLogScene;
