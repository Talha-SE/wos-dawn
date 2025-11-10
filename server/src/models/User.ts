import { Schema, model, Types, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  gameId?: string;
  gameName?: string;
  automationEnabled: boolean;
  redeemedCodes: Types.ObjectId[];
  suspended: boolean;
  suspendedUntil?: Date;
  isAdmin: boolean;
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
    redeemedCodes: [{ type: Schema.Types.ObjectId, ref: 'GiftCode', default: [] }],
    suspended: { type: Boolean, default: false },
    suspendedUntil: { type: Date },
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = model<IUser>('User', UserSchema);
