/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type {
  Extension,
  onConnectPayload,
  onDisconnectPayload,
  onAuthenticatePayload,
  onDestroyPayload,
  onStatelessPayload,
  onRequestPayload,
} from "@hocuspocus/server";

// Define this type locally if it doesn't exist in the current version
type onMessagePayload = {
  document: any;
  request: any;
  socketId: string;
  message: Uint8Array;
  context: any;
};
import { logger } from "@kardon/logger";
import { Redis } from "@/extensions/redis";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// Use the logger directly instead of getting a named logger

export interface MessageData {
  id: string;
  type: 'message' | 'typing' | 'presence';
  content?: string;
  senderId: string;
  senderName: string;
  roomId: string;
  timestamp: number;
  replyTo?: string;
}

export interface WebSocketConnection {
  id: string;
  clientId: string;
  userId: string;
  roomId: string;
  socket: any;
}

export class MessagingExtension implements Extension {
  public readonly name = "messaging";

  // Store connected clients
  private connections: Map<string, WebSocketConnection> = new Map();

  // Store room memberships
  private roomMemberships: Map<string, Set<string>> = new Map(); // roomId -> Set of connectionIds

  constructor() {
    // No need to call super() since we're implementing, not extending
  }

  // Called when a WebSocket connection is established
  async onConnect(data: onConnectPayload) {
    const { connection, request, documentName, context } = data;
    // Use socketId instead of connection.id
    const connectionId = `${data.socketId || Math.random().toString(36).substring(7)}`;

    logger.info(`Client ${connectionId} connected to messaging`, { extension: "messaging", event: "connect" });

    // Store the connection information
    if (context && context.userId) {
      const websocketConn: WebSocketConnection = {
        id: connectionId,
        clientId: data.socketId ? data.socketId.toString() : connectionId,
        userId: context.userId,
        roomId: documentName, // Document name corresponds to room ID
        socket: connection
      };

      this.connections.set(connectionId, websocketConn);

      // Add user to room membership
      if (!this.roomMemberships.has(documentName)) {
        this.roomMemberships.set(documentName, new Set());
      }
      this.roomMemberships.get(documentName)!.add(connectionId);

      // Notify other users in the room about new presence
      this.broadcastToRoom(
        documentName,
        {
          type: 'presence',
          content: 'online',
          senderId: context.userId,
          senderName: context.user?.name || 'Unknown',
          roomId: documentName,
          timestamp: Date.now(),
          id: uuidv4() // Add ID to satisfy MessageData interface
        },
        connectionId // Exclude sender from broadcast
      );
    }
  }

  // Called when a WebSocket connection is authenticated
  async onAuthenticate(data: onAuthenticatePayload) {
    const { request, documentName, token } = data;
    
    logger.debug(`Authentication requested for document: ${documentName}`);
    
    // Here we would validate the JWT token from the request
    // and return the user context
    try {
      // Assuming token contains user info as JSON string
      const userDetails = JSON.parse(token);
      return {
        userId: userDetails.id,
        user: {
          id: userDetails.id,
          name: userDetails.name || userDetails.display_name,
        },
      };
    } catch (error) {
      logger.error("Authentication failed:", error, { extension: "messaging", event: "auth_error" });
      throw new Error("Invalid authentication token");
    }
  }

  // Called when a message is received
  async onMessage(data: onMessagePayload) {
    const { document, request, socketId, message, context } = data;
    
    try {
      const messageData: MessageData = JSON.parse(new TextDecoder().decode(message));
      
      if (messageData.type === 'message') {
        // Validate message content
        if (!messageData.content || messageData.content.trim() === '') {
          logger.warn(`Received empty message from user`, { userId: context.userId, extension: "messaging", event: "empty_message" });
          return;
        }
        
        // Add ID and timestamp
        messageData.id = uuidv4();
        messageData.timestamp = Date.now();
        
        // Save message to database via API call
        await this.saveMessageToDatabase(messageData, context);
        
        // Broadcast the message to all members in the room
        this.broadcastToRoom(
          messageData.roomId,
          messageData,
          socketId?.toString() // Exclude sender from broadcast
        );
      } else if (messageData.type === 'typing') {
        // Broadcast typing indicator to room
        this.broadcastToRoom(
          messageData.roomId,
          {
            ...messageData,
            id: uuidv4() // Add ID to satisfy MessageData interface
          },
          socketId?.toString() // Exclude sender from broadcast
        );
      }
    } catch (error) {
      logger.error("Error processing message:", error, { extension: "messaging", event: "message_processing_error" });
    }
  }

