"use client";

import { useEffect, useState } from "react";

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number | null;
  mtime: string;
};

export default function FilesPage() {
  const [dir, setDir] = useState("/");
  const [items, setItems] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/files?path=${encodeURIComponent(dir)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items);
      })
      .catch(() => setError("Failed to load files"));
  }, [dir]);

  const goInto = (name: string) => {
    setDir((prev) => (prev === "/" ? `/${name}` : `${prev}/${name}`));
    setError("");
  };

  const goBack = () => {
    setDir((prev) => {
      const parts = prev.replace(/\/$/, "").split("/");
      parts.pop();
      return parts.join("/") || "/";
    });
    setError("");
  };

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">文件</h1>
      <p className="text-[15px] text-apple-muted mb-8">NAS‑Data{dir}</p>

      {dir !== "/" && (
        <button
          onClick={goBack}
          className="text-sm text-clean-blue mb-4 bg-transparent border-0 cursor-pointer"
        >
          ← 返回
        </button>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-[20px] overflow-hidden">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between px-5 py-3 border-b border-[#f0f0f2] last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-apple-muted text-lg">{item.isDirectory ? "📁" : "📄"}</span>
              {item.isDirectory ? (
                <button
                  onClick={() => goInto(item.name)}
                  className="text-sm font-medium text-apple-text bg-transparent border-0 cursor-pointer hover:text-clean-blue"
                >
                  {item.name}
                </button>
              ) : (
                <span className="text-sm text-apple-text">{item.name}</span>
              )}
            </div>
            {item.size != null && (
              <span className="text-xs text-apple-muted">
                {item.size > 1024 * 1024
                  ? `${(item.size / 1024 / 1024).toFixed(1)} MB`
                  : `${(item.size / 1024).toFixed(1)} KB`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
