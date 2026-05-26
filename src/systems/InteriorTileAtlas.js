export const TILE_SIZE = 32;

export const INTERIOR_ATLAS = {
  key: 'srwInteriorAtlas32',
  columns: 48,
  tileSize: TILE_SIZE
};

export const FANCY_FURNITURE = {
  key: 'fancyMansionFurniture32',
  columns: 13,
  tileSize: TILE_SIZE
};

export const FANCY_DOOR_TILES = {
  key: 'fancyMansionDoorTiles32',
  columns: 18,
  tileSize: TILE_SIZE
};

export function getTile(col, row, atlas = INTERIOR_ATLAS) {
  return row * atlas.columns + col;
}

export function drawTile(scene, col, row, x, y, options = {}) {
  const atlas = options.atlas || INTERIOR_ATLAS;
  const tile = scene.add.image(x, y, atlas.key, getTile(col, row, atlas))
    .setOrigin(0)
    .setDepth(options.depth ?? 0);

  if (options.scale) {
    tile.setScale(options.scale);
  }

  return tile;
}

export function drawTileBlock(scene, atlas, pattern, startX, startY, options = {}) {
  const tileSize = (atlas.tileSize || TILE_SIZE) * (options.scale || 1);
  const sprites = [];

  pattern.forEach((rowTiles, rowIndex) => {
    rowTiles.forEach((tileRef, colIndex) => {
      if (!tileRef) return;
      const [col, row] = tileRef;
      sprites.push(drawTile(
        scene,
        col,
        row,
        startX + colIndex * tileSize,
        startY + rowIndex * tileSize,
        { ...options, atlas }
      ));
    });
  });

  return sprites;
}
