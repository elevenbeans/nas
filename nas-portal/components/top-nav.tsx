"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, FolderOpen, Image, Settings, BookOpen, X, Grid3x3 } from "lucide-react";
import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

export default function TopNav() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { href: "/", label: locales[locale].nav.overview, icon: LayoutDashboard },
    { href: "/files", label: locales[locale].nav.files, icon: FolderOpen },
    { href: "/photos", label: locales[locale].nav.photos, icon: Image },
    { href: "/guide", label: locales[locale].nav.guide, icon: BookOpen },
    { href: "/settings", label: locales[locale].nav.settings, icon: Settings },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const currentItem = navItems.find((i) => i.href === pathname);

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

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <LanguageToggle />
            <div className="w-7 h-7 bg-clean-blue rounded-full flex items-center justify-center text-white text-[11px] font-heading font-semibold">
              E
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile right-side floating button + popover */}
      <div className="sm:hidden" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="fixed z-50 w-11 h-11 bg-white border border-[#e5e5e7] shadow-lg rounded-full flex items-center justify-center text-apple-muted hover:text-apple-text transition-all active:scale-95"
          style={{ right: "16px", top: "55%" }}
          aria-label="Navigation menu"
        >
          <Grid3x3 className="w-5 h-5" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="fixed z-50 bg-white rounded-[16px] shadow-xl border border-[#f0f0f2] overflow-hidden"
              style={{ right: "68px", top: "55%", transform: "translateY(-50%)" }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0f2]">
                <span className="text-[13px] font-semibold text-apple-text">Navigation</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-apple-muted bg-transparent border-0 cursor-pointer p-0.5"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-[15px] font-medium transition-all ${
                      isActive
                        ? "text-clean-blue bg-[#eff6ff]"
                        : "text-apple-muted hover:bg-[#f5f5f7]"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
