import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'suspension' | 'warning' | 'info' | 'room_transfer' | 'account_action';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  relatedEntity?: {
    type: 'user' | 'room' | 'ticket' | 'gift_code' | 'slot';
    id: string;
    name?: string;
  };
  actionUrl?: string; // URL to navigate to for more details
  read: boolean;
  readAt?: Date;
  expiresAt?: Date; // Optional expiration for notifications
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['suspension', 'warning', 'info', 'room_transfer', 'account_action'], 
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 1000 },
  relatedEntity: {
    type: {
      type: String,
      enum: ['user', 'room', 'ticket', 'gift_code', 'slot']
    },
    id: String,
    name: String
  },
  actionUrl: { type: String, maxlength: 500 },
  read: { type: Boolean, default: false, index: true },
  readAt: Date,
  expiresAt: Date
}, { 
  timestamps: true 
});

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

export const Notification = model<INotification>('Notification', notificationSchema);
