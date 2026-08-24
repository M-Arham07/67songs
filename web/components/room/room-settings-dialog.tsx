"use client";

import * as React from "react";
import { Settings, Shield, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRoomStore } from "@/lib/stores/room-store";

interface RoomSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferMasterOpen?: () => void;
}

export function RoomSettingsDialog({
  isOpen,
  onOpenChange,
  onTransferMasterOpen,
}: RoomSettingsDialogProps) {
  const { roomId, title, settings, isMaster } = useRoomStore();

  const [newTitle, setNewTitle] = React.useState(title || "");
  const [allowRequests, setAllowRequests] = React.useState(
    settings?.collaborationPolicy.allowSongRequests ?? true
  );
  const [chatEnabled, setChatEnabled] = React.useState(
    settings?.collaborationPolicy.chatEnabled ?? true
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !isMaster) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          collaborationPolicy: {
            allowSongRequests: allowRequests,
            chatEnabled: chatEnabled,
            reactionsEnabled: chatEnabled,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update room settings");
      }

      toast.success("Room settings updated");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEndRoom = async () => {
    if (!confirm("Are you sure you want to end this listening jam for everyone?")) return;
    if (!roomId || !isMaster) return;

    try {
      await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
      toast.info("Room ended");
      window.location.href = "/";
    } catch {
      toast.error("Failed to end room");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#111111] border-[#262626]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-[#fafafa]" />
            <span>Master Room Settings</span>
          </DialogTitle>
          <DialogDescription>
            Configure participant permissions and session properties.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#fafafa]">
              Room Title
            </label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Room Name"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[#262626]">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#fafafa]">
                  Allow Song Requests
                </span>
                <p className="text-[11px] text-[#a1a1a1]">
                  Participants can request songs for your approval.
                </p>
              </div>
              <Switch
                checked={allowRequests}
                onCheckedChange={setAllowRequests}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-[#fafafa]">
                  Enable Room Chat
                </span>
                <p className="text-[11px] text-[#a1a1a1]">
                  Allow participants to text and react with emoji.
                </p>
              </div>
              <Switch
                checked={chatEnabled}
                onCheckedChange={setChatEnabled}
              />
            </div>
          </div>

          {/* Master Actions */}
          <div className="space-y-2 pt-4 border-t border-[#262626]">
            {onTransferMasterOpen && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onTransferMasterOpen();
                }}
                className="w-full gap-2 text-xs"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400" />
                <span>Transfer Master Control...</span>
              </Button>
            )}

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleEndRoom}
              className="w-full gap-2 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>End Jam Session</span>
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
