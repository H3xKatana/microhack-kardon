/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { useState } from "react";
import { MessageRoomList } from "./message-room-list";
import { ChatRoom } from "./chat-room";

interface MessagingSidebarProps {
  rooms: any[];
  messages: any[];
  currentUserId: string;
  onRoomSelect: (roomId: string) => void;
  onSend: (message: string) => void;
  onRoomCreate?: () => void;
  selectedRoomId?: string;
}

export const MessagingSidebar: React.FunctionComponent<MessagingSidebarProps> = ({
  rooms,
  messages,
  currentUserId,
  onRoomSelect,
  onSend,
  onRoomCreate,
  selectedRoomId,
}) => {
  return (
    <div className="flex h-full w-full bg-white border-r border-gray-200">
      {/* Rooms List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <MessageRoomList
          rooms={rooms}
          onRoomSelect={onRoomSelect}
          onRoomCreate={onRoomCreate}
          selectedRoomId={selectedRoomId}
        />
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId ? (
          <ChatRoom
            messages={messages}
            currentUserId={currentUserId}
            onSend={onSend}
            placeholder="Type a message..."
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Select a room to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};