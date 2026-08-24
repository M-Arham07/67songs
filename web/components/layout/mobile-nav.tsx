"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, PlusCircle, Radio } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useRoomStore } from "@/lib/stores/room-store";

export function MobileNav() {
  const pathname = usePathname();
  const { roomId, roomCode } = useRoomStore();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Create", href: "/create", icon: PlusCircle },
    { name: "Join", href: "/join", icon: Compass },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-[#262626] bg-[#0c0c0c]/95 backdrop-blur-md flex items-center justify-around select-none">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors w-16 py-1",
              isActive ? "text-[#fafafa] font-semibold" : "text-[#666666]"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}

      {roomId && (
        <Link
          href={`/room/${roomId}`}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[#1db954] w-16 py-1",
            pathname.startsWith(`/room/${roomId}`) && "font-bold"
          )}
        >
          <Radio className="h-4 w-4 animate-pulse text-[#1db954]" />
          <span>Room</span>
        </Link>
      )}
    </nav>
  );
}
