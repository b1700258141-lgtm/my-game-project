# 现代万事屋炼金叙事经营游戏

临时英文名：Modern Odd Jobs Alchemy Sim

这是一个面向腾讯黑客松风格的现代万事屋 + 炼金术 + 精魂记忆 + 模拟经营叙事游戏项目。

> **重要：Codex、CodeBuddy 或其他 AI Agent 在修改项目之前，必须先完整阅读本 README。项目进度与开发规范以后统一以 README 为准。**

---

## 项目概念

玩家继承家族留下的现代万事屋，通过接待现代来客、接取委托、购买或准备炼金材料、使用炼金釜制作物品、完成委托、获得资金与人气，并逐步解锁寄宿在现代人身上的古代精魂记忆。

当前重点不是扩写正式剧情，而是搭建一个可以跑通的经营 Demo 闭环。

---

## 当前开发状态

项目基于 Vite + Phaser 开发，当前已包含以下系统：

### 核心玩法系统

| 系统 | 状态 | 说明 |
|------|:---:|------|
| 万事屋主场景与玩家移动 | ✅ | WASD / 方向键移动，可交互物体 |
| 时间系统 | ✅ | 现实 1 秒 = 游戏 1 分钟，自动流逝 |
| 昼夜系统 | ✅ | 白天/傍晚/夜晚三时段，遮罩变色 |
| 随机来访 NPC | ✅ | 每日随机 NPC 到访，跨天自动消失 |
| 对话系统 | ✅ | NPC 对话、委托接取、奖励弹窗 |
| 背包系统 | ✅ | 物品堆叠、关键物品标记 |
| 玩家起名系统 | ✅ | 新游戏先输入主角名；旧存档缺名字会补录；后续对话统一显示玩家名；CodeBuddy 已加入本地校验 + 云端审核 |
| 集市商店系统 | ✅ | 玩家与门交互 → 集市 → 购买炼金材料 |
| 委托系统 | ✅ | 长期/短期委托，接取/完成/过期；前十天短期委托刷新池已接入 |
| 炼金釜系统 | ✅ | 4×4 宫格放置、材料形状、品质评分 |
| 床铺交互 | ✅ | 睡 6/12/24 小时跳时间 |
| 每日结算系统 | ✅ | Day End 统计面板 |
| 家具升级系统 | ✅ | 接待台/炼金釜/书架/床/门牌升级 |
| 书架/万事屋档案 | ✅ | 回忆、素材图鉴、产物图鉴、委托记录、关键物品记录、成就 |
| 万事屋等级系统 | ✅ | 根据人气升级 Lv1-Lv5，委托成功收益按等级倍率结算，不降级 |
| 音效系统 (SFX) | ✅ | Kenney CC0 27 个音效文件，SfxManager 统一管理，打开/关闭/确认/购买等音效 |
| BGM 系统 | ✅ | 主菜单 / 白天 BGM / 夜晚 BGM 三时段自动切换 |
| 开场剧情 | ✅ | 打字机效果对话 + 主角立绘 + 可配背景，系统提示框动态定位 |
| ESC 返回主菜单 | ✅ | 主界面 ESC 自动存档到槽位 1 并返回标题；弹窗状态优先关闭弹窗 |
| 昼夜光照渐进系统 | ✅ | 12 关键帧平滑插值，双层渲染（环境光 + 暖色渐变），控制台调试支持 |

### Codex 补充完成的开发进度

以下内容是 CodeBuddy 已写入 README 之外，由 Codex 与用户共同补齐的部分：

1. 迁移并整理了原 `AGENTS.md` 中的核心项目规范，后续 AI Agent 进入项目只需要通读 README。
2. 完整阅读并同步了《游戏开发设定稿.md》的当前设定方向。
3. 补充前十天短期委托刷新池，新增以下现代生活委托：
   - 便利店夜班委托
   - 安神香委托
   - 药房粉末委托
   - 网约车除味委托
   - 小饭馆招客委托
   - 资料室异响委托
