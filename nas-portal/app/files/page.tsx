"use client";

import { useEffect, useRef, useState } from "react";
import FileRow from "@/components/file-row";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

type FileEntry = {
  name: string;
  isDirectory: boolean;
  size: number | null;
  mtime: string;
  mimeType?: string | null;
};

export default function FilesPage() {
  const { locale } = useLanguage();
  const t = locales[locale];
  const [dir, setDir] = useState("/");
  const [items, setItems] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetch(`/api/files?path=${encodeURIComponent(dir)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(t.files.loadError);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [dir, t.files.loadError]);

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
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">{t.nav.files}</h1>
      <p className="text-[15px] text-apple-muted mb-4">NAS‑Data{dir}</p>

      {dir !== "/" && (
        <button
          onClick={goBack}
          className="text-sm text-clean-blue mb-4 bg-transparent border-0 cursor-pointer"
        >
          {t.files.back}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading && items.length === 0 && (
        <div className="bg-white rounded-[20px] overflow-hidden py-8 text-center text-sm text-apple-muted">
          {t.photos.loading}
        </div>
      )}
      {!loading && (
        <div className="bg-white rounded-[20px] overflow-hidden">
          {items.map((item) => (
            <FileRow
              key={item.name}
              item={item}
              dir={dir}
              onNavigate={goInto}
            />
          ))}
        </div>
      )}
    </div>
  );
}
