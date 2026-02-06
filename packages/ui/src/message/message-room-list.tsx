/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { FC } from "react";
import { useState, useEffect } from "react";
import { Button } from "../button";
import { SearchInput } from "../form-fields/search-input";
import { MessageRoomIcon } from "@kardon/propel/icons";

interface MessageRoomItem {
  id: string;
  name: string;
  description?: string;
  last_activity: string;
  unread_count?: number;
  is_member: boolean;
}

interface MessageRoomListProps {
  rooms: MessageRoomItem[];
  onRoomSelect: (roomId: string) => void;
  onRoomCreate?: () => void;
  selectedRoomId?: string;
}

export const MessageRoomList: React.FunctionComponent<MessageRoomListProps> = ({
  rooms,
  onRoomSelect,
  onRoomCreate,
  selectedRoomId,
}) => {
  const [filteredRooms, setFilteredRooms] = useState(rooms);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (searchTerm) {
      const filtered = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms(rooms);
    }
  }, [searchTerm, rooms]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Message Rooms</h3>
          {onRoomCreate && (
            <Button 
              variant="primary" 
              onClick={onRoomCreate}
              className="h-8 w-8 p-0 rounded-full"
            >
              +
            </Button>
          )}
        </div>
        <SearchInput
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(value) => setSearchTerm(value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1 p-2">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-gray-100 ${
                selectedRoomId === room.id ? "bg-gray-100" : ""
              }`}
              onClick={() => onRoomSelect(room.id)}
            >
              <div className="flex-shrink-0">
                <MessageRoomIcon className="h-5 w-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{room.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {room.description || "No description"}
                </p>
              </div>
              {room.unread_count && room.unread_count > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center rounded-full bg-red-500 h-5 w-5 text-xs text-white justify-center">
                    {room.unread_count}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};