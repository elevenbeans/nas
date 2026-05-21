import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/top-nav";

export const metadata: Metadata = {
  title: "NAS 管理面板",
  description: "家庭 NAS 管理界面",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>
        <TopNav />
        <main>{children}</main>
        <footer className="bg-white border-t border-[#f0f0f2] px-4 sm:px-8">
          <div className="max-w-[920px] mx-auto py-8 text-center text-[13px] text-apple-muted leading-relaxed">
            <div>Powered by</div>
            <div className="flex gap-3 justify-center">
              <a href="https://chat.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-clean-blue hover:underline">Deepseek v4</a>
              <a href="https://elevenbeans.github.io" target="_blank" rel="noopener noreferrer" className="text-clean-blue hover:underline">elevenbeans.github.io</a>
              <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" className="text-clean-blue hover:underline">opencode</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
