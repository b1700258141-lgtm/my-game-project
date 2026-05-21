# AGENTS.md

## 1. Project Name

现代万事屋炼金叙事经营游戏

Temporary English name:

Modern Odd Jobs Alchemy Sim

This project is being developed for a Tencent Hackathon-style narrative game project.

All AI agents must read this file before modifying the project.

---

## 2. Core Game Concept

This is a modern pixel-style business simulation and narrative game.

The player inherits a family-run modern “万事屋” and gradually revives it through:

- receiving modern visitors
- accepting commissions
- buying or collecting alchemy materials
- crafting items with an alchemy cauldron
- completing quests
- unlocking ancient spirit memories
- upgrading furniture and shop facilities
- discovering family secrets

The core fantasy is:

Modern everyday NPCs may carry ancient spirits inside them.

The player solves their modern problems through alchemy and gradually unlocks fragments of ancient Chinese cultural memories.

---

## 3. Visual and Gameplay Style

The intended style is:

- pixel-style main room scene
- controllable pixel player character
- 2D character portraits during dialogue
- simulation-management loop inspired by Kairosoft-style games
- light UI feedback
- day-by-day business progression

Current main UI should show:

- current day and time
- money
- popularity
- possibly shop level or furniture progression

---

## 4. Important Narrative Rule

Do not write final story content unless the user explicitly asks.

AI agents must not autonomously create:

- formal NPC dialogue
- formal ancient spirit memory text
- final main story text
- final ending text
- detailed Chinese cultural lore entries

If placeholder text is needed, use obvious placeholders:

- 【占位 NPC 对话，后续由用户补充】
- 【古代精魂记忆文本待补充】
- 【委托描述待补充】
- 【素材说明待补充】
- 【产物说明待补充】
- 【关键物品说明待补充】
- 【主线线索待补充】

NPCs should be modern and grounded, such as:

- restaurant chef
- company owner
- lawyer
- driver
- student
- office worker
- shop clerk
- landlord
- courier

Avoid fantasy-style NPCs such as wandering poets, mages, knights, or fantasy adventurers.

---

## 5. Current Core Systems

The project may contain or is expected to contain these systems:

### Player and Main Scene

- player movement
- main 万事屋 scene
- interactable furniture
- interactable door
- interactable bed
- interactable bookshelf
- interactable alchemy cauldron

### Game State

Expected states include:

- normal
- dialogue
- inventory
- questList
- alchemy
- shop
- sleepChoice
- locationChoice
- rewardPopup
- dailySummary
- furnitureUpgrade
- bookshelf
- archive
- transition

Rules:

- normal: player can move
- UI states: player usually cannot move
- after closing UI, return to normal unless another explicit state is active
- avoid black screen and stuck state bugs

### Time System

Game time target:

- real 1 minute = game 1 hour
- real 1 second = game 1 minute
- game should continue progressing while the player is idle in normal state
- time may pause in UI states

The clock should display:

第 X 天 HH:MM

Bed interaction allows skipping time:

- 6 hours
- 12 hours
- 1 day

Sleeping or natural time crossing into the next day should notify daily systems and random NPC systems.

---

## 6. Daily Business Loop

The project goal is to support a complete one-day business loop:

1. start the day
2. show current day, time, money, popularity
3. random visitor may arrive
4. player talks to NPC
5. player accepts commission
6. player buys or prepares materials
7. player uses alchemy cauldron
8. player crafts requested item
9. player submits commission
10. player earns money and popularity
11. daily stats record progress
12. player sleeps
13. daily summary appears
14. player enters next day
15. player upgrades furniture with earned money

This complete loop is more important than adding many isolated features.

---

## 7. Inventory System

Inventory should store real data, not just UI display.

Expected item fields:

- itemId
- itemName
- itemType
- itemCount
- itemDescription
- isKeyItem
- sourceNpcId
- quality, if item is an alchemy product

Common item types:

- alchemyMaterial
- alchemyProduct
- questItem
- keyItem
- normalItem

Rules:

- same itemId should stack unless quality or design requires separation
- alchemy products may have quality-specific itemIds
- key items should be recorded in the archive system
- inventory changes should notify UI and archive systems when needed

---

## 8. Shop System

The market shop can sell alchemy materials.

Current or expected materials include:

- 甲壳虫
- 萝卜
- 风铃草
- 狗尾巴草
- 夜露
- 旧铜钱

Suggested itemIds:

- material_beetle
- material_carrot
- material_bellflower
- material_foxtail_grass
- material_night_dew
- material_old_coin

Rules:

