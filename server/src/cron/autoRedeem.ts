import cron from 'node-cron';
import { User } from '../models/User';
import { GiftCode } from '../models/GiftCode';
import { redeemGiftCode } from '../services/wos';
import { Types } from 'mongoose';

async function runOnce() {
  const now = new Date();
  const latest = await GiftCode.findOne({
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
  }).sort({ createdAt: -1 });

  if (!latest) return;

  const users = await User.find({ automationEnabled: true, gameId: { $exists: true, $ne: null } });

  for (const user of users) {
    try {
      const latestId = (latest._id as unknown) as Types.ObjectId;
      const already = (user.redeemedCodes ?? []).some((id) => id.equals(latestId));
      if (already) continue;
      if (!user.gameId) continue;

      const result = await redeemGiftCode(user.gameId, latest.code);
      if (result) {
        user.redeemedCodes = user.redeemedCodes || [];
        user.redeemedCodes.push(latestId);
        await user.save();
      }
    } catch (e) {
      // ignore per-user errors
    }
  }
}

export function startAutoRedeemCron() {
  const job = cron.schedule('*/15 * * * *', () => {
    runOnce().catch(() => undefined);
  });
  // also run at boot
  runOnce().catch(() => undefined);
  return job;
}
