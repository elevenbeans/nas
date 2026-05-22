"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

type Photo = { name: string; capturedAt: string; size: number };
type Group = { date: string; photos: Photo[] };

function formatDate(iso: string, fmt: string) {
  const d = new Date(iso);
  return fmt
    .replace("{y}", String(d.getFullYear()))
    .replace("{m}", String(d.getMonth() + 1))
    .replace("{d}", String(d.getDate()));
}

function groupByDate(photos: Photo[]): Group[] {
  const map = new Map<string, Photo[]>();
  for (const p of photos) {
    const d = p.capturedAt.slice(0, 7);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(p);
  }
  return Array.from(map.entries()).map(([date, photos]) => ({ date, photos }));
}

export default function PhotosPage() {
  const { locale } = useLanguage();
  const t = locales[locale];
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => {
        setGroups(groupByDate(data.photos || []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">{t.nav.photos}</h1>
      <p className="text-[15px] text-apple-muted mb-8">{t.photos.subtitle}</p>

      {loading ? (
        <div className="text-sm text-apple-muted text-center py-10">{t.photos.loading}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-[20px] p-10 text-center text-apple-muted text-sm">
          {t.photos.empty}
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.date} className="mb-8">
            <div className="font-heading text-sm font-semibold text-apple-muted mb-3 px-0.5">
              {formatDate(g.date, t.photos.dateFmt)}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {g.photos.map((p) => (
                <a
                  key={p.name}
                  href={`/api/photos/${encodeURIComponent(p.name)}`}
                  target="_blank"
                  className="block aspect-square rounded-xl overflow-hidden bg-[#e8e8ed] hover:opacity-80 transition-opacity"
                >
                  <img
                    src={`/api/photos/${encodeURIComponent(p.name)}?w=400`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
