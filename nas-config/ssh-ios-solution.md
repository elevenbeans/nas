# iOS 公网 SSH 控制 Mac mini 方案

## 现状

- CF 域名 `elevebeans.me` ✓
- CF Tunnel（quick tunnel / token 模式）已运行，`nas.elevebeans.me → localhost:3000` ✓
- ⚠️ Cloudflare Warp 中国大陆不可用，需换方案

## 方案一：Cloudflare 浏览器 SSH（推荐，零安装）

无需安装任何 App，直接 Safari 打开网页就能 SSH。

### 原理

```
[iOS Safari] → https://ssh.elevebeans.me → CF Access Auth → CF Tunnel → Mac mini:22
```

Cloudflare Zero Trust 提供浏览器端 Web Terminal，击键通过 CF 网络 → Tunnel → SSH 端口。

### Mac mini 端配置

**1. 开启 SSH**

```bash
sudo systemsetup -setremotelogin on
```

**2. Tunnel 中添加 SSH 的 Public Hostname**

Cloudflare Zero Trust 仪表盘 → **Networks** → **Tunnels** → 点击你的 tunnel：

- **Public Hostnames** 选项卡 → **Add a public hostname**
  - **Subdomain**: `ssh`
  - **Domain**: `elevebeans.me`
  - **Type**: `SSH`
  - **URL**: `localhost:22`
  - **Save**

**3. 创建 Cloudflare Access 应用**

Cloudflare Zero Trust → **Access** → **Applications** → **Add an application** → **Self-hosted**：

- **Application name**: `SSH Access`
- **Domain**: `ssh.elevebeans.me`
- **Policy**: 设置认证方式（推荐 Email OTP 或 Google OAuth）
- 其他保持默认 → **Add application**

### iOS 使用

Safari 打开 `https://ssh.elevebeans.me` → Cloudflare 认证（邮箱验证码等）→ 浏览器内出现 Web Terminal → 输入 Mac mini 用户名密码登录。

### 优缺点

| 项目 | 评价 |
|------|------|
| App 安装 | ❌ 无需任何安装 |
| 中国可用性 | ✅ 只要 CF 能被访问 |
| SSH 体验 | ⭐⭐ 网页终端，移动端键盘支持一般 |
| 复制粘贴 | ⚠️ 有限 |
| 安全性 | ⭐⭐⭐⭐⭐ CF Access 认证 + Tunnel 加密 |

---

## 方案二：Tailscale（原生 SSH 客户端体验）

Tailscale 基于 WireGuard，能穿透 NAT 和防火墙，iOS App Store 中国区可下载。

### 架构

```
[iOS 手机] ── Tailscale ──→ Tailscale DERP/直连 ──→ Mac mini (Tailscale IP)
```

### Mac mini 端

```bash
brew install --cask tailscale
# 或从 https://tailscale.com/download 下载
# 打开后登录 Tailscale 账号
tailscale ip -4
# 记录返回的 IP，如 100.x.x.x
```

### iOS 端

App Store 搜索 **Tailscale** → 安装 → 登录同一账号。

SSH 客户端推荐：
- **Termius**（免费，App Store 中国区可下载）
- **Blink Shell**（付费，内置 Tailscale + cloudflared）

新建连接：
- **Host**: Mac mini 的 Tailscale IP（如 `100.x.x.x`）
- **Port**: `22`
- **Username**: 你的 Mac 用户名
- **Auth**: SSH Key 或密码

### 优缺点

| 项目 | 评价 |
|------|------|
| App 安装 | ✅ App Store 中国区可下载 |
| SSH 体验 | ⭐⭐⭐ 原生客户端，完整键盘支持 |
| 配置复杂度 | ⭐⭐ 需安装两个设备 |
| 速度 | ⭐⭐⭐ P2P 直连（通常快于 CF Tunnel） |
| 安全性 | ⭐⭐⭐⭐⭐ WireGuard 加密 |

---

## 方案三：Blink Shell + cloudflared（最极客）

**Blink Shell**（付费 $19.99）是 iOS 专业终端，内置了 `cloudflared`，可直接通过 Cloudflare Tunnel 建立 SSH 连接，无需 Warp。

### 原理

Blink Shell 内置 cloudflared → `cloudflared access ssh` → CF Tunnel → Mac mini:22

### iOS 使用

1. App Store 购买安装 **Blink Shell**
2. Blink 中配置 Cloudflare Tunnel：
   ```
   blink> config
   → Connections → + New → SSH via Cloudflare
   → Hostname: ssh.elevebeans.me
   → User: (你的 Mac 用户名)
   ```
3. 连接时 Blink 会自动调用 CF Access 认证

### 优缺点

| 项目 | 评价 |
|------|------|
| 价格 | 💰 $19.99 |
| SSH 体验 | ⭐⭐⭐⭐⭐ 专业终端，mosh 支持，媲美电脑 |
| 中国可用性 | ✅ Blink App Store 中国区可下载（需确认） |

---

## 方案四：直接端口转发 + 安全加固（兜底）

如果上述方案都不通，且路由器支持端口转发。

### 步骤

1. 路由器将公网端口（如 2222）转发到 Mac mini `22`
2. 仅允许 SSH Key 登录，禁止密码
3. 安装 `fail2ban`

```bash
# Mac mini 上
# 1. SSH Key 登录
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys

# 2. 关闭密码登录
sudo sed -i '' 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i '' 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 3. 重启 SSH
sudo launchctl stop com.openssh.sshd
sudo launchctl start com.openssh.sshd

# 4. 安装 fail2ban
brew install fail2ban
sudo cp /opt/homebrew/etc/fail2ban/jail.conf /opt/homebrew/etc/fail2ban/jail.local
sudo brew services start fail2ban
```

### 优缺点

| 项目 | 评价 |
|------|------|
| 复杂度 | ⭐⭐ 路由器设置 + SSH 配置 |
| 安全性 | ⚠️ 暴露公网端口，依赖 fail2ban |
| SSH 体验 | ⭐⭐⭐ 原生客户端 |
| 中国可用性 | ✅ 完全独立 |

---

## 总结

| 方案 | App 安装 | SSH 体验 | 中国可用 | 推荐度 |
|------|----------|----------|----------|--------|
| **浏览器 SSH (CF Access)** | 无需安装 | ⭐⭐ 网页终端 | ✅ | ⭐⭐⭐ 首选 |
| **Tailscale + Termius** | 2 个 App | ⭐⭐⭐ 原生 | ✅ App Store | ⭐⭐⭐ 长期用 |
| **Blink Shell + cloudflared** | Blink 付费 | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐ 极客 |
| **端口转发 + 加固** | 无需安装 | ⭐⭐⭐ 原生 | ✅ | ⭐⭐ 兜底 |

### 我的建议

1. **先试方案一**（浏览器 SSH）——零成本零安装，5 分钟配好
2. 体验不满意 → **方案二**（Tailscale + Termius），这是长期使用的最佳性价比方案
3. 追求极致体验 → **方案三**（Blink Shell）

方案四仅作兜底，不推荐长期使用。
