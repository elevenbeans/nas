"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FolderOpen, Image, Settings, X } from "lucide-react";

const navItems = [
  { href: "/", label: "概览", icon: LayoutDashboard },
  { href: "/files", label: "文件", icon: FolderOpen },
  { href: "/photos", label: "照片", icon: Image },
  { href: "/settings", label: "设置", icon: Settings },
];

export default function TopNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 flex items-center justify-center h-14 bg-white border-b border-[#f0f0f2] px-4 sm:px-8">
        <div className="flex items-center w-full max-w-[920px]">
          <Link href="/" className="flex items-center gap-2.5 mr-8 shrink-0">
            <span className="font-heading text-[17px] font-bold tracking-tight">🏠 NAS </span>
          </Link>

          <div className="hidden sm:flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-[6px] transition-all ${
                    isActive
                      ? "text-clean-blue bg-[#eff6ff] font-semibold"
                      : "text-apple-muted hover:text-apple-text hover:bg-[#f5f5f7]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-4 shrink-0">
            <span className="hidden sm:block text-xs text-apple-muted font-medium">192.168.1.46</span>
            <div className="w-7 h-7 bg-clean-blue rounded-full flex items-center justify-center text-white text-[11px] font-heading font-semibold">
              E
            </div>
            <button
              className="flex sm:hidden flex-col gap-1.5 p-1.5 bg-transparent border-0 cursor-pointer"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
              <span className="block w-5 h-[2px] bg-apple-text rounded" />
            </button>
          </div>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[98]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {drawerOpen && (
      <div className="fixed top-0 right-0 w-[260px] h-full bg-white z-[99] p-6 shadow-[-2px_0_20px_rgba(0,0,0,0.08)]">
        <button
          className="absolute top-5 right-5 text-apple-muted text-2xl bg-transparent border-0 cursor-pointer"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5 mb-8 font-heading text-[17px] font-bold">
          <div className="w-[26px] h-[26px] bg-clean-blue rounded-[6px]" />
          NAS
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 text-[15px] font-medium px-3 py-3 rounded-lg mb-1 ${
                isActive
                  ? "text-clean-blue bg-[#eff6ff] font-semibold"
                  : "text-apple-muted"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
      )}
    </>
  );
}