- buying item should reduce money
- insufficient money should prevent purchase
- purchased item must enter InventoryManager
- do not allow negative money
- shop list should support scrolling

---

## 9. Alchemy Cauldron System

The object should be named 炼金釜 in player-facing text.

The old name 炼金缸 should not appear in UI text.

Alchemy cauldron opens a 4x4 grid.

Materials have footprint shapes.

Material shape config should be data-driven and not hardcoded into UI logic.

Current material shapes:

### 萝卜

itemId:

material_carrot

cells:

- [0, 0]
- [1, 0]

Total cells: 2

### 狗尾巴草

itemId:

material_foxtail_grass

cells:

- [0, 0]
- [0, 1]
- [1, 0]
- [1, 1]

Total cells: 4

### 风铃草

itemId:

material_bellflower

cells:

- [0, 0]
- [0, 1]
- [0, 2]

Total cells: 3

### 甲壳虫

itemId:

material_beetle

cells:

- [0, 0]
- [0, 1]
- [0, 2]
- [1, 0]
- [1, 1]
- [1, 2]
- [2, 0]

Total cells: 7

### 夜露

itemId:

material_night_dew

cells:

- [0, 0]
- [1, 0]
- [1, 1]

Total cells: 3

### 旧铜钱

itemId:

material_old_coin

cells:

- [0, 0]

Total cells: 1

---

## 10. Current Alchemy Scoring Rule

Use the latest scoring rule.

Do not use older scoring rules.

Scoring is based on the final grid cell state.

Rules:

- empty cell: 0 points
- a cell occupied by exactly 1 material: 2 points
- a cell occupied by 2 or more materials: total 1 point
- a stacked cell still gives only 1 point, no matter how many materials overlap there

maxScore:

sum of all material footprint cells × 2

quality ratio:

currentScore / maxScore

Quality:

- ratio == 1: perfect / 完美品质
- ratio >= 0.8 and < 1: excellent / 优秀品质
- ratio >= 0.4 and < 0.8: normal / 普通品质
- ratio < 0.4: poor / 劣等品质

Examples:

消食片:
萝卜 2 + 狗尾巴草 4 + 风铃草 3 = 9 cells
maxScore = 18

中药粉末:
甲壳虫 7 + 狗尾巴草 4 = 11 cells
maxScore = 22

安神香:
风铃草 3 + 夜露 3 = 6 cells
maxScore = 12

招财丸:
萝卜 2 + 旧铜钱 1 = 3 cells
maxScore = 6

驱秽粉:
甲壳虫 7 + 风铃草 3 + 狗尾巴草 4 = 14 cells
maxScore = 28

---

## 11. Current Alchemy Recipes

Current recipes:

### 消食片

Materials:

- material_carrot
- material_foxtail_grass
- material_bellflower

Result baseId:

digestive_tablet

### 中药粉末

Materials:

- material_beetle
- material_foxtail_grass

Result baseId:

herbal_powder

### 安神香

Materials:

- material_bellflower
- material_night_dew

Result baseId:

calming_incense

### 招财丸

Materials:

- material_carrot
- material_old_coin

Result baseId:

fortune_pill

### 驱秽粉

Materials:

- material_beetle
- material_bellflower
- material_foxtail_grass

Result baseId:

cleansing_powder

Recipe matching:

- ignore material order
- exact material set required
- no extra materials for now
- invalid combination should not consume materials

Alchemy success:

- consume each required material x1
- add one quality-specific product to inventory
- unlock product archive by base product name, not by quality

---

## 12. Product Archive Rule

Product archive records base products only.

Do not create separate archive entries for different qualities.

Example:

Inventory may contain:

- 劣等品质 消食片
- 普通品质 消食片
- 优秀品质 消食片
- 完美品质 消食片

Product archive should show only:

- 消食片

It may track:

- firstCraftedQuality
- bestQualityCrafted
- craftedCount

---

## 13. Quest System

Quest status should be separated:

- notAccepted
- inProgress
- readyToSubmit
- completed
- expired

Rules:

- accepting quest only changes status to inProgress
- do not auto-complete on accept
- completed quests go to bookshelf quest records
- inProgress quests appear in J key quest list
- completed quests should not appear in current inProgress list
- quest completion should require explicit submit/check logic

---

## 14. Bookshelf Archive System

Bookshelf should open a cabinet-like archive UI.

Tabs:

1. 回忆
2. 素材图鉴
3. 产物图鉴
4. 委托记录
5. 关键物品记录

Rules:

### 回忆

Show ancient spirit memories that are:

