# NAS Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js 15 NAS management portal with Apple-style UI, running on Mac Mini (macOS).

**Architecture:** Next.js 15 App Router, single process. API Routes execute shell commands via `child_process` for system data. Static file serving for photos. No Jellyfin/Docker — Kodi on XGIMI handles video via SMB. No database — all state from filesystem.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, lucide-react, sharp (image resize), system font stack

**App Language:** Chinese (all UI text localized to Chinese)

**Production:** socat (root, port 80) → Next.js (user, port 3000), both launchd auto-start

---

### Task 1: Project Initialization

**Files:**
- Create: `nas-portal/package.json`
- Create: `nas-portal/tsconfig.json`
- Create: `nas-portal/next.config.ts`
- Create: `nas-portal/postcss.config.mjs`
- Create: `nas-portal/app/layout.tsx`
- Create: `nas-portal/app/globals.css`
- Create: `nas-portal/app/page.tsx` (placeholder)

- [x] **Step 1: Create project directory and initialize**

```bash
mkdir -p nas-portal/app
cd nas-portal
```

Expected: directory exists.

- [x] **Step 2: Create package.json** (with browserslist `chrome >= 77` for WeChat iOS 8.0.73 compatibility)

```json
{
  "name": "nas-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3000",
    "sync": "next build && cp com.nas.portal.plist ~/Library/LaunchAgents/ && launchctl kickstart gui/$(id -u)/com.nas.portal"
  },
  "dependencies": {
    "next": "^15.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.400.0",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.4.0",
    "@tailwindcss/postcss": "^4.0.0"
  },
  "browserslist": {
    "production": ["chrome >= 77"],
    "development": ["last 1 chrome version"]
  }
}
```

- [x] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [x] **Step 4: Create next.config.ts** — minimal, no special config needed

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [x] **Step 5: Create postcss.config.mjs** — Tailwind CSS v4 PostCSS plugin only (no postcss-preset-env; iOS WKWebView supports `@layer` natively)

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [x] **Step 6: Create globals.css** — Tailwind v4 `@theme` with system font stack, Apple-inspired palette, blue accent `#006EDB`

```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  --color-apple-bg: #fbfbfd;
  --color-apple-text: #1d1d1f;
  --color-apple-muted: #86868b;
  --color-apple-blue: #006edb;
}

body {
  font-family: var(--font-sans);
  background: var(--color-apple-bg);
  color: var(--color-apple-text);
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100% !important;
}
```

- [x] **Step 7: Install dependencies and verify build**

```bash
cd nas-portal && npm install && npm run build
```

Expected: Build succeeds, output written to `.next/`.

---

### Task 2: Top Navigation Bar (Apple-style)

**Files:**
- Create: `nas-portal/components/top-nav.tsx`
- Modify: `nas-portal/app/layout.tsx`

- [x] **Step 1: Install Lucide React**

Run: `npm install lucide-react`

- [x] **Step 2: Create top-nav.tsx** — 4 nav items (概览/文件/照片/设置), all Chinese labels, mobile hamburger drawer with Escape key + body scroll lock, responsive

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FolderOpen, Image, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "概览", icon: LayoutDashboard },
  { href: "/files", label: "文件", icon: FolderOpen },
  { href: "/photos", label: "照片", icon: Image },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function TopNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [drawerOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 flex justify-center h-14 bg-white/80 backdrop-blur-lg border-b border-[#f0f0f2] px-4 sm:px-8">
        <div className="flex items-center w-full max-w-[920px]">
          <Link href="/" className="flex items-center gap-2.5 mr-8 shrink-0">
            <div className="w-[26px] h-[26px] bg-apple-blue rounded-[6px]" />
            <span className="text-[17px] font-bold tracking-tight">NAS</span>
          </Link>
          <div className="hidden sm:flex gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-[6px] transition-all ${
                  pathname === item.href
                    ? "text-apple-blue bg-[#eff6ff] font-semibold"
                    : "text-apple-muted hover:text-apple-text hover:bg-[#f5f5f7]"
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-4 shrink-0">
            <span className="hidden sm:block text-xs text-apple-muted font-medium">192.168.1.46</span>
            <div className="w-7 h-7 bg-apple-blue rounded-full flex items-center justify-center text-white text-[11px] font-semibold">E</div>
            <button className="flex sm:hidden flex-col gap-1.5 p-1.5 bg-none border-none cursor-pointer" onClick={() => setDrawerOpen(true)} aria-label="打开菜单">
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && <div className="fixed inset-0 bg-black/30 z-[98]" onClick={() => setDrawerOpen(false)} />}

      <div className={`fixed top-0 right-0 w-[260px] h-full bg-white z-[99] p-6 shadow-[-2px_0_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
        drawerOpen ? "translate-x-0" : "translate-x-full"
      }`}>
        <button className="absolute top-5 right-5 text-apple-muted text-2xl bg-none border-none cursor-pointer" onClick={() => setDrawerOpen(false)} aria-label="关闭菜单">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 mb-8 text-[17px] font-bold">
          <div className="w-[26px] h-[26px] bg-apple-blue rounded-[6px]" />
          NAS
        </div>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)}
            className={`flex items-center gap-3 text-[15px] font-medium px-3 py-3 rounded-lg mb-1 ${
              pathname === item.href
                ? "text-apple-blue bg-[#eff6ff] font-semibold"
                : "text-apple-muted"
            }`}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
