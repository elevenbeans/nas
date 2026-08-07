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
    zh: "SMB 访问：同一 WiFi 下，在 Finder (Mac) 或「此电脑」(Windows) 地址栏输入 smb://192.168.1.46 或 smb://nas.local 即可像本地硬盘一样访问。删除不可恢复，请谨慎。",
    en: "SMB access: on the same WiFi, type smb://192.168.1.46 or smb://nas.local into Finder (Mac) or This PC (Windows) to access files like a local drive. Deleted files cannot be recovered.",
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
];

export function buildSystemPrompt(locale: Locale): string {
  const facts = FACTS.map((f) => (locale === "zh" ? f.zh : f.en)).join("\n");
  const header =
    locale === "zh"
      ? "你是「家庭 NAS 助手」，负责回答用户关于这台家庭 NAS 的使用问题。回答请用中文，简洁、友好，必要时分点列出。只依据下方已知事实回答；如果问题超出事实范围，请如实说明你不知道，不要编造。已知事实如下："
      : "You are the 'Home NAS Assistant', answering questions about how to use this home NAS. Reply in English, concise and friendly, using bullet points when helpful. Answer only based on the facts below; if a question is outside them, say you don't know instead of making things up. Known facts:";
  return `${header}\n${facts}`;
}
