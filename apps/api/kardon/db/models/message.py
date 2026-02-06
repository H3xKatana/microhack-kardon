# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.conf import settings
from django.db import models

# Module imports
from kardon.db.mixins import TimeAuditModel, BulkCreateManager


def get_default_message_room_description():
    return "General discussion room"


class MessageRoom(TimeAuditModel):
    """
    Represents a chat room/group where users can communicate within workspaces/projects
    """
    id = models.UUIDField(db_index=True, primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(default=get_default_message_room_description)
    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="message_rooms",
        null=True,
        blank=True
    )
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.CASCADE,
        related_name="message_rooms",
        null=True,
        blank=True
    )
    is_private = models.BooleanField(default=False)  # For private 1:1 conversations
    is_archived = models.BooleanField(default=False)
    
    objects = BulkCreateManager()

    class Meta:
        verbose_name = "Message Room"
        verbose_name_plural = "Message Rooms"
        db_table = "message_rooms"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["workspace"], name="message_room_workspace_idx"),
            models.Index(fields=["project"], name="message_room_project_idx"),
            models.Index(fields=["is_private"], name="message_room_private_idx"),
            models.Index(fields=["is_archived"], name="message_room_archived_idx"),
        ]

    def __str__(self):
        return f"{self.name} <{self.id}>"


class Message(TimeAuditModel):
    """
    Represents a message sent in a message room
    """
    id = models.UUIDField(db_index=True, primary_key=True)
    room = models.ForeignKey(MessageRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages"
    )
    message = models.TextField()
    attachments = models.JSONField(default=list)  # Store attachment metadata
    reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies"
    )
    is_reply = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    objects = BulkCreateManager()

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        db_table = "messages"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["room"], name="message_room_idx"),
            models.Index(fields=["sender"], name="message_sender_idx"),
            models.Index(fields=["reply_to"], name="message_reply_idx"),
            models.Index(fields=["is_deleted"], name="message_deleted_idx"),
        ]

    def __str__(self):
        return f"Message by {self.sender.display_name} in {self.room.name}"


class MessageMember(TimeAuditModel):
    """
    Represents a user's membership in a message room
    """
    id = models.UUIDField(db_index=True, primary_key=True)
    room = models.ForeignKey(MessageRoom, on_delete=models.CASCADE, related_name="members")
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_rooms"
    )
    is_muted = models.BooleanField(default=False)
    view_props = models.JSONField(default=dict)  # Store user preferences for this room
    last_read_at = models.DateTimeField(null=True, blank=True)
    
    objects = BulkCreateManager()

    class Meta:
        verbose_name = "Message Member"
        verbose_name_plural = "Message Members"
        db_table = "message_members"
        ordering = ("-created_at",)
        unique_together = ["room", "member"]
        indexes = [
            models.Index(fields=["room"], name="message_member_room_idx"),
            models.Index(fields=["member"], name="message_member_member_idx"),
        ]

    def __str__(self):
        return f"{self.member.display_name} in {self.room.name}"


class MessageReaction(TimeAuditModel):
    """
    Represents reactions to messages (like emojis)
    """
    id = models.UUIDField(db_index=True, primary_key=True)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reactions"
    )
    reaction = models.CharField(max_length=20)  # Emoji or reaction code
    
    objects = BulkCreateManager()

    class Meta:
        verbose_name = "Message Reaction"
        verbose_name_plural = "Message Reactions"
        db_table = "message_reactions"
        ordering = ("-created_at",)
        unique_together = ["message", "actor", "reaction"]
        indexes = [
            models.Index(fields=["message"], name="message_reaction_message_idx"),
            models.Index(fields=["actor"], name="message_reaction_actor_idx"),
        ]

    def __str__(self):
        return f"{self.reaction} by {self.actor.display_name} on message {self.message.id}"


class MessageNotification(TimeAuditModel):
    """
    Represents message notifications to users
    """
    id = models.UUIDField(db_index=True, primary_key=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="triggered_message_notifications",
        null=True
    )
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_message_notifications"
    )
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="notifications")
    message_thread = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="thread_notifications",
        null=True
    )
    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE)
    project = models.ForeignKey("db.Project", on_delete=models.CASCADE, null=True)
    # Notification preferences
    notify_user = models.BooleanField(default=True)
    snoozed_till = models.DateTimeField(null=True)
    archived_at = models.DateTimeField(null=True)
    read_at = models.DateTimeField(null=True)
    
    objects = BulkCreateManager()

    class Meta:
        verbose_name = "Message Notification"
        verbose_name_plural = "Message Notifications"
        db_table = "message_notifications"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["member"], name="message_notification_member_idx"),
            models.Index(fields=["message"], name="message_notification_message_idx"),
            models.Index(fields=["workspace"], name="message_notification_workspace_idx"),
            models.Index(fields=["project"], name="message_notification_project_idx"),
            models.Index(fields=["read_at"], name="message_notification_read_idx"),
            models.Index(fields=["notify_user"], name="message_notification_notify_idx"),
        ]

    def __str__(self):
        return f"Notification for {self.member.display_name} about message {self.message.id}"