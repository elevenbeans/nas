"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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

function dirFromUrl(pathname: string): string {
  const parts = pathname.replace(/^\/files\/?/, "").split("/").filter(Boolean);
  return parts.length === 0 ? "/" : "/" + parts.join("/");
}

export default function FilesBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLanguage();
  const t = locales[locale];
  const [items, setItems] = useState<FileEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const dir = dirFromUrl(pathname);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetch(`/api/files?path=${encodeURIComponent(dir)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setItems(data.items);
          setRestricted(data.restricted === true);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(t.files.loadError);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [dir, t.files.loadError]);

  const goInto = useCallback(
    (name: string) => {
      const next = dir === "/" ? `/${name}` : `${dir}/${name}`;
      router.push(`/files${next}`);
      setError("");
    },
    [dir, router],
  );

  const goBack = useCallback(() => {
    const parent = dir.replace(/\/[^/]*$/, "") || "/";
    router.push(`/files${parent === "/" ? "" : parent}`);
    setError("");
  }, [dir, router]);

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

      {restricted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-medium text-amber-800">{t.files.restrictedTitle}</p>
          <p className="text-xs text-amber-700 mt-1">{t.files.restrictedNotice}</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {loading && items.length === 0 && (
        <div className="bg-white rounded-[20px] overflow-hidden py-8 text-center text-sm text-apple-muted">
          {t.photos.loading}
        </div>
      )}
      {!loading && items.length === 0 && !error && (
        <div className="bg-white rounded-[20px] overflow-hidden py-10 text-center text-sm text-apple-muted">
          {t.files.emptyDir}
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="bg-white rounded-[20px] overflow-hidden">
          {items.map((item) => (
            <FileRow key={item.name} item={item} dir={dir} onNavigate={goInto} restricted={restricted} />
          ))}
        </div>
      )}
    </div>
  );
}
