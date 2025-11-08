import mongoose, { Schema, Document } from 'mongoose';

export interface IProfile extends Document {
  gameId: string;
  nickname: string;
  kid: number;
  stove_lv: number;
  stove_lv_content: string | number;
  avatar_image?: string;
  total_recharge_amount: number;
  autoRedemption: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema: Schema = new Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nickname: {
    type: String,
    required: true
  },
  kid: {
    type: Number,
    required: true
  },
  stove_lv: {
    type: Number,
    required: true
  },
  stove_lv_content: {
    type: Schema.Types.Mixed, // Can be string or number
    required: true
  },
  avatar_image: {
    type: String,
    default: null
  },
  total_recharge_amount: {
    type: Number,
    default: 0
  },
  autoRedemption: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<IProfile>('Profile', ProfileSchema);