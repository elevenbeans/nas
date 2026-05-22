"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

type LanguageContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const LanguageContext = createContext<LanguageContextType>({ locale: "zh", setLocale: () => {} });

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nas-locale") as Locale | null;
    if (stored === "zh" || stored === "en") {
      setLocale(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem("nas-locale", locale);
  }, [locale, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <button
      onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
      className="text-[12px] font-medium text-apple-muted hover:text-apple-text bg-transparent border border-[#e5e5e7] rounded-[6px] px-2.5 py-1 transition-all hover:bg-[#f5f5f7] cursor-pointer"
      aria-label="Toggle language"
    >
      {locale === "zh" ? "EN" : "中"}
    </button>
  );
}
