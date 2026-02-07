# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from kardon.app.serializers import (
    MessageSerializer,
    MessageCreateSerializer,
    MessageUpdateSerializer,
    MessageReactionSerializer,
)
from kardon.db.models import (
    Message,
    Channel,
    ChannelMember,
    MessageReaction,
    UserNotificationPreference,
)
from kardon.app.permissions import allow_permission, ROLE
from kardon.app.services.messaging import MessageNotificationService
from kardon.utils.paginator import BasePaginator

from ..base import BaseViewSet


class MessageViewSet(BaseViewSet, BasePaginator):
    model = Message
    serializer_class = MessageSerializer

    def get_queryset(self):
        channel_id = self.kwargs.get("channel_id")
        return (
            Message.objects.filter(
                channel_id=channel_id,
                parent__isnull=True,  # Only top-level messages
                deleted_at__isnull=True,
            )
            .select_related("sender", "workspace", "project", "channel")
            .prefetch_related(Prefetch("reactions", queryset=MessageReaction.objects.select_related("reacted_by")))
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id):
        # Verify user is channel member - only required for private channels
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if channel.channel_type != "public":
            if not ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).exists():
                return Response({"error": "You are not a member of this channel"}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset()

        # Filter by parent (for threaded replies)
        parent_id = request.GET.get("parent")
        if parent_id:
            queryset = (
                Message.objects.filter(parent_id=parent_id, deleted_at__isnull=True)
                .select_related("sender")
                .prefetch_related(Prefetch("reactions", queryset=MessageReaction.objects.select_related("reacted_by")))
            )

        # Search
        search = request.GET.get("search")
        if search:
            queryset = queryset.filter(content__icontains=search)

        # Before/After cursor for pagination
        before = request.GET.get("before")
        if before:
            queryset = queryset.filter(created_at__lt=before)

        after = request.GET.get("after")
        if after:
            queryset = queryset.filter(created_at__gt=after)

        # Pagination
        if request.GET.get("per_page") and request.GET.get("cursor"):
            return self.paginate(
                order_by="-created_at",
                request=request,
                queryset=queryset,
                on_results=lambda messages: MessageSerializer(messages, many=True).data,
            )

        # Default: return last 50 messages
        queryset = queryset.order_by("-created_at")[:50]
        serializer = MessageSerializer(queryset, many=True)

        # Update last read
        membership = ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).first()

        if membership and queryset.exists():
            membership.last_read_at = timezone.now()
            membership.last_read_message = queryset.first()
            membership.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)

        # Verify user is channel member - only required for private channels
        membership = ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).first()

        if not membership:
            if channel.channel_type != "public":
                return Response({"error": "You are not a member of this channel"}, status=status.HTTP_403_FORBIDDEN)
            # Auto-join public channels
            membership = ChannelMember.objects.create(
                channel=channel, member=request.user, role=ChannelMember.Role.MEMBER
            )

        serializer = MessageCreateSerializer(data=request.data, context={"request": request})

        if serializer.is_valid():
            message = serializer.save(workspace=channel.workspace, project=channel.project, sender=request.user)

            # Update last read to include this message
            membership.last_read_at = timezone.now()
            membership.last_read_message = message
            membership.save()

            # Create notifications for channel members
            MessageNotificationService.create_message_notifications(message)

            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, channel_id, pk):
        message = self.get_queryset().get(pk=pk)

        # Only sender or admins can edit
        if str(message.sender_id) != str(request.user.id):
            is_admin = ChannelMember.objects.filter(
                channel_id=channel_id, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
            ).exists()

            if not is_admin:
                return Response(
                    {"error": "Only the sender or channel admins can edit messages"}, status=status.HTTP_403_FORBIDDEN
                )

        serializer = MessageUpdateSerializer(message, data=request.data, partial=True)
        if serializer.is_valid():
            message = serializer.save(edited_at=timezone.now())
            return Response(MessageSerializer(message).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, pk):
        message = self.get_queryset().get(pk=pk)

        # Only sender or admins can delete
        if str(message.sender_id) != str(request.user.id):
            is_admin = ChannelMember.objects.filter(
                channel_id=channel_id, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
            ).exists()

            if not is_admin:
                return Response(
                    {"error": "Only the sender or channel admins can delete messages"}, status=status.HTTP_403_FORBIDDEN
                )

        message.delete(soft=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageReactionViewSet(BaseViewSet):
    model = MessageReaction
    serializer_class = MessageReactionSerializer

    def get_queryset(self):
        message_id = self.kwargs.get("message_id")
        return MessageReaction.objects.filter(message_id=message_id, deleted_at__isnull=True).select_related(
            "reacted_by"
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id, message_id):
        queryset = self.get_queryset()
        serializer = MessageReactionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def create(self, request, slug, channel_id, message_id):
        # Verify user is channel member
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)
        if not ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).exists():
            return Response({"error": "You are not a member of this channel"}, status=status.HTTP_403_FORBIDDEN)

        reaction = request.data.get("reaction")
        if not reaction:
            return Response({"error": "Reaction is required"}, status=status.HTTP_400_BAD_REQUEST)

        reaction_obj, created = MessageReaction.objects.get_or_create(
            message_id=message_id, reacted_by=request.user, reaction=reaction, defaults={}
        )

        if not created:
            return Response({"error": "You have already reacted with this emoji"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MessageReactionSerializer(reaction_obj).data, status=status.HTTP_201_CREATED)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, message_id, pk):
        reaction = self.get_queryset().get(pk=pk)

        # Only the user who reacted can remove their reaction
        if str(reaction.reacted_by_id) != str(request.user.id):
            return Response({"error": "You can only remove your own reactions"}, status=status.HTTP_403_FORBIDDEN)

        reaction.delete(soft=True)
        return Response(status=status.HTTP_204_NO_CONTENT)
