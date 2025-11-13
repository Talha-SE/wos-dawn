import mongoose, { Schema, Document, Model } from 'mongoose'

export interface PendingTranslationDoc extends Document {
  userId: mongoose.Types.ObjectId
  messageId: string
  messageContent: string
  targetLanguage: string
  roomCode: string
  retryCount: number
  lastAttempt: Date
  createdAt: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  translatedText?: string // Store the result
}

const PendingTranslationSchema = new Schema<PendingTranslationDoc>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messageId: { type: String, required: true },
  messageContent: { type: String, required: true },
  targetLanguage: { type: String, required: true },
  roomCode: { type: String, required: true },
  retryCount: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  error: { type: String },
  translatedText: { type: String }
})

// Compound index for efficient querying
PendingTranslationSchema.index({ userId: 1, messageId: 1, targetLanguage: 1 }, { unique: true })
PendingTranslationSchema.index({ status: 1, lastAttempt: 1 })
PendingTranslationSchema.index({ createdAt: 1 }) // For cleanup

const PendingTranslation: Model<PendingTranslationDoc> = mongoose.models.PendingTranslation || mongoose.model<PendingTranslationDoc>('PendingTranslation', PendingTranslationSchema)
export default PendingTranslation
