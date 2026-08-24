import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "67Songs — Synchronized Music Rooms",
  description:
    "Listen to music together in real-time. Start a room, invite friends with a code or QR, and synchronize playback perfectly across browsers.",
  openGraph: {
    title: "67Songs — Synchronized Music Rooms",
    description: "Social, synchronized music listening.",
    siteName: "67Songs",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-[#fafafa] min-h-screen selection:bg-[#1db954]/30 selection:text-[#fafafa]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
