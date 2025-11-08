import { Router } from 'express';
import { GiftCode } from '../models/GiftCode';
import env from '../config/env';

const router = Router();

router.use((req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) return res.status(401).json({ message: 'Unauthorized' });
  next();
});

router.get('/gift/codes/all', async (_req, res) => {
  const codes = await GiftCode.find().sort({ createdAt: -1 });
  res.json(codes);
});

router.post('/gift/codes', async (req, res) => {
  const { code, expiresAt, active } = req.body as { code: string; expiresAt?: string | Date; active?: boolean };
  if (!code) return res.status(400).json({ message: 'code required' });
  const payload: any = { code };
  if (typeof active === 'boolean') payload.active = active;
  if (expiresAt) payload.expiresAt = new Date(expiresAt);
  const created = await GiftCode.findOneAndUpdate({ code }, { $set: payload }, { new: true, upsert: true });
  res.json(created);
});

router.put('/gift/codes/:id', async (req, res) => {
  const { id } = req.params;
  const { expiresAt, active } = req.body as { expiresAt?: string | Date; active?: boolean };
  const update: any = {};
  if (typeof active === 'boolean') update.active = active;
  if (expiresAt) update.expiresAt = new Date(expiresAt);
  const updated = await GiftCode.findByIdAndUpdate(id, { $set: update }, { new: true });
  res.json(updated);
});

router.delete('/gift/codes/:id', async (req, res) => {
  const { id } = req.params;
  await GiftCode.findByIdAndDelete(id);
  res.json({ ok: true });
});

export default router;
