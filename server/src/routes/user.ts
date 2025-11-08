import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { fetchPlayerProfile } from '../services/wos';

const router = Router();

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId).select('email gameId automationEnabled');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.put('/me/game', requireAuth, async (req: AuthRequest, res) => {
  const { gameId } = req.body as { gameId: string };
  if (!gameId) return res.status(400).json({ message: 'gameId required' });
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { gameId } },
    { new: true }
  ).select('email gameId automationEnabled');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.put('/me/automation', requireAuth, async (req: AuthRequest, res) => {
  const { enabled } = req.body as { enabled: boolean };
  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: { automationEnabled: !!enabled } },
    { new: true }
  ).select('email gameId automationEnabled');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.get('/me/profile', requireAuth, async (req: AuthRequest, res) => {
  const user = await User.findById(req.userId).select('gameId');
  if (!user || !user.gameId) return res.status(400).json({ message: 'Set your gameId first' });
  try {
    const data = await fetchPlayerProfile(user.gameId);
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ message: 'Failed to fetch profile', detail: e?.response?.data || e?.message });
  }
});

export default router;