4. 新增委托均已录入 `src/data/commissions.json` 与 `src/data/dialogues.json`，并进入短期委托随机刷新池；不会一次性全刷。
5. 接取委托界面只显示“收益”，收益数值使用完美达成的基础收益，但不向玩家暴露“完美达成收益”。
6. 提交物品类委托点击“前往完成”后，会打开物品提交列表，让玩家选择背包中对应品质物品；即使只有一种品质，也走列表。
7. 选项类委托点击“进行任务”后，会打开完成方式列表；隐藏选项只有在背包满足条件时出现。
8. 委托完成时会扣除对应物品或资金，并从委托日志移除/进入完成记录。
9. 未达成/过期委托扣除人气，扣除值不受万事屋等级收益倍率影响。
10. 新增 `src/systems/WanShiWuLevelSystem.js`：
    - `getWanShiWuLevelByPopularity(popularity)`
    - `getCommissionRewardMultiplier(shopLevel)`
    - `applyCommissionReward(baseFunds, basePopularity, shopLevel)`
11. 万事屋等级配置已写入 `src/data/gameConfig.json`：
    - Lv1：倍率 x1
    - Lv2：人气值 > 2000，收益 x3
    - Lv3：人气值 > 10000，收益 x6
    - Lv4：人气值 > 30000，收益 x11
    - Lv5：人气值 > 100000，收益 x21
12. 万事屋等级只升不降；人气变化后、读档/进入游戏、每日结算后会检查升级。
13. 升级时弹出系统提示：`【系统】：万事屋等级提升至LvX！委托收益提高了。`
14. UI 状态栏显示：天数/时间、资金、人气、万事屋等级 LvX。
15. 存档/读档包含 `playerName`、`popularity`、`wanShiWuLevel`、短期委托刷新状态等关键字段。
16. 新游戏会先进入名字输入界面，输入非空且 trim 后的名字才能进入主界面。
17. 对话系统统一将 `player`、`玩家`、`玩家id`、`【玩家id】` 映射为玩家输入的名字，不在对话数据中手写主角名。
18. 已用 `npm run build` 验证构建通过；浏览器预览验证过新游戏名字输入与主界面等级显示。

#### 2026-05-27 Codex 与用户完成进展

1. 重构标题主菜单视觉风格：
   - 将原深蓝冷色面板改为暖棕、米黄、黄昏橙色系。
   - 使用 Phaser Graphics 绘制暖色背景、纸张/木质面板、木牌按钮、炼金釜图标、樱花花瓣、窗格、城市剪影与炼金阵暗纹。
   - 保留“万事屋炼金物语”标题、“Mendel's General Store”副标题、“开始游戏”“继续游戏”和底部版权信息。
2. 修复主菜单加载与 Phaser 图形兼容问题：
   - 将不兼容的 `quadraticCurveTo()` 改为 Phaser 支持的折线贝塞尔近似绘制，避免进入标题场景时报错卡在加载页。
   - 为 BootScene 增加标题场景启动兜底，并在启动前安全注册室内火焰动画。
3. 优化标题主菜单按钮交互：
   - “开始游戏”“继续游戏”改为独立透明 `Zone` 接管点击和 hover。
   - 扩大按钮热区，改善鼠标缓慢移入时 hover/点击不灵敏的问题。
4. 统一游戏画布外层页面氛围：
   - `index.html` 的页面背景由冷深蓝改为暖棕/暖橙/米黄渐变。
   - 游戏容器边框与阴影改为暖色系，减少画布内外割裂。
5. 接入开场白剧情背景图：
   - 新增 `public/assets/backgrounds/opening_general_store_bg.png`，来源为用户提供的 `pix/万事屋背景.png`。
   - OpeningStoryScene 使用该图片作为玩家起名后的开场剧情背景。
   - 背景按 cover 逻辑等比例铺满开场剧情区域，避免强行拉伸，允许轻微边缘裁切。
   - 保留左侧主角立绘预留区、底部暖色对话框和开场剧情结束后进入万事屋主界面的流程。