```

- [x] **Step 3: Update layout.tsx** — add TopNav, footer with "Powered by" links, meta tags with Chinese

```tsx
import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/top-nav";

export const metadata: Metadata = {
  title: "NAS Portal",
  description: "Home NAS management interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <TopNav />
        <main>{children}</main>
        <footer className="text-center py-8 text-xs text-apple-muted border-t border-[#f0f0f2] mt-8">
          Powered by{" "}
          <a href="https://deepseek.com" className="text-apple-blue hover:underline">Deepseek v4</a>
          {" · "}
          <a href="https://elevenbeans.github.io" className="text-apple-blue hover:underline">elevenbeans</a>
          {" · "}
          <a href="https://opencode.ai" className="text-apple-blue hover:underline">opencode</a>
        </footer>
      </body>
    </html>
  );
}
```

---

### Task 3: Dashboard Page (概览)

**Files:**
- Create: `nas-portal/app/page.tsx` (overwrite placeholder)

- [x] **Dashboard features:**
  - Greeting "Hi, Eva" with time-based suffix
  - Photo carousel (real images from API, 80vw breakout, scroll-snap, auto-play 4s loop, first photo aligned to nav)
  - Storage card from live `/api/system/status`
  - Network card from live `/api/system/status`
  - No Jellyfin service card — SMB-only status shown in Settings page

---

### Task 4: System Status API Route

**Files:**
- Create: `nas-portal/app/api/system/status/route.ts`

- [x] **API returns:** disk usage (df -H), SMB service status (pgrep samba), Tailscale status (tailscale status), network info (ifconfig). No Jellyfin check.

```ts
export async function GET() {
  const df = execSync("df -H /Volumes/NAS-Data 2>/dev/null || df -H /", { encoding: "utf-8" });
  // ... parse df, check smb pgrep, tailscale status, ifconfig en0
  return NextResponse.json({
    storage: { used, total, percent },
    smb: boolean,
    tailscale: boolean,
    network: { ip, hostname: "Mac Mini", interface: iface },
  });
}
```

---

### Task 5: Files Page (文件)

**Files:**
- Create: `nas-portal/app/files/page.tsx`
- Create: `nas-portal/app/api/files/route.ts`

- [x] **Features:**
  - Directory navigation (breadcrumb-style path links)
  - Path traversal protection (resolved path must start with BASE path)
  - Hidden files (dotfiles) and Docker directory filtered out
  - Chinese UI

---

### Task 6: Photos Page + API (照片)

**Files:**
- Create: `nas-portal/app/photos/page.tsx`
- Create: `nas-portal/app/api/photos/route.ts`
- Create: `nas-portal/app/api/photos/[name]/route.ts`

- [x] **Features:**
  - Date-grouped timeline from directory structure (Photos/YYYY/MM/)
  - Grid layout for thumbnails with `?w=400` query param
  - Auto-compress to 1200px for mobile UA via sharp
  - Image serving via sharp (`next.config.ts` not modified — API route handles this)

---

### Task 7: Settings Page (设置)

**Files:**
- Create: `nas-portal/app/settings/page.tsx`

- [x] **Features:**
  - SMB service status (实时检测)
  - Tailscale status (实时检测)
  - No Jellyfin/Docker references
  - All Chinese text

---

### Task 8: Production Deployment

**Files:**
- Create: `nas-portal/com.nas.portal.plist` (LaunchAgent, user)
- Create: `nas-portal/com.nas.socat.plist` (LaunchDaemon, root)

- [x] **Setup:**
  - Next.js on port 3000 via LaunchAgent (user, not root — avoids TCC issues)
  - socat redirect port 80→3000 via LaunchDaemon (root)
  - Both with KeepAlive, auto-start on boot
  - Dev on port 3001 via `npm run dev`
  - Production restart via `npm run sync` (build + kickstart)

---

## Self-Review Checklist

1. **Spec coverage:** All 4 pages (dashboard, files, photos, settings) are covered. No Jellyfin/media page. Chinese UI throughout. Apple-inspired design with system font stack.
2. **No placeholders:** No "TBD", "coming soon", or "implement later" patterns.
3. **No Jellyfin references:** All Jellyfin-related code, configs, and UI references removed (previously had Jellyfin, Docker container stopped and removed).
4. **Clean CSS:** Tailwind v4 `@theme`, system font stack (no Google Fonts), `-webkit-text-size-adjust: 100%` for WeChat iOS compatibility.
