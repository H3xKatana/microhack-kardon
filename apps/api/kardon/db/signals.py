# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db.models.signals import post_save
from django.dispatch import receiver
from kardon.db.models import Project, Workspace, MessageRoom, MessageMember
from kardon.utils.cache import invalidate_meta_cache


@receiver(post_save, sender=Workspace)
def create_workspace_default_message_rooms(sender, instance, created, **kwargs):
    """
    Create default message rooms when a new workspace is created.
    """
    if created:
        # Create a general discussion room for the workspace
        general_room = MessageRoom.objects.create(
            name="General",
            description="General discussion for this workspace",
            workspace=instance,
            is_private=False
        )
        
        # Add all workspace members to this room
        for member in instance.workspace_member.all():
            MessageMember.objects.create(
                room=general_room,
                member=member.member
            )


@receiver(post_save, sender=Project)
def create_project_default_message_rooms(sender, instance, created, **kwargs):
    """
    Create default message rooms when a new project is created.
    """
    if created:
        # Create a general discussion room for the project
        general_room = MessageRoom.objects.create(
            name="General",
            description="General discussion for this project",
            project=instance,
            is_private=False
        )
        
        # Add all project members to this room
        for member in instance.project_member.all():
            MessageMember.objects.create(
                room=general_room,
                member=member.member
            )


@receiver(post_save, sender=MessageRoom)
def add_members_to_new_room(sender, instance, created, **kwargs):
    """
    When a new room is created, add the creator and any specified members.
    """
    if created:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # If there's a creator, add them as a member
        if hasattr(instance, '_created_by'):
            MessageMember.objects.get_or_create(
                room=instance,
                member=instance._created_by
            )