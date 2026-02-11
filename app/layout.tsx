import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PublicHeader from "@/components/PublicHeader";
import ScrollProgressBtn from "@/components/ScrollProgressBtn";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "松本 友弥 Portfolio",
  description: "フォトグラファー 松本 友弥のポートフォリオサイトです。実績やご依頼の流れを紹介しています。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-gray-900`}
      >
        <PublicHeader />
        <main>
          {children}
        </main>
        <ScrollProgressBtn />
      </body>
    </html>
  );
}
