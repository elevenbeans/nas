"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PhotoInfo = { name: string; capturedAt: string; size: number };

const WIDTHS = [320, 640, 1024, 1920];

function srcSet(name: string): string {
  return WIDTHS
    .map((w) => `/api/photos/${encodeURIComponent(name)}?w=${w} ${w}w`)
    .join(", ");
}

let cachedItems: PhotoInfo[] | null = null;

export default function PhotoCarousel({ photos, loading }: { photos: PhotoInfo[]; loading?: boolean }) {
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  if (photos.length && !cachedItems) {
    cachedItems = photos
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }
  const items = cachedItems ?? [];

  const getSnapWidth = useCallback((): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    const children = el.querySelector("ul")?.children;
    if (!children || children.length < 2) return el.clientWidth;
    const a = children[0] as HTMLElement;
    const b = children[1] as HTMLElement;
    return b.offsetLeft - a.offsetLeft;
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const snapWidth = getSnapWidth();
      if (snapWidth <= 0) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - snapWidth) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: snapWidth, behavior: "smooth" });
      }
    }, 4000);
  }, [items.length, getSnapWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
      resetTimer();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [resetTimer]);

  useEffect(() => {
    if (items.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length, resetTimer]);

  if (loading && items.length === 0) {
    return (
      <div className="relative left-1/2 -translate-x-1/2 w-screen mb-6">
        <style>{`@keyframes carouselZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
        <div className="bg-[#e8e8ed] h-48 md:h-64 w-full animate-pulse" />
        <div className="w-[max(16px,min(calc(50vw-444px),30%))] sm:w-[max(24px,min(calc(50vw-436px),30%))] h-1 bg-[#e8e8ed] rounded-full mt-6 mx-auto overflow-hidden">
          <div className="h-full w-1/3 bg-[#d4d4d8] rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen mb-6">
      <style>{`@keyframes carouselZoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      <div
        ref={scrollRef}
        className="overflow-x-auto [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] scrollbar-none"
      >
        <ul className="flex gap-5 list-none p-0 m-0" role="list">
          {items.map((p, i) => (
            <li
              key={p.name}
              className={`shrink-0 scroll-snap-start box-border ${
                i === 0
                  ? "pl-[max(16px,min(calc(50vw-444px),30%))] sm:pl-[max(24px,min(calc(50vw-436px),30%))]"
                  : ""
              }`}
            >
              <div
                style={{ animationDelay: `${i * 600}ms` }}
                className="rounded-2xl shadow-sm overflow-hidden bg-[#e8e8ed] animate-[carouselZoomIn_600ms_ease-out_both]"
              >
                <img
                  src={`/api/photos/${encodeURIComponent(p.name)}?w=1024`}
                  srcSet={srcSet(p.name)}
                  sizes="(max-width: 639px) 80vw, (max-width: 1023px) 50vw, 33vw"
                  alt={p.name}
                  className="h-48 md:h-64 w-auto bg-[#e8e8ed] rounded-2xl"
                  loading="lazy"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-[max(16px,min(calc(50vw-444px),30%))] sm:w-[max(24px,min(calc(50vw-436px),30%))] h-1 bg-[#e8e8ed] rounded-full mt-6 mx-auto overflow-hidden">
        <div className="h-full bg-clean-blue rounded-full" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
