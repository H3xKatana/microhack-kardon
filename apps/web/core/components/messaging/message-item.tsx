/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import type { IMessage } from "@kardon/types";
import { formatDistanceToNow } from "date-fns";

interface MessageItemProps {
  message: IMessage;
  showHeader: boolean;
}

export const MessageItem = observer(({ message, showHeader }: MessageItemProps) => {
  return (
    <div className={`group relative flex gap-3 py-1 px-2 -mx-2 hover:bg-accent/50 rounded ${showHeader ? "mt-4" : ""}`}>
      {showHeader ? (
        <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
          {(message.sender_details?.display_name || message.sender_details?.email || "?").charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className="w-10 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">
              {message.sender_details?.display_name || message.sender_details?.email || "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
            {message.is_edited && <span className="text-xs text-muted-foreground">(edited)</span>}
          </div>
        )}

        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>

        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-muted border-transparent hover:border-border"
              >
                <span>{reaction.reaction}</span>
              </button>
            ))}
          </div>
        )}

        {message.reply_count > 0 && (
          <button className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground">
            {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
    </div>
  );
});
