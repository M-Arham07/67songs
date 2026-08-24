"use client";

import * as React from "react";
import { Radio, AlertTriangle, Loader2 } from "lucide-react";
import { useRoomStore } from "@/lib/stores/room-store";

export function MasterGraceOverlay() {
  const { isHostGraceActive, hostGraceExpiresAt } = useRoomStore();
  const [secondsRemaining, setSecondsRemaining] = React.useState(60);

  React.useEffect(() => {
    if (!isHostGraceActive || !hostGraceExpiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((hostGraceExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isHostGraceActive, hostGraceExpiresAt]);

  if (!isHostGraceActive) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-500/50 bg-[#16130b] text-amber-300 shadow-2xl backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 animate-bounce" />
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">Master Disconnected</span>
        <span className="text-amber-400/70">•</span>
        <span>Awaiting reconnect ({secondsRemaining}s)</span>
      </div>
      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 ml-1" />
    </div>
  );
}