6. 验证情况：
   - 多次运行 `npm run build`，最终构建通过。
   - 开发服务可访问 `/assets/backgrounds/opening_general_store_bg.png`。

### CodeBuddy 补充完成的开发进度

以下内容由 CodeBuddy 在 `feature/security-system` 分支上完成：

#### 1. 音效系统 (SFX)

- 新增 `src/systems/SfxManager.js`：单例音效管理器，统一管理所有游戏音效
- 新增 `src/data/sfxConfig.js`：音效配置映射表（菜单打开/关闭、确认、取消、购买成功/失败、获得物品、错误提示等）
- 集成 Kenney CC0 免费音效包（`.ogg` 格式），共 27 个音效文件
- 所有 UI 操作（打开背包、炼金、商店、家具升级、对话框等）均已接入对应音效
- 炼金釜打开音效切换为 `bookOpen.ogg`（原 `open_alchemy` 过于刺耳）

#### 2. 背景音乐系统 (BGM)

- 新增 `src/systems/BgmManager.js`：单例 BGM 管理器，支持播放/切换/暂停
- 新增 `src/data/bgmConfig.js`：三时段 BGM 配置
  - 主菜单：`main_menu_so_long_days.mp3`
  - 白天 (6:00-17:59)：`shop_day_asayo.mp3` (solfa - 新しい朝)
  - 夜晚 (18:00-5:59)：`shop_night_tranquility.mp3` (Christina Kuong)
- ShopScene 每帧检测时段变化，自动切换 BGM
- TitleScene 进入时播放主菜单 BGM，首次点击解锁浏览器自动播放限制
- BGM 设置持久化到 localStorage

#### 3. 开场剧情

- 新增 `src/scenes/OpeningStoryScene.js`：新游戏开场的剧情演出场景
- 新增 `src/data/openingStory.js`：开场剧情对话数据
- 支持打字机效果逐字显示
- 左侧预留 220px 主角立绘区域（`/assets/portraits/player_opening.png`）
- 可配置背景图片（`/assets/backgrounds/opening_bg.png`）
- 系统提示框面板高度 320px，确认按钮动态定位在文字下方，不与内容重叠

#### 4. 床铺交互改进

- 新增睡眠次数限制：每天只能睡一次（`hasSleptToday` 标记）
- 已睡过时显示提示"今天已经休息过了"，睡眠按钮仅弹出 toast 提示
- 存档和取消按钮始终可用
- 跨天自动重置睡眠标记（`GameState.nextDay()` 中重置 `hasSleptToday = false`）
- 睡眠过场动画：800ms 黑屏淡出 + 600ms 淡入

#### 5. UI 修复

- **DayEndScene**：修复第一行"今日接待客人"被 viewport 遮罩裁剪的问题；调整 `contentY` 从 -142 → -118，使内容正确位于遮罩范围内
- **FurnitureUpgradeScene**：修复"条件"文字与"升级"按钮重叠，将条件文字移至按钮正下方居中显示
- **ShopScene**：底部快捷键提示新增 `| ESC 主菜单`

#### 6. ESC 返回主菜单

- ShopScene 新增 ESC 键处理逻辑：
  - SLEEP_CHOICE / LOCATION_CHOICE / SHOP 状态 → 优先关闭弹窗回 NORMAL
  - REWARD_POPUP 状态 → 关闭奖励弹窗回 NORMAL
  - TRANSITION 状态 → 恢复 NORMAL
  - NORMAL 状态 → 自动存档到槽位 1 → 跳转到 TitleScene
- 不刷新页面、不重置 GameState、不丢失数据
- 子场景（背包/炼金/委托等）已有独立 ESC 处理，按 ESC 先返回 ShopScene，再按 ESC 才回主菜单

#### 7. 昼夜光照渐进变化系统

- 新增 `src/systems/DayNightLighting.js`：
  - 12 个关键时间节点定义（0:00 / 3:00 / 6:00 / 8:00 / 12:00 / 16:00 / 18:00 / 19:30 / 21:00 / 23:00 / 24:00）
  - `calculateLightingByTime(hour, minute)`：小数小时 + RGB 分量级线性插值
  - 返回参数：overlayColor、overlayAlpha、warmth、brightness
  - `getDayPhaseLabel(hour)`：六时段中文标签（凌晨/清晨/上午/下午/傍晚/夜晚/深夜）
