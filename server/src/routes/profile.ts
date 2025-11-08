import { Router } from 'express';
import Profile from '../models/Profile';
import { fetchPlayerProfile } from '../services/wos';

const router = Router();

// Get all saved profiles - must come before /:gameId to avoid conflict
router.get('/all', async (req, res) => {
  try {
    const profiles = await Profile.find({}).sort({ updatedAt: -1 });

    res.json({
      ok: true,
      profiles
    });

  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch profiles',
      error: error.message
    });
  }
});

// Get profile by game ID (from database or API)
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('[API] GET /api/profile/:gameId ->', { fid: gameId });

    // First check if profile exists in database
    const savedProfile = await Profile.findOne({ gameId });

    if (savedProfile) {
      console.log('[API] profile source = database', { fid: gameId });
      return res.json({
        ok: true,
        profile: savedProfile,
        source: 'database'
      });
    }

    // If not in database, fetch from WOS API
    const response = await fetchPlayerProfile(gameId);
    
    if (response && response.code === 0 && response.data) {
      const profileData = {
        gameId: response.data.fid.toString(),
        nickname: response.data.nickname,
        kid: response.data.kid,
        stove_lv: response.data.stove_lv,
        stove_lv_content: response.data.stove_lv_content,
        avatar_image: response.data.avatar_image || null,
        total_recharge_amount: response.data.total_recharge_amount || 0,
        autoRedemption: false
      };

      console.log('[API] profile source = api', { fid: gameId, code: response.code, msg: response.msg });
      return res.json({
        ok: true,
        profile: profileData,
        source: 'api'
      });
    }

    console.log('[API] player not found or bad response', { fid: gameId, response });
    res.status(404).json({
      ok: false,
      message: 'Player not found',
      detail: response
    });

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

// Save/Update profile
router.post('/save', async (req, res) => {
  try {
    const { gameId, nickname, kid, stove_lv, stove_lv_content, avatar_image, total_recharge_amount, autoRedemption } = req.body;

    const profileData = {
      gameId,
      nickname,
      kid,
      stove_lv,
      stove_lv_content,
      avatar_image,
      total_recharge_amount,
      autoRedemption
    };

    const profile = await Profile.findOneAndUpdate(
      { gameId },
      profileData,
      { upsert: true, new: true, runValidators: true }
    );

    res.json({
      ok: true,
      message: 'Profile saved successfully',
      profile
    });

  } catch (error: any) {
    console.error('Error saving profile:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to save profile',
      error: error.message
    });
  }
});

// Delete profile
router.delete('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const result = await Profile.findOneAndDelete({ gameId });

    if (!result) {
      return res.status(404).json({
        ok: false,
        message: 'Profile not found'
      });
    }

    res.json({
      ok: true,
      message: 'Profile deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      ok: false,
      message: 'Failed to delete profile',
      error: error.message
    });
  }
});

export default router;