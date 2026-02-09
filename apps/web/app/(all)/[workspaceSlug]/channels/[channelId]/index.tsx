/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Hash, Users, X } from "lucide-react";
import { useMessagingStore } from "@/hooks/store/use-messaging-store";
import { useMessagingWebSocket } from "@/hooks/use-messaging-websocket";
import { ChannelList } from "@/components/messaging/channel-list";
import { MessageList } from "@/components/messaging/message-list";
import { MessageInput } from "@/components/messaging/message-input";
import { Button } from "@kardon/propel/button";
import { EModalPosition, EModalWidth, ModalCore } from "@kardon/ui";

function ChannelPage() {
  const { workspaceSlug, channelId } = useParams<{ workspaceSlug: string; channelId: string }>();
  const {
    currentChannel,
    isConnected,
    channelMembers,
    fetchChannelMembers,
    fetchMessages,
    setCurrentChannelId,
    fetchChannels,
    joinChannel,
  } = useMessagingStore();
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  const currentMembers = channelId ? channelMembers[channelId] || [] : [];

  useMessagingWebSocket({
    workspaceSlug: workspaceSlug || "",
    onMessage: (message) => {},
  });

  useEffect(() => {
    if (workspaceSlug) {
      fetchChannels(workspaceSlug);
    }
  }, [workspaceSlug, fetchChannels]);

  useEffect(() => {
    if (workspaceSlug && channelId) {
      setCurrentChannelId(channelId);
    }
  }, [workspaceSlug, channelId, setCurrentChannelId]);

  useEffect(() => {
    if (!workspaceSlug || !channelId || !currentChannel) return;

    const initChannel = async () => {
      // Auto-join public channels (ignore if already joined)
      if (currentChannel.channel_type === "public") {
        try {
          await joinChannel(workspaceSlug, channelId);
        } catch {
          // Already a member, ignore error
        }
      }
      // Fetch members and messages after joining
      await fetchChannelMembers(workspaceSlug, channelId);
      await fetchMessages(workspaceSlug, channelId);
    };
    initChannel();
  }, [workspaceSlug, channelId, currentChannel, joinChannel, fetchChannelMembers, fetchMessages]);

  // Poll messages every 0.5s only when there are unread or user just sent
  useEffect(() => {
    if (!workspaceSlug || !channelId) return;

    let lastFetch = Date.now();

    const interval = setInterval(() => {
      // Only poll if there are unread messages OR recent activity
      const unread = currentChannel?.unread_count;
      const recentlyFetched = Date.now() - lastFetch < 5000;

      if ((unread && unread > 0) || !recentlyFetched) {
        fetchMessages(workspaceSlug, channelId);
        lastFetch = Date.now();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [workspaceSlug, channelId, currentChannel, fetchMessages]);

  const openMembersModal = () => setIsMembersModalOpen(true);
  const closeMembersModal = () => setIsMembersModalOpen(false);

  if (!workspaceSlug) return null;

  return (
    <>
      <div className="flex h-full">
        <aside className="w-64 border-r flex flex-col flex-shrink-0">
          <ChannelList workspaceSlug={workspaceSlug} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {channelId ? (
            <>
              <header className="h-14 border-b flex items-center px-4 gap-3 flex-shrink-0">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <h1 className="font-semibold">{currentChannel?.name || "Loading..."}</h1>
                {currentChannel?.description && (
                  <span className="text-sm text-muted-foreground hidden md:inline">{currentChannel.description}</span>
                )}
                <div className="flex-1" />
                <button
                  onClick={openMembersModal}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                  title="Manage members"
                >
                  <Users className="h-4 w-4" />
                </button>
                <div
                  className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
                  title={isConnected ? "Connected" : "Disconnected"}
                />
              </header>

              <MessageList workspaceSlug={workspaceSlug} />

              <MessageInput workspaceSlug={workspaceSlug} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a channel to start messaging
            </div>
          )}
        </main>
      </div>

      <ModalCore
        isOpen={isMembersModalOpen}
        position={EModalPosition.TOP}
        width={EModalWidth.MD}
        handleClose={closeMembersModal}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Channel Members</h2>
            <button onClick={closeMembersModal} className="p-1 hover:bg-accent rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {currentMembers.length > 0 ? (
              currentMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {(member.member_details?.display_name || member.member_details?.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {member.member_details?.display_name || member.member_details?.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.role === 20 ? "Admin" : member.role === 15 ? "Member" : "Viewer"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-sm text-muted-foreground">No members found</div>
            )}
          </div>
        </div>
      </ModalCore>
    </>
  );
}

export default observer(ChannelPage);
