/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useEffect, useState } from "react";
// kardon imports
import { useTranslation } from "@kardon/i18n";
// components
import { PageHead } from "@/components/core/page-title";
import { MessagingSidebar } from "@kardon/ui/message";
import { useRealTimeMessaging } from "@/hooks/use-realtime-messaging";
// hooks
import { useMessage } from "@/hooks/store/use-message";
import { useUser } from "@/hooks/store/use-user";
import { useWorkspace } from "@/hooks/store/use-workspace";
import type { Route } from "./+types/page";

const MessagingPage = observer(({ params }: Route.ComponentProps) => {
  const { workspaceSlug } = params;
  // kardon hooks
  const { t } = useTranslation();
  const { 
    fetchRooms, 
    fetchRoomMessages, 
    sendMessage, 
    joinRoom, 
    leaveRoom, 
    setActiveRoom, 
    activeRoomId, 
    activeRoomMessages,
    rooms
  } = useMessage();
  const { currentWorkspace } = useWorkspace();
  const { currentUser } = useUser();
  
  const [localMessages, setLocalMessages] = useState<any[]>([]);

  // Initialize messaging functionality
  useEffect(() => {
    if (workspaceSlug) {
      fetchRooms(workspaceSlug);
    }
  }, [workspaceSlug, fetchRooms]);

  // Update local messages when active room changes
  useEffect(() => {
    if (activeRoomId && workspaceSlug) {
      fetchRoomMessages(workspaceSlug, activeRoomId);
    }
  }, [activeRoomId, workspaceSlug, fetchRoomMessages]);

  // Sync store messages to local state
  useEffect(() => {
    setLocalMessages(activeRoomMessages);
  }, [activeRoomMessages]);

  // Real-time messaging hook
  const { isConnected, sendMessage: sendRealTimeMessage } = useRealTimeMessaging({
    roomId: activeRoomId || '',
    userId: currentUser?.id || '',
    userName: currentUser?.display_name || 'User',
    onMessage: (messageData) => {
      // Update local messages when receiving real-time messages
      setLocalMessages(prev => [...prev, messageData]);
    },
    onPresence: (presenceData) => {
      // Handle presence updates if needed
      console.log('Presence update:', presenceData);
    },
    onError: (error) => {
      console.error('Real-time messaging error:', error);
    }
  });

  const handleSend = async (content: string) => {
    if (!activeRoomId || !workspaceSlug) return;
    
    try {
      // Send via API & real-time
      const messageResponse = await sendMessage(workspaceSlug, activeRoomId, content);
      
      // Optimistic update
      setLocalMessages(prev => [...prev, messageResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRoomSelect = async (roomId: string) => {
    setActiveRoom(roomId);
    
    if (workspaceSlug) {
      try {
        await joinRoom(workspaceSlug, roomId);
        // Fetch messages for the selected room
        await fetchRoomMessages(workspaceSlug, roomId);
      } catch (error) {
        console.error('Error joining room:', error);
      }
    }
  };

  const handleRoomCreate = async () => {
    // Implement room creation logic
    console.log('Create new room');
  };

  // derived values
  const pageTitle = currentWorkspace?.name
    ? `${t("messaging")} - ${currentWorkspace?.name}`
    : t("messaging");

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="h-full w-full">
        <MessagingSidebar
          rooms={rooms}
          messages={localMessages}
          currentUserId={currentUser?.id || ''}
          onRoomSelect={handleRoomSelect}
          onSend={handleSend}
          onRoomCreate={handleRoomCreate}
          selectedRoomId={activeRoomId}
        />
      </div>
    </>
  );
});

export default MessagingPage;