"use client";

import * as React from "react";
import QRCode from "react-qr-code";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface InviteShareProps {
  roomId: string;
  roomCode: string;
  title: string;
  inviteUrl?: string;
  trigger?: React.ReactNode;
}

export function InviteShare({
  roomId,
  roomCode,
  title,
  inviteUrl,
  trigger,
}: InviteShareProps) {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedCode, setCopiedCode] = React.useState(false);

  const fullUrl =
    inviteUrl ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : `/room/${roomId}`);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      toast.success(`Room code "${roomCode}" copied!`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            <span>Invite</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-[#1db954]" />
            <span>Invite Friends to Jam</span>
          </DialogTitle>
          <DialogDescription>
            Anyone with the QR code, link, or 4-letter code can listen with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg border border-[#262626] mx-auto w-fit shadow-inner">
            <QRCode
              value={fullUrl}
              size={160}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>

          {/* 4-Letter Code Display */}
          <div className="flex items-center justify-between p-3 rounded-md border border-[#262626] bg-[#161616]">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-[#666666]">
                4-Letter Code
              </span>
              <div className="text-xl font-mono font-bold tracking-widest text-[#fafafa]">
                {roomCode}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="gap-1.5"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#1db954]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </Button>
          </div>

          {/* Direct Invite Link */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="flex-1 h-9 rounded-md border border-[#262626] bg-[#161616] px-3 text-xs text-[#a1a1a1] focus:outline-none"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-black" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
