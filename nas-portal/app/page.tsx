"use client";

import { useEffect, useState } from "react";
import { fetchSystemStatus, type SystemStatus } from "@/lib/api";
import { HardDrive, Radio, Wifi, Image } from "lucide-react";

const photos = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  label: `IMG_${String(1000 + i).slice(1)}`,
}));

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(console.error);
  }, []);

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <div className="mb-9 px-0.5">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          Good evening.
        </h1>
        <p className="text-[15px] text-apple-muted">NAS‑Data is up and running.</p>
      </div>

      {/* Photos block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <Image className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">Photos</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="media-gallery-wrapper w-full mx-auto">
            <div className="gallery scroll-container overflow-x-auto [-webkit-overflow-scrolling:touch] [scroll-snap-type:x_mandatory] scrollbar-none">
              <ul className="item-container flex gap-3 w-max list-none p-0" role="list">
                {photos.map((p) => (
                  <li
                    key={p.id}
                    className="gallery-item shrink-0 scroll-snap-start rounded-xl overflow-hidden h-[200px] first:w-[600px] sm:[&:first-child]:w-[600px] [&:first-child]:w-[375px] max-sm:h-[140px] bg-[#e8e8ed] flex items-center justify-center text-apple-muted text-sm"
                  >
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="flex gap-1.5 mt-3 list-none p-0">
            {photos.map((p, i) => (
              <li
                key={p.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === 0 ? "w-5 bg-clean-blue" : "w-1.5 bg-[#d4d4d8]"
                }`}
              />
            ))}
          </ul>
          <div className="text-[13px] text-apple-muted mt-0.5">42 new · Today</div>
        </div>
      </div>

      {/* Storage block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">Storage</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="text-[13px] text-apple-muted mb-2">
            <strong className="text-apple-text font-semibold">
              {status?.storage.used ?? "—"}
            </strong>{" "}
            of {status?.storage.total ?? "—"} used
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
          <span className="font-heading text-[15px] font-semibold">Network</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-heading text-xl font-bold tracking-tight">
                {status?.network.ip ?? "192.168.1.46"}
              </div>
              <div className="text-[13px] text-green-600">Connected</div>
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
          <span className="font-heading text-[15px] font-semibold">Services</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-[7px] h-[7px] rounded-full bg-green-600" />
              SMB
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-[7px] h-[7px] rounded-full ${status?.services.jellyfin ? "bg-green-600" : "bg-[#d4d4d8]"}`} />
              Jellyfin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
