/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Request } from "express";
import WebSocket from "ws";
import { Controller, WebSocket as WSDecorator } from "@kardon/decorators";
import { logger } from "@kardon/logger";
import { redisManager } from "@/redis";

interface MessagePayload {
  type: "message" | "typing" | "reaction" | "join" | "leave" | "read";
  channelId: string;
  workspaceSlug: string;
  data: unknown;
  timestamp: number;
}

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  workspaceSlug: string;
  channelIds: Set<string>;
}

@Controller("/messaging")
export class MessagingController {
  [key: string]: unknown;
  private clients: Map<string, ConnectedClient> = new Map();
  private channelSubscriptions: Map<string, Set<string>> = new Map(); // channelId -> Set of clientIds

  constructor() {
    // Subscribe to Redis pub/sub for cross-instance message broadcasting
    this.setupRedisSubscription();
  }

  private async setupRedisSubscription() {
    try {
      await redisManager.subscribe("messaging:broadcast", (message) => {
        this.handleBroadcastMessage(JSON.parse(message));
      });
    } catch (error) {
      logger.error("MESSAGING_CONTROLLER: Failed to setup Redis subscription:", error);
    }
  }

  private handleBroadcastMessage(payload: MessagePayload) {
    const { channelId, data, type } = payload;
    const subscribers = this.channelSubscriptions.get(channelId);

    if (!subscribers) return;

    const message = JSON.stringify({ type, data, timestamp: Date.now() });

    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  private subscribeToChannel(clientId: string, channelId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.channelIds.add(channelId);

    if (!this.channelSubscriptions.has(channelId)) {
      this.channelSubscriptions.set(channelId, new Set());
    }
    this.channelSubscriptions.get(channelId)!.add(clientId);
  }

  private unsubscribeFromChannel(clientId: string, channelId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.channelIds.delete(channelId);
    }

    const subscribers = this.channelSubscriptions.get(channelId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.channelSubscriptions.delete(channelId);
      }
    }
  }

  private unsubscribeFromAllChannels(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.channelIds.forEach((channelId) => {
      this.unsubscribeFromChannel(clientId, channelId);
    });
  }

  @WSDecorator("/ws")
  handleConnection(ws: WebSocket, req: Request) {
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract user info from auth middleware
    const userId = (req as unknown as Record<string, unknown>).userId as string | undefined;
    const workspaceSlug = (req as unknown as Record<string, unknown>).workspaceSlug as string | undefined;

    if (!userId || !workspaceSlug) {
      logger.warn("MESSAGING_CONTROLLER: Connection attempt without authentication");
      ws.close(1008, "Authentication required");
      return;
    }

    logger.info(`MESSAGING_CONTROLLER: Client connected: ${clientId}`);

    // Store client
    this.clients.set(clientId, {
      ws,
      userId,
      workspaceSlug,
      channelIds: new Set(),
    });

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: "connected",
        clientId,
        timestamp: Date.now(),
      })
    );

    // Handle messages from client
    ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString()) as MessagePayload;
        this.handleClientMessage(clientId, message);
      } catch (error) {
        logger.error("MESSAGING_CONTROLLER: Failed to parse message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            error: "Invalid message format",
          })
        );
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      logger.info(`MESSAGING_CONTROLLER: Client disconnected: ${clientId}`);
      this.unsubscribeFromAllChannels(clientId);
      this.clients.delete(clientId);
    });

    // Handle errors
    ws.on("error", (error: Error) => {
      logger.error(`MESSAGING_CONTROLLER: WebSocket error for client ${clientId}:`, error);
    });
  }

  private async handleClientMessage(clientId: string, payload: MessagePayload) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { type, channelId, data } = payload;

    switch (type) {
      case "join":
        this.subscribeToChannel(clientId, channelId);
        client.ws.send(
          JSON.stringify({
            type: "joined",
            channelId,
            timestamp: Date.now(),
          })
        );
        break;

      case "leave":
        this.unsubscribeFromChannel(clientId, channelId);
        break;

      case "typing":
        // Broadcast typing indicator to channel members
        await this.broadcastToChannel(
          channelId,
          {
            type: "typing",
            channelId,
            userId: client.userId,
            timestamp: Date.now(),
          },
          clientId
        );
        break;

      case "message":
      case "reaction":
      case "read":
        // Broadcast to Redis for cross-instance distribution
        await redisManager.publish(
          "messaging:broadcast",
          JSON.stringify({
            type,
            channelId,
            workspaceSlug: client.workspaceSlug,
            data,
            timestamp: Date.now(),
          })
        );
        break;

      default:
        client.ws.send(
          JSON.stringify({
            type: "error",
            error: `Unknown message type: ${type}`,
          })
        );
    }
  }

  private async broadcastToChannel(channelId: string, data: unknown, excludeClientId?: string) {
    const subscribers = this.channelSubscriptions.get(channelId);
    if (!subscribers) return;

    const message = JSON.stringify(data);

    subscribers.forEach((clientId) => {
      if (clientId === excludeClientId) return;

      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }
}
