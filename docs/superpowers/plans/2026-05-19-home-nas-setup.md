# 家用 NAS 实施方案

**目标：** 用 Mac Mini (macOS) + UGREEN 双盘位硬盘盒 + 1块 WD Red 3TB（第二盘位预留）搭建家庭 NAS，管理照片/文件/视频，所有家庭成员设备可访问。

**架构：** Mac Mini 作为 NAS 主机，WD Red 3TB 格式化为 APFS 单卷。SMB 文件共享（Homebrew samba）给局域网所有设备，极米投影仪用 Kodi 通过 SMB 播放视频，不跑 Jellyfin/Docker。自定义 Next.js 网页（NAS Portal）作为统一管理入口。

**技术栈：** macOS (主机), Homebrew samba (SMB 文件共享), Next.js 15 (NAS Portal), Kodi (投影仪播放)

---

### 任务 1：硬盘初始化

- [x] **步骤 1：连接硬盘并识别**
  - UGREEN 双盘位硬盘盒已连接 Mac Mini，WD Red 3TB 识别为 `disk2`

- [x] **步骤 2：格式化为 APFS**
  - 卷名：`NAS-Data`（最初叫 `WD-3T`，已改名）

- [x] **步骤 3：确认挂载**
  - 挂载点：`/Volumes/NAS-Data`

- [x] **步骤 4：创建数据文件夹**
  ```
  NAS-Data/
  ├── Photos/       # 照片（按 YYYY/MM 分类）
  ├── Videos/       # 电影/视频（供 Kodi 读取）
  ├── Downloads/    # 下载文件夹
  └── Backups/      # 备份
  ```

---

### 任务 2：SMB 文件共享

- [x] **方案：** Homebrew samba（不使用 macOS 自带的系统共享）
  - 原因：macOS Tahoe (Sequoia) Finder SMB 存在系统 bug，`smbutil view` 终端正常但 Finder `smb://` 连接失败

- [x] **配置文件：** `/opt/homebrew/etc/samba/smb.conf`
- [x] **SMB 二进制：** `/opt/homebrew/sbin/samba-dot-org-smbd`
- [x] **端口：** 445
- [x] **访问方式：**
  - 访客：读写访问（免密码）
  - 用户 `elevenbeans` 密码：`nas123`

- [x] **开机自启：** launchd（`com.nas.samba.plist`）
- [x] **macOS Tahoe 临时方案（如果 Finder 连不上）：**
  ```bash
  # 终端确认 SMB 是否正常
  smbutil view //guest@192.168.1.46/NAS-Data

  # 或显式指定凭据连接
  smbutil view //elevenbeans:nas123@192.168.1.46/NAS-Data
  ```

---

### 任务 3：NAS Portal（自定义网页管理界面）

- [x] **目录：** `~/code/nas/nas-portal/`
- [x] **访问地址：** `http://192.168.1.46/`（端口 80 → socat → 3000）
- [x] **开发地址：** `http://192.168.1.46:3001`（`npm run dev`）
- [x] **部署方式：**
  - LaunchAgent `com.nas.portal`（用户态，Next.js 生产运行在端口 3000）
  - LaunchDaemon `com.nas.socat`（root，端口 80 → 3000）
  - `npm run sync`：构建 + 重启生产服务
- [x] **前端特性：**
  - Apple 风格 UI，系统字体栈，蓝 `#006EDB` 主色调
  - 全部界面中文化
  - 顶部导航：概览 / 文件 / 照片 / 设置（各带 Lucide 图标）
  - 仪表盘：照片轮播 + 存储/网络状态卡片
  - 文件浏览器：目录导航 + 路径穿越防护
  - 照片页面：按日期分组时间线
  - 设置页面：SMB/Tailscale 状态检测
- [x] **WeChat iOS 兼容：**
  - `-webkit-text-size-adjust: 100% !important` 防止微信字号缩放
  - browserslist `chrome >= 77`

---

### 任务 4：各设备配置

- [ ] **MacBook Pro / Air**
  - Finder → Cmd+K → `smb://192.168.1.46/NAS-Data`
  - 自动挂载（系统设置 → 通用 → 登录项）

- [ ] **iPhone（2 台）**
  - 照片备份：待定（PhotoSync / iCloudPD）
  - 浏览器访问 NAS Portal：`http://192.168.1.46/`

- [x] **极米投影仪（XGIMI RS10）**
  - 方案：安装 **Kodi**，添加 SMB 源（`smb://192.168.1.46/Videos`）
  - 不装 Jellyfin/Docker — Kodi 直接读取 NAS 视频文件

---

### 任务 5：照片自动备份（待办）

- [ ] **选项 A：iCloudPD**（免费，CLI 工具）
- [ ] **选项 B：PhotoSync**（买断 $4.99，简单易用）
- [ ] **手动备份：** iPhone → 文件 App → 连接 SMB → 复制照片

---

### 任务 6：外网访问（延后）

- [ ] **Tailscale**（免费个人版，最多 3 用户 100 台设备）
  ```bash
  brew install --cask tailscale
  ```
  - Mac Mini 主节点
  - 2 台 iPhone
  - MacBook Pro / Air

---

## 关键决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 媒体服务器 | 不用 Jellyfin | Kodi 直接挂 SMB 更简单，无服务器依赖 |
| SMB 方案 | Homebrew samba | macOS 自带 SMB 在 Tahoe 有 bug |
| 字体方案 | 系统字体栈 | 零外部依赖，没 Google Fonts 加载延迟，符合中文 Apple 风格 |
| 端口转发 | socat | 避免 pf 防火墙配置和 TCC 权限问题 |
| 开发端口 | 3000(生产) / 3001(开发) | `npm run sync` 一键构建 + 重启 |

## 已知问题

- **macOS Tahoe Finder SMB bug**：Finder 连接 `smb://192.168.1.46/` 可能失败，终端 `smbutil view` 正常。workaround：用 Kodi/MacBook 通过终端挂载，或显式输入凭据。
