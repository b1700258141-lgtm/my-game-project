// 记忆场景 - 展示精魂的古代记忆（暖色 UI 版）
import memories from '../data/memories.json';
import { getSfxManager } from '../systems/SfxManager';
import CommissionSystem from '../systems/CommissionSystem';
import SpiritMemoryManager from '../systems/SpiritMemoryManager';
import InventorySystem from '../systems/InventorySystem';
import DailyLoopManager from '../systems/DailyLoopManager';
import { WARM_UI, addWarmButton, addWarmPanel } from '../ui/WarmUITheme';

class MemoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryScene' });
    this.currentMemory = null;
    this.memoryId = null;
    this.nextDialogueId = null;
    this.returnScene = 'ShopScene';
    this.fromDialogue = false;
    this.dialogueData = null;
    this.completeCommissionId = null;
  }

  init(data = {}) {
    this.memoryId = data.memoryId || null;
    this.nextDialogueId = data.nextDialogueId || null;
    this.returnScene = data.returnScene || 'ShopScene';
    this.fromDialogue = data.fromDialogue || false;
    this.completeCommissionId = data.completeCommissionId || null;
    this.currentLineIndex = 0;
    this.currentChoices = [];
    this.isTyping = false;
    this.typeTimer = null;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.resetFX();

    this.currentMemory = this.memoryId
      ? memories.memories.find(m => m.id === this.memoryId)
      : null;

    // 精魂记忆背景图（depth 0）
    if (this.textures.exists('ancientSpiritBg')) {
      const bg = this.add.image(width / 2, height / 2, 'ancientSpiritBg');
      const scale = Math.max(width / bg.width, height / bg.height);
      bg.setScale(scale).setDepth(0);
    }
    // 暖色半透明暗层遮罩（depth 1）
    this.add.rectangle(width / 2, height / 2, width, height, 0x1b100b, 0.4).setDepth(1);

    // 记忆容器
    const memoryContainer = this.add.container(width / 2, height / 2).setDepth(5);

    // 记忆标题
    const title = this.add.text(0, -248, this.currentMemory?.title || '未名回忆', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight,
      fontStyle: 'italic'
    }).setOrigin(0.5);
    memoryContainer.add(title);

    // 装饰标题分隔线
    const divider = this.add.rectangle(0, -218, 320, 2, WARM_UI.border, 0.6);
    memoryContainer.add(divider);

    // 精魂名称
    if (this.currentMemory?.spiritName) {
      const spiritLabel = this.add.text(0, -195, this.currentMemory.spiritName, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.goldText,
        fontStyle: 'italic'
      }).setOrigin(0.5);
      memoryContainer.add(spiritLabel);
    }

    // 漂浮记忆碎片
    this.createFloatingParticles();

    // 加载记忆数据
    this.loadMemoryData();

    // 淡入动画
    memoryContainer.setScale(0.8).setAlpha(0);
    getSfxManager().memoryTrigger();
    this.cameras.main.fadeIn(800);

    this.tweens.add({
      targets: memoryContainer,
      scale: 1,
      alpha: 1,
      duration: 800,
      ease: 'Power2'
    });
  }

  loadMemoryData() {
    if (this.memoryId && !this.currentMemory) {
      this.currentMemory = memories.memories.find(m => m.id === this.memoryId);
    }

    if (this.currentMemory && this.currentMemory.dialogueId) {
      this.dialogueData = memories.dialogues?.[this.currentMemory.dialogueId];
    }

    if (!this.dialogueData) {
      this.dialogueData = {
        speaker: '旁白',
        lines: [
          { id: '1', text: '（记忆模糊不清，仿佛有什么被封印了...）' }
        ],
        choices: [{ text: '（结束记忆）', effects: {}, next: null }]
      };
    }

    this.createMemoryDialogue();
  }

  createFloatingParticles() {
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(80, 400);
      const particle = this.add.rectangle(x, y, 6, 6, WARM_UI.gold, 0.25)
        .setRotation(Phaser.Math.Between(0, 4)).setDepth(3);

      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.15, to: 0.4 },
        duration: Phaser.Math.Between(3000, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createMemoryDialogue() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 对话框容器
    this.dialogContainer = this.add.container(0, 0).setDepth(10);

    // 暖色对话框背景
    addWarmPanel(this, this.dialogContainer, width / 2, height - 100, width - 80, 180, {
      fill: WARM_UI.panelLight
    });

    const dialogLeft = 60;
    const dialogTop = height - 190;
    const dialogTextWidth = width - 120;

    // 精魂名称木牌（居中显示无立绘模式）
    const nameBg = this.add.rectangle(width / 2, dialogTop + 26, 280, 30, WARM_UI.panelDark)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(2, WARM_UI.border);
    this.dialogContainer.add(nameBg);

    this.nameText = this.add.text(width / 2, dialogTop + 26, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dialogContainer.add(this.nameText);

    // 对话文本（无立绘，居中全宽）
    this.dialogueText = this.add.text(dialogLeft, dialogTop + 48, '', {
      fontSize: '17px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: dialogTextWidth, useAdvancedWrap: true },
      lineSpacing: 6,
      maxLines: 5
    });
    this.dialogContainer.add(this.dialogueText);

    // 选项容器
    this.choicesContainer = this.add.container(width / 2, height - 54).setDepth(12);
    this.dialogContainer.add(this.choicesContainer);

    // 继续提示
    this.continueHint = this.add.text(width - 60, height - 20, '>>', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: WARM_UI.text
    }).setDepth(13);
    this.tweens.add({
      targets: this.continueHint,
      alpha: { from: 1, to: 0.3 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // 点击继续
    this.input.on('pointerdown', () => {
      this.handleClick();
    });

    // 空格键继续
    this.input.keyboard.on('keydown-SPACE', () => {
      this.handleClick();
    });

    this.showCurrentLine();
  }

  showCurrentLine() {
    const lines = this.dialogueData.lines;
    if (!lines || this.currentLineIndex >= lines.length) {
      this.showChoices();
      return;
    }

    const line = lines[this.currentLineIndex];
    this.clearChoices();
    this.nameText.setText(this.dialogueData.speaker || '旁白');

    this.startTyping(line.text, () => {
      if (this.currentLineIndex < lines.length - 1) {
        this.continueHint.setVisible(true);
      } else if (this.dialogueData.choices && this.dialogueData.choices.length > 0) {
        // choices exist, don't show hint
      } else {
        this.continueHint.setVisible(true);
      }
    });
  }

  startTyping(text, onComplete) {
    this.isTyping = true;
    this.fullText = text;
    this.dialogueText.setText('');
    this.continueHint.setVisible(false);

    let charIndex = 0;
    const speed = 28;

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
          if (onComplete) onComplete();
        }
      },
      repeat: text.length - 1
    });
  }

  skipTyping() {
    if (this.typeTimer) {
      this.typeTimer.remove();
    }
    this.dialogueText.setText(this.fullText);
    this.isTyping = false;
  }

  showChoices() {
    this.continueHint.setVisible(false);
    this.clearChoices();

    const choices = this.dialogueData.choices || [];
    if (choices.length === 0) {
      this.time.delayedCall(500, () => this.finishMemory());
      return;
    }

    const startY = -(choices.length - 1) * 25;
    choices.forEach((choice, index) => {
      const y = startY + index * 50;
      this.createChoiceButton(choice.text, y, index);
    });
  }

  createChoiceButton(text, y, index) {
    const btn = this.add.container(0, y);
    const bg = this.add.rectangle(0, 0, 360, 40, WARM_UI.panelLight, 0.95)
      .setStrokeStyle(2, WARM_UI.border);
    btn.add(bg);

    const numText = this.add.text(-160, 0, `${index + 1}.`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: WARM_UI.goldText
    }).setOrigin(0, 0.5);
    btn.add(numText);

    const choiceText = this.add.text(-130, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text
    }).setOrigin(0, 0.5);
    btn.add(choiceText);

    btn.setSize(360, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.setFillStyle(WARM_UI.buttonHover, 0.95);
      bg.setStrokeStyle(2, WARM_UI.border);
    });
    btn.on('pointerout', () => {
      bg.setFillStyle(WARM_UI.panelLight, 0.95);
      bg.setStrokeStyle(2, WARM_UI.border);
    });
    btn.on('pointerdown', () => {
      this.selectChoice(index);
    });

    this.choicesContainer.add(btn);
  }

  selectChoice(index) {
    const choice = this.dialogueData.choices[index];
    if (!choice) return;

    if (choice.effects) {
      window.gameState.applyEffects(choice.effects);
    }

    if (this.currentMemory && this.currentMemory.rewards) {
      const rewards = { ...this.currentMemory.rewards };
      const inventorySystem = new InventorySystem(window.gameState);
      const dailyLoop = new DailyLoopManager(window.gameState);
      if (rewards.addKeyItem) {
        inventorySystem.addKeyItem(rewards.addKeyItem, this.currentMemory.id);
        dailyLoop.recordItemGained(rewards.addKeyItem, 1);
        delete rewards.addKeyItem;
      }
      if (rewards.addItem) {
        inventorySystem.addItem(rewards.addItem, 1, this.currentMemory.id);
        dailyLoop.recordItemGained(rewards.addItem, 1);
        delete rewards.addItem;
      }
      window.gameState.applyEffects(rewards);
      this.showRewardsPopup(this.currentMemory.rewards);
    }

    this.time.delayedCall(1000, () => {
      this.finishMemory();
    });
  }

  showRewardsPopup(rewards) {
    const parts = [];
    if (rewards.funds) {
      const sign = rewards.funds > 0 ? '+' : '';
      parts.push({ text: `${sign}${rewards.funds} 资金`, color: WARM_UI.textLight });
    }
    if (rewards.popularity) {
      const sign = rewards.popularity > 0 ? '+' : '';
      parts.push({ text: `${sign}${rewards.popularity} 人气`, color: WARM_UI.warningText });
    }
    if (rewards.flags || rewards.npcAffinity) {
      parts.push({ text: '记忆已解锁', color: WARM_UI.goldText });
    }
    if (parts.length === 0) return;

    const popup = this.add.container(400, 300).setDepth(100);
    const bg = this.add.rectangle(0, 0, 180, 30 + parts.length * 24, WARM_UI.panel, 0.96)
      .setStrokeStyle(2, WARM_UI.border);
    popup.add(bg);

    parts.forEach((part, i) => {
      const text = this.add.text(0, -8 + i * 24, part.text, {
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
      duration: 2000,
      ease: 'Power2',
      onComplete: () => popup.destroy()
    });
  }

  clearChoices() {
    this.choicesContainer.removeAll(true);
  }

  handleClick() {
    if (this.isTyping) {
      this.skipTyping();
      if (this.currentLineIndex < this.dialogueData.lines.length - 1) {
        this.continueHint.setVisible(true);
      } else if (this.dialogueData.choices && this.dialogueData.choices.length > 0) {
        // choices exist
      } else {
        this.continueHint.setVisible(true);
      }
    } else if (this.choicesContainer.list.length === 0) {
      this.currentLineIndex++;
      this.showCurrentLine();
    }
  }

  finishMemory() {
    if (this.typeTimer) {
      this.typeTimer.remove();
      this.typeTimer = null;
    }

    if (this.currentMemory && this.currentMemory.unlockCodex) {
      window.gameState.unlockMemory(this.currentMemory.id);
      const memoryText = this.dialogueData?.lines?.map(line => line.text).join('\n') || this.currentMemory.description;
      const spiritMemoryManager = new SpiritMemoryManager(window.gameState);
      spiritMemoryManager.unlockSpiritMemory({
        ...this.currentMemory,
        memoryId: this.currentMemory.id,
        memoryText,
        hasViewed: true
      });
      spiritMemoryManager.markSpiritMemoryViewed(this.currentMemory.id);
    }

    if (this.completeCommissionId) {
      const completed = new CommissionSystem(window.gameState).completeQuest(this.completeCommissionId);
      if (completed) {
        window.gameState.addSystemMessage(`委托「${this.currentMemory?.relatedCommissionTitle || this.completeCommissionId}」已完成。`);
      }
    }

    if (this.fromDialogue) {
      this.scene.start('DialogueScene', {
        dialogueId: this.nextDialogueId,
        returnScene: this.returnScene,
        npcId: null,
        fromMemory: true
      });
    } else {
      this.scene.start(this.returnScene);
    }
  }
}

export default MemoryScene;
