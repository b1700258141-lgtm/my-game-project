// 成就提示 UI - 在游戏右下角显示成就解锁提示
// 3 秒后自动消失，不暂停游戏，不阻塞玩家操作，不切换 GameState

class AchievementToastUI {
  /**
   * @param {Phaser.Scene} scene - 游戏场景引用
   */
  constructor(scene) {
    this.scene = scene;
    this.isShowing = false;
    this._queue = [];
    this._currentToast = null;
    this._toastTimer = null;
    this._isDestroyed = false;

    // 显示时长（毫秒）
    this.displayDuration = 3000;
  }

  /**
   * 显示成就提示（如果正在显示则加入队列）
   * @param {{ achievementId: string, title: string, description: string }} achievement
   */
  show(achievement) {
    if (this._isDestroyed) return;
    if (!achievement || !achievement.title) return;

    this._queue.push(achievement);
    if (!this.isShowing) {
      this._showNext();
    }
  }

  /**
   * 显示队列中的下一个成就
   */
  _showNext() {
    if (this._isDestroyed) return;
    if (this._queue.length === 0) {
      this.isShowing = false;
      return;
    }

    this.isShowing = true;
    const achievement = this._queue.shift();
    this._createToastElement(achievement);
  }

  /**
   * 创建提示 UI 元素
   */
  _createToastElement(achievement) {
    if (this._isDestroyed || !this.scene || !this.scene.add) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 右下角位置
    const toastX = width - 140;
    const toastY = height - 65;

    const container = this.scene.add.container(toastX, toastY).setDepth(200);

    // 背景
    const bg = this.scene.add.rectangle(0, 0, 250, 80, 0x2e3440, 0.95)
      .setStrokeStyle(2, 0xebcb8b);
    container.add(bg);

    // 标题行：成就达成！
    const headerText = this.scene.add.text(0, -24, '成就达成！', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: '#ebcb8b',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(headerText);

    // 成就名称
    const titleText = this.scene.add.text(0, -4, achievement.title, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: '#eceff4',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(titleText);

    // 描述（如果有空间）
    if (achievement.description) {
      const descText = this.scene.add.text(0, 18, achievement.description, {
        fontSize: '11px',
        fontFamily: 'Georgia, serif',
        color: '#d8dee9',
        align: 'center'
      }).setOrigin(0.5).setWordWrapWidth(220);
      container.add(descText);
    }

    // 初始从下方滑入动画
    container.setY(toastY + 40);
    container.setAlpha(0);

    this.scene.tweens.add({
      targets: container,
      y: toastY,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this._currentToast = container;

    // 3 秒后自动消失
    this._toastTimer = this.scene.time.delayedCall(this.displayDuration, () => {
      this._hideToast(container);
    });
  }

  /**
   * 隐藏提示
   */
  _hideToast(container) {
    if (this._isDestroyed || !this.scene || !this.scene.tweens) {
      this._cleanupToast(container);
      return;
    }

    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      y: container.y + 30,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this._cleanupToast(container);
        // 显示队列中的下一个
        this._showNext();
      }
    });
  }

  /**
   * 清理提示元素
   */
  _cleanupToast(container) {
    if (container && !container.isDestroyed) {
      try {
        container.destroy();
      } catch (e) {
        // 忽略已销毁的容器
      }
    }
    if (this._currentToast === container) {
      this._currentToast = null;
    }
  }

  /**
   * 销毁所有提示和队列
   */
  destroy() {
    this._isDestroyed = true;

    if (this._toastTimer) {
      this._toastTimer.remove();
      this._toastTimer = null;
    }

    if (this._currentToast && !this._currentToast.isDestroyed) {
      try {
        this._currentToast.destroy();
      } catch (e) {
        // 忽略
      }
      this._currentToast = null;
    }

    this._queue = [];
    this.isShowing = false;
  }
}

export default AchievementToastUI;
