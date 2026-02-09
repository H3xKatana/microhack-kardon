/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { useEffect, useRef, useCallback } from "react";
import type { IWebSocketMessage, IMessage, ITypingIndicator } from "@kardon/types";
import { useUser } from "@/hooks/store/user";
import { LIVE_BASE_URL, LIVE_BASE_PATH } from "@kardon/constants";

interface UseMessagingWebSocketProps {
  workspaceSlug: string;
  onMessage?: (message: IMessage) => void;
  onTyping?: (indicator: ITypingIndicator) => void;
  onReaction?: (data: {
    channelId: string;
    messageId: string;
    reaction: IMessage["reactions"][0];
    isRemoved: boolean;
  }) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const useMessagingWebSocket = ({
  workspaceSlug,
  onMessage,
  onTyping,
  onReaction,
  onConnected,
  onDisconnected,
}: UseMessagingWebSocketProps) => {
  const { data: currentUser } = useUser();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!workspaceSlug || !currentUser?.id) return;

    const wsUrl = `${LIVE_BASE_URL.replace(/^http/, "ws")}${LIVE_BASE_PATH}/messaging/ws/.websocket`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Messaging WS] Connection opened");
      onConnected?.();
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as IWebSocketMessage;

        switch (data.type) {
          case "connected":
            console.log("[Messaging WS] Connected:", data.clientId);
            break;

          case "message": {
            const message = data.data as IMessage;
            if (message.sender !== currentUser?.id) {
              onMessage?.(message);
            }
            break;
          }

          case "typing": {
            const indicator = data.data as ITypingIndicator;
            if (indicator.userId !== currentUser?.id) {
              onTyping?.(indicator);
            }
            break;
          }

          case "reaction": {
            const reactionData = data.data as {
              channelId: string;
              messageId: string;
              reaction: IMessage["reactions"][0];
              isRemoved: boolean;
            };
            onReaction?.(reactionData);
            break;
          }

          case "error":
            console.error("[Messaging WS] Error:", data.error);
            break;
        }
      } catch (error) {
        console.error("[Messaging WS] Failed to parse message:", error);
      }
    };

    ws.onclose = () => {
      console.log("[Messaging WS] Connection closed");
      onDisconnected?.();

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error: Event) => {
      console.error("[Messaging WS] Connection error:", error);
    };

    wsRef.current = ws;
  }, [workspaceSlug, currentUser?.id, onMessage, onTyping, onReaction, onConnected, onDisconnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const sendTyping = useCallback((channelId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          channelId,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  const sendMessage = useCallback((channelId: string, message: IMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          channelId,
          data: message,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  const sendReaction = useCallback(
    (channelId: string, messageId: string, reaction: IMessage["reactions"][0], isRemoved = false) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "reaction",
            channelId,
            data: { channelId, messageId, reaction, isRemoved },
            timestamp: Date.now(),
          })
        );
      }
    },
    []
  );

  const joinChannel = useCallback((channelId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "join",
          channelId,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "leave",
          channelId,
          timestamp: Date.now(),
        })
      );
    }
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    sendTyping,
    sendMessage,
    sendReaction,
    joinChannel,
    leaveChannel,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
};
