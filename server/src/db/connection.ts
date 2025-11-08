import mongoose from 'mongoose';
import env from '../config/env';

export async function connectDB() {
  const uri = env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}
