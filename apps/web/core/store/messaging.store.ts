/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { action, computed, observable, makeObservable, runInAction } from "mobx";
// types
import type {
  IChannel,
  IChannelMember,
  IMessage,
  IMessageReaction,
  IWebSocketMessage,
  ITypingIndicator,
  ChannelType,
} from "@kardon/types";
// services
import { messagingService } from "@/services/messaging.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IMessagingStore {
  // loaders
  loader: boolean;
  messagesLoader: boolean;
  // observables
  channels: IChannel[];
  currentChannelId: string | null;
  channelMembers: Record<string, IChannelMember[]>;
  messages: Record<string, IMessage[]>; // channelId -> messages
  typingUsers: Record<string, ITypingIndicator[]>; // channelId -> typing users
  // WebSocket
  wsConnection: WebSocket | null;
  isConnected: boolean;
  joinedChannels: Set<string>;
  hasMoreMessages: boolean;

  // computed
  currentChannel: IChannel | null;
  currentChannelMessages: IMessage[];
  unreadCount: number;

  // actions
  setChannels: (channels: IChannel[]) => void;
  addChannel: (channel: IChannel) => void;
  updateChannel: (channelId: string, updates: Partial<IChannel>) => void;
  removeChannel: (channelId: string) => void;
  setCurrentChannelId: (channelId: string | null) => void;
  setChannelMembers: (channelId: string, members: IChannelMember[]) => void;
  setMessages: (channelId: string, messages: IMessage[]) => void;
  prependMessages: (channelId: string, messages: IMessage[]) => void;
  addMessage: (channelId: string, message: IMessage) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<IMessage>) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  addReaction: (channelId: string, messageId: string, reaction: IMessageReaction) => void;
  removeReaction: (channelId: string, messageId: string, reactionId: string) => void;
  setTypingUser: (channelId: string, indicator: ITypingIndicator) => void;
  clearTypingUser: (channelId: string, userId: string) => void;
  setWsConnection: (ws: WebSocket | null) => void;
  setIsConnected: (connected: boolean) => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  setHasMoreMessages: (hasMore: boolean) => void;
  fetchChannels: (workspaceSlug: string) => Promise<void>;
  fetchMessages: (workspaceSlug: string, channelId: string) => Promise<void>;
  createMessage: (workspaceSlug: string, channelId: string, content: string, parentId?: string) => Promise<void>;
  createChannel: (
    workspaceSlug: string,
    payload: { name: string; channel_type: ChannelType; member_ids?: string[] }
  ) => Promise<IChannel>;
  fetchChannelMembers: (workspaceSlug: string, channelId: string) => Promise<void>;
  addChannelMember: (workspaceSlug: string, channelId: string, memberId: string) => Promise<void>;
  removeChannelMember: (workspaceSlug: string, channelId: string, memberId: string) => Promise<void>;
  reset: () => void;
}

export class MessagingStore implements IMessagingStore {
  // loaders
  loader: boolean = false;
  messagesLoader: boolean = false;
  // observables
  channels: IChannel[] = [];
  currentChannelId: string | null = null;
  channelMembers: Record<string, IChannelMember[]> = {};
  messages: Record<string, IMessage[]> = {};
  typingUsers: Record<string, ITypingIndicator[]> = {};
  // WebSocket
  wsConnection: WebSocket | null = null;
  isConnected: boolean = false;
  joinedChannels: Set<string> = new Set();
  hasMoreMessages: boolean = true;

  // root store
  rootStore: CoreRootStore;

