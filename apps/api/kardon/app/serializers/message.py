# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from rest_framework import serializers
from .base import BaseSerializer
from .user import UserLiteSerializer
from kardon.db.models import Message, Channel, ChannelMember, MessageReaction


class MessageReactionSerializer(BaseSerializer):
    reacted_by_details = UserLiteSerializer(source="reacted_by", read_only=True)

    class Meta:
        model = MessageReaction
        fields = ["id", "reaction", "reacted_by", "reacted_by_details", "created_at"]
        read_only_fields = ["reacted_by"]


class MessageSerializer(BaseSerializer):
    sender_details = UserLiteSerializer(source="sender", read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reply_count = serializers.SerializerMethodField()
    is_edited = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "workspace",
            "project",
            "channel",
            "sender",
            "sender_details",
            "content",
            "content_json",
            "parent",
            "reactions",
            "reply_count",
            "is_edited",
            "edited_at",
            "is_system",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["sender", "edited_at", "is_system"]

    def get_reply_count(self, obj):
        return obj.replies.filter(deleted_at__isnull=True).count()

    def get_is_edited(self, obj):
        return obj.edited_at is not None


class MessageCreateSerializer(BaseSerializer):
    """Serializer for creating messages."""

    class Meta:
        model = Message
        fields = ["channel", "content", "parent"]

    def validate_channel(self, value):
        user = self.context["request"].user
        if not ChannelMember.objects.filter(channel=value, member=user, deleted_at__isnull=True).exists():
            raise serializers.ValidationError("You are not a member of this channel.")
        return value


class MessageUpdateSerializer(BaseSerializer):
    """Serializer for updating messages."""

    class Meta:
        model = Message
        fields = ["content"]


class ChannelMemberSerializer(BaseSerializer):
    member_details = UserLiteSerializer(source="member", read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChannelMember
        fields = [
            "id",
            "channel",
            "member",
            "member_details",
            "role",
            "last_read_at",
            "unread_count",
            "is_muted",
            "notification_preference",
            "created_at",
        ]
        read_only_fields = ["member"]

    def get_unread_count(self, obj):
        if obj.last_read_at:
            return (
                Message.objects.filter(channel=obj.channel, created_at__gt=obj.last_read_at, deleted_at__isnull=True)
                .exclude(sender=obj.member)
                .count()
            )
        return Message.objects.filter(channel=obj.channel, deleted_at__isnull=True).exclude(sender=obj.member).count()


class ChannelSerializer(BaseSerializer):
    created_by_details = UserLiteSerializer(source="created_by", read_only=True)
    member_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            "id",
            "workspace",
            "project",
            "name",
            "description",
            "channel_type",
            "created_by",
            "created_by_details",
            "member_count",
            "last_message",
            "unread_count",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_member_count(self, obj):
        return obj.channel_members.filter(deleted_at__isnull=True).count()

    def get_last_message(self, obj):
        last_msg = obj.channel_messages.filter(deleted_at__isnull=True).first()
        if last_msg:
            return {
                "id": str(last_msg.id),
                "content": last_msg.content[:100],
                "sender": UserLiteSerializer(last_msg.sender).data,
                "created_at": last_msg.created_at,
            }
        return None

    def get_unread_count(self, obj):
        user = self.context.get("request", {}).user if self.context.get("request") else None
        if not user:
            return 0

        membership = obj.channel_members.filter(member=user, deleted_at__isnull=True).first()

        if membership and membership.last_read_at:
            return (
                obj.channel_messages.filter(created_at__gt=membership.last_read_at, deleted_at__isnull=True)
                .exclude(sender=user)
                .count()
            )
        return obj.channel_messages.filter(deleted_at__isnull=True).exclude(sender=user).count()


class ChannelCreateSerializer(BaseSerializer):
    """Serializer for creating channels."""

    member_ids = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)

    class Meta:
        model = Channel
        fields = ["name", "description", "channel_type", "project", "member_ids"]

    def validate_name(self, value):
        workspace = self.context["workspace"]
        if Channel.objects.filter(workspace=workspace, name__iexact=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError("A channel with this name already exists.")
        return value

    def create(self, validated_data):
        workspace = self.context["workspace"]
        member_ids = validated_data.pop("member_ids", [])
        user = self.context["request"].user

        # Remove workspace and created_by from validated_data if present (ModelSerializer adds them)
        validated_data.pop("workspace", None)
        validated_data.pop("created_by", None)

        channel = Channel.objects.create(workspace=workspace, created_by=user, **validated_data)

        for member_id in member_ids:
            ChannelMember.objects.create(channel=channel, member_id=member_id)

        return channel


class ChannelUpdateSerializer(BaseSerializer):
    """Serializer for updating channels."""

    class Meta:
        model = Channel
        fields = ["name", "description", "is_archived"]
