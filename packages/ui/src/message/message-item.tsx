/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "../utils";

interface MessageItemProps {
  message: any; // Using 'any' temporarily, would use proper type
  currentUserId: string;
  showSender?: boolean;
}

export const MessageItem: React.FunctionComponent<MessageItemProps> = ({
  message,
  currentUserId,
  showSender = true,
}) => {
  const isCurrentUser = message.sender === currentUserId;

  // Format date to HH:MM format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={cn(
      "flex items-start gap-2 py-2 w-full",
      isCurrentUser ? "flex-row-reverse" : ""
    )}>
      {showSender && (
        <div className={cn(
          "shrink-0",
          isCurrentUser ? "order-2" : "order-1"
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender_detail?.avatar || ""} alt={message.sender_detail?.display_name || "User"} />
            <AvatarFallback>
              {(message.sender_detail?.display_name || "U").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className={cn(
        "flex flex-col max-w-[75%]",
        isCurrentUser ? "items-end order-1" : "items-start order-2"
      )}>
        {showSender && (
          <span className={cn(
            "text-xs font-medium mb-1",
            isCurrentUser ? "text-right text-brand-secondary" : "text-left text-gray-500"
          )}>
            {message.sender_detail?.display_name}
          </span>
        )}
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm break-words",
          isCurrentUser
            ? "bg-brand-primary text-white rounded-br-md"
            : "bg-gray-100 text-gray-800 rounded-bl-md"
        )}>
          {message.message}
        </div>
        <span className={cn(
          "text-xs mt-1",
          isCurrentUser ? "text-brand-secondary" : "text-gray-500"
        )}>
          {formatDate(message.created_at)}
        </span>
      </div>
    </div>
  );
};
