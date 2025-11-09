import cron from 'node-cron'
import SlotReservation from '../models/SlotReservation'

function currentUtcDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function startSlotResetCron() {
  cron.schedule(
    '0 0 * * *',
    async () => {
      const utcDate = currentUtcDateString()
      try {
        const { deletedCount = 0 } = await SlotReservation.deleteMany({ date: { $lt: utcDate } })
        if (deletedCount > 0) {
          console.log(`[SVS Reset] Cleared ${deletedCount} slot reservations before ${utcDate}`)
        } else {
          console.log(`[SVS Reset] No slot reservations to reset before ${utcDate}`)
        }
      } catch (err) {
        console.error('[SVS Reset] Failed to reset slot reservations', err)
      }
    },
    { timezone: 'UTC' }
  )
}
