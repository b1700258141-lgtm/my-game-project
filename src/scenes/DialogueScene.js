// 对话场景 - 数据驱动的对话系统（支持对话历史滚动 + 物品奖励）
import dialogues from '../data/dialogues.json';
import InventorySystem from '../systems/InventorySystem';
import VisitorSystem from '../systems/VisitorSystem';
import { GAME_STATE } from '../systems/GameState';
import RandomNpcManager, { RANDOM_NPC_STATE } from '../systems/RandomNpcManager';
import DailyLoopManager from '../systems/DailyLoopManager';

class DialogueScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DialogueScene' });
    this.currentDialogueId = null;
    this.currentDialogue = null;
    this.currentLineIndex = 0;
    this.currentChoices = null;
    this.returnScene = 'ShopScene';
    this.npcId = null;
    this.isTyping = false;
    this.fullText = '';
    this.typeTimer = null;
    this.choiceButtons = [];
    this.pendingMemory = null;
    this.pendingNextDialogue = null;
    this._transitioning = false;
    this._inputLocked = false;
    this._onTypingComplete = null;

    // ========== 对话历史 ==========
    this.dialogueHistory = [];       // { speakerName, text, isPlayerChoice, choiceText, dialogueIndex }
    this.scrollOffset = 0;          // 0 = 当前对话, >0 = 查看历史
    this.isViewingHistory = false;   // 是否正在查看历史
    this.historyOverlay = null;      // 历史文本容器

    // ========== NPC 对话结束处理 ==========
    this.npcIdForVisitor = null;     // 用于标记随机 NPC 对话结束
    this.visitorConfigId = null;
    this.visitorDialogueMarked = false;
  }

  init(data) {
    // 如果是从 MemoryScene 返回，直接处理返回逻辑
    if (data.fromMemory) {
      this.fromMemory = true;
      this.returnScene = data.returnScene || 'ShopScene';
      this.pendingNextDialogue = data.dialogueId || null;
      this._transitioning = false;
      this._inputLocked = false;
      return;
    }

    this.currentDialogueId = data.dialogueId || null;
    this.returnScene = data.returnScene || 'ShopScene';
    this.npcId = data.npcId || null;
    this.npcIdForVisitor = data.npcId || null; // 用于标记来访 NPC 对话结束
    this.visitorConfigId = data.visitorConfigId || null;
    this.visitorDialogueMarked = false;
    this.pendingMemory = null;
    this.pendingNextDialogue = null;
    this.inventorySystem = null;
    this.fromMemory = false;
    this.dialogueHistory = [];
    this.scrollOffset = 0;
    this.isViewingHistory = false;
    
    // 初始化背包系统
    if (window.gameState) {
      this.inventorySystem = new InventorySystem(window.gameState);
      window.gameState.setReturnScene(this.returnScene);
      window.gameState.setGameState(GAME_STATE.DIALOGUE);
    }
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 重置相机状态，防止残留黑屏
    this.cameras.main.resetFX();

    // 半透明背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75);

    // 对话框容器
    this.dialogBox = this.add.container(0, 0).setDepth(10);

    // NPC 名字背景
    const nameBg = this.add.rectangle(width / 2 - 180, 415, 120, 35, 0x2e3440)
      .setStrokeStyle(2, 0x88c0d0);
    this.dialogBox.add(nameBg);

    // NPC 名字
    this.nameText = this.add.text(width / 2 - 180, 415, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#88c0d0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dialogBox.add(this.nameText);

    // NPC 立绘区域（左侧）
    this.portraitContainer = this.add.container(100, height / 2 - 50).setDepth(11);
    this.dialogBox.add(this.portraitContainer);

    // 立绘背景
    const portraitBg = this.add.rectangle(0, 0, 150, 200, 0x2e3440)
      .setStrokeStyle(3, 0x4c566a);
    this.portraitContainer.add(portraitBg);

    // 立绘占位
    this.portraitImage = this.add.rectangle(0, 0, 130, 180, 0x3b4252)
      .setStrokeStyle(2, 0x4c566a);
    this.portraitContainer.add(this.portraitImage);

    // 对话框主体
    const dialogBg = this.add.rectangle(width / 2, height - 100, width - 80, 180, 0x2e3440)
      .setStrokeStyle(3, 0x88c0d0);
    this.dialogBox.add(dialogBg);

    // 对话文本
    this.dialogueText = this.add.text(width / 2 - 280, height - 160, '', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      wordWrap: true,
      wordWrapWidth: 560,
      lineSpacing: 6
    });
    this.dialogBox.add(this.dialogueText);

    // 选项容器
    this.choicesContainer = this.add.container(width / 2, height - 60).setDepth(12);
    this.dialogBox.add(this.choicesContainer);

    // 继续提示
    this.continueHint = this.add.text(width - 60, height - 20, '▼', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#88c0d0'
    }).setDepth(13);
    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // 历史浏览提示
    this.historyHint = this.add.text(width / 2, height - 18, '↑↓ 浏览历史对话', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#4c566a'
    }).setOrigin(0.5).setDepth(13).setVisible(false);

    // 点击继续
    this.input.on('pointerdown', () => {
      this.handleClick();
    });

    // 空格键继续
    this.input.keyboard.on('keydown-SPACE', () => {
      this.handleClick();
    });

    // ========== 鼠标滚轮查看对话历史 ==========
    this.input.on('wheel', (pointer, currentlyOver, dx, dy) => {
      this.handleWheel(dy);
    });

    // 加载对话数据
    if (this.fromMemory) {
      this.inventorySystem = new InventorySystem(window.gameState);
      if (this.pendingNextDialogue) {
        this.loadDialogue(this.pendingNextDialogue);
      } else {
        this.finishDialogue();
      }
    } else if (this.currentDialogueId) {
      this.loadDialogue(this.currentDialogueId);
    }

    // 淡入
    this.cameras.main.fadeIn(300);
  }

  // ========== 鼠标滚轮处理 ==========

  handleWheel(dy) {
    if (this.dialogueHistory.length === 0) return;

    // dy < 0 = 上滚（查看更早的对话）
    // dy > 0 = 下滚（回到更新的对话）
    if (dy < 0) {
      // 上滚 — 查看更早的对话
      this.scrollOffset = Math.min(this.scrollOffset + 1, this.dialogueHistory.length - 1);
    } else if (dy > 0) {
      // 下滚 — 回到更新的对话
      this.scrollOffset = Math.max(this.scrollOffset - 1, 0);
    }

    if (this.scrollOffset > 0) {
      this.showHistoryEntry();
    } else {
      this.hideHistoryEntry();
    }
  }

  // 显示历史条目
  showHistoryEntry() {
    this.isViewingHistory = true;
    const entryIndex = this.dialogueHistory.length - 1 - this.scrollOffset;
    const entry = this.dialogueHistory[entryIndex];
    if (!entry) return;

    // 隐藏选项按钮（查看历史时不显示选项）
    this.choicesContainer.removeAll(true);
    this.choiceButtons = [];
    this.continueHint.setVisible(false);

    // 更新名字
    this.nameText.setText(entry.speakerName || '');

    // 更新文本（显示历史文本，半透明效果表示是历史）
    if (entry.isPlayerChoice) {
      this.dialogueText.setText(`【你的选择】${entry.choiceText}`);
      this.dialogueText.setAlpha(0.7);
    } else {
      this.dialogueText.setText(entry.text);
      this.dialogueText.setAlpha(0.7);
    }

    // 显示历史提示
    this.historyHint.setVisible(true);
    this.historyHint.setText(`浏览历史 (${this.scrollOffset}/${this.dialogueHistory.length - 1}) ↑↓`);
  }

  // 隐藏历史条目，回到当前对话
  hideHistoryEntry() {
    this.isViewingHistory = false;
    this.dialogueText.setAlpha(1.0);
    this.historyHint.setVisible(false);

    // 重新显示当前对话
    if (this.currentDialogue) {
      const lines = this.currentDialogue.lines;
      if (lines && this.currentLineIndex < lines.length) {
        this.dialogueText.setText(this.fullText || lines[this.currentLineIndex].text);
        this.nameText.setText(this.currentDialogue.speaker || '');
        // 如果之前有选项，重新显示
        if (this.currentLineIndex >= lines.length - 1 && this.currentChoices && this.currentChoices.length > 0) {
          this.showChoices();
        } else {
          this.continueHint.setVisible(true);
        }
      } else if (this.currentChoices && this.currentChoices.length > 0) {
        this.showChoices();
      } else {
        this.continueHint.setVisible(true);
      }
    }
  }

  // ========== 对话历史记录 ==========

  addToHistory(entry) {
    this.dialogueHistory.push({
      speakerName: entry.speakerName || '',
      text: entry.text || '',
      isPlayerChoice: entry.isPlayerChoice || false,
      choiceText: entry.choiceText || '',
      dialogueIndex: entry.dialogueIndex || 0
    });
  }

  // ========== 对话逻辑 ==========

  loadDialogue(dialogueId) {
    const dialogueData = dialogues.dialogues[dialogueId];
    if (!dialogueData) {
      console.error(`Dialogue not found: ${dialogueId}`);
      this._transitioning = false;
      this.finishDialogue();
      return;
    }

    this.currentDialogueId = dialogueId;
    this.currentDialogue = dialogueData;
    this.currentLineIndex = 0;
    this.currentChoices = dialogueData.choices || [];
    this.choiceButtons = [];
    this._inputLocked = false;
    this._transitioning = false;
    this.scrollOffset = 0;
    this.isViewingHistory = false;
    this.historyHint.setVisible(false);
    this.dialogueText.setAlpha(1.0);

    // 设置立绘颜色
    if (dialogueData.portrait) {
      this.portraitImage.setFillStyle(0x5e81ac);
      this.portraitImage.setStrokeStyle(2, 0x81a1c1);
    }

    // 显示第一行
    this.showCurrentLine();
  }

  showCurrentLine() {
    const lines = this.currentDialogue.lines;
    if (!lines || this.currentLineIndex >= lines.length) {
      this.showChoices();
      return;
    }

    const line = lines[this.currentLineIndex];
    
    // 清除之前的选项
    this.clearChoices();

    // 显示角色名
    this.nameText.setText(this.currentDialogue.speaker || '');

    // 记录到历史
    this.addToHistory({
      speakerName: this.currentDialogue.speaker || '',
      text: line.text,
      isPlayerChoice: false,
      dialogueIndex: this.currentLineIndex
    });

    // 打字机效果
    this.startTyping(line.text, () => {
      if (this.currentLineIndex < lines.length - 1) {
        this.continueHint.setVisible(true);
      } else if (this.currentChoices && this.currentChoices.length > 0) {
        this.showChoices();
      } else {
        this.continueHint.setVisible(true);
      }
    });
  }

  startTyping(text, onComplete) {
    this.isTyping = true;
    this.fullText = text;
    this.dialogueText.setText('');
    this.dialogueText.setAlpha(1.0);
    this.continueHint.setVisible(false);
    this._onTypingComplete = onComplete;

    let charIndex = 0;
    const speed = 25;

    if (this.typeTimer) {
      this.typeTimer.remove();
    }

    this.typeTimer = this.time.addEvent({
      delay: speed,
      callback: () => {
        charIndex++;
        this.dialogueText.setText(text.substring(0, charIndex));

        if (charIndex >= text.length) {
          this.isTyping = false;
          this._onTypingComplete = null;
          if (onComplete) onComplete();
        }
      },
      repeat: text.length - 1
    });
  }

  skipTyping() {
    if (this.typeTimer) {
      this.typeTimer.remove();
      this.typeTimer = null;
    }
    this.dialogueText.setText(this.fullText);
    this.isTyping = false;

    const cb = this._onTypingComplete;
    this._onTypingComplete = null;
    if (cb) cb();
  }

  showChoices() {
    this.continueHint.setVisible(false);
    this.clearChoices();

    if (!this.currentChoices || this.currentChoices.length === 0) {
      this.time.delayedCall(800, () => {
        this.finishDialogue();
      });
      return;
    }

    const startY = -(this.currentChoices.length - 1) * 25;
    
    this.currentChoices.forEach((choice, index) => {
      const y = startY + index * 50;
      const btn = this.createChoiceButton(choice.text, y, index);
      this.choiceButtons.push(btn);
    });
  }

  createChoiceButton(text, y, index) {
    const btn = this.add.container(0, y);

    const bg = this.add.rectangle(0, 0, 400, 40, 0x3b4252)
      .setStrokeStyle(2, 0x4c566a);
    btn.add(bg);

    const numText = this.add.text(-180, 0, `${index + 1}.`, {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#88c0d0'
    }).setOrigin(0, 0.5);
    btn.add(numText);

    const choiceText = this.add.text(-150, 0, text, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4'
    }).setOrigin(0, 0.5);
    btn.add(choiceText);

    btn.setSize(400, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.setFillStyle(0x4c566a);
      bg.setStrokeStyle(2, 0x88c0d0);
    });

    btn.on('pointerout', () => {
      bg.setFillStyle(0x3b4252);
      bg.setStrokeStyle(2, 0x4c566a);
    });

    btn.on('pointerdown', () => {
      this.selectChoice(index);
    });

    this.choicesContainer.add(btn);
    return btn;
  }

  selectChoice(index) {
    const choice = this.currentChoices[index];
    if (!choice) return;

    // 记录玩家选择到历史
    this.addToHistory({
      speakerName: '玩家',
      text: '',
      isPlayerChoice: true,
      choiceText: choice.text,
      dialogueIndex: this.currentLineIndex
    });

    // 防止重复点击
    this.clearChoices();
    this.currentChoices = null;
    this._inputLocked = true;

    // 收集获得的物品（用于奖励弹窗）
    const rewardItems = this.collectRewardItems(choice.effects);

    // 应用效果
    if (choice.effects) {
      this.applyItemEffects(choice.effects);
      if (window.gameState) {
        window.gameState.applyEffects(choice.effects);
      }
      if (choice.effects.startTemporaryCommission && window.gameState._pendingTempCommission) {
        this.createTempCommission(window.gameState._pendingTempCommission);
        window.gameState._pendingTempCommission = null;
      }
      this.showEffectPopup(choice.effects);
    }

    // 设置待展示的奖励物品
    if (rewardItems.length > 0) {
      window.gameState.setPendingRewardItems(rewardItems);
    }

    // 延迟切换
    this.time.delayedCall(600, () => {
      if (this._transitioning) return;
      this._inputLocked = false;

      if (choice.triggerMemory) {
        this.pendingMemory = choice.triggerMemory;
        this.pendingNextDialogue = choice.next;
        this.triggerMemoryScene(choice.triggerMemory, choice.next);
      } else if (choice.next) {
        this.loadDialogue(choice.next);
      } else {
        this.finishDialogue();
      }
    });
  }

  // 收集对话选项中获得的物品
  collectRewardItems(effects) {
    if (!effects) return [];
    const items = [];

    if (effects.addItem) {
      const itemName = this.inventorySystem?.itemSystem?.getItemName(effects.addItem) || effects.addItem;
      items.push({ itemId: effects.addItem, name: itemName, count: 1, isKeyItem: false });
    }
    if (effects.addKeyItem) {
      const itemName = this.inventorySystem?.itemSystem?.getItemName(effects.addKeyItem) || effects.addKeyItem;
      items.push({ itemId: effects.addKeyItem, name: itemName, count: 1, isKeyItem: true });
    }

    return items;
  }

  // 标记来访 NPC 对话结束
  markVisitorDialogueEnd() {
    if (this.visitorDialogueMarked || !this.visitorConfigId) return;
    try {
      const randomNpcManager = new RandomNpcManager(window.gameState);
      randomNpcManager.setNpcState(this.visitorConfigId, RANDOM_NPC_STATE.TALKED);
      this.visitorDialogueMarked = true;
    } catch (e) {
      console.warn('markVisitorDialogueEnd error:', e);
    }
  }

  // 处理物品相关效果（增强版 — 传入 sourceNpcId）
  applyItemEffects(effects) {
    if (!this.inventorySystem || !window.gameState) return;

    const sourceNpcId = this.npcId || '';

    if (effects.addItem) {
      this.inventorySystem.addItem(effects.addItem, 1, sourceNpcId);
      new DailyLoopManager(window.gameState).recordItemGained(effects.addItem, 1);
    }

    if (effects.addKeyItem) {
      this.inventorySystem.addKeyItem(effects.addKeyItem, sourceNpcId);
      new DailyLoopManager(window.gameState).recordItemGained(effects.addKeyItem, 1);
    }

    if (effects.removeItem) {
      this.inventorySystem.removeItem(effects.removeItem);
      new DailyLoopManager(window.gameState).recordItemConsumed(effects.removeItem, 1);
    }

    const dailyLoop = new DailyLoopManager(window.gameState);
    if (effects.funds > 0) dailyLoop.recordMoneyEarned(effects.funds);
    if (effects.funds < 0) dailyLoop.recordMoneySpent(Math.abs(effects.funds));
    if (effects.popularity > 0) dailyLoop.recordPopularityGained(effects.popularity);
  }

  // 创建临时委托
  createTempCommission(tempCommissionId) {
    if (!window.gameState) return;
    const visitorSystem = new VisitorSystem(window.gameState);
    visitorSystem.addTemporaryCommission(tempCommissionId);
  }

  // 获取物品名称
  getItemName(itemId) {
    if (this.inventorySystem?.itemSystem) {
      return this.inventorySystem.itemSystem.getItemName(itemId);
    }
    return itemId;
  }

  triggerMemoryScene(memoryId, nextDialogueId) {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MemoryScene', {
        memoryId: memoryId,
        nextDialogueId: nextDialogueId,
        returnScene: this.returnScene,
        fromDialogue: true
      });
    });
  }

  onReturnFromMemory() {
    if (this.pendingNextDialogue) {
      this.cameras.main.fadeIn(300);
      this.loadDialogue(this.pendingNextDialogue);
      this.pendingMemory = null;
      this.pendingNextDialogue = null;
    } else {
      this.finishDialogue();
    }
  }

  showEffectPopup(effects) {
    const parts = [];
    
    if (effects.funds) {
      const sign = effects.funds > 0 ? '+' : '';
      parts.push({ text: `${sign}${effects.funds} 资金`, color: '#a3be8c' });
    }
    if (effects.popularity) {
      const sign = effects.popularity > 0 ? '+' : '';
      parts.push({ text: `${sign}${effects.popularity} 人气`, color: '#bf616a' });
    }
    if (effects.flags) {
      parts.push({ text: '剧情已更新', color: '#88c0d0' });
    }
    if (effects.npcAffinity) {
      parts.push({ text: '好感度变化', color: '#b48ead' });
    }
    if (effects.completeCommission) {
      parts.push({ text: '委托完成', color: '#a3be8c' });
    }
    
    if (effects.addItem) {
      const itemName = this.getItemName(effects.addItem);
      parts.push({ text: `获得 ${itemName}`, color: '#ebcb8b' });
    }
    if (effects.addKeyItem) {
      const itemName = this.getItemName(effects.addKeyItem);
      parts.push({ text: `获得关键物品: ${itemName}`, color: '#ebcb8b' });
    }
    if (effects.removeItem) {
      const itemName = this.getItemName(effects.removeItem);
      parts.push({ text: `失去 ${itemName}`, color: '#bf616a' });
    }
    if (effects.setEndingFlag) {
      parts.push({ text: '结局条件已更新', color: '#88c0d0' });
    }
    if (effects.startTemporaryCommission) {
      parts.push({ text: '临时委托已添加', color: '#a3be8c' });
    }

    if (parts.length === 0) return;

    const popup = this.add.container(400, 200).setDepth(100);
    
    const bg = this.add.rectangle(0, 0, 200, 30 + parts.length * 22, 0x2e3440, 0.95)
      .setStrokeStyle(2, 0x4c566a);
    popup.add(bg);

    parts.forEach((part, i) => {
      const text = this.add.text(0, -10 + i * 22, part.text, {
        fontSize: '14px',
        fontFamily: 'Courier New',
        color: part.color
      }).setOrigin(0.5);
      popup.add(text);
    });

    this.tweens.add({
      targets: popup,
      alpha: 0,
      y: popup.y - 30,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => popup.destroy()
    });
  }

  clearChoices() {
    this.choicesContainer.removeAll(true);
    this.choiceButtons = [];
  }

  handleClick() {
    // 防止在场景切换期间或输入锁定时被触发
    if (this._transitioning || this._inputLocked) return;

    // 如果正在查看历史，点击回到当前对话
    if (this.isViewingHistory) {
      this.scrollOffset = 0;
      this.hideHistoryEntry();
      return;
    }

    if (this.isTyping) {
      this.skipTyping();
      return;
    }
    
    if (this.choiceButtons.length > 0) return;
    
    this.currentLineIndex++;
    this.showCurrentLine();
  }

  finishDialogue() {
    if (this._transitioning) return;
    this._transitioning = true;

    if (this.typeTimer) {
      this.typeTimer.remove();
      this.typeTimer = null;
    }

    this.input.off('pointerdown');
    this.input.keyboard.off('keydown-SPACE');
    this.input.off('wheel');

    this.markVisitorDialogueEnd();

    // 恢复游戏状态
    window.gameState.setGameState(GAME_STATE.NORMAL);

    // 直接切换场景
    this.scene.start(this.returnScene);
  }
}

export default DialogueScene;
