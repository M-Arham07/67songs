"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Compass, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizeRoomCode } from "@/lib/utils/room-code";

function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = React.useState(normalizeRoomCode(initialCode));
  const [displayName, setDisplayName] = React.useState("");
  const [step, setStep] = React.useState<"code" | "guest_name">("code");
  const [resolvedRoom, setResolvedRoom] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-resolve code if passed via query params
  React.useEffect(() => {
    if (initialCode && initialCode.length === 4) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = async (lookupCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const clean = normalizeRoomCode(lookupCode);
      const res = await fetch(`/api/rooms/resolve/${clean}`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Room not found");
      }

      setResolvedRoom(json);
      setStep("guest_name");
    } catch (err: any) {
      setError(err.message || "Failed to find room with that code");
      toast.error(err.message || "Room not found");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 4) {
      handleLookup(code);
    }
  };

  const handleJoinFinal = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = displayName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    sessionStorage.setItem(`guest_name_${resolvedRoom.roomId}`, finalName);
    router.push(`/room/${resolvedRoom.roomId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[#fafafa]">Join a Jam</h1>
          <p className="text-xs text-[#a1a1a1]">
            Enter the 4-letter room code to jump in.
          </p>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#262626] rounded-lg p-6 space-y-6">
        {step === "code" ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#fafafa]">
                4-Character Room Code
              </label>
              <Input
                type="text"
                placeholder="e.g. 7X9K"
                maxLength={4}
                autoFocus
                value={code}
                onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
                className="font-mono text-center text-xl tracking-[0.5em] h-12 uppercase"
              />
              <p className="text-[11px] text-[#666666]">
                Case-insensitive, letters and numbers only.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded bg-[#e5484d]/10 border border-[#e5484d]/30 text-xs text-[#e5484d]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={code.length !== 4 || isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Looking up Jam...</span>
                </>
              ) : (
                <>
                  <span>Find Jam</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoinFinal} className="space-y-4">
            <div className="p-3 rounded border border-[#262626] bg-[#161616] space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#1db954]">
                Jam Found
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#fafafa]">
                  {resolvedRoom?.title}
                </span>
                <Badge variant="secondary" className="font-mono">
                  {resolvedRoom?.code}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#fafafa]">
                Your Display Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Jordan"
                maxLength={24}
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-[11px] text-[#666666]">
                Leave empty for a random fun nickname.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("code")}
                className="w-1/3"
              >
                Back
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                Enter Room
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-[#666666]">Loading...</div>}>
      <JoinRoomContent />
    </React.Suspense>
  );
}
