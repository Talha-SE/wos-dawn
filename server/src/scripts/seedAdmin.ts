import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB } from '../db/connection'
import { User } from '../models/User'

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@wos.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set in environment. Create server/.env with MONGODB_URI before running.')
    process.exit(1)
  }

  await connectDB()

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { email, passwordHash } },
    { new: true, upsert: true }
  )

  console.log('Admin user upserted:', { id: user.id, email: user.email })
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
