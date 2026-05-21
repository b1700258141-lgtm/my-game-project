# Modern Odd Jobs Alchemy Sim

现代万事屋 + 炼金术 + 精魂记忆 + 模拟经营叙事游戏项目。

## Current Status

This is a Vite + Phaser prototype. Current systems include player movement, inventory, shop, random visitors, commissions, alchemy cauldron, bookshelf archive, daily summary, furniture upgrades, time progression, and scrollable UI lists.

## Run Locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## AI Agent Rule

Before Codex, CodeBuddy, or any other AI agent modifies this project, it must read `AGENTS.md` first.

## Git Workflow

Recommended update flow:

```bash
git status
git pull --rebase
git checkout -b codex/feature-name
git add <changed-files>
git commit -m "feat: describe feature"
git push -u origin codex/feature-name
```

Do not use `git reset --hard`, `git clean -fd`, or `git push --force` unless the user explicitly authorizes it.

---
# 涓囦簨灞嬬偧閲戠墿璇?

鍍忕礌椋庢牸鐨勭幇浠ｄ竾浜嬪眿妯℃嫙缁忚惀鍙欎簨娓告垙銆?

## 鎶€鏈爤

- Vite 5.x
- Phaser 3.88
- JavaScript (ES Module)

## 椤圭洰缁撴瀯

```
鈹溾攢鈹€ public/
鈹?  鈹斺攢鈹€ assets/           # 缇庢湳璧勬簮鐩綍
鈹?      鈹溾攢鈹€ backgrounds/  # 鑳屾櫙鍥?
鈹?      鈹溾攢鈹€ pixel/        # 鍍忕礌绮剧伒鍥?
鈹?      鈹溾攢鈹€ portraits/    # 瑙掕壊绔嬬粯
鈹?      鈹溾攢鈹€ audio/       # 闊虫晥闊充箰
鈹?      鈹斺攢鈹€ ui/           # UI 璧勬簮
鈹溾攢鈹€ src/
鈹?  鈹溾攢鈹€ scenes/           # 娓告垙鍦烘櫙
鈹?  鈹?  鈹溾攢鈹€ BootScene.js      # 鍚姩鍦烘櫙
鈹?  鈹?  鈹溾攢鈹€ TitleScene.js     # 鏍囬鐣岄潰
鈹?  鈹?  鈹溾攢鈹€ ShopScene.js      # 涓囦簨灞嬩富鍦烘櫙
鈹?  鈹?  鈹溾攢鈹€ DialogueScene.js  # 瀵硅瘽鍦烘櫙
鈹?  鈹?  鈹溾攢鈹€ MemoryScene.js    # 璁板繂鍦烘櫙
鈹?  鈹?  鈹斺攢鈹€ DayEndScene.js    # 鏃ョ粓缁撶畻
鈹?  鈹溾攢鈹€ systems/          # 娓告垙绯荤粺
鈹?  鈹?  鈹斺攢鈹€ GameState.js      # 娓告垙鐘舵€佺鐞?
鈹?  鈹溾攢鈹€ data/             # 鏁版嵁閰嶇疆
鈹?  鈹?  鈹斺攢鈹€ gameConfig.json   # 娓告垙閰嶇疆
鈹?  鈹溾攢鈹€ config.js         # Phaser 閰嶇疆
鈹?  鈹斺攢鈹€ main.js           # 娓告垙鍏ュ彛
鈹溾攢鈹€ index.html
鈹溾攢鈹€ vite.config.js
鈹斺攢鈹€ package.json
```

## 蹇€熷紑濮?

```bash
# 瀹夎渚濊禆
npm install

# 寮€鍙戞ā寮?
npm run dev

# 鐢熶骇鏋勫缓
npm run build

# 棰勮鏋勫缓
npm run preview
```

## 娓告垙鎿嶄綔

- **WASD / 鏂瑰悜閿?*: 绉诲姩瑙掕壊
- **E 閿?*: 涓庣墿浣撲氦浜?
- **绌烘牸閿?*: 鍦ㄥ璇濅腑缁х画

## 褰撳墠宸插疄鐜板姛鑳?

1. **鏍囬鐣岄潰** - 娓告垙鏍囬銆佸紑濮嬫父鎴忔寜閽?
2. **涓囦簨灞嬪満鏅?* - 绾壊鑳屾櫙 + 鍙Щ鍔ㄧ帺瀹舵柟鍧?
3. **鐜╁瑙掕壊** - WASD/鏂瑰悜閿Щ鍔紝鍗犱綅绮剧伒
4. **UI 鏄剧ず** - 鍙充笂瑙掓樉绀哄ぉ鏁般€佽祫閲戙€佷汉姘?
5. **浜や簰绯荤粺** - 闈犺繎鐗╀綋鏄剧ず浜や簰鎻愮ず
6. **棰勭暀鍦烘櫙** - DialogueScene銆丮emoryScene銆丏ayEndScene

## 涓嬩竴姝ヨ鍒?

- [ ] AlchemyScene - 鐐奸噾绯荤粺
- [ ] 鍓ф儏鏁版嵁绯荤粺
- [ ] NPC 濂芥劅搴︾郴缁?
- [ ] 濮旀墭浠诲姟绯荤粺
- [ ] 鍍忕礌缇庢湳璧勬簮

## 鎵╁睍鎸囧崡

### 娣诲姞鏂板満鏅?

1. 鍦?`src/scenes/` 鍒涘缓鏂板満鏅枃浠?
2. 鍦?`src/main.js` 涓鍏ュ苟娉ㄥ唽鍦烘櫙

### 淇敼娓告垙鏁板€?

缂栬緫 `src/data/gameConfig.json`:
- `display`: 娓告垙绐楀彛灏哄
- `player`: 鐜╁閫熷害銆佸昂瀵?
- `initial`: 鍒濆璧勯噾銆佷汉姘?
- `game`: 娓告垙澶╂暟绛?

### 娣诲姞鍓ф儏鏁版嵁

鍦?`src/data/` 涓嬪垱寤?JSON 鏂囦欢锛屾牸寮忓弬鑰冿細
```json
{
  "dialogue": [
    { "name": "瑙掕壊鍚?, "text": "瀵硅瘽鍐呭" }
  ]
}
```

