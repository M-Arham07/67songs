"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  PlusCircle,
  LogIn,
  LogOut,
  Radio,
  Music2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/lib/stores/room-store";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { roomId, roomCode, title, isMaster } = useRoomStore();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Create a Jam", href: "/create", icon: PlusCircle },
    { name: "Join a Jam", href: "/join", icon: Compass },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-[#262626] bg-[#0d0d0d] transition-all duration-150 select-none z-30 h-screen sticky top-0 shrink-0",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-[#262626]">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1db954] text-black font-black text-sm shrink-0">
            67
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[#fafafa]">
                67Songs
              </span>
              <span className="text-[10px] text-[#666666] uppercase tracking-wider">
                Sync Listening
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#666666] hover:text-[#fafafa] p-1 rounded transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#202020] text-[#fafafa] font-semibold"
                  : "text-[#a1a1a1] hover:bg-[#161616] hover:text-[#fafafa]"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Active Room Indicator in Sidebar */}
        {roomId && (
          <div className="pt-4 mt-4 border-t border-[#262626]">
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-[#666666]">
                Current Session
              </span>
            )}
            <Link
              href={`/room/${roomId}`}
              className={cn(
                "mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium border border-[#1db954]/30 bg-[#1db954]/5 text-[#1db954] hover:bg-[#1db954]/10 transition-colors",
                pathname.startsWith(`/room/${roomId}`) && "bg-[#1db954]/15"
              )}
              title={isCollapsed ? `Room: ${roomCode}` : undefined}
            >
              <Radio className="h-4 w-4 shrink-0 animate-pulse text-[#1db954]" />
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-semibold text-[#fafafa]">
                      {title || "Active Room"}
                    </span>
                    {isMaster && (
                      <Badge variant="master" className="text-[9px] px-1 py-0">
                        Master
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-[#a1a1a1]">
                    Code: {roomCode}
                  </span>
                </div>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#262626] text-[11px] text-[#666666]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <span>v1.0.0</span>
            <span className="text-[#1db954] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1db954]"></span>
              Online
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-[#1db954]"></span>
          </div>
        )}
      </div>
    </aside>
  );
}
