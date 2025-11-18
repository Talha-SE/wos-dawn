import cron from 'node-cron'
import AllianceMessage from '../models/AllianceMessage'

/**
 * Auto-delete alliance chat messages older than 7 days
 * Runs every hour to clean up old messages from the database
 */
export function startMessageCleanupCron() {
  // Run every hour at minute 0
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        
        const result = await AllianceMessage.deleteMany({
          createdAt: { $lt: sevenDaysAgo }
        })
        
        const deletedCount = result.deletedCount || 0
        
        if (deletedCount > 0) {
          console.log(`[Message Cleanup] Deleted ${deletedCount} messages older than 7 days`)
        } else {
          console.log(`[Message Cleanup] No messages older than 7 days to delete`)
        }
      } catch (err) {
        console.error('[Message Cleanup] Failed to delete old messages:', err)
      }
    },
    { timezone: 'UTC' }
  )
  
  console.log('[Message Cleanup] Cron job started - runs every hour to delete messages older than 7 days')
}
