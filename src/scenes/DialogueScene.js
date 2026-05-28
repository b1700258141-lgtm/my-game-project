import { WARM_UI, addWarmButton, addWarmPanel, addWarmTag } from '../ui/WarmUITheme';
import { getSfxManager } from '../systems/SfxManager';
// 瀵硅瘽鍦烘櫙 - 鏁版嵁椹卞姩鐨勫璇濈郴缁燂紙鏀寔瀵硅瘽鍘嗗彶婊氬姩 + 鐗╁搧濂栧姳锛?
import dialogues from '../data/dialogues.json';
import InventorySystem from '../systems/InventorySystem';
import VisitorSystem from '../systems/VisitorSystem';
import { GAME_STATE } from '../systems/GameState';
import RandomNpcManager, { RANDOM_NPC_STATE } from '../systems/RandomNpcManager';
import DailyLoopManager from '../systems/DailyLoopManager';
import {
  getCharacterAsset,
  getCharacterAssetByPortraitId,
  getCharacterAssetBySpeaker
} from '../data/characterAssets.js';

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

    // ========== 瀵硅瘽鍘嗗彶 ==========
    this.dialogueHistory = [];       // { speakerName, text, isPlayerChoice, choiceText, dialogueIndex }
    this.scrollOffset = 0;          // 0 = 褰撳墠瀵硅瘽, >0 = 鏌ョ湅鍘嗗彶
    this.isViewingHistory = false;   // 鏄惁姝ｅ湪鏌ョ湅鍘嗗彶
    this.historyOverlay = null;      // 鍘嗗彶鏂囨湰瀹瑰櫒

    // ========== NPC 瀵硅瘽缁撴潫澶勭悊 ==========
    this.npcIdForVisitor = null;     // 鐢ㄤ簬鏍囪闅忔満 NPC 瀵硅瘽缁撴潫
    this.visitorConfigId = null;
    this.visitorDialogueMarked = false;
  }

  init(data) {
    // 濡傛灉鏄粠 MemoryScene 杩斿洖锛岀洿鎺ュ鐞嗚繑鍥為€昏緫
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
    this.npcIdForVisitor = data.npcId || null; // 鐢ㄤ簬鏍囪鏉ヨ NPC 瀵硅瘽缁撴潫
    this.visitorConfigId = data.visitorConfigId || null;
    this.visitorDialogueMarked = false;
    this.pendingMemory = null;
    this.pendingNextDialogue = null;
    this.inventorySystem = null;
    this.fromMemory = false;
    this.dialogueHistory = [];
    this.scrollOffset = 0;
    this.isViewingHistory = false;
    this.backgroundKey = data.backgroundKey || null;
    
    // 鍒濆鍖栬儗鍖呯郴缁?
    if (window.gameState) {
      this.inventorySystem = new InventorySystem(window.gameState);
      window.gameState.setReturnScene(this.returnScene);
      window.gameState.setGameState(GAME_STATE.DIALOGUE);
    }
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 閲嶇疆鐩告満鐘舵€侊紝闃叉娈嬬暀榛戝睆
    this.cameras.main.resetFX();

    // 背景：委托对话使用万事屋内部背景图，普通对话保持纯黑遮罩
    if (this.backgroundKey && this.textures.exists(this.backgroundKey)) {
      const bg = this.add.image(width / 2, height / 2, this.backgroundKey);
      const iw = bg.width;
      const ih = bg.height;
      const scale = Math.max(width / iw, height / ih);
      bg.setScale(scale).setDepth(0);
      this.add.rectangle(width / 2, height / 2, width, height, 0x0a0810, 0.35).setDepth(1);
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(0);
    }

    // Dialog box container
    this.dialogBox = this.add.container(0, 0).setDepth(10);

    // NPC 绔嬬粯鍖哄煙锛堝乏渚э級
    // 使用较低的底部位置 (= 对话框顶部附近)，让立绘至少露出大腿及以上
    this.portraitContainer = this.add.container(width * 0.13, height - 172).setDepth(11);
    this.dialogBox.add(this.portraitContainer);

    // 閫忔槑绔嬬粯灞傦紝涓嶇粰绔嬬粯鍔犱笉閫忔槑鑳屾櫙
    this.portraitFrame = this.add.rectangle(0, -120, width * 0.22, height * 0.75, 0x000000, 0)
      .setVisible(false);
    this.portraitContainer.add(this.portraitFrame);

    this.portraitSprite = this.add.image(0, 0, 'character_player_portrait')
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.portraitContainer.add(this.portraitSprite);

    // 瀵硅瘽妗嗕富浣?
    addWarmPanel(this, this.dialogBox, width / 2, height - 100, width - 80, 180, {
      fill: WARM_UI.panelLight
    });

    const dialogLeft = 190;
    const dialogTextWidth = width - 300;
    const dialogTop = height - 190;

    // 角色名木牌
    const nameBg = this.add.rectangle(dialogLeft, dialogTop + 26, 240, 30, WARM_UI.panelDark)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, WARM_UI.border);
    this.dialogBox.add(nameBg);

    this.nameText = this.add.text(dialogLeft + 14, dialogTop + 26, '', {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.textLight,
      fontStyle: 'bold',
      wordWrap: { width: 210, useAdvancedWrap: true },
      maxLines: 1
    }).setOrigin(0, 0.5);
    this.dialogBox.add(this.nameText);

    // 瀵硅瘽鏂囨湰
    this.dialogueText = this.add.text(dialogLeft + 42, dialogTop + 48, '', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: dialogTextWidth, useAdvancedWrap: true },
      lineSpacing: 6,
      fixedWidth: dialogTextWidth,
      maxLines: 3
    });
    this.dialogBox.add(this.dialogueText);

    // 閫夐」瀹瑰櫒
    this.choicesContainer = this.add.container(width / 2, height - 54).setDepth(12);
    this.dialogBox.add(this.choicesContainer);

    // 缁х画鎻愮ず
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

    // 鍘嗗彶娴忚鎻愮ず
    this.historyHint = this.add.text(width / 2, height - 18, '鈫戔啌 娴忚鍘嗗彶瀵硅瘽', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: WARM_UI.textMuted
    }).setOrigin(0.5).setDepth(13).setVisible(false);

    // 鐐瑰嚮缁х画
    this.input.on('pointerdown', () => {
      this.handleClick();
    });

    // 绌烘牸閿户缁?
    this.input.keyboard.on('keydown-SPACE', () => {
      this.handleClick();
    });

    // ========== 榧犳爣婊氳疆鏌ョ湅瀵硅瘽鍘嗗彶 ==========
    this.input.on('wheel', (pointer, currentlyOver, dx, dy) => {
      this.handleWheel(dy);
    });

    // 鍔犺浇瀵硅瘽鏁版嵁
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

    // 娣″叆
    this.cameras.main.fadeIn(300);
  }

  // ========== 榧犳爣婊氳疆澶勭悊 ==========

  handleWheel(dy) {
    if (this.dialogueHistory.length === 0) return;

    // dy < 0 = 涓婃粴锛堟煡鐪嬫洿鏃╃殑瀵硅瘽锛?
    // dy > 0 = 涓嬫粴锛堝洖鍒版洿鏂扮殑瀵硅瘽锛?
    if (dy < 0) {
      // 涓婃粴 鈥?鏌ョ湅鏇存棭鐨勫璇?
      this.scrollOffset = Math.min(this.scrollOffset + 1, this.dialogueHistory.length - 1);
    } else if (dy > 0) {
      // 涓嬫粴 鈥?鍥炲埌鏇存柊鐨勫璇?
      this.scrollOffset = Math.max(this.scrollOffset - 1, 0);
    }

    if (this.scrollOffset > 0) {
      this.showHistoryEntry();
    } else {
      this.hideHistoryEntry();
    }
  }

  // 鏄剧ず鍘嗗彶鏉＄洰
  showHistoryEntry() {
    this.isViewingHistory = true;
    const entryIndex = this.dialogueHistory.length - 1 - this.scrollOffset;
    const entry = this.dialogueHistory[entryIndex];
    if (!entry) return;

    // 闅愯棌閫夐」鎸夐挳锛堟煡鐪嬪巻鍙叉椂涓嶆樉绀洪€夐」锛?
    this.choicesContainer.removeAll(true);
    this.choiceButtons = [];
    this.continueHint.setVisible(false);

    // 鏇存柊鍚嶅瓧
    this.nameText.setText(this.getSpeakerName(entry.speakerName || ''));

    // 鏇存柊鏂囨湰锛堟樉绀哄巻鍙叉枃鏈紝鍗婇€忔槑鏁堟灉琛ㄧず鏄巻鍙诧級
    if (entry.isPlayerChoice) {
      this.dialogueText.setText(`【你的选择】${entry.choiceText}`);
      this.dialogueText.setAlpha(0.7);
    } else {
      this.dialogueText.setText(entry.text);
      this.dialogueText.setAlpha(0.7);
    }

    // 鏄剧ず鍘嗗彶鎻愮ず
    this.historyHint.setVisible(true);
    this.historyHint.setText(`娴忚鍘嗗彶 (${this.scrollOffset}/${this.dialogueHistory.length - 1}) 鈫戔啌`);
  }

  // 闅愯棌鍘嗗彶鏉＄洰锛屽洖鍒板綋鍓嶅璇?
  hideHistoryEntry() {
    this.isViewingHistory = false;
    this.dialogueText.setAlpha(1.0);
    this.historyHint.setVisible(false);

    // 閲嶆柊鏄剧ず褰撳墠瀵硅瘽
    if (this.currentDialogue) {
      const lines = this.currentDialogue.lines;
      if (lines && this.currentLineIndex < lines.length) {
        this.dialogueText.setText(this.fullText || lines[this.currentLineIndex].text);
        this.nameText.setText(this.getSpeakerName(this.resolveLineSpeaker(lines[this.currentLineIndex])));
        this.updateDialoguePortrait(lines[this.currentLineIndex]);
        // 濡傛灉涔嬪墠鏈夐€夐」锛岄噸鏂版樉绀?
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

  // ========== 瀵硅瘽鍘嗗彶璁板綍 ==========

  addToHistory(entry) {
    this.dialogueHistory.push({
      speakerName: entry.speakerName || '',
      text: entry.text || '',
      isPlayerChoice: entry.isPlayerChoice || false,
      choiceText: entry.choiceText || '',
      dialogueIndex: entry.dialogueIndex || 0
    });
  }

  // ========== 瀵硅瘽閫昏緫 ==========

  getSpeakerName(rawSpeaker) {
    const speaker = String(rawSpeaker || '');
    const playerName = window.gameState?.getPlayerName?.() || '玩家';
    if (speaker === 'player' || speaker === '玩家' || speaker === 'playerId' || speaker === '【玩家id】') {
      return playerName;
    }
    return speaker.replaceAll('【玩家id】', playerName);
  }

  resolveLineSpeaker(line = null) {
    return line?.speaker || line?.speakerId || this.currentDialogue?.speaker || '';
  }

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

    this.updateDialoguePortrait();

    // 鏄剧ず绗竴琛?
    this.showCurrentLine();
  }

  showCurrentLine() {
    const lines = this.currentDialogue.lines;
    if (!lines || this.currentLineIndex >= lines.length) {
      this.showChoices();
      return;
    }

    const line = lines[this.currentLineIndex];
    
    // 娓呴櫎涔嬪墠鐨勯€夐」
    this.clearChoices();
    this.updateDialoguePortrait(line);

    // 显示角色名
    const speakerName = this.getSpeakerName(this.resolveLineSpeaker(line));
    this.nameText.setText(speakerName);
    if (this.dialogueText?.setMaxLines) {
      this.dialogueText.setMaxLines(3);
    }

    // 记录到历史
    this.addToHistory({
      speakerName,
      text: line.text,
      isPlayerChoice: false,
      dialogueIndex: this.currentLineIndex
    });

    // 鎵撳瓧鏈烘晥鏋?
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

    if (this.dialogueText?.setMaxLines) {
      this.dialogueText.setMaxLines(this.currentChoices.length > 1 ? 2 : 3);
    }

    const startY = -(this.currentChoices.length - 1) * 22;
    
    this.currentChoices.forEach((choice, index) => {
      const y = startY + index * 44;
      const btn = this.createChoiceButton(choice.text, y, index);
      this.choiceButtons.push(btn);
    });
  }

  updateDialoguePortrait(line = null) {
    const asset = this.resolvePortraitAsset(line);
    if (!asset?.portraitKey || !this.textures.exists(asset.portraitKey)) {
      this.portraitSprite?.setVisible(false);
      return;
    }

    const texture = this.textures.get(asset.portraitKey);
    texture?.setFilter?.(Phaser.Textures.FilterMode.NEAREST);

    this.portraitSprite
      .setTexture(asset.portraitKey)
      .setVisible(true);

    const maxW = this.cameras.main.width * 0.22;
    const maxH = this.cameras.main.height * 0.74;
    const source = this.portraitSprite.texture.getSourceImage();
    const scale = Math.min(maxW / source.width, maxH / source.height);
    this.portraitSprite.setScale(scale);
  }

  resolvePortraitAsset(line = null) {
    const speakerId = line?.speakerId || line?.speaker || this.currentDialogue?.speakerId;
    if (speakerId) {
      const bySpeakerId = getCharacterAsset(speakerId) || getCharacterAssetBySpeaker(speakerId);
      if (bySpeakerId) return bySpeakerId;
    }

    const portraitId = line?.portrait || this.currentDialogue?.portrait;
    if (portraitId) {
      const byPortrait = getCharacterAssetByPortraitId(portraitId);
      if (byPortrait) return byPortrait;
    }

    if (this.npcId) {
      const byNpcId = getCharacterAsset(this.npcId);
      if (byNpcId) return byNpcId;
    }

    return null;
  }

  createChoiceButton(text, y, index) {
    const btn = this.add.container(0, y);

    const bg = this.add.rectangle(0, 0, 520, 40, WARM_UI.panelLight)
      .setStrokeStyle(2, WARM_UI.border);
    btn.add(bg);

    const numText = this.add.text(-240, 0, `${index + 1}.`, {
      fontSize: '16px',
      fontFamily: 'Courier New',
      color: WARM_UI.text
    }).setOrigin(0, 0.5);
    btn.add(numText);

    const choiceText = this.add.text(-205, 0, text, {
      fontSize: '16px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      wordWrap: { width: 430, useAdvancedWrap: true },
      fixedWidth: 430,
      maxLines: 2
    }).setOrigin(0, 0.5);
    btn.add(choiceText);

    btn.setSize(520, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.setFillStyle(WARM_UI.panelAlt);
      bg.setStrokeStyle(2, WARM_UI.button);
    });

    btn.on('pointerout', () => {
      bg.setFillStyle(WARM_UI.panelLight);
      bg.setStrokeStyle(2, WARM_UI.border);
    });

    btn.on('pointerdown', () => {
      getSfxManager().clickButton();
      this.selectChoice(index);
    });

    this.choicesContainer.add(btn);
    return btn;
  }

  selectChoice(index) {
    const choice = this.currentChoices[index];
    if (!choice) return;

    // 璁板綍鐜╁閫夋嫨鍒板巻鍙?
    this.addToHistory({
      speakerName: this.getSpeakerName('鐜╁'),
      text: '',
      isPlayerChoice: true,
      choiceText: choice.text,
      dialogueIndex: this.currentLineIndex
    });

    // 闃叉閲嶅鐐瑰嚮
    this.clearChoices();
    this.currentChoices = null;
    this._inputLocked = true;

    // 鏀堕泦鑾峰緱鐨勭墿鍝侊紙鐢ㄤ簬濂栧姳寮圭獥锛?
    const rewardItems = this.collectRewardItems(choice.effects);

    // 搴旂敤鏁堟灉
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

    // 璁剧疆寰呭睍绀虹殑濂栧姳鐗╁搧
    if (rewardItems.length > 0) {
      window.gameState.setPendingRewardItems(rewardItems);
    }

    // 寤惰繜鍒囨崲
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

  // 鏀堕泦瀵硅瘽閫夐」涓幏寰楃殑鐗╁搧
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

  // 鏍囪鏉ヨ NPC 瀵硅瘽缁撴潫
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

  // 澶勭悊鐗╁搧鐩稿叧鏁堟灉锛堝寮虹増 鈥?浼犲叆 sourceNpcId锛?
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

  // 鍒涘缓涓存椂濮旀墭
  createTempCommission(tempCommissionId) {
    if (!window.gameState) return;
    const visitorSystem = new VisitorSystem(window.gameState);
    visitorSystem.addTemporaryCommission(tempCommissionId);
  }

  // 鑾峰彇鐗╁搧鍚嶇О
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
      parts.push({ text: `${sign}${effects.funds} 资金`, color: WARM_UI.alchemyText });
    }
    if (effects.popularity) {
      const sign = effects.popularity > 0 ? '+' : '';
      parts.push({ text: `${sign}${effects.popularity} 人气`, color: WARM_UI.warningText });
    }
    if (effects.flags) {
      parts.push({ text: '剧情已更新', color: WARM_UI.text });
    }
    if (effects.npcAffinity) {
      parts.push({ text: '好感度变化', color: '#6B4A7A' });
    }
    if (effects.completeCommission) {
      parts.push({ text: '委托完成', color: WARM_UI.alchemyText });
    }
    
    if (effects.addItem) {
      const itemName = this.getItemName(effects.addItem);
      parts.push({ text: `获得 ${itemName}`, color: WARM_UI.goldText });
    }
    if (effects.addKeyItem) {
      const itemName = this.getItemName(effects.addKeyItem);
      parts.push({ text: `获得关键物品: ${itemName}`, color: WARM_UI.goldText });
    }
    if (effects.removeItem) {
      const itemName = this.getItemName(effects.removeItem);
      parts.push({ text: `失去 ${itemName}`, color: WARM_UI.warningText });
    }
    if (effects.setEndingFlag) {
      parts.push({ text: '结局条件已更新', color: WARM_UI.text });
    }
    if (effects.startTemporaryCommission) {
      parts.push({ text: '临时委托已添加', color: WARM_UI.alchemyText });
    }

    if (parts.length === 0) return;

    const popup = this.add.container(400, 200).setDepth(100);
    
    const bg = this.add.rectangle(0, 0, 200, 30 + parts.length * 22, WARM_UI.panel, 0.95)
      .setStrokeStyle(2, WARM_UI.border);
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
    // 闃叉鍦ㄥ満鏅垏鎹㈡湡闂存垨杈撳叆閿佸畾鏃惰瑙﹀彂
    if (this._transitioning || this._inputLocked) return;
    getSfxManager().clickButton();

    // 濡傛灉姝ｅ湪鏌ョ湅鍘嗗彶锛岀偣鍑诲洖鍒板綋鍓嶅璇?
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

    // 鐩存帴鍒囨崲鍦烘櫙
    this.scene.start(this.returnScene);
  }
}

export default DialogueScene;
