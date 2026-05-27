说明：

1. source_1x/ 里面是从你上传的原始 spritesheet 直接裁出的透明 PNG，保留原始 alpha。
2. source_4x_preview/ 是同一批素材的 x4 最近邻放大版本，方便直接预览或临时替换。
3. fixed_from_uploaded_crop/ 是对你之前单独裁出来的 PNG 做“边缘连通背景移除”的兜底版本，主要用于没有在当前可见源图里找到完全同款的 door 和 lantern2。
4. alternatives/ 里放了一个 atlas_16x 里的门候选，但它和你上传的门并非完全同款。
5. manifest.csv / manifest.json 记录了来源图、裁切坐标、尺寸和 alpha 检查。

注意：如果要让游戏完全统一比例，建议在代码里使用 source_1x，然后由游戏渲染层用 nearest-neighbor 放大/缩小；不要用截图工具再裁。
