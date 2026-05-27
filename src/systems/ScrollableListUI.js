import { WARM_UI } from '../ui/WarmUITheme';
export default class ScrollableListUI {
  constructor(scene, options) {
    this.scene = scene;
    this.parent = options.parent || null;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 200;
    this.height = options.height || 200;
    this.rowHeight = options.rowHeight || 40;
    this.rowGap = options.rowGap ?? 6;
    this.padding = options.padding ?? 4;
    this.wheelStep = options.wheelStep || 36;
    this.scrollY = 0;
    this.contentHeight = 0;

    this.root = scene.add.container(this.x, this.y);
    if (this.parent) {
      this.parent.add(this.root);
    }

    this.content = scene.add.container(-this.width / 2, -this.height / 2);
    this.root.add(this.content);

    const world = this.getWorldCenter();
    this.maskGraphics = scene.add.graphics();
    this.maskGraphics.fillStyle(0xffffff, 1);
    this.maskGraphics.fillRect(
      world.x - this.width / 2,
      world.y - this.height / 2,
      this.width,
      this.height
    );
    this.maskGraphics.setVisible(false);
    this.content.setMask(this.maskGraphics.createGeometryMask());

    this.track = scene.add.rectangle(this.width / 2 - 5, 0, 6, this.height, WARM_UI.panel, 0.82)
      .setStrokeStyle(1, WARM_UI.border);
    this.thumb = scene.add.rectangle(this.width / 2 - 5, -this.height / 2 + 20, 8, 40, WARM_UI.border, 0.9)
      .setStrokeStyle(1, WARM_UI.gold)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.root.add([this.track, this.thumb]);
    this.thumb.on('drag', (_pointer, _dragX, dragY) => {
      this.setScrollRatioFromThumbY(dragY);
    });

    this.handleWheel = this.handleWheel.bind(this);
    scene.input.on('wheel', this.handleWheel);
    scene.events.once('shutdown', () => this.destroy());
  }

  getWorldCenter() {
    return {
      x: (this.parent ? this.parent.x : 0) + this.x,
      y: (this.parent ? this.parent.y : 0) + this.y
    };
  }

  containsPointer(pointer) {
    const world = this.getWorldCenter();
    return pointer.x >= world.x - this.width / 2 &&
      pointer.x <= world.x + this.width / 2 &&
      pointer.y >= world.y - this.height / 2 &&
      pointer.y <= world.y + this.height / 2;
  }

  handleWheel(pointer, _gameObjects, _deltaX, deltaY) {
    if (!this.containsPointer(pointer)) return;
    this.scrollBy(deltaY > 0 ? this.wheelStep : -this.wheelStep);
  }

  clear() {
    this.content.removeAll(true);
    this.contentHeight = 0;
    this.scrollY = 0;
    this.updateScroll();
  }

  render(dataList, createRow, options = {}) {
    this.content.removeAll(true);
    const items = Array.isArray(dataList) ? dataList : [];
    let y = this.padding;

    if (items.length === 0) {
      const emptyText = options.emptyText || '暂无记录';
      const empty = this.scene.add.text(this.width / 2, this.height / 2, emptyText, {
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
        color: WARM_UI.textMuted,
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: this.width - 24, useAdvancedWrap: true }
      }).setOrigin(0.5);
      this.content.add(empty);
      this.contentHeight = this.height;
      this.scrollY = 0;
      this.updateScroll();
      return;
    }

    items.forEach((item, index) => {
      const rowHeight = options.rowHeight || this.rowHeight;
      const row = createRow(item, index, this.width - 18, rowHeight);
      if (!row) return;
      row.x = 0;
      row.y = y;
      this.content.add(row);
      y += rowHeight + this.rowGap;
    });

    this.contentHeight = Math.max(this.height, y + this.padding - this.rowGap);
    if (!options.keepScroll) {
      this.scrollY = 0;
    }
    this.updateScroll();
  }

  maxScroll() {
    return Math.max(0, this.contentHeight - this.height);
  }

  scrollBy(delta) {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll());
    this.updateScroll();
  }

  setScrollRatioFromThumbY(thumbY) {
    const maxScroll = this.maxScroll();
    if (maxScroll <= 0) return;

    const thumbHeight = this.getThumbHeight();
    const trackTop = -this.height / 2;
    const trackRange = this.height - thumbHeight;
    const top = Phaser.Math.Clamp(thumbY - thumbHeight / 2, trackTop, trackTop + trackRange);
    const ratio = trackRange <= 0 ? 0 : (top - trackTop) / trackRange;
    this.scrollY = ratio * maxScroll;
    this.updateScroll();
  }

  getThumbHeight() {
    if (this.contentHeight <= this.height) return this.height;
    return Phaser.Math.Clamp((this.height / this.contentHeight) * this.height, 32, this.height);
  }

  updateScroll() {
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll());
    this.content.y = -this.height / 2 - this.scrollY;

    const canScroll = this.maxScroll() > 0;
    this.track.setVisible(canScroll);
    this.thumb.setVisible(canScroll);
    if (!canScroll) return;

    const thumbHeight = this.getThumbHeight();
    const trackTop = -this.height / 2;
    const trackRange = this.height - thumbHeight;
    const ratio = this.maxScroll() <= 0 ? 0 : this.scrollY / this.maxScroll();
    this.thumb.height = thumbHeight;
    this.thumb.setDisplaySize(8, thumbHeight);
    this.thumb.y = trackTop + thumbHeight / 2 + ratio * trackRange;
  }

  destroy() {
    if (!this.scene || !this.scene.input) return;
    this.scene.input.off('wheel', this.handleWheel);
    if (this.maskGraphics) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }
  }
}
