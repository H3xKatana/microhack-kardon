/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { useMessagingStore } from "@/hooks/store/use-messaging-store";

interface MessageInputProps {
  workspaceSlug: string;
}

export const MessageInput = observer(({ workspaceSlug }: MessageInputProps) => {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentChannelId, createMessage } = useMessagingStore();

  const handleSend = async () => {
    if (!currentChannelId || !content.trim() || isSending) return;

    setIsSending(true);
    try {
      await createMessage(workspaceSlug, currentChannelId, content.trim());
      setContent("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setContent(target.value);
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  if (!currentChannelId) return null;

  return (
    <div className="border-t p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full min-h-[44px] max-h-[200px] resize-none pr-12 py-2 px-3 border rounded-md"
            rows={1}
          />
          <button
            className="absolute right-2 bottom-2 p-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
            disabled={!content.trim() || isSending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
});
