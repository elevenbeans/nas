"use client";

import { LanguageProvider } from "@/components/language-toggle";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
