import { Schema, model, Types, Document } from 'mongoose';

export interface IActivityLog extends Document {
  type: 'user_register' | 'user_login' | 'room_create' | 'slot_reserve' | 'gift_redeem' | 'user_suspend' | 'room_suspend';
  userId?: Types.ObjectId;
  userEmail: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  type: {
    type: String,
    required: true,
    enum: ['user_register', 'user_login', 'room_create', 'slot_reserve', 'gift_redeem', 'user_suspend', 'room_suspend'],
    index: true
  },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  userEmail: { type: String, required: true, index: true },
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true }
});

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema);
