# Copyright (c) 2023-present Kardon Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

from django.utils import timezone
from django.conf import settings

from kardon.db.models import (
    Notification,
    Channel,
    ChannelMember,
    Message,
    UserNotificationPreference,
)
import re


class MessageNotificationService:
    """Service for handling message notifications."""

    @staticmethod
    def create_message_notifications(message: Message) -> None:
        """Create notifications for new messages."""
        channel = message.channel
        sender = message.sender

        # Get all channel members except sender
        members = ChannelMember.objects.filter(channel=channel, deleted_at__isnull=True).exclude(member=sender)

        # Parse mentions from message content
        mentioned_user_ids = MessageNotificationService._extract_mentions(message.content)

        for member in members:
            # Skip if muted
            if member.is_muted:
                continue

            # Check notification preferences
            should_notify = MessageNotificationService._should_notify(member, message, mentioned_user_ids)

            if should_notify:
                # Create in-app notification
                Notification.objects.create(
                    workspace=channel.workspace,
                    project=channel.project,
                    entity_identifier=message.id,
                    entity_name="message",
                    title=f"New message in #{channel.name}",
                    message={
                        "content": message.content[:200],
                        "channel_name": channel.name,
                        "sender_name": sender.display_name or sender.email,
                    },
                    message_html=f"<p><strong>{sender.display_name or sender.email}</strong> in <strong>#{channel.name}</strong></p><p>{message.content[:200]}</p>",
                    sender=f"message:{channel.id}",
                    triggered_by=sender,
                    receiver=member.member,
                )

                # Check if email notification should be sent
                if MessageNotificationService._should_send_email(member, mentioned_user_ids):
                    MessageNotificationService._send_email_notification(member, message, channel)

    @staticmethod
    def _extract_mentions(content: str) -> set:
        """Extract @mentions from message content."""
        # Pattern matches @username or @user@domain.com
        pattern = r"@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9_]+)"
        matches = re.findall(pattern, content)

        # Convert to user IDs (this would need to look up users)
        # For now, return the mentioned identifiers
        return set(matches)

    @staticmethod
    def _should_notify(member: ChannelMember, message: Message, mentioned_user_ids: set) -> bool:
        """Determine if a member should be notified."""
        preference = member.notification_preference

        if preference == "none":
            return False

        if preference == "mentions_only":
            # Check if user was mentioned
            return str(member.member_id) in mentioned_user_ids

        return True

    @staticmethod
    def _should_send_email(member: ChannelMember, mentioned_user_ids: set) -> bool:
        """Determine if email notification should be sent."""
        # Check user preferences
        try:
            user_pref = UserNotificationPreference.objects.get(user=member.member)
            # For now, use comment preference as proxy for message notifications
            return user_pref.comment
        except UserNotificationPreference.DoesNotExist:
            return True

    @staticmethod
    def _send_email_notification(member: ChannelMember, message: Message, channel: Channel) -> None:
        """Send email notification for message."""
        # Use existing email notification infrastructure
        # This would integrate with your existing email service
        context = {
            "receiver_name": member.member.display_name or member.member.email,
            "sender_name": message.sender.display_name or message.sender.email,
            "channel_name": channel.name,
            "message_content": message.content[:500],
            "workspace_name": channel.workspace.name,
            "action_url": f"{settings.APP_BASE_URL}/{channel.workspace.slug}/channels/{channel.id}",
        }

        # Assuming you have an email service
        # send_email_notification(
        #     to_email=member.member.email,
        #     template="message_notification",
        #     context=context
        # )
        pass

    @staticmethod
    def mark_channel_notifications_as_read(user, channel_id: str) -> None:
        """Mark all notifications for a channel as read."""
        Notification.objects.filter(
            receiver=user,
            entity_name="message",
            sender=f"message:{channel_id}",
            read_at__isnull=True,
        ).update(read_at=timezone.now())
