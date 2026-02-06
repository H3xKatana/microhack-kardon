/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { makeObservable, observable, action, computed, runInAction } from "mobx";
import { orderBy, set } from "lodash-es";
import { nanoid } from "nanoid";
// kardon imports
import type { CoreRootStore } from "@/store/root.store";
import type { TMessage, TMessageRoom, TMessageMember } from "@kardon/types";
import { MessageService } from "@kardon/services";

export interface IMessageStore {
  // observables
  loader: boolean;
  rooms: Record<string, TMessageRoom>;
  roomMembers: Record<string, TMessageMember>;
  messages: Record<string, TMessage>;
  activeRoomId: string | null;
  // actions
  fetchRooms: (workspaceSlug: string) => Promise<TMessageRoom[]>;
  fetchRoomMessages: (workspaceSlug: string, roomId: string) => Promise<TMessage[]>;
  sendMessage: (workspaceSlug: string, roomId: string, content: string) => Promise<TMessage>;
  joinRoom: (workspaceSlug: string, roomId: string) => Promise<void>;
  leaveRoom: (workspaceSlug: string, roomId: string) => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  // computed
  activeRoom: TMessageRoom | undefined;
  activeRoomMessages: TMessage[];
}

export class MessageStore implements IMessageStore {
  // observables
  loader = false;
  rooms: Record<string, TMessageRoom> = {};
  roomMembers: Record<string, TMessageMember> = {};
  messages: Record<string, TMessage> = {};
  activeRoomId: string | null = null;

  constructor(private store: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable,
      rooms: observable,
      roomMembers: observable,
      messages: observable,
      activeRoomId: observable,
      // actions
      fetchRooms: action,
      fetchRoomMessages: action,
      sendMessage: action,
      joinRoom: action,
      leaveRoom: action,
      setActiveRoom: action,
      // computed
      activeRoom: computed,
      activeRoomMessages: computed,
    });
  }

  // computed properties
  get activeRoom() {
    if (!this.activeRoomId) return undefined;
    return this.rooms[this.activeRoomId];
  }

  get activeRoomMessages() {
    if (!this.activeRoomId) return [];
    
    const roomMessages = Object.values(this.messages).filter(
      msg => msg.room === this.activeRoomId
    );
    
    return orderBy(roomMessages, [(msg) => new Date(msg.created_at)], ["asc"]);
  }

  // actions
  fetchRooms = async (workspaceSlug: string) => {
    this.loader = true;
    try {
      const messageService = new MessageService();
      const response = await messageService.getRooms(workspaceSlug);
      
      runInAction(() => {
        // Clear existing rooms
        this.rooms = {};
        
        // Add new rooms to store
        response.forEach((room) => {
          set(this.rooms, room.id, room);
        });
      });
      
      return response;
    } catch (error) {
      console.error("MessageStore -> fetchRooms -> error", error);
      throw error;
    } finally {
      runInAction(() => {
        this.loader = false;
      });
    }
  };

  fetchRoomMessages = async (workspaceSlug: string, roomId: string) => {
    this.loader = true;
    try {
      const messageService = new MessageService();
      const response = await messageService.getRoomMessages(workspaceSlug, roomId);
      
      runInAction(() => {
        // Update room messages in store
        response.forEach((message) => {
          set(this.messages, message.id, message);
        });
      });
      
      return response;
    } catch (error) {
      console.error("MessageStore -> fetchRoomMessages -> error", error);
      throw error;
    } finally {
      runInAction(() => {
        this.loader = false;
      });
    }
  };

  sendMessage = async (workspaceSlug: string, roomId: string, content: string) => {
    this.loader = true;
    try {
      const messageService = new MessageService();
      
      // Optimistic update - add temporary message
      const tempId = `temp_${nanoid()}`;
      const tempMessage: TMessage = {
        id: tempId,
        room: roomId,
        message: content,
        attachments: [],
        reply_to: null,
        is_reply: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender: this.store.user.user?.id || '',
        sender_detail: {
          id: this.store.user.user?.id || '',
          display_name: this.store.user.user?.display_name || 'Unknown',
          avatar: this.store.user.user?.avatar || null,
        }
      };
      
      runInAction(() => {
        set(this.messages, tempId, tempMessage);
      });
      
      // Actually send the message
      const response = await messageService.sendMessage(workspaceSlug, {
        room: roomId,
        message: content
      });
      
      // Update with actual response
      runInAction(() => {
        // Remove temp message
        delete this.messages[tempId];
        // Add actual message
        set(this.messages, response.id, response);
      });
      
      return response;
    } catch (error) {
      console.error("MessageStore -> sendMessage -> error", error);
      throw error;
    } finally {
      runInAction(() => {
        this.loader = false;
      });
    }
  };

  joinRoom = async (workspaceSlug: string, roomId: string) => {
    try {
      const messageService = new MessageService();
      await messageService.joinRoom(workspaceSlug, roomId);
      
      // Update local store
      runInAction(() => {
        // Room is now joined, can update local state if needed
      });
    } catch (error) {
      console.error("MessageStore -> joinRoom -> error", error);
      throw error;
    }
  };

  leaveRoom = async (workspaceSlug: string, roomId: string) => {
    try {
      const messageService = new MessageService();
      await messageService.leaveRoom(workspaceSlug, roomId);
      
      // Update local store
      runInAction(() => {
        if (this.activeRoomId === roomId) {
          this.activeRoomId = null;
        }
      });
    } catch (error) {
      console.error("MessageStore -> leaveRoom -> error", error);
      throw error;
    }
  };

  setActiveRoom = (roomId: string | null) => {
    runInAction(() => {
      this.activeRoomId = roomId;
    });
  };
}