  // Called when a WebSocket connection is disconnected
  async onDisconnect(data: onDisconnectPayload) {
    const { context } = data;
    // Use socketId instead of connection.connection
    const connectionId = (data.socketId || Math.random().toString(36).substring(7)).toString();

    logger.info(`Client disconnected from messaging`, { connectionId, extension: "messaging", event: "disconnect" });

    this.handleDisconnection(connectionId, context);
  }

  // Helper to handle disconnections
  private handleDisconnection(connectionId: string, context: any) {
    const conn = this.connections.get(connectionId);
    if (conn) {
      // Remove from connections map
      this.connections.delete(connectionId);
      
      // Remove from room membership
      const roomMembers = this.roomMemberships.get(conn.roomId);
      if (roomMembers) {
        roomMembers.delete(connectionId);
        if (roomMembers.size === 0) {
          this.roomMemberships.delete(conn.roomId); // Cleanup empty rooms
        }
      }
      
      // Notify other users in the room about user leaving
      if (context && context.userId) {
        this.broadcastToRoom(
          conn.roomId,
          {
            type: 'presence',
            content: 'offline',
            senderId: context.userId,
            senderName: context.user?.name || 'Unknown',
            roomId: conn.roomId,
            timestamp: Date.now(),
            id: uuidv4() // Add ID to satisfy MessageData interface
          },
          connectionId // Exclude disconnected user from broadcast
        );
      }
    }
  }

  // Called when server status changes
  async onStateless(data: onStatelessPayload) {
    // Handle server status updates if needed
    logger.info(`Messaging extension stateless event:`, { extension: "messaging", event: "stateless" });
  }

  // Called when a request occurs
  async onRequest(data: onRequestPayload) {
    logger.error(`Messaging request event:`, { extension: "messaging", event: "request" });
  }

  // Called when the server is destroyed
  async onDestroy(data: onDestroyPayload) {
    logger.info("Destroying messaging extension...", { extension: "messaging", event: "destroy" });
    this.connections.clear();
    this.roomMemberships.clear();
  }

  /**
   * Send a message to all members of a room except the sender
   */
  private broadcastToRoom(roomId: string, messageData: MessageData, excludeConnectionId?: string) {
    const roomMembers = this.roomMemberships.get(roomId);
    if (!roomMembers) {
      logger.warn(`No members found for room:`, { roomId, extension: "messaging", event: "no_room_members" });
      return;
    }

    for (const connectionId of roomMembers) {
      if (excludeConnectionId && connectionId === excludeConnectionId) {
        continue; // Skip sender
      }
      
      const client = this.connections.get(connectionId);
      if (client && client.socket && client.socket.send) {
        try {
          client.socket.send(JSON.stringify(messageData));
        } catch (error) {
          logger.error(`Failed to send message to client:`, error, { connectionId, extension: "messaging", event: "send_message_error" });
        }
      }
    }
  }

  /**
   * Save message to database via API call
   */
  private async saveMessageToDatabase(messageData: MessageData, context: any) {
    try {
      // Construct API endpoint to save message
      const apiEndpoint = process.env.API_BASE_URL || "http://localhost:8000";
      
      const response = await axios.post(
        `${apiEndpoint}/api/messages/`, 
        {
          room: messageData.roomId,
          message: messageData.content,
          reply_to: messageData.replyTo || null,
        },
        {
          headers: {
            'Authorization': `Bearer ${context.token || ''}`, // Pass auth token if available
            'Content-Type': 'application/json'
          }
        }
      );
      
      logger.info(`Message saved to database`, { messageId: response.data.id, extension: "messaging", event: "message_saved" });
    } catch (error) {
      logger.error(`Failed to save message to database:`, error, { extension: "messaging", event: "save_message_error" });
    }
  }

  /**
   * Get all members of a room
   */
  public getRoomMembers(roomId: string): string[] {
    const roomMembers = this.roomMemberships.get(roomId);
    return roomMembers ? Array.from(roomMembers) : [];
  }

  /**
   * Get connection count for statistics
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }
}