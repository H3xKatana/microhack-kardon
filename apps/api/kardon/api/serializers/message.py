# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers

# Module imports
from kardon.db.models import Message, MessageMember, MessageNotification, MessageReaction, MessageRoom
from .base import BaseSerializer
from .user import UserLiteSerializer


class MessageRoomSerializer(BaseSerializer):
    """
    Serializer for message room model with access control and member management.
    """
    members = serializers.IntegerField(read_only=True)
    is_member = serializers.BooleanField(read_only=True)

    class Meta:
        model = MessageRoom
        fields = "__all__"
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "created_by",
            "updated_at",
        ]

    def create(self, validated_data):
        """
        Create a new message room and automatically add the creator as a member.
        """
        request = self.context.get("request")
        validated_data["_created_by"] = request.user  # Stash for signal
        room = MessageRoom.objects.create(**validated_data)
        
        # Add the creator as a member of the room
        MessageMember.objects.create(room=room, member=request.user)
        
        return room


class MessageMemberSerializer(BaseSerializer):
    """
    Serializer for managing user membership in message rooms.
    """
    member_detail = UserLiteSerializer(source="member", read_only=True)

    class Meta:
        model = MessageMember
        fields = "__all__"
        read_only_fields = [
            "id",
            "member",
            "created_at",
            "last_read_at",
        ]

    def create(self, validated_data):
        """
        Add a user to a room, ensuring access control.
        """
        request = self.context.get("request")
        room = validated_data.get("room")
        
        # Check if user has access to the workspace/project
        has_access = False
        if room.workspace:
            has_access = room.workspace.workspace_member.filter(
                member=request.user, 
                is_active=True
            ).exists()
        elif room.project:
            has_access = room.project.project_member.filter(
                member=request.user, 
                is_active=True
            ).exists()
        
        if not has_access:
            raise serializers.ValidationError({
                "error": "You do not have permission to join this room"
            })
        
        return super().create(validated_data)


class MessageSerializer(BaseSerializer):
    """
    Serializer for message model with content validation and security checks.
    """
    sender_detail = UserLiteSerializer(source="sender", read_only=True)

    class Meta:
        model = Message
        fields = "__all__"
        read_only_fields = [
            "id",
            "sender",
            "room",
            "created_at",
            "updated_at",
            "is_edited",
        ]

    def validate_message(self, value):
        """
        Validate message content length and security.
        """
        if len(value) > 10000:  # 10KB limit
            raise serializers.ValidationError("Message content is too long")
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty")
        return value

    def create(self, validated_data):
        """
        Create a new message and handle related operations like notifications.
        """
        request = self.context.get("request")
        validated_data["sender"] = request.user
        
        # Check if sender is a member of the room
        room = validated_data["room"]
        if not MessageMember.objects.filter(room=room, member=request.user).exists():
            raise serializers.ValidationError({
                "error": "You are not a member of this room"
            })
        
        message = super().create(validated_data)
        
        # Create notifications for all room members except the sender
        room_members = MessageMember.objects.filter(room=room).exclude(member=request.user)
        
        notifications = []
        for member in room_members:
            notifications.append(
                MessageNotification(
                    message=message,
                    member=member.member,
                    workspace=room.workspace or room.project.workspace,
                    project=room.project,
                    actor=request.user
                )
            )
        
        if notifications:
            MessageNotification.objects.bulk_create(notifications)
        
        # Update last_read_at for sender
        try:
            sender_member = MessageMember.objects.get(room=room, member=request.user)
            sender_member.last_read_at = message.created_at
            sender_member.save(update_fields=["last_read_at"])
        except MessageMember.DoesNotExist:
            pass  # Should not happen in normal flow
        
        return message


class MessageReactionSerializer(BaseSerializer):
    """
    Serializer for managing message reactions (emojis).
    """
    actor_detail = UserLiteSerializer(source="actor", read_only=True)

    class Meta:
        model = MessageReaction
        fields = "__all__"
        read_only_fields = [
            "id",
            "actor",
        ]

    def create(self, validated_data):
        """
        Add a reaction to a message.
        """
        request = self.context.get("request")
        validated_data["actor"] = request.user
        
        # Check if user is a member of the room where the message is
        message = validated_data.get("message")
        if not MessageMember.objects.filter(
            room=message.room, 
            member=request.user
        ).exists():
            raise serializers.ValidationError({
                "error": "You are not a member of the room containing this message"
            })
        
        return super().create(validated_data)


class MessageNotificationSerializer(BaseSerializer):
    """
    Serializer for managing message notifications.
    """
    member_detail = UserLiteSerializer(source="member", read_only=True)
    message_detail = MessageSerializer(source="message", read_only=True)

    class Meta:
        model = MessageNotification
        fields = "__all__"
        read_only_fields = [
            "id",
            "member",
            "read_at",
            "archived_at",
            "snoozed_till",
        ]