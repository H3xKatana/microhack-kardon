/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { API_BASE_URL } from "@kardon/constants";
import type {
  IChannel,
  IChannelMember,
  IMessage,
  IMessageReaction,
  ICreateChannelPayload,
  IUpdateChannelPayload,
  ICreateMessagePayload,
  IUpdateMessagePayload,
  ICreateReactionPayload,
} from "@kardon/types";
import { APIService } from "@/services/api.service";

export class MessagingService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  // Channel operations
  async getChannels(
    workspaceSlug: string,
    params?: {
      type?: string;
      project?: string;
      include_archived?: boolean;
      sort_by?: string;
      per_page?: number;
      cursor?: string;
    }
  ): Promise<IChannel[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${query ? `?${query}` : ""}`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getChannel(workspaceSlug: string, channelId: string): Promise<IChannel> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createChannel(workspaceSlug: string, payload: ICreateChannelPayload): Promise<IChannel> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/`, payload)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateChannel(workspaceSlug: string, channelId: string, payload: IUpdateChannelPayload): Promise<IChannel> {
    return this.patch(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`, payload)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteChannel(workspaceSlug: string, channelId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async joinChannel(workspaceSlug: string, channelId: string): Promise<IChannelMember> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/join/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async leaveChannel(workspaceSlug: string, channelId: string): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/leave/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async markChannelAsRead(workspaceSlug: string, channelId: string): Promise<void> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/mark-read/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Channel members
  async getChannelMembers(workspaceSlug: string, channelId: string): Promise<IChannelMember[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addChannelMember(
    workspaceSlug: string,
    channelId: string,
    memberId: string,
    role?: number
  ): Promise<IChannelMember> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/`, {
      member_id: memberId,
      role,
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeChannelMember(workspaceSlug: string, channelId: string, memberId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/members/${memberId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Message operations
  async getMessages(
    workspaceSlug: string,
    channelId: string,
    params?: {
      parent?: string;
      search?: string;
      before?: string;
      after?: string;
      per_page?: number;
      cursor?: string;
    }
  ): Promise<IMessage[]> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${query ? `?${query}` : ""}`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async createMessage(workspaceSlug: string, channelId: string, payload: ICreateMessagePayload): Promise<IMessage> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/`, payload)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateMessage(
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    payload: IUpdateMessagePayload
  ): Promise<IMessage> {
    return this.patch(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/`, payload)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteMessage(workspaceSlug: string, channelId: string, messageId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  // Reactions
  async getReactions(workspaceSlug: string, channelId: string, messageId: string): Promise<IMessageReaction[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async addReaction(
    workspaceSlug: string,
    channelId: string,
    messageId: string,
    payload: ICreateReactionPayload
  ): Promise<IMessageReaction> {
    return this.post(`/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/`, payload)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async removeReaction(workspaceSlug: string, channelId: string, messageId: string, reactionId: string): Promise<void> {
    return this.delete(
      `/api/workspaces/${workspaceSlug}/channels/${channelId}/messages/${messageId}/reactions/${reactionId}/`
    )
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

export const messagingService = new MessagingService();
