# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.db.models import Q, Count, Max
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from kardon.app.serializers import (
    ChannelSerializer,
    ChannelCreateSerializer,
    ChannelUpdateSerializer,
    ChannelMemberSerializer,
)
from kardon.db.models import Channel, ChannelMember, WorkspaceMember, Message, Workspace
from kardon.app.permissions import allow_permission, ROLE
from kardon.utils.paginator import BasePaginator

from ..base import BaseViewSet


class ChannelViewSet(BaseViewSet, BasePaginator):
    model = Channel
    serializer_class = ChannelSerializer

    def get_workspace(self):
        """Get the workspace from the slug."""
        slug = self.kwargs.get("slug")
        return Workspace.objects.get(slug=slug)

    def get_queryset(self):
        workspace_slug = self.kwargs.get("slug")
        user = self.request.user

        # User can see channels they are members of, or public channels
        return (
            Channel.objects.filter(workspace__slug=workspace_slug, deleted_at__isnull=True)
            .filter(Q(channel_type="public") | Q(channel_members__member=user))
            .select_related("workspace", "project", "created_by")
            .annotate(
                member_count=Count("channel_members", distinct=True),
                last_message_at=Max("channel_messages__created_at"),
            )
            .distinct()
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug):
        queryset = self.get_queryset()

        # Filter by channel type
        channel_type = request.GET.get("type")
        if channel_type:
            queryset = queryset.filter(channel_type=channel_type)

        # Filter by project
        project_id = request.GET.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Exclude archived
        if not request.GET.get("include_archived"):
            queryset = queryset.filter(is_archived=False)

        # Sort by last message or creation
        sort_by = request.GET.get("sort_by", "last_message")
        if sort_by == "last_message":
            queryset = queryset.order_by("-last_message_at", "-created_at")
        else:
            queryset = queryset.order_by("-created_at")

        # Pagination
        if request.GET.get("per_page") and request.GET.get("cursor"):
            return self.paginate(
                order_by="-created_at",
                request=request,
                queryset=queryset,
                on_results=lambda channels: ChannelSerializer(channels, many=True, context={"request": request}).data,
            )

        serializer = ChannelSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug):
        workspace = self.get_workspace()
        serializer = ChannelCreateSerializer(data=request.data, context={"workspace": workspace, "request": request})

        if serializer.is_valid():
            channel = serializer.save()

            # Add creator as admin
            ChannelMember.objects.create(channel=channel, member=request.user, role=ChannelMember.Role.ADMIN)

            # Add other members if provided
            member_ids = request.data.get("member_ids", [])
            for member_id in member_ids:
                if str(member_id) != str(request.user.id):
                    ChannelMember.objects.get_or_create(
                        channel=channel, member_id=member_id, defaults={"role": ChannelMember.Role.MEMBER}
                    )

            return Response(
                ChannelSerializer(channel, context={"request": request}).data, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def retrieve(self, request, slug, pk):
        channel = self.get_queryset().get(pk=pk)
        serializer = ChannelSerializer(channel, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def partial_update(self, request, slug, pk):
        channel = self.get_queryset().get(pk=pk)

        # Only channel admins or workspace admins can update
        is_channel_admin = ChannelMember.objects.filter(
            channel=channel, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
        ).exists()

        if not is_channel_admin:
            return Response({"error": "Only channel admins can update the channel"}, status=status.HTTP_403_FORBIDDEN)

        serializer = ChannelUpdateSerializer(channel, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ChannelSerializer(channel, context={"request": request}).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, pk):
        channel = self.get_queryset().get(pk=pk)

        # Only channel admins or workspace admins can delete
        is_channel_admin = ChannelMember.objects.filter(
            channel=channel, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
        ).exists()

        if not is_channel_admin:
            return Response({"error": "Only channel admins can delete the channel"}, status=status.HTTP_403_FORBIDDEN)

        channel.delete(soft=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChannelMemberViewSet(BaseViewSet):
    model = ChannelMember
    serializer_class = ChannelMemberSerializer

    def get_queryset(self):
        channel_id = self.kwargs.get("channel_id")
        return ChannelMember.objects.filter(channel_id=channel_id, deleted_at__isnull=True).select_related(
            "member", "channel"
        )

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def list(self, request, slug, channel_id):
        queryset = self.get_queryset()
        serializer = ChannelMemberSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def create(self, request, slug, channel_id):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)

        # Only channel admins can add members
        is_admin = ChannelMember.objects.filter(
            channel=channel, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
        ).exists()

        if not is_admin:
            return Response({"error": "Only channel admins can add members"}, status=status.HTTP_403_FORBIDDEN)

        member_id = request.data.get("member_id")
        role = request.data.get("role", ChannelMember.Role.MEMBER)

        # Validate member exists in workspace
        if not WorkspaceMember.objects.filter(workspace__slug=slug, member_id=member_id, is_active=True).exists():
            return Response({"error": "User is not a member of this workspace"}, status=status.HTTP_400_BAD_REQUEST)

        member, created = ChannelMember.objects.get_or_create(
            channel=channel, member_id=member_id, defaults={"role": role}
        )

        if not created:
            return Response({"error": "User is already a member of this channel"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ChannelMemberSerializer(member).data, status=status.HTTP_201_CREATED)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def destroy(self, request, slug, channel_id, pk):
        channel = Channel.objects.get(pk=channel_id, workspace__slug=slug)

        # Only channel admins can remove members (or users can remove themselves)
        is_admin = ChannelMember.objects.filter(
            channel=channel, member=request.user, role__gte=ChannelMember.Role.ADMIN, deleted_at__isnull=True
        ).exists()

        membership = ChannelMember.objects.get(pk=pk, channel=channel)

        if not is_admin and str(membership.member_id) != str(request.user.id):
            return Response({"error": "Only channel admins can remove other members"}, status=status.HTTP_403_FORBIDDEN)

        membership.delete(soft=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JoinChannelEndpoint(BaseViewSet):
    """Endpoint for users to join public channels."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug, pk):
        channel = Channel.objects.get(pk=pk, workspace__slug=slug)

        if channel.channel_type != "public":
            return Response({"error": "Can only join public channels directly"}, status=status.HTTP_400_BAD_REQUEST)

        member, created = ChannelMember.objects.get_or_create(
            channel=channel, member=request.user, defaults={"role": ChannelMember.Role.MEMBER}
        )

        if not created:
            return Response({"error": "Already a member of this channel"}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ChannelMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class LeaveChannelEndpoint(BaseViewSet):
    """Endpoint for users to leave channels."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug, pk):
        channel = Channel.objects.get(pk=pk, workspace__slug=slug)

        membership = ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).first()

        if not membership:
            return Response({"error": "Not a member of this channel"}, status=status.HTTP_400_BAD_REQUEST)

        membership.delete(soft=True)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MarkChannelReadEndpoint(BaseViewSet):
    """Mark all messages in a channel as read."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def post(self, request, slug, pk):
        channel = Channel.objects.get(pk=pk, workspace__slug=slug)

        membership = ChannelMember.objects.filter(channel=channel, member=request.user, deleted_at__isnull=True).first()

        if not membership:
            return Response({"error": "Not a member of this channel"}, status=status.HTTP_403_FORBIDDEN)

        membership.last_read_at = timezone.now()
        membership.save()

        return Response({"message": "Channel marked as read"}, status=status.HTTP_200_OK)
