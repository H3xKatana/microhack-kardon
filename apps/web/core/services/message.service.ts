/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { APIService } from "@/services/api.service";
import { TMessage, TMessageRoom } from "@kardon/types";

export interface IMessageService {
  getRooms: (workspaceSlug: string) => Promise<TMessageRoom[]>;
  getRoomMessages: (workspaceSlug: string, roomId: string) => Promise<TMessage[]>;
  sendMessage: (workspaceSlug: string, messageData: any) => Promise<TMessage>;
  joinRoom: (workspaceSlug: string, roomId: string) => Promise<any>;
  leaveRoom: (workspaceSlug: string, roomId: string) => Promise<any>;
}

export class MessageService extends APIService implements IMessageService {
  constructor() {
    super();
  }

  async getRooms(workspaceSlug: string): Promise<TMessageRoom[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/messages/rooms/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data || error;
      });
  }

  async getRoomMessages(workspaceSlug: string, roomId: string): Promise<TMessage[]> {
    return this.get(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/`)
      .then((response) => response?.data?.messages || []) // Assuming the API returns messages under a 'messages' key
      .catch((error) => {
        throw error?.response?.data || error;
      });
  }

  async sendMessage(workspaceSlug: string, messageData: any): Promise<TMessage> {
    return this.post(`/api/workspaces/${workspaceSlug}/messages/`, messageData)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data || error;
      });
  }

  async joinRoom(workspaceSlug: string, roomId: string) {
    return this.post(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/join/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data || error;
      });
  }

  async leaveRoom(workspaceSlug: string, roomId: string) {
    return this.post(`/api/workspaces/${workspaceSlug}/messages/rooms/${roomId}/leave/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data || error;
      });
  }
}