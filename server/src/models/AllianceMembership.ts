import mongoose, { Schema, Document, Model } from 'mongoose'

export interface AllianceMembershipDoc extends Document {
  roomCode: string
  userId: mongoose.Types.ObjectId
  role: 'owner' | 'member'
  joinedAt: Date
}

const AllianceMembershipSchema = new Schema<AllianceMembershipDoc>({
  roomCode: { type: String, required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['owner', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
})

AllianceMembershipSchema.index({ roomCode: 1, userId: 1 }, { unique: true })

const AllianceMembership: Model<AllianceMembershipDoc> = mongoose.models.AllianceMembership || mongoose.model<AllianceMembershipDoc>('AllianceMembership', AllianceMembershipSchema)
export default AllianceMembership
