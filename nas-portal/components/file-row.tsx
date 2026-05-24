"use client";

import { useState } from "react";
import FileIcon from "@/components/file-icon";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";
import {
  getFileCategory, isVideoBrowserSupported, isPreviewableInBrowser,
} from "@/lib/file-types";

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number | null;
  mtime: string;
  mimeType?: string | null;
};

type FileRowProps = {
  item: FileEntry;
  dir: string;
  onNavigate: (name: string) => void;
};

function formatSize(size: number): string {
  if (size > 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export default function FileRow({ item, dir, onNavigate }: FileRowProps) {
  const { locale } = useLanguage();
  const t = locales[locale];
  const [showVideo, setShowVideo] = useState(false);

  const itemPath = dir === "/" ? `/${item.name}` : `${dir}/${item.name}`;

  if (item.isDirectory) {
    return (
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f2] last:border-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon name={item.name} isDirectory path={itemPath} />
          <button
            onClick={() => onNavigate(item.name)}
            className="text-sm font-medium text-apple-text bg-transparent border-0 cursor-pointer hover:text-clean-blue truncate"
          >
            {item.name}
          </button>
        </div>
        <span className="text-xs text-apple-muted shrink-0 ml-4">—</span>
      </div>
    );
  }

  const category = getFileCategory(item.name);

  const renderAction = () => {
    if (category === "video" && isVideoBrowserSupported(item.name)) {
      return (
        <button
          onClick={() => setShowVideo(!showVideo)}
          className="text-xs text-clean-blue bg-transparent border-0 cursor-pointer hover:underline"
        >
          {showVideo ? t.files.hide : t.files.play}
        </button>
      );
    }
    if (isPreviewableInBrowser(item.name)) {
      return (
        <a
          href={`/api/files/download?path=${encodeURIComponent(itemPath)}&inline=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-clean-blue hover:underline"
        >
          {t.files.preview}
        </a>
      );
    }
    return (
      <a
        href={`/api/files/download?path=${encodeURIComponent(itemPath)}`}
        className="text-xs text-apple-muted hover:text-clean-blue"
      >
        {t.files.download}
      </a>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f2] last:border-0">
        <div className="flex items-center gap-3 min-w-0">
          <FileIcon name={item.name} isDirectory={false} path={itemPath} />
          <div className="min-w-0">
            <div className="text-sm text-apple-text truncate">{item.name}</div>
            <div className="mt-0.5">{renderAction()}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {item.size != null && (
            <span className="text-xs text-apple-muted">{formatSize(item.size)}</span>
          )}
        </div>
      </div>
      {showVideo && category === "video" && (
        <div className="px-5 py-3 border-b border-[#f0f0f2] bg-gray-50">
          <video
            controls
            autoPlay
            className="w-full max-h-[480px] rounded-lg"
            preload="metadata"
          >
            <source
              src={`/api/files/stream?path=${encodeURIComponent(itemPath)}`}
              type={item.mimeType || "video/mp4"}
            />
          </video>
        </div>
      )}
    </>
  );
}
