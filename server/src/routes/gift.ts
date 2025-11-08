import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { GiftCode } from '../models/GiftCode';
import { User } from '../models/User';
import { redeemGiftCode } from '../services/wos';

const router = Router();

router.get('/codes', requireAuth, async (req: AuthRequest, res: Response) => {
  const now = new Date();
  const codes = await GiftCode.find({
    active: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
  }).sort({ createdAt: -1 });
  res.json(codes);
});

router.post('/redeem', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) return res.status(400).json({ message: 'code required' });
    const user = await User.findById(req.userId);
    if (!user || !user.gameId) return res.status(400).json({ message: 'Set your gameId first' });

    const result = await redeemGiftCode(user.gameId, code);

    const codeDoc = await GiftCode.findOne({ code });
    if (codeDoc && !user.redeemedCodes?.some((id: any) => id.equals(codeDoc._id))) {
      user.redeemedCodes.push(codeDoc._id as any);
      await user.save();
    }
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(502).json({ ok: false, message: 'Redeem failed', detail: e?.response?.data || e?.message });
  }
});

router.post('/redeem/latest', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const latest = await GiftCode.findOne({
      active: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    }).sort({ createdAt: -1 });
    if (!latest) return res.status(404).json({ message: 'No active codes' });

    const user = await User.findById(req.userId);
    if (!user || !user.gameId) return res.status(400).json({ message: 'Set your gameId first' });

    const result = await redeemGiftCode(user.gameId, latest.code);

    if (!user.redeemedCodes?.some((id: any) => id.equals(latest._id))) {
      user.redeemedCodes.push(latest._id as any);
      await user.save();
    }

    res.json({ ok: true, result, code: latest.code });
  } catch (e: any) {
    res.status(502).json({ ok: false, message: 'Redeem failed', detail: e?.response?.data || e?.message });
  }
});

// Public endpoint: Redeem by Game ID (no auth required)
router.post('/redeem/by-id', async (req, res: Response) => {
  try {
    const { gameId, code } = req.body as { gameId: string; code: string };
    
    if (!gameId) return res.status(400).json({ message: 'Game ID is required' });
    if (!code) return res.status(400).json({ message: 'Gift code is required' });

    // Validate gameId format (usually numeric)
    if (!/^\d+$/.test(gameId)) {
      return res.status(400).json({ message: 'Invalid Game ID format. Should be numeric.' });
    }

    const result = await redeemGiftCode(gameId, code);

    // Check if redemption was successful
    if (result && (result.code === 0 || result.msg === 'success')) {
      res.json({ 
        ok: true, 
        message: 'Gift code redeemed successfully!', 
        result,
        gameId,
        redeemedCode: code
      });
    } else {
      // Return detailed error for debugging
      res.status(400).json({ 
        ok: false, 
        message: result?.msg || 'Redemption failed', 
        detail: result,
        hint: result?.msg === 'Sign Error' 
          ? 'WOS_SECRET in .env may be incorrect or outdated. Check WOS_SECRET_GUIDE.md'
          : 'The gift code may be expired, invalid, or already redeemed for this Game ID'
      });
    }
  } catch (e: any) {
    res.status(502).json({ 
      ok: false, 
      message: 'Redemption failed', 
      detail: e?.response?.data || e?.message,
      hint: 'Check server logs for more details'
    });
  }
});

// Get all active codes (public)
router.get('/active-codes', async (req, res: Response) => {
  try {
    const now = new Date();
    const codes = await GiftCode.find({
      active: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }]
    }).sort({ createdAt: -1 }).select('code expiresAt createdAt');
    
    res.json(codes);
  } catch (e: any) {
    res.status(500).json({ message: 'Failed to fetch codes', error: e.message });
  }
});

export default router;
