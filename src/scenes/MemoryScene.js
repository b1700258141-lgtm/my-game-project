// 记忆场景 - 展示精魂的古代记忆
import memories from '../data/memories.json';
import dialogues from '../data/dialogues.json';

class MemoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryScene' });
    this.currentMemory = null;
    this.memoryId = null;
    this.nextDialogueId = null;
    this.returnScene = 'ShopScene';
    this.fromDialogue = false;
    this.dialogueData = null;
  }

  init(data) {
    this.memoryId = data.memoryId || null;
    this.nextDialogueId = data.nextDialogueId || null;
    this.returnScene = data.returnScene || 'ShopScene';
    this.fromDialogue = data.fromDialogue || false;
    this.currentLineIndex = 0;
    this.currentChoices = [];
    this.isTyping = false;
    this.typeTimer = null;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 重置相机状态
    this.cameras.main.resetFX();

    // 记忆场景特殊色调
    this.cameras.main.setBackgroundColor('#1c1c2e');

    // 创建背景
    this.createMemoryBackground();

    // 记忆容器
    const memoryContainer = this.add.container(width / 2, height / 2);

    // 记忆画面框
    const frame = this.add.rectangle(0, 0, 560, 380, 0x2e2440)
      .setStrokeStyle(4, 0xa3be8c);
    memoryContainer.add(frame);

    // 背景占位（占位图/后续替换）
    const bgPlaceholder = this.add.rectangle(0, 0, 540, 360, 0x3c3050)
      .setStrokeStyle(1, 0x5e5270);
    memoryContainer.add(bgPlaceholder);

    // 背景类型标识
    const bgType = this.currentMemory?.background || 'ancient_ruins';
    const bgLabel = this.add.text(0, 0, `[${bgType}]`, {
      fontSize: '24px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    memoryContainer.add(bgLabel);

    // 记忆标题
    const title = this.add.text(width / 2, 50, this.currentMemory?.title || '???', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#b48ead',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    memoryContainer.add(title);

    // 装饰光点
    this.createFloatingParticles();

    // 加载记忆数据
    this.loadMemoryData();

    // 淡入动画
    memoryContainer.setScale(0.8).setAlpha(0);
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
    // 查找记忆数据
    if (this.memoryId) {
      this.currentMemory = memories.memories.find(m => m.id === this.memoryId);
    }

    // 加载对话数据
    if (this.currentMemory && this.currentMemory.dialogueId) {
      this.dialogueData = dialogues.dialogues[this.currentMemory.dialogueId];
    }

    // 如果没有对话数据，使用默认
    if (!this.dialogueData) {
      this.dialogueData = {
        speaker: '旁白',
        lines: [
          { id: '1', text: '（记忆模糊不清，仿佛有什么被封印了...）' }
        ],
        choices: [{ text: '继续', effects: {}, next: null }]
      };
    }

    // 创建对话 UI
    this.createMemoryDialogue();
  }

  createMemoryBackground() {
    // 渐变背景层
    for (let i = 0; i < 20; i++) {
      const y = i * 30;
      const alpha = 0.02 + (i * 0.01);
      this.add.rectangle(400, y, 800, 30, 0xa3be8c, alpha);
    }

    // 背景星点
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, 800);
      const y = Phaser.Math.Between(0, 600);
      const star = this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xa3be8c, 0.3);
      
      this.tweens.add({
        targets: star,
        alpha: { from: 0.1, to: 0.6 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  createFloatingParticles() {
    // 漂浮的记忆碎片
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(50, 550);
      const particle = this.add.rectangle(x, y, 8, 8, 0xb48ead, 0.4)
        .setRotation(Phaser.Math.Between(0, 4));
      
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 40),
        rotation: particle.rotation + Math.PI,
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

    // NPC 名字背景
    const nameBg = this.add.rectangle(width / 2 - 180, 455, 100, 32, 0x2e3440)
      .setStrokeStyle(2, 0xa3be8c);
    this.dialogContainer.add(nameBg);

    // NPC 名字
    this.nameText = this.add.text(width / 2 - 180, 455, '旁白', {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#a3be8c',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dialogContainer.add(this.nameText);

    // 对话框主体
    const dialogBg = this.add.rectangle(width / 2, height - 80, width - 100, 120, 0x2e3440, 0.95)
      .setStrokeStyle(3, 0xa3be8c);
    this.dialogContainer.add(dialogBg);

    // 对话文本
    this.dialogueText = this.add.text(width / 2 - 300, height - 120, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      wordWrap: true,
      wordWrapWidth: 600,
      lineSpacing: 6
    });
    this.dialogContainer.add(this.dialogueText);

    // 选项容器
    this.choicesContainer = this.add.container(width / 2, height - 40).setDepth(12);
    this.dialogContainer.add(this.choicesContainer);

    // 继续提示
    this.continueHint = this.add.text(width - 60, height - 20, '▼', {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
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

    // 显示第一行
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
        // 有选项，不显示继续提示
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
    const speed = 30;

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
      // 无选项，自动结束
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

    const bg = this.add.rectangle(0, 0, 350, 40, 0x3c3050)
      .setStrokeStyle(2, 0x5e5270);
    btn.add(bg);

    const numText = this.add.text(-155, 0, `${index + 1}.`, {
      fontSize: '14px',
      fontFamily: 'Courier New',
      color: '#a3be8c'
    }).setOrigin(0, 0.5);
    btn.add(numText);

    const choiceText = this.add.text(-125, 0, text, {
      fontSize: '14px',
      fontFamily: 'Georgia, serif',
      color: '#d8dee9'
    }).setOrigin(0, 0.5);
    btn.add(choiceText);

    btn.setSize(350, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.setFillStyle(0x5e5270);
      bg.setStrokeStyle(2, 0xa3be8c);
    });

    btn.on('pointerout', () => {
      bg.setFillStyle(0x3c3050);
      bg.setStrokeStyle(2, 0x5e5270);
    });

    btn.on('pointerdown', () => {
      this.selectChoice(index);
    });

    this.choicesContainer.add(btn);
  }

  selectChoice(index) {
    const choice = this.dialogueData.choices[index];
    if (!choice) return;

    // 应用对话选项效果
    if (choice.effects) {
      window.gameState.applyEffects(choice.effects);
    }

    // 应用记忆奖励
    if (this.currentMemory && this.currentMemory.rewards) {
      window.gameState.applyEffects(this.currentMemory.rewards);
      this.showRewardsPopup(this.currentMemory.rewards);
    }

    // 延迟结束
    this.time.delayedCall(1000, () => {
      this.finishMemory();
    });
  }

  showRewardsPopup(rewards) {
    const parts = [];
    
    if (rewards.funds) {
      const sign = rewards.funds > 0 ? '+' : '';
      parts.push({ text: `${sign}${rewards.funds} 资金`, color: '#a3be8c' });
    }
    if (rewards.popularity) {
      const sign = rewards.popularity > 0 ? '+' : '';
      parts.push({ text: `${sign}${rewards.popularity} 人气`, color: '#bf616a' });
    }
    if (rewards.flags || rewards.npcAffinity) {
      parts.push({ text: '记忆已解锁', color: '#b48ead' });
    }

    if (parts.length === 0) return;

    const popup = this.add.container(400, 300).setDepth(100);
    
    const bg = this.add.rectangle(0, 0, 180, 30 + parts.length * 24, 0x2e2440, 0.95)
      .setStrokeStyle(2, 0xa3be8c);
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
        // 有选项
      } else {
        this.continueHint.setVisible(true);
      }
    } else if (this.choicesContainer.list.length === 0) {
      this.currentLineIndex++;
      this.showCurrentLine();
    }
  }

  finishMemory() {
    // 停止所有定时器
    if (this.typeTimer) {
      this.typeTimer.remove();
      this.typeTimer = null;
    }

    // 解锁图鉴
    if (this.currentMemory && this.currentMemory.unlockCodex) {
      window.gameState.unlockMemory(this.currentMemory.id);
    }

    // 直接切换场景，不用 camera fade
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
