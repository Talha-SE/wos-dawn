import { Schema, model, Types, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  gameId?: string;
  gameName?: string;
  automationEnabled: boolean;
  redeemedCodes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    gameId: { type: String },
    gameName: { type: String },
    automationEnabled: { type: Boolean, default: false },
    redeemedCodes: [{ type: Schema.Types.ObjectId, ref: 'GiftCode', default: [] }]
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
