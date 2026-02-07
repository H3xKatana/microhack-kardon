# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.conf import settings
from django.db import models
from .base import BaseModel


class Message(BaseModel):
    """Real-time group messages within workspace channels."""

    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="messages")
    project = models.ForeignKey(
        "db.Project", on_delete=models.CASCADE, related_name="project_messages", null=True, blank=True
    )
    channel = models.ForeignKey(
        "db.Channel", on_delete=models.CASCADE, related_name="channel_messages", null=True, blank=True
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField()
    content_json = models.JSONField(default=dict, blank=True)
    parent = models.ForeignKey("self", on_delete=models.CASCADE, related_name="replies", null=True, blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        db_table = "messages"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["workspace", "created_at"], name="msg_workspace_created_idx"),
            models.Index(fields=["channel", "created_at"], name="msg_channel_created_idx"),
            models.Index(fields=["sender", "created_at"], name="msg_sender_created_idx"),
            models.Index(fields=["parent", "created_at"], name="msg_parent_created_idx"),
        ]

    def __str__(self):
        return f"<{self.sender.email}>: {self.content[:50]}"


class Channel(BaseModel):
    """Messaging channels within workspaces."""

    class ChannelType(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"
        DIRECT = "direct", "Direct"

    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="channels")
    project = models.ForeignKey(
        "db.Project", on_delete=models.CASCADE, related_name="project_channels", null=True, blank=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    channel_type = models.CharField(max_length=20, choices=ChannelType.choices, default=ChannelType.PUBLIC)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_channels")
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="ChannelMember", through_fields=("channel", "member"), related_name="channels"
    )
    is_archived = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Channel"
        verbose_name_plural = "Channels"
        db_table = "channels"
        unique_together = ["workspace", "name", "deleted_at"]
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["workspace", "channel_type"], name="channel_workspace_type_idx"),
            models.Index(fields=["project", "created_at"], name="channel_project_created_idx"),
        ]

    def __str__(self):
        return f"#{self.name} <{self.workspace.name}>"


class ChannelMember(BaseModel):
    """Channel membership with last read tracking."""

    class Role(models.IntegerChoices):
        ADMIN = 20, "Admin"
        MEMBER = 15, "Member"
        VIEWER = 5, "Viewer"

    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="channel_members")
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_memberships")
    role = models.PositiveSmallIntegerField(choices=Role.choices, default=Role.MEMBER)
    last_read_at = models.DateTimeField(null=True, blank=True)
    last_read_message = models.ForeignKey(
        Message, on_delete=models.SET_NULL, related_name="read_by", null=True, blank=True
    )
    is_muted = models.BooleanField(default=False)
    notification_preference = models.CharField(
        max_length=20,
        choices=[
            ("all", "All Messages"),
            ("mentions", "Mentions Only"),
            ("none", "None"),
        ],
        default="all",
    )

    class Meta:
        verbose_name = "Channel Member"
        verbose_name_plural = "Channel Members"
        db_table = "channel_members"
        unique_together = ["channel", "member", "deleted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["channel", "member"],
                condition=models.Q(deleted_at__isnull=True),
                name="channel_member_unique_channel_member_when_deleted_at_null",
            )
        ]
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.member.email} in #{self.channel.name}"


class MessageReaction(BaseModel):
    """Reactions to messages."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    reacted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_reactions")
    reaction = models.CharField(max_length=50)  # emoji or shortcode

    class Meta:
        verbose_name = "Message Reaction"
        verbose_name_plural = "Message Reactions"
        db_table = "message_reactions"
        unique_together = ["message", "reacted_by", "reaction", "deleted_at"]
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.reacted_by.email}: {self.reaction}"


class MessageAttachment(BaseModel):
    """Attachments to messages."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    asset = models.ForeignKey("db.FileAsset", on_delete=models.CASCADE, related_name="message_attachments")

    class Meta:
        verbose_name = "Message Attachment"
        verbose_name_plural = "Message Attachments"
        db_table = "message_attachments"
        ordering = ("-created_at",)
