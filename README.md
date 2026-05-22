# 现代万事屋炼金叙事经营游戏

临时英文名：Modern Odd Jobs Alchemy Sim

这是一个面向腾讯黑客松风格的现代万事屋 + 炼金术 + 精魂记忆 + 模拟经营叙事游戏项目。

> 重要：Codex、CodeBuddy 或其他 AI Agent 在修改项目之前，必须先阅读 `AGENTS.md`。

## 项目概念

玩家继承家族留下的现代万事屋，通过接待现代来客、接取委托、购买或准备炼金材料、使用炼金釜制作物品、完成委托、获得资金与人气，并逐步解锁寄宿在现代人身上的古代精魂记忆。

当前重点不是扩写正式剧情，而是搭建一个可以跑通的经营 Demo 闭环。

## 当前开发状态

项目基于 Vite + Phaser 开发，当前已经包含或正在推进以下系统：

- 万事屋主场景与玩家移动
- 随机来访 NPC
- 对话系统
- 背包系统
- 集市商店系统
- 委托系统
- 炼金釜 4x4 宫格炼金系统
- 每日时间流逝与睡觉跳时间
- 每日结算系统
- 家具升级系统
- 书架 / 万事屋档案系统
- 通用可滚动 UI 列表组件

## 技术栈

- Vite 5.x
- Phaser 3.88
- JavaScript ES Module

## 运行项目

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 项目结构

```text
public/                 # 静态资源目录
src/
  data/                 # 游戏数据配置
  scenes/               # Phaser 场景
  systems/              # 游戏系统逻辑
  config.js             # Phaser 配置
  main.js               # 游戏入口
index.html
vite.config.js
package.json
AGENTS.md               # AI Agent 项目记忆与开发规范
```

## 重要开发规范

请先阅读 `AGENTS.md`，其中包含：

- 项目背景
- 禁止自动编写正式剧情的规则
- 当前炼金配方与计分规则
- 背包、商店、委托、书架、家具升级等系统说明
- UI 状态管理要求
- Git 协作规则

简要规则：

- 不要擅自编写正式 NPC 对话。
- 不要擅自编写正式古代精魂记忆文本。
- 不要擅自编写正式结局内容。
- 不要破坏背包、商店、炼金、委托、书架、每日结算等已有系统。
- 不要提交 `node_modules/`、`dist/`、日志、环境文件、模型权重或密钥。

## Git 协作方式

推荐每次功能开发使用独立分支：

```bash
git status
git pull --rebase
git checkout -b codex/feature-name
# 修改项目
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

## 编码说明

仓库文本文件统一使用 UTF-8。`.gitattributes` 已约束常见文本文件使用 LF 行尾，避免 Windows 环境下再次出现乱码或行尾混乱。
