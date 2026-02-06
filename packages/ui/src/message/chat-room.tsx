/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { Card, CardContent } from "../card";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

interface ChatRoomProps {
  messages: any[];
  currentUserId: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatRoom: React.FunctionComponent<ChatRoomProps> = ({
  messages,
  currentUserId,
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  return (
    <Card className="flex flex-col h-full w-full border-0 shadow-none bg-transparent">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex-1 min-h-0">
          <MessageList messages={messages} currentUserId={currentUserId} />
        </div>
        <div className="p-4 border-t border-gray-200">
          <MessageInput
            onSend={onSend}
            disabled={disabled}
            placeholder={placeholder}
          />
        </div>
      </CardContent>
    </Card>
  );
};