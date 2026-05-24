"use client";

import { useState } from "react";
import {
  FileText, FileSpreadsheet, FileArchive, FileVideo, FileMusic,
  File as FileDoc, Folder,
} from "lucide-react";
import { getFileCategory, isVideoBrowserSupported } from "@/lib/file-types";

type FileIconProps = {
  name: string;
  isDirectory: boolean;
  path: string;
};

const iconMap: Record<string, typeof FileText> = {
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  archive: FileArchive,
  code: FileText,
  text: FileText,
  audio: FileMusic,
  video: FileVideo,
};

const bgColors: Record<string, string> = {
  pdf: "bg-red-50",
  document: "bg-blue-50",
  spreadsheet: "bg-green-50",
  archive: "bg-stone-100",
  code: "bg-gray-100",
  text: "bg-gray-100",
  audio: "bg-gray-100",
  video: "bg-neutral-900",
};

const iconColors: Record<string, string> = {
  pdf: "text-red-600",
  document: "text-blue-600",
  spreadsheet: "text-green-600",
  archive: "text-stone-500",
  code: "text-gray-500",
  text: "text-gray-500",
  audio: "text-gray-500",
  video: "text-white",
};

export default function FileIcon({ name, isDirectory, path }: FileIconProps) {
  const [thumbError, setThumbError] = useState(false);

  if (isDirectory) {
    return (
      <div className="w-11 h-11 rounded-[6px] bg-gray-100 flex items-center justify-center shrink-0">
        <Folder className="w-5 h-5 text-gray-500" />
      </div>
    );
  }

  const category = getFileCategory(name);

  if (category === "image" && !thumbError) {
    return (
      <div className="w-11 h-11 rounded-[6px] overflow-hidden shrink-0 bg-gray-100">
        <img
          src={`/api/files/thumbnail?path=${encodeURIComponent(path)}`}
          alt={name}
          width={200}
          height={200}
          className="w-full h-full object-cover"
          onError={() => setThumbError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  const Icon = iconMap[category] || FileDoc;

  return (
    <div className={`w-11 h-11 rounded-[6px] ${bgColors[category] || "bg-gray-100"} flex items-center justify-center shrink-0`}>
      <Icon className={`w-5 h-5 ${iconColors[category] || "text-gray-500"}`} />
    </div>
  );
}