- ShopScene 双层渲染：
  - 环境光层（depth=5）：主色调覆盖层，不阻挡点击（`input.enabled = false`）
  - 暖色渐变层（depth=5.1）：黄昏/清晨微暖色调，仅在 warmth > 0.02 时启用
  - UI 层始终在最前（depth=10），不受光照影响
- 灯笼贴图切换逻辑更新：19:00-5:59 为夜间
- 调试功能：控制台 `window.__debugSetGameTime(h, m)` / `window.__debugGetLighting()`

| 时间段 | 效果 |
|--------|------|
| 0:00-6:00 | 最深夜，深蓝紫 overlay α=0.48-0.52，brightness=0.60-0.62 |
| 6:00-12:00 | 黎明→早晨→正午，α 从 0.28→0，brightness 从 0.78→1.0 |
| 12:00-16:00 | 全天最亮，α=0-0.08，微暖 warmth=0.10-0.35 |
| 16:00-19:00 | 明显黄昏，α=0.08-0.28，暖橙 warmth=0.35-0.55 |
| 19:00-24:00 | 入夜→深夜，α=0.28-0.52，蓝紫夜色 warmth=0.20→0 |

### 当前委托完成规则实现概况

| 委托 | 完成方式 | 备注 |
|------|----------|------|
| 消食片委托 | 提交消食片品质物品 | 通过提交列表选择品质 |
| 寻猫委托 | 选择完成方式 | 招财丸隐藏选项仅持有时出现 |
| 便利店夜班委托 | 选择完成方式 | 驱秽粉隐藏选项仅持有时出现 |
| 安神香委托 | 提交安神香品质物品 | 通过提交列表选择品质 |
| 药房粉末委托 | 提交中药粉末品质物品 | 通过提交列表选择品质 |
| 网约车除味委托 | 提交驱秽粉品质物品 | 无驱秽粉时提示并返回委托日志 |
| 小饭馆招客委托 | 选择完成方式 | 招财丸隐藏选项仅持有时出现 |
| 资料室异响委托 | 选择完成方式 | 驱秽粉/安神香隐藏选项仅持有时出现 |

### 成就系统

| 成就 ID | 名称 | 触发条件 |
|---------|------|---------|
| `achievement_start_revival` | 万事屋复兴开启！ | 首次进入万事屋主场景 |
| `achievement_hidden_quest_solution` | 原来还能这样？ | 预留接口，后续接入 |
| `achievement_popularity_2000` | 小有规模！ | 人气 ≥ 2000 |

- 成就解锁时右下角 3 秒提示，不阻塞操作
- 存档/读档保持成就状态，不重复弹提示

### 安全体系

| 模块 | 文件 | 功能 |
|------|------|------|
| 安全配置 | `src/security/securityConfig.js` | 统一开关，按模块启用/关闭 |
| 起名校验 | `src/security/nameModeration.js` | 本地基础校验（长度/URL/手机号/邮箱/广告/敏感词） |
| 内容安全 Provider | `src/security/contentSafetyProvider.js` | 本地词库 + TMS 云端审核抽象层 |
| 行为检测 | `src/security/behaviorGuard.js` | 人气/资金异常暴涨拦截、委托非法完成检测 |
| 数据校验 | `src/security/dataValidator.js` | 玩家状态净化、背包校验、存档净化、奖励配置校验 |
| 安全委托包装 | `src/security/safeCommissionWrapper.js` | 委托奖励从配置读取（不接受 UI 传入）|
| 安全日志 | `src/security/securityLogger.js` | 脱敏日志，预留 Has-Anonymizer 接口 |
| 敏感词配置 | `src/security/sensitiveWords.local.example.json` | 仅占位示例词，生产环境接 TMS |

### 云服务接入

