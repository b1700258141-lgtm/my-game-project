# 音效素材授权记录 (LICENSES.md)

> 最后更新: 2026-05-27
> 项目: 万事屋炼金物语 (Modern Odd Jobs Alchemy Sim)
>
> 所有音效文件位于 `public/assets/audio/sfx/` 目录 (.ogg 格式)。
>
> **授权来源**: Kenney 免费公开授权素材
> **授权类型**: CC0 1.0 Universal (Public Domain)
> **官方声明**: "These assets are all CC0 licensed, which means they're free to use in any project, commercial or otherwise."
> **Kenney 网站**: https://kenney.nl/
>
> ✅ 可商用，无需署名，无使用限制。

---

## 素材包来源

| 素材包 | 路径 | 许可证文件 |
|--------|------|-----------|
| kenney_interface-sounds | `bgm/kenney_interface-sounds/` | License.txt (CC0) |
| kenney_rpg-audio | `bgm/kenney_rpg-audio/` | License.txt (CC0) |
| kenney_impact-sounds | `bgm/kenney_impact-sounds/` | License.txt (CC0) |

---

## 文件对应关系 (最终文件 ← 源文件)

### UI 類 (7)

| 最终文件 | 源文件 | 来源包 |
|----------|--------|--------|
| `open_menu.ogg` | `maximize_001.ogg` | kenney_interface-sounds |
| `close_menu.ogg` | `minimize_001.ogg` | kenney_interface-sounds |
| `click_button.ogg` | `click_003.ogg` | kenney_interface-sounds |
| `hover_button.ogg` | `tick_001.ogg` | kenney_interface-sounds |
| `confirm.ogg` | `confirmation_003.ogg` | kenney_interface-sounds |
| `cancel.ogg` | `back_001.ogg` | kenney_interface-sounds |
| `error.ogg` | `error_004.ogg` | kenney_interface-sounds |

### 物品類 (6)

| 最终文件 | 源文件 | 来源包 |
|----------|--------|--------|
| `buy_item.ogg` | `handleCoins.ogg` | kenney_rpg-audio |
| `buy_fail.ogg` | `error_005.ogg` | kenney_interface-sounds |
| `receive_item.ogg` | `select_003.ogg` | kenney_interface-sounds |
| `submit_item.ogg` | `drop_002.ogg` | kenney_interface-sounds |
| `select_item.ogg` | `click_002.ogg` | kenney_interface-sounds |
| `use_item.ogg` | `glass_003.ogg` | kenney_interface-sounds |

### 委托類 (3)

| 最终文件 | 源文件 | 来源包 |
|----------|--------|--------|
| `quest_accept.ogg` | `confirmation_002.ogg` | kenney_interface-sounds |
| `quest_complete.ogg` | `bong_001.ogg` | kenney_interface-sounds |
| `reward.ogg` | `handleCoins2.ogg` | kenney_rpg-audio |

### 炼金類 (8)

| 最终文件 | 源文件 | 来源包 | 备注 |
|----------|--------|--------|------|
| `open_alchemy.ogg` | `open_002.ogg` | kenney_interface-sounds | |
| `add_material.ogg` | `drop_001.ogg` | kenney_interface-sounds | |
| `remove_material.ogg` | `select_005.ogg` | kenney_interface-sounds | |
| `alchemy_start.ogg` | `metalPot2.ogg` | kenney_rpg-audio | 金属锅/药锅启动声 |
| `alchemy_loop.ogg` | `impactGlass_medium_002.ogg` | kenney_impact-sounds | ⚠️ 占位 - 建议替换为真正循环气泡/炉火声 |
| `alchemy_success.ogg` | `impactBell_heavy_001.ogg` | kenney_impact-sounds | |
| `alchemy_fail.ogg` | `error_006.ogg` | kenney_interface-sounds | |
| `high_quality_result.ogg` | `impactGlass_light_000.ogg` | kenney_impact-sounds | |

### 剧情類 (3)

| 最终文件 | 源文件 | 来源包 |
|----------|--------|--------|
| `clue_found.ogg` | `question_003.ogg` | kenney_interface-sounds |
| `memory_trigger.ogg` | `impactBell_heavy_003.ogg` | kenney_impact-sounds |
| `key_item_get.ogg` | `confirmation_004.ogg` | kenney_interface-sounds |

---

## 格式说明

所有源文件为 `.ogg` (Vorbis) 格式，直接使用而未转换。`sfxConfig.js` 中路径已同步更新为 `.ogg` 扩展名。后续如需 `.wav` 格式，可用 Audacity 批量转换。

---

## 需要署名？

否。Kenney 素材均为 CC0 (Public Domain)，无需署名。但建议在游戏 Credits 中写下感谢:

> Sound effects: Kenney (kenney.nl) - CC0 Licensed
