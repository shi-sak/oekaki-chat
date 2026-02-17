import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SITE_URL } from "@/constants/top";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // ▼ これがないと画像が出ないことがあります！
  metadataBase: new URL(SITE_URL),

  title: "HYPER OEKAKI CHAT",
  description: "60分お絵描きチャット",
  icons: {
    icon: "/favicon.webp",
  },

  openGraph: {
    title: "HYPER OEKAKI CHAT",
    description: "60分お絵描きチャット",
    url: SITE_URL,
    siteName: "HYPER OEKAKI CHAT",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/ogp_default.png", // publicフォルダの中身を指定
        width: 1200,
        height: 630,
        alt: "HYPER OEKAKI CHAT",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "HYPER OEKAKI CHAT",
    description: "60分お絵描きチャット",
    images: ["/ogp_default.png"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
