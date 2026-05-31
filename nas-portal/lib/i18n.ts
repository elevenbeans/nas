export type Locale = "zh" | "en";

export interface GuideSection {
  title: string;
  items: string[];
}

export interface GuideTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface GuideTranslation {
  title: string;
  subtitle: string;
  sections: GuideSection[];
  tableSections: GuideTable[];
}

export const locales: Record<Locale, {
  nav: Record<string, string>;
  guide: GuideTranslation;
  dashboard: {
    welcomeBack: string;
    storage: string;
    storageUsed: string;
    network: string;
    connected: string;
    services: string;
  };
  files: {
    back: string;
    loadError: string;
    emptyDir: string;
    play: string;
    download: string;
    preview: string;
    hide: string;
    restrictedTitle: string;
    restrictedNotice: string;
  };
  photos: {
    subtitle: string;
    loading: string;
    empty: string;
    dateFmt: string;
  };
  settings: {
    subtitle: string;
    smb: string;
    running: string;
    tailscale: string;
    notConfigured: string;
  };
}> = {
  zh: {
    nav: {
      overview: "概览",
      files: "文件",
      photos: "照片",
      guide: "指南",
      settings: "设置",
    },
    dashboard: {
      welcomeBack: "欢迎回家",
      storage: "存储",
      storageUsed: "{used} / {total} 已使用",
      network: "网络",
      connected: "已连接",
      services: "服务",
    },
    files: {
      back: "← 返回",
      loadError: "无法加载文件",
      emptyDir: "此目录为空",
      play: "播放",
      download: "下载",
      preview: "预览",
      hide: "隐藏",
      restrictedTitle: "版权与合规声明",
      restrictedNotice: "此目录中的影视文件受版权保护。根据相关法律法规，未经授权不得在外部网络进行预览、浏览或下载。请通过家庭内网（同一 WiFi）访问以获取完整功能。",
    },
    photos: {
      subtitle: "照片时间线",
      loading: "加载中…",
      empty: "暂无照片。请将照片放入 NAS‑Data/Photos/",
      dateFmt: "{y}年{m}月",
    },
    settings: {
      subtitle: "系统设置",
      smb: "SMB 文件共享",
      running: "运行中",
      tailscale: "远程访问 (Tailscale)",
      notConfigured: "未配置",
    },
    guide: {
      title: "使用指南",
      subtitle: "了解如何充分利用你的家庭 NAS",
      sections: [
        {
          title: "欢迎使用家庭 NAS",
          items: [
            "家庭 NAS（网络附加存储）是你的私人云存储中心，位于家庭局域网中。",
            "你可以把它当作一个超大容量的硬盘，家里所有设备（电脑、手机、平板、电视）都能访问它。",
            "与商业云盘不同，你的数据完全由自己掌控，没有隐私泄露风险，也没有月费限制。",
          ],
        },
        {
          title: "文件管理",
          items: [
            "通过「文件」页面可以浏览 NAS 中的所有文件。",
            "在电脑/手机上打开 Finder（Mac）或「此电脑」（Windows），在地址栏输入 smb://192.168.1.xx 即可像本地硬盘一样访问。",
            "拖拽文件到共享文件夹即可上传，删除操作不可恢复，请谨慎操作。",
          ],
        },
        {
          title: "照片管理",
          items: [
            "将手机照片导入 NAS 后，「照片」页面会按拍摄时间自动整理成时间线视图。",
            "支持常见格式：JPEG、HEIC、PNG、RAW，视频暂不支持在线预览。",
            "建议定期将手机照片导入 NAS，释放手机存储空间的同时确保数据安全。",
          ],
        },
        {
          title: "连接方式",
          items: [
            "局域网：同一 WiFi 下的设备可直接通过 \\\\nas 或 smb://nas.local 连接。",
            "推荐使用 SMB 协议映射网络驱动器，体验最接近本地硬盘。",
          ],
        },
        {
          title: "常见问题",
          items: [
            "Q: 忘记管理员密码怎么办？\nA: 请联系系统管理员重置。",
            "Q: 如何扩展存储空间？\nA: 插入新硬盘后联系管理员进行配置。",
            "Q: 文件意外删除能恢复吗？\nA: 目前不支持回收站功能，删除前请确认。",
          ],
        },
      ],
      tableSections: [
        {
          title: "要不要存 NAS？听听管理员的建议",
          headers: ["很重要？", "可共享？", "存储方案", "说明"],
          rows: [
            ["✅", "✅", "NAS + Local", "公网可读，内网读写，Local + NAS 双备份"],
            ["❌", "✅", "NAS", "公网可读，内网读写，NAS 存储"],
            ["✅", "❌", "Local", "个人 access，自备份"],
            ["❌", "❌", "Local", "个人 access，不备份"],
          ],
        },
      ],
    },
  },
  en: {
    nav: {
      overview: "Dashboard",
      files: "Files",
      photos: "Photos",
      guide: "Guide",
      settings: "Settings",
    },
    dashboard: {
      welcomeBack: "Welcome back",
      storage: "Storage",
      storageUsed: "{used} / {total} used",
      network: "Network",
      connected: "Connected",
      services: "Services",
    },
    files: {
      back: "← Back",
      loadError: "Failed to load files",
      emptyDir: "This folder is empty",
      play: "Play",
      download: "Download",
      preview: "Preview",
      hide: "Hide",
      restrictedTitle: "Copyright & Compliance Notice",
      restrictedNotice: "Movie files in this directory are protected by copyright. Unauthorized preview, browsing, or download from external networks is prohibited by law. Please access via your home network (same WiFi) for full functionality.",
    },
    photos: {
      subtitle: "Photo Timeline",
      loading: "Loading…",
      empty: "No photos yet. Add photos to NAS‑Data/Photos/",
      dateFmt: "{m}/{y}",
    },
    settings: {
      subtitle: "System Settings",
      smb: "SMB File Sharing",
      running: "Running",
      tailscale: "Remote Access (Tailscale)",
      notConfigured: "Not Configured",
    },
    guide: {
      title: "User Guide",
      subtitle: "Learn how to make the most of your home NAS",
      sections: [
        {
          title: "Welcome to Your Home NAS",
          items: [
            "A home NAS (Network Attached Storage) is your private cloud storage hub located on your home network.",
            "Think of it as a massive hard drive that every device in your home (computers, phones, tablets, TVs) can access.",
            "Unlike commercial cloud services, your data stays completely under your control \u2014 no privacy risks, no monthly fees.",
          ],
        },
        {
          title: "File Management",
          items: [
            "Use the Files page to browse, upload, and download all files on your NAS.",
            "On your computer, open Finder (Mac) or This PC (Windows) and enter smb://nas.local to access files like a local drive.",
            "Drag and drop files to upload. Deleted files cannot be recovered, so proceed with caution.",
          ],
        },
        {
          title: "Photo Management",
          items: [
            "After importing photos to the NAS, the Photos page automatically organizes them into a timeline view by capture date.",
            "Supported formats: JPEG, HEIC, PNG, RAW. Video preview is not currently supported.",
            "Regularly import phone photos to the NAS to free up storage space while keeping your data safe.",
          ],
        },
        {
          title: "Connection Methods",
          items: [
            "Local network: Devices on the same WiFi can connect via \\\\nas or smb://nas.local.",
            "Remote access: Use Tailscale to securely access your NAS from anywhere (requires setup in Settings).",
            "We recommend mapping a network drive via SMB for the most native experience.",
          ],
        },
        {
          title: "FAQ",
          items: [
            "Q: What if I forget the admin password?\nA: Contact the system administrator to reset it.",
            "Q: How do I expand storage?\nA: Insert a new drive and contact the administrator for configuration.",
            "Q: Can I recover accidentally deleted files?\nA: A trash bin feature is not yet available. Please confirm before deleting.",
            "Q: Remote access is slow. What can I do?\nA: Check your Tailscale connection status or contact the administrator for network optimization.",
          ],
        },
      ],
      tableSections: [
        {
          title: "Store in NAS or not? Advice from the Admin",
          headers: ["Important?", "Sharable?", "Storage", "Description"],
          rows: [
            ["✅", "✅", "NAS + Local", "LAN sharing, Local + NAS dual backup"],
            ["❌", "✅", "NAS", "LAN sharing, NAS storage"],
            ["✅", "❌", "Local", "Personal access, self backup"],
            ["❌", "❌", "Local", "Personal access, no backup"],
          ],
        },
      ],
    },
  },
};