| 阶段 | 状态 | 说明 |
|------|:---:|------|
| Step 1: Mock 云审核 | ✅ | 本地 mock，前端异步审核流程跑通 |
| Step 2: CloudBase 云函数 + TMS | ✅ | 云函数支持 Mock/TMS 双模式，根据环境变量切换 |
| Step 3: HTTP fetch 接入 | ✅ | 前端改用 HTTP POST 调用，停用 CloudBase SDK |

#### 当前云审核架构

```
前端 PlayerNameScene
  ├─ validatePlayerName()        本地基础校验
  └─ moderatePlayerName()        HTTP POST 云审核
       │
       └─ fetch → https://...app.tcloudbase.com/moderatePlayerName
            │
            ▼ CloudBase HTTP 云函数（ap-shanghai）
            ├─ SECURITY_CLOUD_MOCK=true   → Mock 审核
            └─ TMS_ENABLED=true           → 腾讯云 TMS
```

- CloudBase 环境 ID：`wanshiwu-game-dev-d7dnulbc30e85d`
- TMS 密钥通过云函数环境变量 `TC_SECRET_ID` / `TC_SECRET_KEY` 读取（不在前端）
- 前端的 HTTP URL 不是密钥，可以出现在配置文件中
- 云函数代码位置：`cloudfunctions/moderatePlayerName/`

---

## 技术栈

- **构建工具**：Vite 5.x
- **游戏引擎**：Phaser 3.88
- **语言**：JavaScript ES Module
- **云端**：CloudBase HTTP 访问服务 + 腾讯云 TMS 内容安全
- **审核方式**：前端 fetch HTTP → CloudBase 云函数 → TMS（fail-closed）

---

## 运行项目

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 项目结构

