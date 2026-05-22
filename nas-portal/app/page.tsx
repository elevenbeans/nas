"use client";

import { useEffect, useState } from "react";
import { fetchSystemStatus, type SystemStatus } from "@/lib/api";
import { HardDrive, Radio, Wifi, Image } from "lucide-react";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";
import PhotoCarousel, { type PhotoInfo } from "@/components/photo-carousel";

export default function Dashboard() {
  const { locale } = useLanguage();
  const t = locales[locale].dashboard;
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(console.error);
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 pt-10 pb-20">
      <div className="mb-9 px-0.5 text-center">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-1">
          Hi, Eva
        </h1>
        <p className="text-[15px] text-apple-muted">{t.welcomeBack}</p>
      </div>

      <PhotoCarousel photos={photos} />

      {/* Storage block */}
      <div className="bg-white rounded-[20px] p-6 mb-4">
        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-clean-blue" />
          </div>
          <span className="font-heading text-[15px] font-semibold">{t.storage}</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="text-[13px] text-apple-muted mb-2">
            <strong className="text-apple-text font-semibold">
              {status?.storage.used ?? "—"}
            </strong>{" "}
            {t.storageUsed.replace("{used}", "").replace("{total}", status?.storage.total ?? "—")}
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
          <span className="font-heading text-[15px] font-semibold">{t.network}</span>
        </div>
        <div className="sm:pl-[54px]">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-heading text-xl font-bold tracking-tight">
                {status?.network.ip ?? "192.168.1.46"}
              </div>
              <div className="text-[13px] text-green-600">{t.connected}</div>
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
          <span className="font-heading text-[15px] font-semibold">{t.services}</span>
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
