import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Sport — Tỷ số trực tiếp, lịch thi đấu, tin tức",
    template: "%s | Sport",
  },
  description:
    "Nền tảng thể thao: tỷ số trực tiếp, lịch thi đấu, kết quả, bảng xếp hạng, tin tức chuyển động.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
