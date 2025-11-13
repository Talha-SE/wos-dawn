import cron from 'node-cron'
import PendingTranslation from '../models/PendingTranslation'

// Clean up old completed/failed translations after 24 hours
export function startTranslationCleanup() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const result = await PendingTranslation.deleteMany({
        $or: [
          { status: 'completed', createdAt: { $lt: oneDayAgo } },
          { status: 'failed', retryCount: { $gte: 10 }, lastAttempt: { $lt: oneDayAgo } }
        ]
      })
      
      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} old translation records`)
      }
    } catch (error) {
      console.error('Error cleaning up translations:', error)
    }
  })
  
  console.log('Translation cleanup cron job started (runs hourly)')
}
