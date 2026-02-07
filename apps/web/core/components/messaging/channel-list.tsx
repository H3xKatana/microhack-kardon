/**
 * Copyright (c) 2023-present Kardon Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { useState, Fragment, useEffect } from "react";
import Link from "next/link";
import { Hash, Lock, MessageCircle, Plus, Users, X } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import type { IChannel } from "@kardon/types";
import type { ChannelType } from "@kardon/types";
import type { IWorkspaceMember } from "@kardon/types";
import { useMessagingStore } from "@/hooks/store/use-messaging-store";
import { WorkspaceService } from "@/kardon-web/services";
import { Button } from "@kardon/propel/button";
import { Input } from "@kardon/propel/input";
import { EModalPosition, EModalWidth, ModalCore } from "@kardon/ui";
import { useTranslation } from "@kardon/i18n";
import useKeypress from "@/hooks/use-keypress";

interface ChannelListProps {
  workspaceSlug: string;
}

export const ChannelList = observer(({ workspaceSlug }: ChannelListProps) => {
  const { channels, currentChannelId, loader, createChannel, fetchChannels } = useMessagingStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<ChannelType>("public");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [members, setMembers] = useState<IWorkspaceMember[]>([]);
  const [membersLoader, setMembersLoader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const workspaceService = new WorkspaceService();

  const loadMembers = async () => {
    setMembersLoader(true);
    try {
      const data = await workspaceService.fetchWorkspaceMembers(workspaceSlug);
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setMembersLoader(false);
    }
  };

  useEffect(() => {
    if (isMembersModalOpen) {
      loadMembers();
    }
  }, [isMembersModalOpen, workspaceSlug]);

  useEffect(() => {
    if (workspaceSlug) {
      fetchChannels(workspaceSlug);
    }
  }, [workspaceSlug, fetchChannels]);

  useKeypress("Escape", () => {
    if (isCreateModalOpen) closeCreateModal();
    if (isMembersModalOpen) closeMembersModal();
  });

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewChannelName("");
    setNewChannelType("public");
    setSelectedMemberIds([]);
    setError(null);
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setNewChannelName("");
    setNewChannelType("public");
    setSelectedMemberIds([]);
    setError(null);
  };

  const closeMembersModal = () => {
    setIsMembersModalOpen(false);
    setSelectedMemberIds([]);
  };

  const openMembersModal = () => {
    setIsMembersModalOpen(true);
    setSelectedMemberIds([]);
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || isCreating) return;

    setError(null);
    setIsCreating(true);

    try {
      await createChannel(workspaceSlug, {
        name: newChannelName.trim(),
        channel_type: newChannelType,
        member_ids: selectedMemberIds,
      });
      closeCreateModal();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create channel";
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const getChannelIcon = (channel: IChannel) => {
    if (channel.channel_type === "direct") return <MessageCircle className="h-4 w-4" />;
    if (channel.channel_type === "private") return <Lock className="h-4 w-4" />;
    return <Hash className="h-4 w-4" />;
  };

  if (loader) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Channels</h3>
          <button
            onClick={openCreateModal}
            className="h-6 w-6 flex items-center justify-center hover:bg-accent rounded transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No channels yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-0.5">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/${workspaceSlug}/channels/${channel.id}`}
                  className={`flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-accent transition-colors ${
                    currentChannelId === channel.id ? "bg-accent font-medium" : ""
                  }`}
                >
                  <span className="text-muted-foreground">{getChannelIcon(channel)}</span>
                  <span className="flex-1 truncate">{channel.name}</span>
                  {channel.unread_count > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {channel.unread_count > 99 ? "99+" : channel.unread_count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Channel Modal */}
      <ModalCore
        isOpen={isCreateModalOpen}
        position={EModalPosition.TOP}
        width={EModalWidth.MD}
        handleClose={closeCreateModal}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Create Channel</h2>
            <button onClick={closeCreateModal} className="p-1 hover:bg-accent rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Channel Name</label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. general"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateChannel();
                  if (e.key === "Escape") closeCreateModal();
                }}
              />
              {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Channel Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewChannelType("public")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border transition-all ${
                    newChannelType === "public"
                      ? "bg-accent-primary/10 border-accent-primary text-accent-primary"
                      : "bg-layer-1 border-subtle hover:bg-accent"
                  }`}
                >
                  <Hash className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Public</div>
                    <div className="text-xs opacity-70">Anyone can join</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewChannelType("private")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border transition-all ${
                    newChannelType === "private"
                      ? "bg-accent-primary/10 border-accent-primary text-accent-primary"
                      : "bg-layer-1 border-subtle hover:bg-accent"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-sm font-medium">Private</div>
                    <div className="text-xs opacity-70">Invite only</div>
                  </div>
                </button>
              </div>
            </div>

            {newChannelType === "private" && (
              <div>
                <button
                  type="button"
                  onClick={openMembersModal}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-subtle hover:bg-accent transition-colors w-full"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedMemberIds.length > 0
                      ? `${selectedMemberIds.length} members selected`
                      : "Add members (optional)"}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="secondary" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateChannel} disabled={!newChannelName.trim() || isCreating}>
              {isCreating ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </div>
      </ModalCore>

      {/* Add Members Modal */}
      <Transition.Root show={isMembersModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeMembersModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-backdrop transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-30 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-4"
              >
                <Dialog.Panel className="relative w-full max-w-md transform rounded-lg bg-surface-1 shadow-raised-200 transition-all">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Dialog.Title className="text-lg font-semibold">Add Members</Dialog.Title>
                      <button onClick={closeMembersModal} className="p-1 hover:bg-accent rounded transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {membersLoader ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">Loading members...</div>
                      ) : members.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">No members found</div>
                      ) : (
                        members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => toggleMember(member.id)}
                            className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors ${
                              selectedMemberIds.includes(member.id) ? "bg-accent" : "hover:bg-accent/50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {(member.display_name || member.email || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium">{member.display_name || member.email}</div>
                              {member.display_name && (
                                <div className="text-xs text-muted-foreground">{member.email}</div>
                              )}
                            </div>
                            {selectedMemberIds.includes(member.id) && (
                              <div className="h-4 w-4 rounded-full bg-primary" />
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button variant="secondary" onClick={closeMembersModal}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={closeMembersModal}>
                        Done
                      </Button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
});
