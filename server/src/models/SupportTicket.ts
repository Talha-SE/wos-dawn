import { Schema, model, Document, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  userId: Types.ObjectId;
  userEmail: string;
  type: 'report_user' | 'report_issue' | 'feature_request' | 'account_issue' | 'technical_support' | 'other';
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reportedUserId?: Types.ObjectId;
  reportedUserEmail?: string;
  attachments?: string[];
  adminRemarks?: {
    remark: string;
    addedBy: string;
    addedAt: Date;
  }[];
  assignedTo?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    type: {
      type: String,
      enum: ['report_user', 'report_issue', 'feature_request', 'account_issue', 'technical_support', 'other'],
      required: true,
      index: true
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed', 'rejected'],
      default: 'pending',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedUserEmail: { type: String },
    attachments: [{ type: String }],
    adminRemarks: [
      {
        remark: { type: String, required: true },
        addedBy: { type: String, required: true },
        addedAt: { type: Date, default: Date.now }
      }
    ],
    assignedTo: { type: String },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

export const SupportTicket = model<ISupportTicket>('SupportTicket', SupportTicketSchema);
