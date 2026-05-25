"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, FolderOpen, Image, Settings, BookOpen, X, Compass } from "lucide-react";
import LanguageToggle from "@/components/language-toggle";
import { useLanguage } from "@/components/language-toggle";
import { locales } from "@/lib/i18n";

export default function TopNav() {
  const pathname = usePathname();
  const { locale } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (!menuOpen || !buttonRef.current) {
      setPositions([]);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const R = rect.width * 1.4;
    const items: { x: number; y: number }[] = [];
    for (let i = 0; i < navItems.length; i++) {
      const deg = 270 - i * 45;
      const rad = (deg * Math.PI) / 180;
      items.push({ x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) });
    }
    setPositions(items);
  }, [menuOpen, navItems.length]);

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

      {/* Mobile right-side floating button + radial menu */}
      <div className="sm:hidden">
        <button
          ref={buttonRef}
          onClick={() => setMenuOpen(!menuOpen)}
          className="fixed z-50 w-20 h-20 bg-white border border-[#e5e5e7] shadow-xl rounded-full flex items-center justify-center text-clean-blue hover:text-clean-blue transition-all active:scale-90"
          style={{ right: "16px", top: "55%", transform: "translateY(-50%)" }}
          aria-label="Navigation menu"
        >
          <Compass className="w-8 h-8" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            {navItems.map((item, i) => {
              const pos = positions[i];
              if (!pos) return null;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="fixed z-50 w-16 h-16 rounded-full flex flex-col items-center justify-center gap-[1px] shadow-lg border border-[#f0f0f2] transition-all active:scale-90"
                  style={{
                    left: pos.x,
                    top: pos.y,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: isActive ? "#eff6ff" : "white",
                  }}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] ${isActive ? "text-clean-blue" : "text-apple-muted"}`}
                  />
                  <span
                    className={`text-[10px] font-medium leading-none ${isActive ? "text-clean-blue" : "text-apple-muted"}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
