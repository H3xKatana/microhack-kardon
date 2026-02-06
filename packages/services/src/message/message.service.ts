/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { APIService } from "../api.service";
import type { TMessage, TMessageRoom } from "@kardon/types";

export interface IMessageService {
  getRooms: (workspaceSlug: string) => Promise<TMessageRoom[]>;
  getRoomMessages: (workspaceSlug: string, roomId: string) => Promise<TMessage[]>;
  sendMessage: (workspaceSlug: string, data: {
    room: string;
    message: string;
  }) => Promise<TMessage>;
  joinRoom: (workspaceSlug: string, roomId: string) => Promise<void>;
  leaveRoom: (workspaceSlug: string, roomId: string) => Promise<void>;
}

export class MessageService implements IMessageService {
  constructor(private apiService: APIService = new APIService()) {}

  async getRooms(workspaceSlug: string): Promise<TMessageRoom[]> {
    const response = await this.apiService.get(`/api/workspaces/${workspaceSlug}/messages/rooms/`);
    return response.data;
  }

  async getRoomMessages(workspaceSlug: string, roomId: string): Promise<TMessage[]> {
    const response = await this.apiService.get(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/messages/`);
    return response.data;
  }

  async sendMessage(workspaceSlug: string, data: {
    room: string;
    message: string;
  }): Promise<TMessage> {
    const response = await this.apiService.post(`/api/workspaces/${workspaceSlug}/messages/send/`, data);
    return response.data;
  }

  async joinRoom(workspaceSlug: string, roomId: string): Promise<void> {
    await this.apiService.post(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/join/`);
  }

  async leaveRoom(workspaceSlug: string, roomId: string): Promise<void> {
    await this.apiService.post(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/leave/`);
  }
}