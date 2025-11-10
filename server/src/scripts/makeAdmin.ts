import mongoose from 'mongoose';
import { User } from '../models/User';
import env from '../config/env';

/**
 * Script to make a user an admin
 * Usage: npx tsx src/scripts/makeAdmin.ts <email>
 */

async function makeAdmin(email: string) {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`ℹ️  User ${email} is already an admin`);
      process.exit(0);
    }

    user.isAdmin = true;
    await user.save();

    console.log(`✅ Successfully made ${email} an admin!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx src/scripts/makeAdmin.ts <email>');
  process.exit(1);
}

makeAdmin(email);
