export const CHARACTER_DIRECTIONS = {
  down: 0,
  left: 1,
  right: 2,
  up: 3
};

const DEFAULT_WALK_SEQUENCE = [0, 1, 2, 1];

export default class CharacterSpriteAnimator {
  constructor(scene, sprite, assetConfig = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.assetConfig = assetConfig;
    this.frameRows = assetConfig.frameRows || 4;
    this.frameCols = assetConfig.frameCols || 3;
    this.directions = assetConfig.directions || CHARACTER_DIRECTIONS;
    this.idleFrameIndex = assetConfig.idleFrameIndex ?? 1;
    this.walkFrameIndices = assetConfig.walkFrameIndices || DEFAULT_WALK_SEQUENCE;
    this.frameRate = assetConfig.frameRate || 8;
    this.scale = assetConfig.scale || 0.16;
    this.lastDirection = 'down';
    this.isMoving = false;
    this.elapsed = 0;
    this.walkCursor = 0;
    this.frameWidth = 0;
    this.frameHeight = 0;
    this.frameNames = [];

    if (this.sprite) {
      this.sprite.setOrigin(assetConfig.anchor?.x ?? 0.5, assetConfig.anchor?.y ?? 1);
      this.sprite.setScale(this.scale);
      this.sprite.texture?.setFilter?.(Phaser.Textures.FilterMode.NEAREST);
      this.refreshFrameSize();
      this.setIdle(this.lastDirection);
    }
  }

  refreshFrameSize() {
    const source = this.sprite?.texture?.getSourceImage?.();
    if (!source?.width || !source?.height) return false;

    this.frameWidth = Math.floor(source.width / this.frameCols);
    this.frameHeight = Math.floor(source.height / this.frameRows);
    this.ensureTextureFrames();
    return this.frameWidth > 0 && this.frameHeight > 0;
  }

  ensureTextureFrames() {
    const texture = this.sprite?.texture;
    if (!texture || !this.frameWidth || !this.frameHeight) return;

    const prefix = `${texture.key}_frame`;
    this.frameNames = [];
    for (let row = 0; row < this.frameRows; row += 1) {
      this.frameNames[row] = [];
      for (let col = 0; col < this.frameCols; col += 1) {
        const frameName = `${prefix}_${row}_${col}`;
        if (!texture.frames?.[frameName]) {
          texture.add(
            frameName,
            0,
            col * this.frameWidth,
            row * this.frameHeight,
            this.frameWidth,
            this.frameHeight
          );
        }
        this.frameNames[row][col] = frameName;
      }
    }
  }

  setIdle(direction = this.lastDirection) {
    this.isMoving = false;
    this.lastDirection = this.normalizeDirection(direction);
    this.walkCursor = 0;
    this.elapsed = 0;
    this.applyFrame(this.lastDirection, this.idleFrameIndex);
  }

  update(delta, velocityX = 0, velocityY = 0, preferredDirection = null) {
    if (!this.sprite) return;

    const moving = Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01;
    if (!moving) {
      if (this.isMoving) {
        this.setIdle(this.lastDirection);
      } else {
        this.applyFrame(this.lastDirection, this.idleFrameIndex);
      }
      return;
    }

    const nextDirection = this.normalizeDirection(preferredDirection || this.directionFromVelocity(velocityX, velocityY));
    if (!this.isMoving) {
      this.walkCursor = 0;
      this.elapsed = 0;
    }

    this.isMoving = true;
    this.lastDirection = nextDirection;
    this.elapsed += delta;

    const frameDuration = 1000 / this.frameRate;
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      this.walkCursor = (this.walkCursor + 1) % this.walkFrameIndices.length;
    }

    this.applyFrame(this.lastDirection, this.walkFrameIndices[this.walkCursor]);
  }

  applyFrame(direction, col) {
    if (!this.frameWidth || !this.frameHeight) {
      if (!this.refreshFrameSize()) return;
    }

    const row = this.directions[this.normalizeDirection(direction)] ?? this.directions.down ?? 0;
    const frameName = this.frameNames?.[row]?.[col];
    if (frameName) {
      this.sprite.setFrame(frameName);
      this.sprite.setOrigin(this.assetConfig.anchor?.x ?? 0.5, this.assetConfig.anchor?.y ?? 1);
      return;
    }

    this.sprite.setCrop(col * this.frameWidth, row * this.frameHeight, this.frameWidth, this.frameHeight);
  }

  directionFromVelocity(velocityX, velocityY) {
    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      return velocityX < 0 ? 'left' : 'right';
    }
    if (Math.abs(velocityY) > 0) {
      return velocityY < 0 ? 'up' : 'down';
    }
    return this.lastDirection;
  }

  normalizeDirection(direction) {
    if (direction === 'left' || direction === 'right' || direction === 'up' || direction === 'down') {
      return direction;
    }
    return this.lastDirection || 'down';
  }
}
