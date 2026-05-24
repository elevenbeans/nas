const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif",
  ".webp": "image/webp", ".heic": "image/heic",
  ".heif": "image/heif", ".avif": "image/avif",
  ".tiff": "image/tiff", ".tif": "image/tiff",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4", ".webm": "video/webm",
  ".mov": "video/quicktime", ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg", ".wav": "audio/wav",
  ".flac": "audio/flac", ".aac": "audio/aac",
  ".m4a": "audio/mp4", ".opus": "audio/opus",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".txt": "text/plain", ".md": "text/markdown",
  ".json": "application/json", ".xml": "application/xml",
  ".yaml": "text/yaml", ".yml": "text/yaml",
  ".js": "text/javascript", ".ts": "text/typescript",
  ".py": "text/x-python", ".sh": "text/x-shellscript",
  ".html": "text/html", ".css": "text/css",
  ".zip": "application/zip", ".tar": "application/x-tar",
  ".gz": "application/gzip", ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
};

const BROWSER_VIDEO = new Set([".mp4", ".webm"]);

export type FileCategory =
  | "image" | "video" | "audio" | "pdf"
  | "document" | "spreadsheet" | "archive"
  | "code" | "text" | "other";

export function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i);
}

export function getMimeType(filename: string): string {
  return EXT_MIME[getExtension(filename).toLowerCase()] || "application/octet-stream";
}

export function getFileCategory(filename: string): FileCategory {
  const ext = getExtension(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif", ".tiff", ".tif", ".bmp"].includes(ext)) return "image";
  if ([".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".flac", ".aac", ".m4a", ".opus"].includes(ext)) return "audio";
  if (ext === ".pdf") return "pdf";
  if ([".doc", ".docx"].includes(ext)) return "document";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "spreadsheet";
  if ([".zip", ".tar", ".gz", ".rar", ".7z"].includes(ext)) return "archive";
  if ([".js", ".ts", ".py", ".sh", ".html", ".css", ".json", ".xml", ".yaml", ".yml"].includes(ext)) return "code";
  if ([".txt", ".md"].includes(ext)) return "text";
  return "other";
}

export function isVideoBrowserSupported(filename: string): boolean {
  return BROWSER_VIDEO.has(getExtension(filename).toLowerCase());
}

export function isPreviewableInBrowser(filename: string): boolean {
  return getFileCategory(filename) === "pdf" || getFileCategory(filename) === "text" || getFileCategory(filename) === "code";
}
