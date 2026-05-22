"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PhotoInfo = { name: string; capturedAt: string; size: number };

const WIDTHS = [320, 640, 1024, 1920];

function srcSet(name: string): string {
  return WIDTHS
    .map((w) => `/api/photos/${encodeURIComponent(name)}?w=${w} ${w}w`)
    .join(", ");
}

export default function PhotoCarousel({ photos }: { photos: PhotoInfo[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const items = useMemo(
    () =>
      photos
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)),
    [photos]
  );

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
      const snapWidth = getSnapWidth();
      if (snapWidth <= 0) return;
      setActiveIdx(Math.round(el.scrollLeft / snapWidth));
      resetTimer();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [resetTimer, getSnapWidth]);

  useEffect(() => {
    if (items.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length, resetTimer]);

  if (items.length === 0) return null;

  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen mb-12">
      <div
        ref={scrollRef}
        className="overflow-x-auto [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] scrollbar-none"
      >
        <ul className="flex gap-5 list-none p-0 m-0" role="list">
          {items.map((p, i) => (
            <li
              key={p.name}
              className="shrink-0 flex-[0_0_80%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] scroll-snap-start aspect-video"
            >
              <div
                className={`overflow-hidden rounded-2xl shadow-sm w-full h-full ${
                  i === 0
                    ? "pl-[max(16px,min(calc(50vw-444px),30%))] sm:pl-[max(24px,min(calc(50vw-436px),30%))]"
                    : ""
                }`}
              >
                <img
                  src={`/api/photos/${encodeURIComponent(p.name)}?w=1024`}
                  srcSet={srcSet(p.name)}
                  sizes="(max-width: 639px) 80vw, (max-width: 1023px) 50vw, 33vw"
                  alt={p.name}
                  className="w-full h-full object-cover bg-[#e8e8ed] rounded-2xl"
                  loading="lazy"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ul className="flex gap-1.5 mt-3 list-none p-0 justify-center">
        {items.map((p, i) => (
          <li
            key={p.name}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIdx ? "w-5 bg-clean-blue" : "w-1.5 bg-[#d4d4d8]"
            }`}
          />
        ))}
      </ul>
    </div>
  );
}
