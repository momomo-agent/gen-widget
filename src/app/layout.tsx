import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gen Widget — AI Native OS Widgets",
  description: "Generate contextual OS widgets from natural language",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
