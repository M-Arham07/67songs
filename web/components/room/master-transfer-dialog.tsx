"use client";

import * as React from "react";
import { Crown, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRoomStore } from "@/lib/stores/room-store";

interface MasterTransferDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferConfirm: (targetUserId: string) => void;
}

export function MasterTransferDialog({
  isOpen,
  onOpenChange,
  onTransferConfirm,
}: MasterTransferDialogProps) {
  const { members, currentUserId, masterId } = useRoomStore();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [isConfirming, setIsConfirming] = React.useState(false);

  const eligibleMembers = Object.values(members).filter(
    (m) => m.id !== currentUserId && m.id !== masterId
  );

  const selectedMember = selectedUserId ? members[selectedUserId] : null;

  const handleSelectMember = (userId: string) => {
    setSelectedUserId(userId);
    setIsConfirming(true);
  };

  const handleExecuteTransfer = () => {
    if (!selectedUserId) return;
    onTransferConfirm(selectedUserId);
    setIsConfirming(false);
    setSelectedUserId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border-[#262626]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-amber-400" />
            <span>Transfer Master Authority</span>
          </DialogTitle>
          <DialogDescription>
            Pass playback control, request moderation, and room authority to another connected participant.
          </DialogDescription>
        </DialogHeader>

        {!isConfirming ? (
          <div className="space-y-4 py-2">
            {eligibleMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#666666] border border-[#262626] rounded-md">
                No other members are currently connected to transfer control to.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {eligibleMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-md border border-[#262626] bg-[#161616] hover:border-[#383838] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        {member.avatarUrl && (
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                        )}
                        <AvatarFallback className="text-xs">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-[#fafafa]">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-[#a1a1a1]">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectMember(member.id)}
                      className="gap-1 text-xs"
                    >
                      <span>Select</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-md border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Confirm Master Authority Transfer</span>
              </div>
              <p className="text-xs text-[#fafafa] leading-relaxed">
                Are you sure you want to transfer full Master authority to{" "}
                <strong className="text-amber-400 font-bold">{selectedMember?.name}</strong>?
                You will become a regular participant.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirming(false)}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteTransfer}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
