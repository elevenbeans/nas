import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/top-nav";

export const metadata: Metadata = {
  title: "NAS Portal",
  description: "Home NAS management interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
