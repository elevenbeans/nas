# NAS Portal — 统一管理界面设计

## 综述

NAS Portal 是一个基于 Next.js 的本地 NAS 管理 Web 界面，运行在 Mac Mini 上，为家庭成员提供 NAS 管理、文件浏览和照片查看入口。**无 Jellyfin / Docker 依赖**。极米投影仪通过 Kodi + SMB 直接播放视频。

## 目标用户

- 主要用户：Eva（界面问候语 "Hi, Eva"）
- 次要用户：家庭成员
- 界面要求：简洁、直观、移动端友好、全部中文

## 页面结构

共 4 个页面（无媒体库页面）：

| 页面 | 路由 | 功能 | 说明 |
|------|------|------|------|
| 概览 | `/` | 仪表盘 | 照片轮播 + 存储/网络状态卡片 |
| 文件 | `/files` | 文件浏览器 | 目录导航，路径穿越防护，过滤隐藏文件/Docker |
| 照片 | `/photos` | 照片墙 | 按日期分组的时间线视图，缩略图懒加载 (`?w=400`) |
| 设置 | `/settings` | 系统设置 | SMB/Tailscale 服务状态检测 |

## 视觉风格

**Apple 风格 — 系统字体栈 + 蓝 `#006EDB` 主色调**

### 设计理念
- 页面如同 Apple 官网，大量留白、内容呼吸感
- 纯白底色 (`#FBFBFD`) 而非纯白，营造 subtle 的高级感
- 卡片大圆角 (18px)、无边框、轻阴影
- 层级通过间距和字号体现，而非边框分隔

### 色彩
- 主色：`#006EDB`（Apple 蓝）— 交互元素
- 成功：`#16A34A`（绿色）— 服务状态、在线指示
- 背景：`#FBFBFD`（Apple 灰白）
- 卡片：`#FFFFFF`
- 一级文字：`#1D1D1F`（Apple 近黑）
- 二级文字：`#86868B`（Apple 次级灰）
- 导航栏文字：`#86868B`，激活态变为 `#006EDB`
- 导航栏背景：`rgba(255,255,255,0.8)` + backdrop-blur

### 字体
- 系统字体栈：`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`
- 不加载任何外部字体（零 Google Fonts 依赖）
- 字号层级（在使用范围内）：28px (页面标题) → 17px (nav brand) → 15px (卡片标题/正文) → 13px → 12px → 11px

### 间距
- 8pt 基线网格
- 卡片内 padding: 24px
- 卡片间距: 16px-20px

### 组件规范
| 组件 | 风格 |
|------|------|
| 顶部导航 | 毛玻璃 (`bg-white/80 backdrop-blur-lg`)，`max-w-[920px]` 居中容器，左 Logo + 导航链接，右 IP + 头像 |
| 汉堡菜单 | 窄屏时右上角三横线按钮，弹出右侧 Drawer，支持 Escape 键关闭 + body scroll lock |
| 仪表盘照片轮播 | 80vw 宽溢出容器，scroll-snap，自动轮播 4s，下一张露出 1/5 |
| 卡片 | 圆角 18px，白色背景，无边框 |
| 进度条 | 5px 高，圆角 3px，浅灰轨道 + `#006EDB` 填充 |
| 状态指示 | 7px 圆形绿/灰 dot + 文字标识 |
| 头像 | 28px 圆形，首字母 "E"，蓝色背景 |
| 照片网格 | `aspect-video`，object-cover，`?w=400` 缩略图，懒加载 |
| 照片详情视图 | 半屏覆盖层，点照片打开，点空白关闭或滚轮关闭 |

### 响应式
- 桌面：导航横向展开，`max-w-[920px]` 容器
- 移动：汉堡菜单收起导航项，照片轮播溢出不受容器限制
- Font scaling：`-webkit-text-size-adjust: 100% !important`（WeChat iOS 兼容）

## 技术栈

