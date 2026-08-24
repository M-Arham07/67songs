"use client";

import * as React from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoomStore } from "@/lib/stores/room-store";

interface ChatPanelProps {
  onSendMessage?: (content: string) => void;
}

export function ChatPanel({ onSendMessage }: ChatPanelProps) {
  const { chatMessages, currentUserId } = useRoomStore();
  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage?.(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border border-[#262626] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#262626] bg-[#111111] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#fafafa]">
          <MessageSquare className="h-4 w-4 text-[#a1a1a1]" />
          <span>Room Chat</span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#666666] py-12">
            <span>No messages yet</span>
            <span className="text-[10px]">Say hi to the jam!</span>
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="p-1.5 rounded bg-[#161616] text-center text-[10px] text-[#1db954] font-medium"
                >
                  {msg.content}
                </div>
              );
            }

            const isMe = msg.sender.id === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                <span className="text-[10px] text-[#666666] px-1 mb-0.5">
                  {msg.sender.name}
                  {msg.sender.role === "master" && " 👑"}
                </span>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
                    isMe
                      ? "bg-[#1db954] text-black font-medium"
                      : "bg-[#181818] border border-[#262626] text-[#fafafa]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-[#262626] bg-[#111111] flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Send a message..."
          maxLength={500}
          className="h-8 text-xs bg-[#161616]"
        />
        <Button
          type="submit"
          variant="primary"
          size="icon-sm"
          disabled={!input.trim()}
          className="shrink-0 h-8 w-8"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
