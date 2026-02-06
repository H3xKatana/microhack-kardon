/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useRef, useState } from "react";

interface MessageData {
  id: string;
  type: 'message' | 'typing' | 'presence';
  content?: string;
  senderId: string;
  senderName: string;
  roomId: string;
  timestamp: number;
  replyTo?: string;
}

interface UseRealTimeMessagingProps {
  roomId: string;
  userId: string;
  userName: string;
  onMessage: (message: MessageData) => void;
  onPresence?: (presenceData: MessageData) => void;
  onError?: (error: Event) => void;
}

export const useRealTimeMessaging = ({
  roomId,
  userId,
  userName,
  onMessage,
  onPresence,
  onError
}: UseRealTimeMessagingProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!roomId || !userId) return;

    const connect = () => {
      // In a real implementation, you would get the WebSocket URL from environment/config
      const wsUrl = process.env.REACT_APP_LIVE_WS_URL || 
                   `ws://localhost:3000/?document=${roomId}&token=${JSON.stringify({id: userId, name: userName})}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`Connected to room ${roomId}`);
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      ws.onmessage = (event) => {
        try {
          const data: MessageData = JSON.parse(event.data);
          
          if (data.type === 'message') {
            onMessage(data);
          } else if (data.type === 'presence' && onPresence) {
            onPresence(data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (onError) onError(error);
      };

      ws.onclose = (event) => {
        console.log(`Disconnected from room ${roomId}:`, event.reason);
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (!event.wasClean) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
          setTimeout(connect, timeout);
          setReconnectAttempts(prev => prev + 1);
        }
      };
    };

    connect();

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId, userId, userName]);

  // Send a message
  const sendMessage = (content: string, replyTo?: string) => {
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    const messageData: MessageData = {
      id: Date.now().toString(), // This will be replaced with actual ID from server
      type: 'message',
      content,
      senderId: userId,
      senderName: userName,
      roomId,
      timestamp: Date.now(),
      replyTo
    };

    wsRef.current.send(JSON.stringify(messageData));
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const typingData: MessageData = {
      id: Date.now().toString(),
      type: 'typing',
      content: isTyping ? 'typing' : 'stopped_typing',
      senderId: userId,
      senderName: userName,
      roomId,
      timestamp: Date.now()
    };

    wsRef.current.send(JSON.stringify(typingData));
  };

  return {
    isConnected,
    sendMessage,
    sendTypingIndicator,
  };
};