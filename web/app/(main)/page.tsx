"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Compass, Radio, Music, Users, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRoomStore } from "@/lib/stores/room-store";
import { normalizeRoomCode } from "@/lib/utils/room-code";

export default function HomePage() {
  const router = useRouter();
  const { roomId, roomCode, title } = useRoomStore();
  const [quickCode, setQuickCode] = React.useState("");

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeRoomCode(quickCode);
    if (clean.length === 4) {
      router.push(`/join?code=${clean}`);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-10">
      {/* Active Session Callout if connected */}
      {roomId && (
        <div className="flex items-center justify-between p-4 rounded-lg border border-[#1db954]/40 bg-[#1db954]/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#1db954]/20 flex items-center justify-center text-[#1db954]">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#fafafa]">
                  Active Jam in Progress: {title}
                </span>
                <Badge variant="master" className="text-[10px]">
                  {roomCode}
                </Badge>
              </div>
              <p className="text-xs text-[#a1a1a1]">
                You are currently in this room session.
              </p>
            </div>
          </div>
          <Button asChild variant="primary" size="sm">
            <Link href={`/room/${roomId}`}>Resume Jam</Link>
          </Button>
        </div>
      )}

      {/* Hero Action Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start a Jam Card */}
        <div className="flex flex-col justify-between p-6 rounded-lg border border-[#262626] bg-[#111111] hover:border-[#383838] transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-md bg-[#1db954]/10 border border-[#1db954]/30 flex items-center justify-center text-[#1db954]">
                <Plus className="h-5 w-5" />
              </div>
              <Badge variant="master">You become Master</Badge>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#fafafa]">
                Start a Listening Jam
              </h2>
              <p className="text-xs text-[#a1a1a1] mt-1 leading-relaxed">
                Create a synchronized room in seconds. Search songs via YouTube Music, invite friends via QR or a 4-letter code, and retain full master playback control.
              </p>
            </div>
          </div>
          <div className="pt-6">
            <Button asChild variant="primary" className="w-full gap-2">
              <Link href="/create">
                <span>Create Room</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Join a Jam Card */}
        <div className="flex flex-col justify-between p-6 rounded-lg border border-[#262626] bg-[#111111] hover:border-[#383838] transition-colors">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-md bg-[#262626] flex items-center justify-center text-[#fafafa]">
                <Compass className="h-5 w-5" />
              </div>
              <span className="text-[11px] text-[#666666] font-mono uppercase tracking-wider">
                Instant Join
              </span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#fafafa]">
                Join with 4-Letter Code
              </h2>
              <p className="text-xs text-[#a1a1a1] mt-1 leading-relaxed">
                Have a room code? Enter it below or scan the host&apos;s QR code to jump straight into the session with zero login required.
              </p>
            </div>
          </div>
          <form onSubmit={handleQuickJoin} className="pt-4 flex gap-2">
            <Input
              type="text"
              placeholder="e.g. 7X9K"
              maxLength={4}
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
              className="font-mono text-center tracking-widest text-sm uppercase"
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={quickCode.trim().length !== 4}
              className="shrink-0"
            >
              Join
            </Button>
          </form>
        </div>
      </div>

      {/* Feature Principles Grid */}
      <div className="space-y-4 pt-4 border-t border-[#262626]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
          How 67Songs Synchronizes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-md border border-[#262626] bg-[#0d0d0d] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#fafafa]">
              <Radio className="h-4 w-4 text-[#1db954]" />
              <span>Realtime Time-Sync</span>
            </div>
            <p className="text-[11px] text-[#a1a1a1] leading-relaxed">
              Commands schedule playback 2–3s in advance. Sub-second drift correction keeps all browsers aligned without audio streaming.
            </p>
          </div>

          <div className="p-4 rounded-md border border-[#262626] bg-[#0d0d0d] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#fafafa]">
              <ShieldCheck className="h-4 w-4 text-[#0070f3]" />
              <span>Master Device Control</span>
            </div>
            <p className="text-[11px] text-[#a1a1a1] leading-relaxed">
              The room creator controls the music queue. Guests can submit track requests for the master to accept or reject with one click.
            </p>
          </div>

          <div className="p-4 rounded-md border border-[#262626] bg-[#0d0d0d] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#fafafa]">
              <Music className="h-4 w-4 text-purple-400" />
              <span>YT Music Discovery</span>
            </div>
            <p className="text-[11px] text-[#a1a1a1] leading-relaxed">
              Instant access to millions of songs, albums, and artists powered by isolated FastAPI ytmusicapi discovery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
