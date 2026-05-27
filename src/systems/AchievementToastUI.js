import { WARM_UI } from '../ui/WarmUITheme';
// 鎴愬氨鎻愮ず UI - 鍦ㄦ父鎴忓彸涓嬭鏄剧ず鎴愬氨瑙ｉ攣鎻愮ず
// 3 绉掑悗鑷姩娑堝け锛屼笉鏆傚仠娓告垙锛屼笉闃诲鐜╁鎿嶄綔锛屼笉鍒囨崲 GameState

class AchievementToastUI {
  /**
   * @param {Phaser.Scene} scene - 娓告垙鍦烘櫙寮曠敤
   */
  constructor(scene) {
    this.scene = scene;
    this.isShowing = false;
    this._queue = [];
    this._currentToast = null;
    this._toastTimer = null;
    this._isDestroyed = false;

    // 鏄剧ず鏃堕暱锛堟绉掞級
    this.displayDuration = 3000;
  }

  /**
   * 鏄剧ず鎴愬氨鎻愮ず锛堝鏋滄鍦ㄦ樉绀哄垯鍔犲叆闃熷垪锛?
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
   * 鏄剧ず闃熷垪涓殑涓嬩竴涓垚灏?
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
   * 鍒涘缓鎻愮ず UI 鍏冪礌
   */
  _createToastElement(achievement) {
    if (this._isDestroyed || !this.scene || !this.scene.add) return;

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // 鍙充笅瑙掍綅缃?
    const toastX = width - 140;
    const toastY = height - 65;

    const container = this.scene.add.container(toastX, toastY).setDepth(200);

    // 鑳屾櫙
    const bg = this.scene.add.rectangle(0, 0, 250, 80, WARM_UI.panel, 0.95)
      .setStrokeStyle(2, WARM_UI.gold);
    container.add(bg);

    const headerText = this.scene.add.text(0, -24, '成就达成！', {
      fontSize: '12px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.goldText,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(headerText);

    // 鎴愬氨鍚嶇О
    const titleText = this.scene.add.text(0, -4, achievement.title, {
      fontSize: '15px',
      fontFamily: 'Georgia, serif',
      color: WARM_UI.text,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(titleText);

    // 鎻忚堪锛堝鏋滄湁绌洪棿锛?
    if (achievement.description) {
      const descText = this.scene.add.text(0, 18, achievement.description, {
        fontSize: '11px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        align: 'center'
      }).setOrigin(0.5).setWordWrapWidth(220);
      container.add(descText);
    }

    // 鍒濆浠庝笅鏂规粦鍏ュ姩鐢?
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

    // 3 绉掑悗鑷姩娑堝け
    this._toastTimer = this.scene.time.delayedCall(this.displayDuration, () => {
      this._hideToast(container);
    });
  }

  /**
   * 闅愯棌鎻愮ず
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
        // 鏄剧ず闃熷垪涓殑涓嬩竴涓?
        this._showNext();
      }
    });
  }

  /**
   * 娓呯悊鎻愮ず鍏冪礌
   */
  _cleanupToast(container) {
    if (container && !container.isDestroyed) {
      try {
        container.destroy();
      } catch (e) {
        // 蹇界暐宸查攢姣佺殑瀹瑰櫒
      }
    }
    if (this._currentToast === container) {
      this._currentToast = null;
    }
  }

  /**
   * 閿€姣佹墍鏈夋彁绀哄拰闃熷垪
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
        // 蹇界暐
      }
      this._currentToast = null;
    }

    this._queue = [];
    this.isShowing = false;
  }
}

export default AchievementToastUI;