```text
项目根目录/
├── public/                              # 静态资源
├── cloudfunctions/
│   └── moderatePlayerName/
│       ├── index.js                     # 云函数入口（兼容 Mock + TMS + HTTP）
│       └── package.json                 # 云函数 TMS SDK 依赖
├── docs/
│   └── security/
│       ├── README_SECURITY_CLOUD_STEP1.md
│       └── README_SECURITY_CLOUD_STEP2.md
├── src/
│   ├── data/                            # 游戏数据 JSON 配置
│   │   ├── commissions.json             # 委托定义
│   │   ├── dialogues.json               # 对话数据
│   │   ├── gameConfig.json              # 游戏全局配置
│   │   ├── items.json                   # 物品定义
│   │   ├── npcs.json                    # NPC 数据
│   │   ├── shopItems.json               # 商店物品
│   │   ├── shopObjects.json             # 主场景物体布局
│   │   └── visitors.json                # 来访 NPC 配置
│   ├── scenes/                          # Phaser 场景
│   │   ├── AlchemyScene.js              # 炼金釜 4×4 宫格
│   │   ├── BookshelfArchiveScene.js     # 书架档案
│   │   ├── BootScene.js                 # 启动场景
│   │   ├── CommissionListScene.js       # 委托列表（柜台）
│   │   ├── DayEndScene.js               # 每日结算
│   │   ├── DialogueScene.js             # NPC 对话
│   │   ├── FurnitureUpgradeScene.js     # 家具升级
│   │   ├── InventoryScene.js            # 背包
│   │   ├── OpeningStoryScene.js         # 开场剧情演出
│   │   ├── PlayerNameScene.js           # 玩家起名（含云端审核）
│   │   ├── QuestLogScene.js             # 委托日志
│   │   ├── ShopScene.js                 # 万事屋主场景
│   │   └── TitleScene.js                # 标题界面
│   ├── security/                        # 独立安全体系
│   │   ├── cloud/
│   │   │   ├── cloudbaseClient.js       # CloudBase SDK 客户端（已停用）
│   │   │   └── moderatePlayerNameApi.js # 云审核 HTTP fetch 客户端
│   │   ├── behaviorGuard.js             # 异常行为检测
│   │   ├── contentSafetyProvider.js     # 内容安全 Provider 抽象
│   │   ├── dataValidator.js             # 数据交互校验
│   │   ├── index.js                     # 安全模块统一导出
│   │   ├── nameModeration.js            # 玩家起名安全校验
│   │   ├── safeCommissionWrapper.js     # 安全委托包装层
│   │   ├── securityConfig.js            # 安全配置总开关
│   │   ├── securityLogger.js            # 安全日志（脱敏）
│   │   ├── AchievementManager.js        # 成就管理器
│   │   ├── AchievementToastUI.js        # 成就提示 UI
│   │   ├── README_SECURITY.md           # 安全体系文档
│   │   └── sensitiveWords.local.example.json  # 敏感词示例（仅占位）
│   ├── systems/                         # 游戏系统逻辑
│   │   ├── AchievementManager.js        # 成就管理（存档/读档/通知）
│   │   ├── AchievementToastUI.js        # 成就提示框
│   │   ├── AlchemyMaterialShapeConfig.js
│   │   ├── AlchemyRecipeManager.js
│   │   ├── ArchiveManager.js            # 书架档案数据管理
│   │   ├── BgmManager.js                 # BGM 管理器（三时段自动切换）
│   │   ├── CommissionSystem.js          # 委托系统
│   │   ├── DailyLoopManager.js          # 每日循环管理
│   │   ├── DayNightLighting.js           # 昼夜光照计算（12 关键帧平滑插值）
│   │   ├── FurnitureUpgradeManager.js   # 家具升级
│   │   ├── GameState.js                 # 游戏状态管理
│   │   ├── InventorySystem.js           # 背包物品
│   │   ├── ItemSystem.js                # 物品定义查询
│   │   ├── RandomNpcManager.js          # 随机 NPC
│   │   ├── SaveLoadManager.js           # 存档/读档（30 槽位）
│   │   ├── ScrollableListUI.js          # 通用滚动列表组件
│   │   ├── SfxManager.js                # 音效管理器（Kenney CC0）
│   │   ├── SpiritMemoryManager.js       # 精魂记忆
│   │   ├── TimeManager.js               # 游戏时间管理
│   │   ├── VisitorSystem.js             # 来访管理
│   │   └── WanShiWuLevelSystem.js       # 万事屋等级
│   ├── ui/                              # UI 主题
│   │   └── WarmUITheme.js               # 暖色 UI 主题（面板/按钮/标签）
│   ├── config.js                        # Phaser 配置
│   └── main.js                          # 游戏入口
├── .env.example                         # 环境变量占位示例
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md                            # 本文件
```

---

## 重要开发规范

本项目原 `AGENTS.md` 的核心内容已迁移到 README。本节是 AI Agent 进入项目后必须遵守的开发规范。

### AI Agent 必做第一步

每次进入项目或准备修改项目时，必须先执行：

1. 完整阅读 `README.md`。
2. 总结与当前任务相关的项目规则。
3. 运行 `git status --short`。
4. 检查当前分支。
5. 确认工作区是否干净。
6. 只在理解现有改动后开始工作。

### 核心叙事规则

- 不要擅自编写正式 NPC 对话。
- 不要擅自编写正式古代精魂记忆文本。
- 不要擅自编写正式结局内容。
- 不要擅自编写正式主线剧情、家族身世或详细中国文化 lore。
- 如果需要占位文本，使用明显占位：
  - `【占位 NPC 对话，后续由用户补充】`
  - `【古代精魂记忆文本待补充】`
  - `【委托描述待补充】`
  - `【素材说明待补充】`
  - `【产物说明待补充】`
  - `【关键物品说明待补充】`
  - `【主线线索待补充】`
- NPC 应保持现代、接地气，例如厨师、公司老板、律师、司机、学生、办公室职员、店员、房东、快递员。
- 避免奇幻冒险者式 NPC，例如游吟诗人、法师、骑士、冒险者。

### 系统开发规则

