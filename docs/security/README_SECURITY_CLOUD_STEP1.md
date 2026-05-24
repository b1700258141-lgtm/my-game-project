# 云服务接入第一步：Mock 云审核接口 + 玩家起名接入

## 一、本阶段完成了什么

1. **环境变量占位**：新增 `.env.example`，包含 CloudBase、TMS、安全日志的占位变量
2. **Mock 云审核接口**：`src/security/cloud/moderatePlayerNameApi.js`，模拟云端内容安全审核
3. **CloudBase 云函数结构预留**：`cloudfunctions/moderatePlayerName/index.js`，后续可直接迁移到真实 CloudBase 环境
4. **安全配置扩展**：`securityConfig.js` 新增 `cloudModeration` 配置块
5. **起名流程接入**：`PlayerNameScene.js` 在本地校验通过后，增加异步云审核步骤
6. **本文档**：`docs/security/README_SECURITY_CLOUD_STEP1.md`

## 二、本阶段没有完成什么

1. ❌ 没有接入真实腾讯云 TMS
2. ❌ 没有部署真实 CloudBase 云函数
3. ❌ 没有写入任何真实密钥（SecretId / SecretKey）
4. ❌ 没有修改委托、炼金、剧情、背包等系统

## 三、为什么现在只做 Mock

1. 当前项目处于 Hackathon 原型阶段，无需真实云环境
2. Mock 接口结构已完全对齐云函数格式，后续切换只需修改 1 个文件
3. 前端的异步审核流程（加载态、错误处理、防重复提交）已在本次实现完毕
4. 真实 TMS 需要腾讯云账号、密钥、CloudBase 环境，不适合在开发早期接入

## 四、玩家起名审核流程

```
玩家输入名字 → 点击"开始经营万事屋"
  │
  ▼
【第 1 步：本地校验】（同步，~0ms）
  · trim 去除空格
  · 空值检查
  · 长度 1-12 字符
  · 纯数字/纯符号检查
  · URL、手机号、邮箱检测
  · 本地敏感词检测
  │
  ├─ 不通过 → 显示错误提示 → 返回
  │
  ▼
【第 2 步：云审核 Mock】（异步，~300ms）
  · moderatePlayerNameMock(name)
  · 检查 name 是否包含 mock 禁止词
  │
  ├─ block → 显示 "名字不太合适" → 返回
  ├─ 异常 → 显示 "审核暂不可用" → 返回
  │
  ▼
【第 3 步：保存并进入游戏】
  · setPlayerName(name)
  · localStorage 持久化
  · 切换到 ShopScene
```

## 五、环境变量说明

| 变量 | 当前值 | 说明 |
|------|--------|------|
| `CLOUDBASE_ENV_ID` | (空) | CloudBase 环境 ID，未接入 |
| `TMS_ENABLED` | `false` | 本阶段必须为 false |
| `SECURITY_CLOUD_MOCK` | `true` | 本阶段必须为 true |
| `SECURITY_LOG_ENABLED` | `true` | 安全日志开关 |

## 六、如何测试

### 本地校验测试

| 测试输入 | 预期结果 |
|---------|---------|
| `""` (空) | 不通过："名字不能为空" |
| `"   "` (全空格) | 不通过："名字不能为空" |
| `"这是一个超过12个字符的超长名字"` | 不通过："名字最多 12 个字符" |
| `"http://evil.com"` | 不通过："名字不太合适" |
| `"13800138000"` | 不通过："名字不太合适" |
| `"test@qq.com"` | 不通过："名字不太合适" |

### 云审核 Mock 测试

| 测试输入 | 预期结果 |
|---------|---------|
| `test_block` | 不通过："名字不太合适"（经云审核 block） |
| `badword` | 不通过："名字不太合适"（经云审核 block） |
| `forbidden` | 不通过："名字不太合适"（经云审核 block） |
| `松林` | **通过**，正常进入游戏 |
| `Yuri` | **通过**，正常进入游戏 |
| `万事屋` | **通过**，正常进入游戏 |

### 回归测试

- 刷新页面后，playerName 仍能从 localStorage 读取
- 进入游戏后玩法不受影响
- 控制台无报错
- 旧存档加载后名字正常显示

## 七、后续如何接入真实腾讯云 TMS

### 需要提供的信息

1. 腾讯云账号的 SecretId / SecretKey
2. CloudBase 环境 ID
3. TMS 服务已开通的地域（如 ap-guangzhou）

### 接入步骤

1. **开通腾讯云 TMS 服务**
   - 登录腾讯云控制台 → 文本内容安全 TMS
   - 开通服务，记录 SecretId / SecretKey

2. **配置云函数环境变量**（`cloudfunctions/moderatePlayerName/`）
   ```bash
   TMS_SECRET_ID=你的SecretId
   TMS_SECRET_KEY=你的SecretKey
   TMS_REGION=ap-guangzhou
   ```
   注意：这些变量**只能**放在云函数环境中，**绝对不能**放在前端代码或 `.env` 文件中。

3. **替换云函数中的审核逻辑**
   - 打开 `cloudfunctions/moderatePlayerName/index.js`
   - 找到 `// ========== 4. Mock 敏感词库 ==========`
   - 将其替换为 TMS API 调用（代码中已预留注释示例）

4. **部署云函数到 CloudBase**
   ```bash
   tcb fn deploy moderatePlayerName
   ```

5. **前端切换为真实调用**
   - 将 `moderatePlayerNameMock()` 替换为真实云函数调用
   - 或通过 CloudBase SDK 调用：`app.callFunction({ name: 'moderatePlayerName', data: { playerName } })`

## 八、是否修改了已有文件

| 文件 | 改动 |
|------|------|
| `src/scenes/PlayerNameScene.js` | 添加云审核异步步骤（~15 行），导入 `moderatePlayerNameMock`，保留原有 UI 完全不变 |
| `src/security/securityConfig.js` | 新增 `cloudModeration` 配置块（~15 行） |

## 九、是否触碰了之前 Codex 改过的代码

- `PlayerNameScene.js` 是 Codex 创建的起名场景
- 本次只在 `confirmName()` 中增加了"本地校验通过后异步调云审核"这一步
- **原有 UI 样式、按钮、输入框、`create()` 方法完全未变**
- **保存逻辑（setPlayerName、localStorage、scene.start）完全未变，提取为 `_proceedToGame()`**
