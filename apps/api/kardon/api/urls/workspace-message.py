# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from kardon.api.views import (
    MessageRoomViewSet,
    MessageViewSet,
    MessageMemberViewSet,
    MessageNotificationViewSet,
    MessageReactionViewSet,
)

# Create routers for workspace-level endpoints
workspace_router = DefaultRouter()

workspace_router.register(r"messages/rooms", MessageRoomViewSet, basename="workspace-message-rooms")
workspace_router.register(r"messages", MessageViewSet, basename="workspace-messages")
workspace_router.register(r"message-members", MessageMemberViewSet, basename="workspace-message-members")
workspace_router.register(r"message-notifications", MessageNotificationViewSet, basename="workspace-message-notifications")
workspace_router.register(r"message-reactions", MessageReactionViewSet, basename="workspace-message-reactions")

urlpatterns = [
    path("workspaces/<str:slug>/", include(workspace_router.urls)),
]