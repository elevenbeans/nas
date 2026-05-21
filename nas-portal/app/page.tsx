"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSystemStatus, type SystemStatus } from "@/lib/api";
import { HardDrive, Radio, Wifi, Image } from "lucide-react";

type PhotoInfo = { name: string; mtime: string; size: number };

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(console.error);
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const newCount = photos.filter((p) => p.mtime.slice(0, 10) === today).length;
  const carouselPhotos = photos.slice(0, 10);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (carouselPhotos.length <= 1) return;
    timerRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const snapWidth = el.clientWidth * 0.8 + 12;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - snapWidth) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: snapWidth, behavior: "smooth" });
      }
    }, 4000);
  }, [carouselPhotos.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const snapWidth = el.clientWidth * 0.8 + 12;
      const idx = Math.round(el.scrollLeft / snapWidth);
      setActiveIdx(idx);
      resetTimer();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [resetTimer]);

  useEffect(() => {
    if (carouselPhotos.length > 1) resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [carouselPhotos.length, resetTimer]);

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <div className="mb-9 px-0.5 text-center">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          Hi, Eva
        </h1>
        <p className="text-[15px] text-apple-muted">欢迎回家</p>
      </div>

      {/* Photos block — 80vw breakout, auto-play */}
      {carouselPhotos.length > 0 && (
      <div className="relative left-1/2 -translate-x-1/2 w-screen mb-12">
        <div
          ref={scrollRef}
          className="overflow-x-auto [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] scrollbar-none"
        >
          <ul className="flex gap-5 list-none p-0 m-0" role="list">
            {carouselPhotos.map((p, i) => (
              <li
                key={p.name}
                className="shrink-0 flex-[0_0_80%] scroll-snap-start aspect-video"
              >
                <div className={`overflow-hidden rounded-2xl shadow-sm w-full h-full ${i === 0 ? "pl-[max(8px,calc(50vw-470px))] sm:pl-[max(16px,calc(50vw-470px))]" : ""}`}>
                  <img
                    src={`/api/photos/${encodeURIComponent(p.name)}`}
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
          {carouselPhotos.map((p, i) => (
            <li
              key={p.name}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx
                  ? "w-5 bg-clean-blue"
                  : "w-1.5 bg-[#d4d4d8]"
              }`}
            />
          ))}
        </ul>
      </div>
      )}

      {/* Storage block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">存储</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="text-[13px] text-apple-muted mb-2">
            <strong className="text-apple-text font-semibold">
              {status?.storage.used ?? "—"}
            </strong>{" "}
            of {status?.storage.total ?? "—"} 已使用
          </div>
          <div className="h-[5px] bg-[#e8e8ed] rounded-[3px]">
            <div
              className="h-[5px] bg-clean-blue rounded-[3px] transition-all"
              style={{ width: `${status?.storage.percent ?? 45}%` }}
            />
          </div>
        </div>
      </div>

      {/* Network block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <Wifi className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">网络</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-heading text-xl font-bold tracking-tight">
                {status?.network.ip ?? "192.168.1.46"}
              </div>
              <div className="text-[13px] text-green-600">已连接</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-apple-muted">Mac Mini</div>
              <div className="text-[13px] text-apple-muted">{status?.network.interface ?? "en0"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Services block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">服务</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-[7px] h-[7px] rounded-full bg-green-600" />
              SMB
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
