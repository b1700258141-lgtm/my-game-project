# 云服务接入第二步：CloudBase 云函数 + TMS 双模式

## 一、本阶段完成了什么

1. **云函数完整实现**：`cloudfunctions/moderatePlayerName/index.js` 支持 Mock / TMS 双模式
2. **云函数依赖管理**：`cloudfunctions/moderatePlayerName/package.json`（TMS SDK）
3. **CloudBase Web SDK 接入**：`@cloudbase/js-sdk` 前端调用云函数
4. **CloudBase 客户端**：`src/security/cloud/cloudbaseClient.js` 懒加载单例
5. **前端统一审核入口**：`moderatePlayerName()` 优先 CloudBase SDK → 回退 Mock
6. **UI 交互优化**：按钮 loading 状态、防重复提交
7. **安全配置**：`securityConfig.js` 默认走 CloudBase（`mockEnabled: false`）

## 二、架构总览

```
前端（PlayerNameScene）
  │
  ├─ validatePlayerName()        ← 本地基础校验（同步）
  │    ├─ 空值 / 长度
  │    ├─ 纯数字 / 纯符号
  │    ├─ URL / 手机号 / 邮箱
  │    └─ 本地敏感词
  │
  ├─ moderatePlayerName()        ← 统一云审核入口
  │    │
  │    ├─ mockEnabled=true  →  moderatePlayerNameMock()
  │    │                        · 本地模拟，无需网络
  │    │
  │    └─ mockEnabled=false →  CloudBase SDK → callFunction()
  │         │                   · @cloudbase/js-sdk 匿名登录
  │         │                   · app.callFunction({ name:'moderatePlayerName', data:{ playerName } })
  │         │
  │         ├─ 成功 → CloudBase 返回 { ok, action }
  │         └─ 失败 → 回退 Mock（fallbackToMockOnError=true）
  │
  └─ 通过 → 保存名字 → 进入游戏
```
  │         ▼
  │    云函数（ap-shanghai）
  │         │
  │         ├─ SECURITY_CLOUD_MOCK=true   →  Mock 审核
  │         └─ TMS_ENABLED=true           →  腾讯云 TMS 审核
  │              │
  │              └─ tencentcloud-sdk-nodejs-tms
  │                   · TextModeration API
  │                   · 密钥从云函数环境变量读取
  │
  └─ 通过 → 保存名字 → 进入游戏
```

## 三、环境变量配置

### 前端（非敏感，可写在代码/`.env.example` 中）

| 变量 | 说明 | 当前值 |
|------|------|--------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID | `wanshiwu-game-dev-d7dnulbc30e85d` |
| `SECURITY_CLOUD_MOCK` | 前端是否走 Mock | `true` |

### 云函数环境变量（敏感，只能在 CloudBase 控制台配置）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TMS_ENABLED` | 是否启用 TMS | `false` |
| `SECURITY_CLOUD_MOCK` | 云函数是否走 Mock | `true` |
| `SECURITY_LOG_ENABLED` | 安全日志开关 | `true` |
| `TC_SECRET_ID` | TMS 密钥 ID | (空) |
| `TC_SECRET_KEY` | TMS 密钥 Key | (空) |
| `TC_REGION` | 腾讯云地域 | `ap-shanghai` |
| `TMS_BIZ_TYPE` | TMS 业务类型（可选） | (空) |

> **注意：** CloudBase 不允许 `TENCENTCLOUD_` 前缀，所有密钥变量统一使用 `TC_` 前缀。

### ❌ 严禁放前端的变量

- `TC_SECRET_ID`
- `TC_SECRET_KEY`
- 任何形式的腾讯云 API 密钥

## 四、如何 Mock 测试

Mock 模式无需任何部署，前端开箱即用。

```
mode: 前端 mockEnabled=true
结果: moderatePlayerName() → moderatePlayerNameMock()

测试:
  输入 "测试玩家" → 通过
  输入 "test_block" → 阻止（mock 禁止词）
  输入 "badword" → 阻止
  输入 "forbidden" → 阻止
```

## 五、如何真实 TMS 测试

### Step 1：安装云函数依赖

```bash
cd cloudfunctions/moderatePlayerName
npm install
```

### Step 2：部署云函数到 CloudBase

方式一：CLI 部署
```bash
tcb fn deploy moderatePlayerName --envId wanshiwu-game-dev-d7dnulbc30e85d
```

方式二：CloudBase 控制台上传
- 登录 https://console.cloud.tencent.com/tcb
- 选择环境 `wanshiwu-game-dev-d7dnulbc30e85d`
- 云函数 → 新建 → 上传代码包

### Step 3：在 CloudBase 控制台配置云函数环境变量

```
TMS_ENABLED=true
SECURITY_CLOUD_MOCK=false
TC_SECRET_ID=你的SecretId
TC_SECRET_KEY=你的SecretKey
TC_REGION=ap-shanghai
SECURITY_LOG_ENABLED=true
```

### Step 5：前端验证

确认 `securityConfig.js` 中 `mockEnabled: false`，然后启动游戏：
```bash
npm run dev
```
打开浏览器 → 开始游戏 → 输入名字 → 点击"开始经营万事屋"
- 正常名字 → 通过，进入游戏
- 违规名字 → 阻止，停留在起名界面
- 浏览器控制台应看到 `[Security] cloudbase_moderation_result` 日志

## 六、如何确认前端没有泄露密钥

1. 前端代码中搜索 `SecretId`, `SecretKey`, `TENCENTCLOUD_SECRET`, `secretId`, `secretKey` → 应无结果
2. 构建产物（`dist/`）中同样搜索 → 应无结果
3. `src/security/` 目录不引入任何 `tencentcloud-sdk` 包
4. `package.json`（项目根目录）不包含 TMS SDK

## 七、模式切换表

| 前端 `mockEnabled` | 效果 |
|:---:|---|
| `true` | 前端本地 Mock（无需网络） |
| `false` | CloudBase SDK → 调用云函数 |
| `false` + 调用失败 | CloudBase → 回退 Mock（`fallbackToMockOnError`） |

切换方式：修改 `src/security/securityConfig.js` 中的：
```js
cloudModeration: {
  mockEnabled: true,   // Mock 模式
  mockEnabled: false,  // CloudBase 模式（默认）
}
```

## 八、修改了哪些文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `cloudfunctions/moderatePlayerName/index.js` | 重写 | 完整实现 Mock + TMS 双模式 |
| `cloudfunctions/moderatePlayerName/package.json` | 新增 | TMS SDK 依赖声明 |
| `src/security/cloud/moderatePlayerNameApi.js` | 重写 | 统一入口，自动选择 Mock / CloudBase |
| `src/scenes/PlayerNameScene.js` | 微调 | `moderatePlayerNameMock` → `moderatePlayerName` |
| `src/security/securityConfig.js` | 更新 | 新增 CloudBase 配置 |
| `.env.example` | 更新 | 区分前端变量和云函数变量 |
| `docs/security/README_SECURITY_CLOUD_STEP2.md` | 新增 | 本文档 |

## 九、是否触碰了之前 Codex 改过的代码

- `PlayerNameScene.js`：仅将 `moderatePlayerNameMock` 改为统一的 `moderatePlayerName`（1 行变更），其余完全不变
- 未触碰委托、炼金、背包、剧情系统
