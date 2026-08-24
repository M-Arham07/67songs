"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Sparkles, Shield, Users, Radio, Crown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreateRoomInputSchema, type CreateRoomInput } from "@/lib/types/room";

export default function CreateRoomPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CreateRoomInput>({
    resolver: zodResolver(CreateRoomInputSchema) as any,
    defaultValues: {
      title: "Late Night Listening Jam",
      visibility: "unlisted",
      joinPolicy: {
        allowGuests: true,
        requiresSignIn: false,
        requiresApproval: false,
      },
      collaborationPolicy: {
        allowSongRequests: true,
        guestsCanAddDirectly: false,
        guestsCanReorder: false,
        votingEnabled: false,
        chatEnabled: true,
        reactionsEnabled: true,
        coHostPlaybackEnabled: true,
      },
      capacity: 25,
    },
  });

  const onSubmit = async (data: CreateRoomInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create room");
      }

      if (json.masterToken) {
        localStorage.setItem(`master_token_${json.roomId}`, json.masterToken);
      }
      toast.success(`Jam created! Code: ${json.code}`);
      router.push(`/room/${json.roomId}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong creating the room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#fafafa]">Start a Listening Jam</h1>
            <Badge variant="master" className="text-[10px] gap-1">
              <Crown className="h-3 w-3" /> Master Device
            </Badge>
          </div>
          <p className="text-xs text-[#a1a1a1]">
            You will be assigned as Master with exclusive playback authority.
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 bg-[#111111] border border-[#262626] rounded-lg p-6"
      >
        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#fafafa]">
            Room Name <span className="text-[#e5484d]">*</span>
          </label>
          <Input
            placeholder="e.g. Chill Beats & Study Session"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-[#e5484d]">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#fafafa]">
            Room Visibility
          </label>
          <Select
            defaultValue={form.getValues("visibility")}
            onValueChange={(val: any) => form.setValue("visibility", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unlisted">
                Unlisted (Anyone with the 4-letter code or link can join)
              </SelectItem>
              <SelectItem value="private">
                Private (Direct link & high-entropy invite token only)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Capacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#fafafa]">
              Max Participants
            </label>
            <span className="text-xs font-mono text-[#a1a1a1]">
              {form.watch("capacity")} people
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="50"
            step="1"
            className="w-full h-1 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#1db954]"
            {...form.register("capacity", { valueAsNumber: true })}
          />
        </div>

        {/* Master & Guest Collaboration Policies */}
        <div className="space-y-4 pt-4 border-t border-[#262626]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
            Song Requests & Collaboration
          </h3>

          {/* Song Requests Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#fafafa]">
                Allow Song Requests
              </span>
              <p className="text-[11px] text-[#a1a1a1]">
                Participants can submit song requests for you to accept or reject.
              </p>
            </div>
            <Switch
              checked={form.watch("collaborationPolicy.allowSongRequests")}
              onCheckedChange={(val) =>
                form.setValue("collaborationPolicy.allowSongRequests", val)
              }
            />
          </div>

          {/* Allow Anonymous Guests */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#fafafa]">
                Allow Guest Participation
              </span>
              <p className="text-[11px] text-[#a1a1a1]">
                Friends can join anonymously with just a display name.
              </p>
            </div>
            <Switch
              checked={form.watch("joinPolicy.allowGuests")}
              onCheckedChange={(val) =>
                form.setValue("joinPolicy.allowGuests", val)
              }
            />
          </div>

          {/* Chat & Reactions */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-[#fafafa]">
                Enable Chat & Emoji Reactions
              </span>
              <p className="text-[11px] text-[#a1a1a1]">
                Live room text chat and curated floating reaction emojis.
              </p>
            </div>
            <Switch
              checked={form.watch("collaborationPolicy.chatEnabled")}
              onCheckedChange={(val) => {
                form.setValue("collaborationPolicy.chatEnabled", val);
                form.setValue("collaborationPolicy.reactionsEnabled", val);
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[#262626]">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Session...</span>
              </>
            ) : (
              <span>Launch Jam & Open Lobby</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
