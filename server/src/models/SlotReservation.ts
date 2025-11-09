import mongoose, { Schema, Document, Types } from 'mongoose'

export interface ISlotReservation extends Document {
  state: string
  allianceName: string
  date: string
  slotIndex: number
  assignedGameId?: string
  assignedPlayerName?: string
  reservedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const SlotReservationSchema = new Schema<ISlotReservation>({
  state: { type: String, required: true, index: true },
  allianceName: { type: String, required: true },
  date: { type: String, required: true, index: true },
  slotIndex: { type: Number, required: true, min: 0, max: 47, index: true },
  assignedGameId: { type: String },
  assignedPlayerName: { type: String },
  reservedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true })

SlotReservationSchema.index({ state: 1, date: 1, slotIndex: 1 }, { unique: true })
SlotReservationSchema.index({ state: 1, date: 1, reservedBy: 1 }, { unique: true })

export default mongoose.model<ISlotReservation>('SlotReservation', SlotReservationSchema)