- unlocked
- viewed

Do not write formal memory text automatically.

### 素材图鉴

Unlock when player first obtains material.

Show:

- name
- type
- description placeholder
- shape cells
- first unlocked day
- source

### 产物图鉴

Unlock when alchemy product is crafted.

Deduplicate by base product name.

### 委托记录

Show only completed quests.

### 关键物品记录

Show key story items acquired from:

- NPC
- quest
- spiritMemory
- alchemy
- storyNode
- debug

Key item records should support culturalTag.

Example culturalTag:

中国传统饮食文化

Do not write final cultural lore unless user asks.

---

## 15. Chinese Cultural Narrative Direction

Future narrative direction:

Ancient spirit memories should include Chinese traditional cultural elements.

Example design direction:

A modern restaurant chef commission may unlock a memory related to the ancient imperial kitchen.

That memory may unlock a key archive item about a famous dish served in the imperial kitchen.

Current implementation should only provide data structures and placeholders.

Do not write the final imperial kitchen story or dish explanation.

Use placeholders:

- 御膳房记忆占位
- 御膳房名菜占位
- 【古代精魂记忆文本待补充】
- 【关键物品说明待补充】

---

## 16. Furniture Upgrade System

Furniture upgrade is part of player positive feedback.

Furniture candidates:

- 接待台
- 炼金釜
- 书架
- 床
- 门牌

Furniture UI should show:

- furniture name
- current level
- current effect
- next level effect
- upgrade cost
- upgrade button

Rules:

- sufficient money: upgrade and deduct money
- insufficient money: show warning
- no negative money
- upgrading should persist in runtime data
- do not fake upgrade only in UI

Furniture upgrades support long-term progression.

---

## 17. Daily Summary System

Daily summary should appear when the day ends.

It should show:

- day ended
- visitors met
- quests accepted
- quests completed
- alchemy count
- perfect alchemy count
- money earned
- money spent
- popularity gained
- items gained
- items consumed
- spirit memory progress placeholder

Do not show only fixed fake data.
Use DailyStats when possible.

---

## 18. Scrollable UI List Rule

All long lists should support scrolling.

Applies to:

- alchemy material list
- alchemy placed material list
- alchemy recipe/product preview list
- shop item list
- furniture upgrade list
- bookshelf archive lists
- quest lists

Rules:

- use mouse wheel to scroll
- show right-side scrollbar
- allow dragging scrollbar
- clear old list items before refreshing
- avoid duplicated UI entries
- avoid button event duplicate binding
- do not let list items stack on top of each other
- reset scroll position when switching tabs unless intentionally preserving it

---

## 19. UI Safety Rules

Before opening a major UI, ensure other major UIs are closed or blocked.

Major UIs include:

- inventory
- dialogue
- quest list
- alchemy
- shop
- bookshelf/archive
- furniture upgrade
- daily summary
- reward popup
- sleep choice
- location choice

Rules:

- UI open: player usually cannot move
- UI close: return to normal
- do not allow black screen
- do not allow stuck input state
- do not allow multiple full-screen UIs stacked accidentally

---

## 20. Git and Collaboration Rules

This project may be modified by both Codex and CodeBuddy.

Always avoid overwriting another agent's work.

Before modifying:

1. read AGENTS.md
2. run git status
3. inspect current branch
4. inspect recent changes if necessary
5. avoid unrelated formatting
6. avoid deleting unknown files
7. avoid large refactors unless explicitly requested

Recommended branch naming:

- codex/feature-name
- codebuddy/feature-name
- fix/bug-name
- review/feature-name

Never use:

- git reset --hard
- git clean -fd
- git push --force

unless explicitly authorized by the user.

For each completed task, report:

- branch name
- files changed
- new files
- summary of changes
- tests performed
- known remaining issues

---

## 21. Forbidden Actions

Do not:

- write final story content without user instruction
- write final NPC dialogue without user instruction
- write final ancient spirit memory text without user instruction
- write final Chinese cultural lore entries without user instruction
- break existing inventory system
- break existing shop system
- break existing alchemy system
- break existing quest system
- break existing bookshelf archive system
- break existing daily summary system
- create duplicate managers for the same responsibility
- commit large generated folders
- commit local model files
- commit credentials
- delete files blindly
- do broad reformatting unrelated to the task

---

## 22. Required First Step For Future Agents

Every future AI agent must begin with:

1. Read AGENTS.md.
2. Summarize relevant project rules.
3. Run git status.
4. Check current branch.
5. Confirm whether the working tree is clean.
6. Only then begin task work.
