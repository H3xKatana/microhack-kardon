/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { IUserLite } from "./users";

export type ChannelType = "public" | "private" | "direct";

export type ChannelMemberRole = 20 | 15 | 5; // Admin, Member, Viewer

export type NotificationPreference = "all" | "mentions" | "none";

export interface IChannel {
  id: string;
  workspace: string;
  project: string | null;
  name: string;
  description: string;
  channel_type: ChannelType;
  created_by: string;
  created_by_details: IUserLite;
  member_count: number;
  last_message: {
    id: string;
    content: string;
    sender: IUserLite;
    created_at: string;
  } | null;
  unread_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface IChannelMember {
  id: string;
  channel: string;
  member: string;
  member_details: IUserLite;
  role: ChannelMemberRole;
  last_read_at: string | null;
  unread_count: number;
  is_muted: boolean;
  notification_preference: NotificationPreference;
  created_at: string;
}

export interface IMessageReaction {
  id: string;
  reaction: string;
  reacted_by: string;
  reacted_by_details: IUserLite;
  created_at: string;
}

export interface IMessage {
  id: string;
  workspace: string;
  project: string | null;
  channel: string;
  sender: string;
  sender_details: IUserLite;
  content: string;
  content_json: Record<string, unknown>;
  parent: string | null;
  reactions: IMessageReaction[];
  reply_count: number;
  is_edited: boolean;
  edited_at: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICreateChannelPayload {
  name: string;
  description?: string;
  channel_type: ChannelType;
  project?: string;
  member_ids?: string[];
}

export interface IUpdateChannelPayload {
  name?: string;
  description?: string;
  is_archived?: boolean;
}

export interface ICreateMessagePayload {
  channel: string;
  content: string;
  parent?: string;
}

export interface IUpdateMessagePayload {
  content: string;
}

export interface ICreateReactionPayload {
  reaction: string;
}

// WebSocket message types
export type WebSocketMessageType = "connected" | "joined" | "message" | "typing" | "reaction" | "read" | "error";

export interface IWebSocketMessage {
  type: WebSocketMessageType;
  data?: unknown;
  timestamp: number;
  clientId?: string;
  channelId?: string;
  userId?: string;
  error?: string;
}

export interface ITypingIndicator {
  channelId: string;
  userId: string;
  timestamp: number;
}
