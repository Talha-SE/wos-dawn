import mongoose, { Schema, Document, Model } from 'mongoose'

export interface AllianceMessageDoc extends Document {
  roomCode: string
  senderId: mongoose.Types.ObjectId
  senderEmail: string
  content?: string
  audioUrl?: string
  audioDuration?: number
  fileUrl?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  createdAt: Date
  replyToMessageId?: string
  replyToContent?: string
  replyToSenderName?: string
}

const AllianceMessageSchema = new Schema<AllianceMessageDoc>({
  roomCode: { type: String, required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderEmail: { type: String, required: true },
  content: { type: String }, // Now optional
  audioUrl: { type: String },
  audioDuration: { type: Number }, // Duration in seconds
  fileUrl: { type: String },
  fileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number }, // Size in bytes
  createdAt: { type: Date, default: Date.now },
  replyToMessageId: { type: String },
  replyToContent: { type: String },
  replyToSenderName: { type: String }
})

AllianceMessageSchema.index({ roomCode: 1, createdAt: -1 })
AllianceMessageSchema.index({ createdAt: 1 }) // For efficient cleanup of old messages

const AllianceMessage: Model<AllianceMessageDoc> = mongoose.models.AllianceMessage || mongoose.model<AllianceMessageDoc>('AllianceMessage', AllianceMessageSchema)
export default AllianceMessage
