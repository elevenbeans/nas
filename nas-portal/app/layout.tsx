import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAS Portal",
  description: "Home NAS management interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
