import { Types } from 'mongoose';
import { Notification, NotificationType, NotificationPriority } from '../models/Notification';

interface CreateNotificationParams {
  userId: Types.ObjectId | string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntity?: {
    type: 'user' | 'room' | 'ticket' | 'gift_code' | 'slot';
    id: string;
    name?: string;
  };
  actionUrl?: string;
  expiresAt?: Date;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = new Notification({
      userId: params.userId,
      type: params.type,
      priority: params.priority || 'medium',
      title: params.title,
      message: params.message,
      relatedEntity: params.relatedEntity,
      actionUrl: params.actionUrl,
      expiresAt: params.expiresAt,
      read: false
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

/**
 * Create suspension notification for a user
 */
export async function createSuspensionNotification(
  userId: Types.ObjectId | string,
  reason: string,
  suspendedUntil?: Date
) {
  const message = suspendedUntil
    ? `Your account has been suspended until ${suspendedUntil.toLocaleString()}. Reason: ${reason}`
    : `Your account has been suspended indefinitely. Reason: ${reason}`;

  return createNotification({
    userId,
    type: 'suspension',
    priority: 'critical',
    title: 'Account Suspended',
    message,
    relatedEntity: {
      type: 'user',
      id: userId.toString()
    }
  });
}

/**
 * Create room suspension notification for all members
 */
export async function createRoomSuspensionNotification(
  userIds: (Types.ObjectId | string)[],
  roomCode: string,
  roomName: string,
  reason: string,
  suspendedUntil?: Date
) {
  const message = suspendedUntil
    ? `Alliance room "${roomName}" has been suspended until ${suspendedUntil.toLocaleString()}. Reason: ${reason}`
    : `Alliance room "${roomName}" has been suspended indefinitely. Reason: ${reason}`;

  const notifications = userIds.map(userId =>
    createNotification({
      userId,
      type: 'suspension',
      priority: 'high',
      title: 'Alliance Room Suspended',
      message,
      relatedEntity: {
        type: 'room',
        id: roomCode,
        name: roomName
      },
      actionUrl: `/dashboard/alliance-chat/${roomCode}`
    })
  );

  return Promise.all(notifications);
}

/**
 * Create room ownership transfer notification
 */
export async function createOwnershipTransferNotification(
  newOwnerId: Types.ObjectId | string,
  oldOwnerEmail: string,
  roomCode: string,
  roomName: string
) {
  return createNotification({
    userId: newOwnerId,
    type: 'room_transfer',
    priority: 'high',
    title: 'You are now Alliance Room Owner',
    message: `You have been appointed as the new owner of alliance room "${roomName}" by an administrator. Previous owner: ${oldOwnerEmail}`,
    relatedEntity: {
      type: 'room',
      id: roomCode,
      name: roomName
    },
    actionUrl: `/dashboard/alliance-chat/${roomCode}`
  });
}

/**
 * Notify old owner about ownership transfer
 */
export async function createOwnershipRemovedNotification(
  oldOwnerId: Types.ObjectId | string,
  newOwnerEmail: string,
  roomCode: string,
  roomName: string
) {
  return createNotification({
    userId: oldOwnerId,
    type: 'room_transfer',
    priority: 'high',
    title: 'Alliance Room Ownership Transferred',
    message: `Ownership of alliance room "${roomName}" has been transferred to ${newOwnerEmail} by an administrator.`,
    relatedEntity: {
      type: 'room',
      id: roomCode,
      name: roomName
    },
    actionUrl: `/dashboard/alliance-chat/${roomCode}`
  });
}

/**
 * Create warning notification
 */
export async function createWarningNotification(
  userId: Types.ObjectId | string,
  title: string,
  message: string
) {
  return createNotification({
    userId,
    type: 'warning',
    priority: 'high',
    title,
    message
  });
}

/**
 * Create info notification
 */
export async function createInfoNotification(
  userId: Types.ObjectId | string,
  title: string,
  message: string,
  actionUrl?: string
) {
  return createNotification({
    userId,
    type: 'info',
    priority: 'low',
    title,
    message,
    actionUrl
  });
}
