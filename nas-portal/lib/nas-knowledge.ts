import type { Locale } from "@/lib/i18n";

interface NasFact {
  zh: string;
  en: string;
}

const FACTS: NasFact[] = [
  {
    zh: "这台 NAS 运行在 Mac Mini (Apple M4, 16GB) 上，使用 Next.js 全家桶搭建，是家庭私有云存储中心。",
    en: "This NAS runs on a Mac Mini (Apple M4, 16GB) built with Next.js, and serves as your home private cloud storage hub.",
  },
  {
    zh: "数据存储：一块 3TB WD Red 硬盘，APFS 格式，挂载在 /Volumes/NAS-Data。",
    en: "Storage: a single 3TB WD Red drive formatted APFS, mounted at /Volumes/NAS-Data.",
  },
  {
    zh: "主要页面：概览（仪表盘）、文件、照片、指南、设置、聊天。",
    en: "Main pages: Dashboard, Files, Photos, Guide, Settings, and Chat.",
  },
  {
    zh: "文件页面：可浏览 NAS 上的所有文件、下载、预览；视频支持在线播放（MP4/WebM，支持 HTTP Range 流式传输）；图片/文件有缩略图。",
    en: "Files page: browse all files on the NAS, download and preview; videos play inline (MP4/WebM with HTTP Range streaming); images and files show thumbnails.",
  },
  {
    zh: "照片页面：照片按 EXIF 拍摄时间自动整理成按月分组的时间线，支持 JPEG/HEIC/PNG/RAW，HEIC 会自动转换为可预览格式。",
    en: "Photos page: photos are auto-organized into a monthly timeline by EXIF capture date; supports JPEG/HEIC/PNG/RAW; HEIC is auto-converted for preview.",
  },
  {
    zh: "SMB 访问：同一 WiFi 下，在 Finder (Mac) 或「此电脑」(Windows) 地址栏输入 smb://elevenbeansdemac-mini.local 即可像本地硬盘一样访问（当前 IP 以概览页显示为准）。删除不可恢复，请谨慎。",
    en: "SMB access: on the same WiFi, type smb://elevenbeansdemac-mini.local into Finder (Mac) or This PC (Windows) to access files like a local drive (the current IP is shown on the dashboard). Deleted files cannot be recovered.",
  },
  {
    zh: "远程访问：通过 Cloudflare Tunnel 在 https://nas.elevenbeans.me 访问；也可用 Tailscale 从任何地方安全访问。",
    en: "Remote access: reachable at https://nas.elevenbeans.me via Cloudflare Tunnel; Tailscale is also available for secure access from anywhere.",
  },
  {
    zh: "版权限制：Movies 目录（影视文件）在外网访问时只能看到文件名和大小，不能预览/播放/下载；需在内网（同一 WiFi）才能获得完整功能。",
    en: "Copyright restriction: the Movies folder (movie files) is limited to name and size over the external network — no preview/play/download; full functionality requires the home network (same WiFi).",
  },
  {
    zh: "存储方案建议：重要且需要共享的数据 → NAS + Local 双备份；只需共享 → NAS；重要但不共享 → Local 自备份；其他 → Local。",
    en: "Storage plan advice: important + shareable → NAS + Local dual backup; shareable only → NAS; important only → Local with self backup; everything else → Local.",
  },
  {
    zh: "语言：页面右上角可切换 中文 / English。",
    en: "Language: toggle 中文 / English at the top-right of the page.",
  },
  {
    zh: "常见问题：忘记管理员密码请联系管理员重置；扩展存储需插入新硬盘并联系管理员；误删文件目前无法恢复（无回收站），删除前请确认。",
    en: "FAQ: contact the admin to reset a forgotten password; expanding storage requires a new drive and admin setup; accidentally deleted files cannot be recovered (no trash), so confirm before deleting.",
  },
  {
    zh: "部署链路：外网经 Cloudflare Tunnel 进入端口 80，再由 socat（root LaunchDaemon）转发到 3000 端口，由 Next.js（用户 LaunchAgent，KeepAlive 常驻）处理。",
    en: "Deployment chain: external traffic enters via Cloudflare Tunnel on port 80, socat (root LaunchDaemon) forwards it to port 3000, where Next.js (user LaunchAgent, KeepAlive) serves it.",
  },
  {
    zh: "服务管理全部使用 launchd：com.nas.portal.plist（Next.js）、com.nas.ollama.plist（Ollama）、com.nas.socat.plist（socat），开机自启、崩溃自动重启。",
    en: "All services are managed by launchd: com.nas.portal.plist (Next.js), com.nas.ollama.plist (Ollama), com.nas.socat.plist (socat) — auto-start on boot and auto-restart on crash.",
  },
  {
    zh: "路径安全：所有文件 API 都经 lib/api-utils.ts 的 resolveSafePath 校验，用 realpathSync 解析后必须落在 /Volumes/NAS-Data 内，越界返回 403。",
    en: "Path safety: all file APIs validate through resolveSafePath in lib/api-utils.ts, which resolves with realpathSync and requires the path to stay inside /Volumes/NAS-Data, returning 403 otherwise.",
  },
  {
    zh: "HEIC 转换：照片预览先由 macOS sips 命令转成 JPEG，再用 sharp 做方向修正与压缩（quality 80, mozjpeg），临时文件放系统 tmp 目录。",
    en: "HEIC conversion: the macOS sips command first converts HEIC to JPEG, then sharp applies rotation and compression (quality 80, mozjpeg), with temp files in the system tmp directory.",
  },
  {
    zh: "图片处理：所有缩略图与缩放都用 sharp 服务端处理——文件列表 200×200 cover 缩略图，照片按 ?w= 参数等比缩放，JPEG quality 80。",
    en: "Image processing: all thumbnails and resizing use sharp server-side — 200×200 cover thumbnails for file listings, width-based resize via ?w= for photos, JPEG quality 80.",
  },
  {
    zh: "视频流：/api/files/stream 支持 HTTP Range，正常返回 206 + Content-Range: bytes start-end/size，越界返回 416，支持 bytes=-500 后缀范围，浏览器可直接内联播放。",
    en: "Video streaming: /api/files/stream supports HTTP Range — returns 206 with Content-Range: bytes start-end/size, 416 when out of bounds, supports suffix ranges like bytes=-500, and browsers can play inline.",
  },
  {
    zh: "照片时间线：用 exifr 读取 EXIF DateTimeOriginal 按拍摄时间排序，按月分组；缺失 EXIF 时回退到文件修改时间。",
    en: "Photo timeline: exifr reads EXIF DateTimeOriginal to sort by capture date and group by month; falls back to file mtime when EXIF is missing.",
  },
  {
    zh: "下载编码：/api/files/download 用 Content-Disposition 的 filename*=UTF-8'' 编码中文文件名，inline=1 参数控制内联预览或附件下载。",
    en: "Download encoding: /api/files/download encodes non-ASCII filenames via Content-Disposition filename*=UTF-8'', and the inline=1 parameter switches between inline preview and attachment download.",
  },
  {
    zh: "内外网区分：lib/network-utils.ts 检查请求 Host 头判断是否来自外部网络；Movies 目录在外网只返回文件名和大小，预览/下载/流媒体接口返回 403。",
    en: "Network detection: lib/network-utils.ts inspects the Host header to tell external from internal traffic; over the external network the Movies folder exposes only name and size, and preview/download/stream endpoints return 403.",
  },
  {
    zh: "技术栈：Next.js 15 App Router + Tailwind v4 + TypeScript，图片 sharp + exifr，Chat 回答用 react-markdown 渲染，图标 lucide-react；本地 AI 用 Ollama qwen3:4b，模型文件在 ~/.ollama/models。",
    en: "Tech stack: Next.js 15 App Router + Tailwind v4 + TypeScript; sharp and exifr for images; react-markdown renders chat replies; lucide-react icons; local AI via Ollama qwen3:4b with model files in ~/.ollama/models.",
  },
];

export function buildSystemPrompt(locale: Locale): string {
  const facts = FACTS.map((f) => (locale === "zh" ? f.zh : f.en)).join("\n");
  const header =
    locale === "zh"
      ? "你是「家庭 NAS 助手」。关于这台 NAS 的问题请优先依据下方已知事实回答，要求准确、简洁、友好，必要时分点；涉及系统当前状态（存储、文件、网络等）时请使用可用工具获取实时数据，不要凭记忆编造。对于与 NAS 无关的通用问题，你也可以正常回答（翻译、写作、常识、闲聊等）。但 NAS 相关的事实性内容不得编造，超出已知事实就如实说明。已知事实如下："
      : "You are the 'Home NAS Assistant'. For questions about this NAS, answer primarily from the facts below — be accurate, concise and friendly, using bullet points when helpful; for current system state (storage, files, network, etc.) use the available tools to fetch live data rather than guessing. You may also answer general questions unrelated to the NAS (translation, writing, common knowledge, casual chat). Never fabricate NAS-related facts; if something is outside the known facts, say so honestly. Known facts:";
  return `${header}\n${facts}`;
}