- **框架：** Next.js 15 (App Router)
- **样式：** Tailwind CSS v4（`@theme` 自定义令牌）
- **图标：** lucide-react
- **图片处理：** sharp（服务端缩放）
- **语言：** TypeScript
- **字体：** 系统字体栈（无外部加载）
- **部署：** Next.js (port 3000) + socat (port 80→3000)，均通过 launchd 自启

## 项目结构

```
nas-portal/
├── app/
│   ├── layout.tsx                # 根布局：TopNav + main + footer
│   ├── page.tsx                  # 仪表盘（照片轮播 + 存储/网络卡片）
│   ├── globals.css               # Tailwind v4 @theme + 全局样式
│   ├── files/
│   │   └── page.tsx              # 文件浏览器
│   ├── photos/
│   │   └── page.tsx              # 照片墙（按日期分组时间线）
│   ├── settings/
│   │   └── page.tsx              # 系统设置（SMB/Tailscale 状态）
│   └── api/
│       ├── system/status/route.ts    # 系统状态（磁盘/SMB/网络）
│       ├── files/route.ts            # 文件列表
│       └── photos/
│           ├── route.ts              # 照片列表
│           └── [name]/route.ts       # 照片输出（sharp 缩放）
├── components/
│   └── top-nav.tsx              # 顶部导航栏
├── lib/
│   └── api.ts                   # 前端 API 请求封装
├── com.nas.portal.plist         # LaunchAgent（用户态）
├── com.nas.socat.plist          # LaunchDaemon（root, port 80→3000）
├── next.config.ts, tsconfig.json, postcss.config.mjs, package.json
└── AGENTS.md                    # 项目上下文/记忆
```

## 数据流

```
浏览器 <--> Next.js API Routes <--> Shell 命令 / 文件系统 (sharp)
```

- API 路由通过 `child_process.execSync` 执行系统命令获取数据
- 无需独立后端服务，全部由 Next.js 处理
- 图片通过 API 路由用 sharp 实时缩放

## API 接口

### GET /api/system/status
返回磁盘使用率、SMB 运行状态、Tailscale 状态、网络信息。

### GET /api/files?path=...
返回指定目录的文件列表。path traversal protected。

### GET /api/photos
返回 NAS-Data/Photos 下的照片列表（按日期排序）。

### GET /api/photos/[name]?w=400
输出缩放后的照片。Mobile UA 自动压缩到 1200px，`?w=` 可覆盖。

## 启动命令

| 模式 | 命令 | 端口 |
|------|------|------|
| 开发 | `npm run dev` | 3001 |
| 生产(手动) | `npm run build && npm run start` | 3000 |
| 生产(一键) | `npm run sync` | 3000(构建后重启) |
| 生产(launchd) | 开机自启 | 80(socat) → 3000 |

## 设计演进

- **v1 初始版本：** Next.js + Tailwind + Poppins/Roboto + shadcn/ui + Jellyfin
- **v1 最终版本：** Next.js + Tailwind v4 + 系统字体栈 + lucide-react + sharp + **无 Jellyfin**

### 关键设计变更记录

| 变更 | 旧 | 新 | 原因 |
|------|----|----|------|
| 字体 | Google Fonts Poppins/Roboto | 系统字体栈 | 零外部依赖，更简洁 |
| 主色 | `#3B82F6` (Clean 蓝) | `#006EDB` (Apple 蓝) | 更贴近 Apple 原生风格 |
| 导航容器 | `max-w-[720px]` | `max-w-[920px]` | 更宽阔，照片展示更好 |
| 组件库 | shadcn/ui | 自定义 | shadcn 的抽象在此场景太重 |
| 媒体页 | Jellyfin iframe 嵌入 | 无（已移除） | 不使用 Jellyfin |
| 导航项 | 5 个（含"媒体"） | 4 个（无"媒体"） | Jellyfin 已移除 |
| UI 语言 | 英文 | 中文 | 目标用户为中文家庭 |
