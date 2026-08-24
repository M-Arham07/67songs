"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { NowPlayingBar } from "@/components/layout/now-playing-bar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useRoomStore } from "@/lib/stores/room-store";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentTrack } = useRoomStore();

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-[#fafafa]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main
          className={`flex-1 pb-24 ${
            currentTrack ? "pb-28" : "pb-20"
          } md:pb-24`}
        >
          {children}
        </main>
      </div>

      {/* Persistent Now-Playing Bar */}
      <NowPlayingBar />

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
