/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useMessagingStore } from "@/hooks/store/use-messaging-store";
import { MessageItem } from "./message-item";

interface MessageListProps {
  workspaceSlug: string;
}

export const MessageList = observer(({ workspaceSlug }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentChannel, currentChannelMessages, messagesLoader } = useMessagingStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChannelMessages.length]);

  if (!currentChannel) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a channel to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messagesLoader ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {currentChannelMessages.map((message, index) => {
            const prevMessage = index > 0 ? currentChannelMessages[index - 1] : null;
            const showHeader =
              !prevMessage ||
              prevMessage.sender !== message.sender ||
              new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000;

            return <MessageItem key={message.id} message={message} showHeader={showHeader} />;
          })}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
});
