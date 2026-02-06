# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Prefetch, Q, Count, Exists, OuterRef

# Third party imports
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action

# Module imports
from kardon.api.views.base import BaseAPIView, BaseViewSet
from kardon.api.serializers import (
    MessageSerializer,
    MessageRoomSerializer,
    MessageMemberSerializer,
    MessageNotificationSerializer,
    MessageReactionSerializer,
)
from kardon.db.models import Message, MessageRoom, MessageMember, MessageNotification, MessageReaction
from kardon.utils.paginator import BasePaginator


class MessageRoomViewSet(BaseViewSet):
    """
    ViewSet for managing message rooms.
    """
    model = MessageRoom
    serializer_class = MessageRoomSerializer
    pagination_class = BasePaginator

    def get_queryset(self):
        """
        Get rooms that the user has access to based on workspace/project membership.
        """
        workspace_slug = self.kwargs.get("slug")

        queryset = MessageRoom.objects.filter(
            Q(workspace__workspace_member__member=self.request.user, workspace__workspace_member__is_active=True) |
            Q(project__project_member__member=self.request.user, project__project_member__is_active=True)
        )

        # If workspace slug is provided, filter by it
        if workspace_slug:
            queryset = queryset.filter(workspace__slug=workspace_slug)

        return (
            queryset
            .select_related("workspace", "project")
            .prefetch_related("members")
            .annotate(
                members_count=Count("members", distinct=True),
                is_member=Exists(
                    MessageMember.objects.filter(
                        room=OuterRef("pk"),
                        member=self.request.user
                    )
                )
            )
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        """
        Create a new message room with proper access validation.
        """
        # Validate workspace/project access
        workspace_id = request.data.get("workspace_id")
        project_id = request.data.get("project_id")
        
        has_access = False
        if workspace_id:
            has_access = request.user.workspace_member.filter(
                workspace__id=workspace_id, 
                is_active=True
            ).exists()
        elif project_id:
            has_access = request.user.project_member.filter(
                project__id=project_id, 
                is_active=True
            ).exists()
        
        if not has_access:
            return Response({
                "error": "You do not have permission to create a room in this workspace/project"
            }, status=status.HTTP_403_FORBIDDEN)
        
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk):
        """
        Get messages for a specific room.
        """
        room = self.get_object()
        
        # Check if user is a member of the room
        if not MessageMember.objects.filter(room=room, member=request.user).exists():
            return Response({
                "error": "You are not a member of this room"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get messages in the room
        messages = Message.objects.filter(
            room=room,
            is_deleted=False
        ).select_related("sender").order_by("-created_at")

        # Mark notifications as read
        MessageNotification.objects.filter(
            member=request.user,
            message__room=room
        ).update(read_at=request.user.last_active)

        serializer = MessageSerializer(messages, many=True, context={"request": request})
        return Response({"messages": serializer.data}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def join(self, request, pk):
        """
        Join a message room.
        """
        room = self.get_object()

        # Check if user is already a member
        if MessageMember.objects.filter(room=room, member=request.user).exists():
            return Response({
                "error": "You are already a member of this room"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if user has access to the workspace/project
        has_access = False
        if room.workspace:
            has_access = request.user.workspace_member.filter(
                workspace=room.workspace,
                is_active=True
            ).exists()
        elif room.project:
            has_access = request.user.project_member.filter(
                project=room.project,
                is_active=True
            ).exists()

        if not has_access:
            return Response({
                "error": "You do not have permission to join this room"
            }, status=status.HTTP_403_FORBIDDEN)

        # Add user as member
        member, created = MessageMember.objects.get_or_create(
            room=room,
            member=request.user
        )

        serializer = MessageMemberSerializer(member, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk):
        """
        Leave a message room.
        """
        room = self.get_object()

        # Check if user is a member of the room
        try:
            member = MessageMember.objects.get(room=room, member=request.user)
            member.delete()
            return Response({"message": "Left the room successfully"}, status=status.HTTP_200_OK)
        except MessageMember.DoesNotExist:
            return Response({
                "error": "You are not a member of this room"
            }, status=status.HTTP_400_BAD_REQUEST)


class MessageViewSet(BaseViewSet):
    """
    ViewSet for managing messages.
    """
    model = Message
    serializer_class = MessageSerializer
    pagination_class = BasePaginator

    def get_queryset(self):
        """
        Get messages that the user has access to based on room membership.
        """
        workspace_slug = self.kwargs.get("slug")

        queryset = Message.objects.filter(
            room__members__member=self.request.user
        )

        # If workspace slug is provided, filter by it
        if workspace_slug:
            queryset = queryset.filter(
                Q(room__workspace__slug=workspace_slug) |
                Q(room__project__workspace__slug=workspace_slug)
            )

        return (
            queryset
            .select_related("sender", "room")
            .prefetch_related("reactions")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        """
        Create a new message after validating permissions.
        """
        room_id = request.data.get("room")
        try:
            room = MessageRoom.objects.get(pk=room_id)
        except MessageRoom.DoesNotExist:
            return Response({
                "error": "Room not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member of the room
        if not MessageMember.objects.filter(room=room, member=request.user).exists():
            return Response({
                "error": "You are not a member of this room"
            }, status=status.HTTP_403_FORBIDDEN)
        
        return super().create(request, *args, **kwargs)

    def update(self, request, pk, *args, **kwargs):
        """
        Update an existing message (edit).
        """
        message = self.get_object()
        
        # Only the sender can edit their message
        if message.sender != request.user:
            return Response({
                "error": "You can only edit your own messages"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Mark as edited
        request.data["is_edited"] = True
        return super().update(request, pk, *args, **kwargs)

    def destroy(self, request, pk, *args, **kwargs):
        """
        Soft delete a message (mark as deleted).
        """
        message = self.get_object()
        
        # Only the sender can delete their message
        if message.sender != request.user:
            return Response({
                "error": "You can only delete your own messages"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        message.is_deleted = True
        message.save(update_fields=["is_deleted"])
        
        return Response({"message": "Message deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def unread(self, request):
        """
        Get unread messages for the user.
        """
        unread_messages = Message.objects.filter(
            notifications__member=request.user,
            notifications__read_at__isnull=True
        ).select_related("sender", "room").order_by("-created_at")[:50]
        
        serializer = MessageSerializer(unread_messages, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageMemberViewSet(BaseViewSet):
    """
    ViewSet for managing message room memberships.
    """
    model = MessageMember
    serializer_class = MessageMemberSerializer

    def get_queryset(self):
        """
        Get memberships for the current user.
        """
        workspace_slug = self.kwargs.get("slug")

        queryset = MessageMember.objects.filter(
            member=self.request.user
        )

        # If workspace slug is provided, filter by it
        if workspace_slug:
            queryset = queryset.filter(
                Q(room__workspace__slug=workspace_slug) |
                Q(room__project__workspace__slug=workspace_slug)
            )

        return queryset.select_related("room", "member")


class MessageNotificationViewSet(BaseViewSet):
    """
    ViewSet for managing message notifications.
    """
    model = MessageNotification
    serializer_class = MessageNotificationSerializer

    def get_queryset(self):
        """
        Get notifications for the current user.
        """
        workspace_slug = self.kwargs.get("slug")

        queryset = MessageNotification.objects.filter(
            member=self.request.user
        )

        # If workspace slug is provided, filter by it
        if workspace_slug:
            queryset = queryset.filter(
                Q(workspace__slug=workspace_slug)
            )

        return queryset.select_related("message", "member", "actor").order_by("-created_at")

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """
        Mark all notifications as read for the user.
        """
        MessageNotification.objects.filter(
            member=request.user,
            read_at__isnull=True
        ).update(read_at=request.user.last_active)
        
        return Response({"message": "All notifications marked as read"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk):
        """
        Mark a specific notification as read.
        """
        notification = self.get_object()
        notification.read_at = request.user.last_active
        notification.save(update_fields=["read_at"])
        
        serializer = MessageNotificationSerializer(notification, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MessageReactionViewSet(BaseViewSet):
    """
    ViewSet for managing message reactions (emojis).
    """
    model = MessageReaction
    serializer_class = MessageReactionSerializer

    def get_queryset(self):
        """
        Get reactions to messages accessible to the user.
        """
        workspace_slug = self.kwargs.get("slug")

        queryset = MessageReaction.objects.filter(
            message__room__members__member=self.request.user
        )

        # If workspace slug is provided, filter by it
        if workspace_slug:
            queryset = queryset.filter(
                Q(message__room__workspace__slug=workspace_slug) |
                Q(message__room__project__workspace__slug=workspace_slug)
            )

        return queryset.select_related("message", "actor")

    def create(self, request, *args, **kwargs):
        """
        Add a reaction to a message.
        """
        message_id = request.data.get("message")
        try:
            message = Message.objects.get(pk=message_id)
        except Message.DoesNotExist:
            return Response({
                "error": "Message not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a member of the room where the message is
        if not MessageMember.objects.filter(
            room=message.room, 
            member=request.user
        ).exists():
            return Response({
                "error": "You are not a member of the room containing this message"
            }, status=status.HTTP_403_FORBIDDEN)
        
        return super().create(request, *args, **kwargs)

    def destroy(self, request, pk, *args, **kwargs):
        """
        Remove a reaction.
        """
        reaction = self.get_object()
        
        # Only the actor can remove their own reaction
        if reaction.actor != request.user:
            return Response({
                "error": "You can only remove your own reactions"
            }, status=status.HTTP_403_FORBIDDEN)
        
        return super().destroy(request, pk, *args, **kwargs)