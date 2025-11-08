import mongoose, { Schema, Document, Model } from 'mongoose'

export interface AllianceMessageDoc extends Document {
  roomCode: string
  senderId: mongoose.Types.ObjectId
  senderEmail: string
  content: string
  createdAt: Date
}

const AllianceMessageSchema = new Schema<AllianceMessageDoc>({
  roomCode: { type: String, required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderEmail: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
})

AllianceMessageSchema.index({ roomCode: 1, createdAt: -1 })

const AllianceMessage: Model<AllianceMessageDoc> = mongoose.models.AllianceMessage || mongoose.model<AllianceMessageDoc>('AllianceMessage', AllianceMessageSchema)
export default AllianceMessage