- 不要破坏背包、商店、炼金、委托、书架、每日结算等已有系统。
- 不要创建职责重复的 Manager。
- 不要删除已有功能。
- 不要做与任务无关的大重构或大范围格式化。
- UI 状态下玩家通常不能移动；关闭 UI 后应回到 normal，避免黑屏、卡输入、多个全屏 UI 意外堆叠。
- 所有长列表都应支持滚动，包含炼金列表、商店列表、家具升级列表、书架档案列表、委托列表。
- 提交物品类委托必须打开提交列表，不能直接自动提交。
- 委托达成条件不直接暴露给玩家，玩家只通过最终资金和人气变化推断完成档位。
- 接取委托界面只显示“收益”，不要写“完美达成收益”。
- 炼金釜玩家可见文本必须叫“炼金釜”，不要写旧名“炼金缸”。
- 产物图鉴按基础产物去重，不因品质生成多条图鉴。
- 完成委托进入书架委托记录，进行中的委托才出现在 J 键委托日志。
- 家具升级必须真实扣钱、真实记录等级，不要只做 UI 假升级。
- 每日结算应来自 DailyStats，避免固定假数据。

### 删除与文件安全规则

- 严禁批量删除文件或目录。
- 禁止使用或变相使用 `rm -rf`、`rm -r`、`del /s`、`rmdir /s`、`Remove-Item -Recurse`、清空文件夹、删除通配符匹配结果。
- 如确实需要删除文件，只能一次删除一个“用户明确指定的完整路径文件”。
- 删除前必须向用户展示将要删除的完整路径，并请求确认。
- 未经确认，不得执行删除操作。
- 如果任务需要删除多个文件、整个文件夹、通配符结果或任何批量清理，必须停止并请求明确授权。
- 不确定是否属于批量删除时，默认视为批量删除并询问用户。
- 不要为了“清理环境”“重新安装”“修复错误”自行删除目录或大量文件。

### Git 与协作规则

- 不要提交 `node_modules/`、`dist/`、日志、环境文件、模型权重或密钥。
- **不要在前端写入 `TC_SECRET_ID` / `TC_SECRET_KEY` / `SecretId` / `SecretKey`。**
- 项目可能由用户、Codex、CodeBuddy 同时修改，必须避免覆盖他人工作。
- 修改前先看工作区状态；不要回滚或覆盖你没有做的改动。
- 推荐分支命名：`codex/feature-name`、`codebuddy/feature-name`、`fix/bug-name`、`review/feature-name`。
- 禁止使用 `git reset --hard`、`git clean -fd`、`git push --force`，除非用户明确授权。
- 每次完成任务后报告：当前分支、修改文件、新增文件、变更摘要、测试、已知问题。

### 起名审核流程

```
玩家输入名字 → 点击"开始经营万事屋"
  │
  ├─ validatePlayerName()         ← 本地基础校验
  │    · 空值 / 长度 1-12 / 纯数字 / 纯符号 / URL / 手机号 / 邮箱
  │
  └─ moderatePlayerName()         ← HTTP POST 云审核（fail-closed）
       │
       ├─ pass   → savePlayerName → 进入游戏
       ├─ block  → 提示 → 停留
       └─ 异常   → 提示"审核暂不可用" → 停留
```

### 安全模块开关

修改 `src/security/securityConfig.js`：

```js
// Mock 模式（离线开发）
cloudModeration: { mockEnabled: true }

// HTTP 云函数模式（正常模式，当前默认）
cloudModeration: { mockEnabled: false }
```

---

## 部署云函数

```bash
# 进入云函数目录安装依赖
cd cloudfunctions/moderatePlayerName
npm install

# 打包并上传至 CloudBase 控制台 → 云函数
# 或通过 CloudBase CLI 部署
```

---

## Git 协作方式

推荐每次功能开发使用独立分支：

```bash
git status
git pull --rebase
git checkout -b codex/feature-name
git add <changed-files>
git commit -m "feat: describe feature"
git push -u origin codex/feature-name
```

不要使用以下命令，除非用户明确授权：

```bash
git reset --hard
git clean -fd
git push --force
```

---

## 编码说明

仓库文本文件统一使用 UTF-8。`.gitattributes` 已约束常见文本文件使用 LF 行尾，避免 Windows 环境下再次出现乱码或行尾混乱。
