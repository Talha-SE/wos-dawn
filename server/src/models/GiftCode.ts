import { Schema, model, Document } from 'mongoose';

export interface IGiftCode extends Document {
  code: string;
  expiresAt?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GiftCodeSchema = new Schema<IGiftCode>(
  {
    code: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const GiftCode = model<IGiftCode>('GiftCode', GiftCodeSchema);
