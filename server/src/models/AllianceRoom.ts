import mongoose, { Schema, Document, Model } from 'mongoose'

export interface AllianceRoomDoc extends Document {
  code: string
  name: string
  state: number
  passwordHash: string
  createdBy: mongoose.Types.ObjectId
  suspended: boolean
  suspendedUntil?: Date
  suspensionReason?: string
  createdAt: Date
}

const AllianceRoomSchema = new Schema<AllianceRoomDoc>({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  state: { type: Number, required: true, index: true },
  passwordHash: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  suspended: { type: Boolean, default: false, index: true },
  suspendedUntil: { type: Date },
  suspensionReason: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
})

const AllianceRoom: Model<AllianceRoomDoc> = mongoose.models.AllianceRoom || mongoose.model<AllianceRoomDoc>('AllianceRoom', AllianceRoomSchema)
export default AllianceRoom