  constructor(rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      loader: observable,
      messagesLoader: observable,
      channels: observable,
      currentChannelId: observable,
      channelMembers: observable,
      messages: observable,
      typingUsers: observable,
      wsConnection: observable,
      isConnected: observable,
      joinedChannels: observable,
      hasMoreMessages: observable,
      // computed
      currentChannel: computed,
      currentChannelMessages: computed,
      unreadCount: computed,
      // actions
      setChannels: action,
      addChannel: action,
      updateChannel: action,
      removeChannel: action,
      setCurrentChannelId: action,
      setChannelMembers: action,
      setMessages: action,
      prependMessages: action,
      addMessage: action,
      updateMessage: action,
      removeMessage: action,
      addReaction: action,
      removeReaction: action,
      setTypingUser: action,
      clearTypingUser: action,
      setWsConnection: action,
      setIsConnected: action,
      joinChannel: action,
      leaveChannel: action,
      setHasMoreMessages: action,
      createChannel: action,
      fetchChannelMembers: action,
      addChannelMember: action,
      removeChannelMember: action,
      reset: action,
    });

    this.rootStore = rootStore;
  }

  // computed
  get currentChannel(): IChannel | null {
    if (!this.currentChannelId) return null;
    return this.channels.find((c) => c.id === this.currentChannelId) || null;
  }

  get currentChannelMessages(): IMessage[] {
    if (!this.currentChannelId) return [];
    return this.messages[this.currentChannelId] || [];
  }

  get unreadCount(): number {
    return this.channels.reduce((acc, channel) => acc + (channel.unread_count || 0), 0);
  }

  // actions
  setChannels = (channels: IChannel[]) => {
    this.channels = channels;
  };

  addChannel = (channel: IChannel) => {
    this.channels.unshift(channel);
  };

  updateChannel = (channelId: string, updates: Partial<IChannel>) => {
    const index = this.channels.findIndex((c) => c.id === channelId);
    if (index !== -1) {
      this.channels[index] = { ...this.channels[index], ...updates };
    }
  };

  removeChannel = (channelId: string) => {
    this.channels = this.channels.filter((c) => c.id !== channelId);
    if (this.currentChannelId === channelId) {
      this.currentChannelId = null;
    }
    delete this.messages[channelId];
    delete this.channelMembers[channelId];
  };

  setCurrentChannelId = (channelId: string | null) => {
    this.currentChannelId = channelId;
  };

  setChannelMembers = (channelId: string, members: IChannelMember[]) => {
    this.channelMembers[channelId] = members;
  };

  setMessages = (channelId: string, messages: IMessage[]) => {
    this.messages[channelId] = messages;
  };

  prependMessages = (channelId: string, messages: IMessage[]) => {
    const existing = this.messages[channelId] || [];
    this.messages[channelId] = [...messages, ...existing];
  };

  addMessage = (channelId: string, message: IMessage) => {
    if (!this.messages[channelId]) {
      this.messages[channelId] = [];
    }
    this.messages[channelId].push(message);
    // Update channel's last message
    const channel = this.channels.find((c) => c.id === channelId);
    if (channel) {
      channel.last_message = {
        id: message.id,
        content: message.content.slice(0, 100),
        sender: message.sender_details,
        created_at: message.created_at,
      };
    }
  };

  updateMessage = (channelId: string, messageId: string, updates: Partial<IMessage>) => {
    const channelMessages = this.messages[channelId] || [];
    const index = channelMessages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      channelMessages[index] = { ...channelMessages[index], ...updates };
    }
  };

  removeMessage = (channelId: string, messageId: string) => {
    this.messages[channelId] = (this.messages[channelId] || []).filter((m) => m.id !== messageId);
  };

  addReaction = (channelId: string, messageId: string, reaction: IMessageReaction) => {
    const channelMessages = this.messages[channelId] || [];
    const message = channelMessages.find((m) => m.id === messageId);
    if (message) {
      message.reactions.push(reaction);
    }
  };

  removeReaction = (channelId: string, messageId: string, reactionId: string) => {
    const channelMessages = this.messages[channelId] || [];
    const message = channelMessages.find((m) => m.id === messageId);
    if (message) {
      message.reactions = message.reactions.filter((r: IMessageReaction) => r.id !== reactionId);
    }
  };

  setTypingUser = (channelId: string, indicator: ITypingIndicator) => {
    if (!this.typingUsers[channelId]) {
      this.typingUsers[channelId] = [];
    }
    // Remove existing indicator for this user
    this.typingUsers[channelId] = this.typingUsers[channelId].filter((t) => t.userId !== indicator.userId);
    this.typingUsers[channelId].push(indicator);
  };

  clearTypingUser = (channelId: string, userId: string) => {
    if (this.typingUsers[channelId]) {
      this.typingUsers[channelId] = this.typingUsers[channelId].filter((t) => t.userId !== userId);
    }
  };

  setWsConnection = (ws: WebSocket | null) => {
    this.wsConnection = ws;
  };

  setIsConnected = (connected: boolean) => {
    this.isConnected = connected;
  };

  joinChannel = (channelId: string) => {
    this.joinedChannels.add(channelId);
    // Send join message to WebSocket
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(
        JSON.stringify({
          type: "join",
          channelId,
          timestamp: Date.now(),
        })
      );
    }
  };

  leaveChannel = (channelId: string) => {
    this.joinedChannels.delete(channelId);
    // Send leave message to WebSocket
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(
        JSON.stringify({
          type: "leave",
          channelId,
          timestamp: Date.now(),
        })
      );
    }
  };

  setHasMoreMessages = (hasMore: boolean) => {
    this.hasMoreMessages = hasMore;
  };

  // async actions
  fetchChannels = async (workspaceSlug: string) => {
    this.loader = true;
    try {
      const channels = await messagingService.getChannels(workspaceSlug);
      runInAction(() => {
        this.channels = channels;
      });
    } catch (error) {
      console.error("Failed to load channels:", error);
    } finally {
      runInAction(() => {
        this.loader = false;
      });
    }
  };

  fetchMessages = async (workspaceSlug: string, channelId: string) => {
    this.messagesLoader = true;
    try {
      const messages = await messagingService.getMessages(workspaceSlug, channelId);
      const newMessages = [...messages].reverse(); // Oldest first

      // Only update if messages have actually changed (compare IDs)
      const existingMessages = this.messages[channelId] || [];
      const existingIds = new Set(existingMessages.map((m) => m.id));
      const newIds = new Set(newMessages.map((m) => m.id));

      // Check if sets are different
      const hasChanged =
        existingMessages.length !== newMessages.length ||
        existingMessages.some((m) => !newIds.has(m.id)) ||
        newMessages.some((m) => !existingIds.has(m.id));

      if (hasChanged) {
        runInAction(() => {
          this.messages = {
            ...this.messages,
            [channelId]: newMessages,
          };
        });
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      runInAction(() => {
        this.messagesLoader = false;
      });
    }
  };

  createMessage = async (workspaceSlug: string, channelId: string, content: string, parentId?: string) => {
    try {
      const message = await messagingService.createMessage(workspaceSlug, channelId, {
        channel: channelId,
        content,
        parent: parentId,
      });
      runInAction(() => {
        this.addMessage(channelId, message);
      });
      // Broadcast via WebSocket
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send(
          JSON.stringify({
            type: "message",
            channelId,
            data: message,
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Failed to create message:", error);
    }
  };

  createChannel = async (
    workspaceSlug: string,
    payload: { name: string; channel_type: ChannelType; member_ids?: string[] }
  ) => {
    try {
      const channel = await messagingService.createChannel(workspaceSlug, payload);
      runInAction(() => {
        this.addChannel(channel);
      });
      return channel;
    } catch (error) {
      console.error("Failed to create channel:", error);
      throw error;
    }
  };

  fetchChannelMembers = async (workspaceSlug: string, channelId: string) => {
    try {
      const members = await messagingService.getChannelMembers(workspaceSlug, channelId);
      runInAction(() => {
        this.channelMembers[channelId] = members;
      });
    } catch (error) {
      console.error("Failed to fetch channel members:", error);
    }
  };

  addChannelMember = async (workspaceSlug: string, channelId: string, memberId: string) => {
    try {
      const member = await messagingService.addChannelMember(workspaceSlug, channelId, memberId);
      runInAction(() => {
        if (!this.channelMembers[channelId]) {
          this.channelMembers[channelId] = [];
        }
        this.channelMembers[channelId].push(member);
      });
    } catch (error) {
      console.error("Failed to add channel member:", error);
      throw error;
    }
  };

  removeChannelMember = async (workspaceSlug: string, channelId: string, memberId: string) => {
    try {
      await messagingService.removeChannelMember(workspaceSlug, channelId, memberId);
      runInAction(() => {
        if (this.channelMembers[channelId]) {
          this.channelMembers[channelId] = this.channelMembers[channelId].filter((m) => m.id !== memberId);
        }
      });
    } catch (error) {
      console.error("Failed to remove channel member:", error);
      throw error;
    }
  };

  reset = () => {
    this.channels = [];
    this.currentChannelId = null;
    this.channelMembers = {};
    this.messages = {};
    this.typingUsers = {};
    this.wsConnection = null;
    this.isConnected = false;
    this.joinedChannels.clear();
    this.hasMoreMessages = true;
  };
}
