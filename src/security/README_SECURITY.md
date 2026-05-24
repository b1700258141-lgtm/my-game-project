# 万事屋炼金物语 - 游戏安全体系

## 概述

独立于业务逻辑的游戏安全模块集合，实现玩家起名校验、敏感词屏蔽、异常行为识别、数据交互校验等功能。

## 目录结构

```
src/security/
├── securityConfig.js              # 安全配置（总开关 + 各模块开关）
├── nameModeration.js              # 玩家起名安全校验
├── contentSafetyProvider.js       # 内容安全服务抽象层（本地 + TMS 占位）
├── behaviorGuard.js               # 异常行为识别
├── dataValidator.js               # 数据交互校验 + 存档净化
├── safeCommissionWrapper.js       # 安全委托完成包装层
├── securityLogger.js              # 安全日志
├── sensitiveWords.local.example.json  # 敏感词本地示例配置
└── README_SECURITY.md             # 本文件
```

## 模块说明

### 1. securityConfig - 安全配置

统一控制所有安全模块的开关。

- `enabled` — 总开关
- `nameModeration` — 起名校验策略（长度、敏感词、广告检测）
- `behaviorGuard` — 行为检测阈值（人气涨幅上限、资金涨幅上限）
- `dataValidator` — 数据校验开关（存档净化等）
- `contentSafety` — 内容安全Provider配置（local / tms / disabled）

### 2. nameModeration - 起名安全校验

校验规则：
1. trim 去除前后空格
2. 不能为空
3. 长度 1-12 字符
4. 禁止纯数字 / 纯特殊符号
5. 禁止广告引流（URL、手机号、邮箱、QQ号/微信号引流）
6. 禁止敏感词

### 3. contentSafetyProvider - 内容安全服务

- `LocalContentSafetyProvider`：本地词库检测
- `TmsContentSafetyProvider`：腾讯云 TMS 占位，生产环境需通过后端代理调用

### 4. behaviorGuard - 行为检测

检测场景：
- 人气值异常暴涨（单次 > 100000）
- 资金异常暴涨（单次 > 1000000）
- 委托非法完成（未接取/已过期）
- 背包物品数量异常
- 游戏天数回退

### 5. dataValidator - 数据校验

- `sanitizePlayerState()` — 玩家状态净化
- `validateInventoryItem()` — 背包物品合法性检查
- `getCommissionRewardFromConfig()` — 从配置读取委托奖励（不接受 UI 传入）
- `sanitizeSaveData()` — 存档加载时净化

### 6. safeCommissionWrapper - 委托安全包装

提供 `safeCompleteCommission()` 函数，流程：
1. 校验委托ID和玩家状态
2. 校验过期状态
3. 从配置读取奖励
4. 发放奖励前做行为检测
5. 记录安全日志

### 7. securityLogger - 安全日志

- 只记录必要信息，避免完整隐私
- 预留 `anonymizeText()` 接口（后续可接入 Has-Anonymizer）

## 如何启用/关闭

### 总开关

```js
import { setSecurityEnabled } from './security/securityConfig';
setSecurityEnabled(false); // 关闭安全体系
```

### 模块级开关

在 `securityConfig.js` 中修改对应模块的 `enabled` 字段：

```js
SecurityConfig.nameModeration.enabled = false;    // 关闭起名校验
SecurityConfig.behaviorGuard.enabled = false;      // 关闭行为检测
SecurityConfig.dataValidator.enabled = false;      // 关闭数据校验
SecurityConfig.contentSafety.provider = 'disabled'; // 关闭内容审核
```

## 接入点

### 已接入

| 接入位置 | 文件 | 行号 | 说明 |
|---------|------|------|------|
| 玩家起名校验 | `PlayerNameScene.js` | `confirmName()` | 在确认名字前调用 `validatePlayerName()` |
| 存档加载净化 | `SaveLoadManager.js` | `applySaveData()` | 加载存档后执行数据净化 |

### 预留接口（未接入业务代码）

| 接口 | 文件 | 说明 |
|------|------|------|
| `safeCompleteCommission()` | `safeCommissionWrapper.js` | 委托完成安全包装，待业务代码调用 |
| `validatePlayerNameAsync()` | `nameModeration.js` | 异步起名校验（支持云端TMS审核） |
| `TmsContentSafetyProvider` | `contentSafetyProvider.js` | 腾讯云TMS云端审核占位 |

## 测试方法

### 玩家起名敏感词屏蔽

```js
// 在浏览器控制台测试
import { validatePlayerName } from './src/security/nameModeration';

// 测试正常名字
validatePlayerName('张三');         // { valid: true }

// 测试空名
validatePlayerName('');             // { valid: false, errorMessage: '名字不能为空' }

// 测试过长名字
validatePlayerName('这是一个超过十二个字符的非常长的名字'); // { valid: false }

// 测试含 URL
validatePlayerName('visitor_www.example.com'); // { valid: false }

// 测试含手机号
validatePlayerName('小明13800138000'); // { valid: false }

// 测试纯数字
validatePlayerName('12345678');     // { valid: false }
```

### 委托奖励防篡改

```js
import { safeCompleteCommission } from './src/security/safeCommissionWrapper';

const result = safeCompleteCommission({
  commissionId: 'comm_001',
  gameState: window.gameState,
});
// result.reward.funds 和 result.reward.popularity 从配置读取，不接受 UI 传入
```

### 存档净化

```js
import { sanitizeSaveData } from './src/security/dataValidator';

const dirtySave = { money: Infinity, popularity: -100 };
const cleanSave = sanitizeSaveData(dirtySave);
// cleanSave.money === 0, cleanSave.popularity === 0
```

## 外部安全工具建议

### EdgeOne 安全加速

- 上线后保护网页/API入口
- WAF、DDoS/CC 防护、Bot 管理、速率限制
- 适合网页版游戏、云存档、排行榜接口
- 不适合代替本地昵称敏感词检测或游戏内部数据校验

### Has-Anonymizer

- 日志发送给AI前做匿名化
- 隐藏手机号、邮箱、人名等隐私信息
- 适合调试日志脱敏、AI分析前隐私保护
- 不适合代替鉴权、WAF、Bot防护、委托奖励校验

### 腾讯云文本内容安全 TMS

- 玩家昵称审核、自定义词库
- 本次已做 Provider 抽象层 (`TmsContentSafetyProvider`)
- SecretId / SecretKey 不应写入前端
- 真实接入时应通过后端代理调用

## 注意事项

1. 本地敏感词配置仅包含示例占位词，生产环境请接入 TMS 或外部合规词库
2. 所有安全模块均可单独启用/关闭，不影响业务逻辑
3. 安全日志经过基础脱敏处理，避免记录完整隐私
4. 行为检测仅记录和阻止异常操作，不执行封号等强制措施
5. 本安全体系独立于业务系统，文件均可单独回滚
