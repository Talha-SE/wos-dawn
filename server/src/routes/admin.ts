import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { GiftCode } from '../models/GiftCode';
import { User } from '../models/User';
import AllianceRoom from '../models/AllianceRoom';
import AllianceMembership from '../models/AllianceMembership';
import AllianceMessage from '../models/AllianceMessage';
import SlotReservation from '../models/SlotReservation';
import { ActivityLog } from '../models/ActivityLog';
import { SupportTicket } from '../models/SupportTicket';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(requireAuth);
router.use(requireAdmin);

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

// List users with full details (admin)
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('email passwordHash gameId gameName automationEnabled createdAt updatedAt suspended suspendedUntil isAdmin')
      .lean();
    
    // Import Profile model dynamically
    const Profile = (await import('../models/Profile')).default;
    
    // Fetch profiles for users with gameId
    const usersWithProfiles = await Promise.all(
      users.map(async (u) => {
        let profile = null;
        if (u.gameId) {
          profile = await Profile.findOne({ gameId: u.gameId }).lean();
        }
        
        return {
          _id: u._id,
          email: u.email,
          passwordHash: u.passwordHash,
          gameId: u.gameId || null,
          gameName: u.gameName || null,
          automationEnabled: u.automationEnabled || false,
          suspended: (u as any).suspended || false,
          suspendedUntil: (u as any).suspendedUntil || null,
          isAdmin: (u as any).isAdmin || false,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          profile: profile ? {
            nickname: profile.nickname,
            kid: profile.kid,
            stove_lv: profile.stove_lv,
            stove_lv_content: profile.stove_lv_content,
            avatar_image: profile.avatar_image,
            total_recharge_amount: profile.total_recharge_amount
          } : null
        };
      })
    );
    
    res.json(usersWithProfiles);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch users' });
  }
});

// Get user statistics
router.get('/stats', async (_req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const suspendedUsers = await User.countDocuments({ suspended: true });
    const activeUsers = totalUsers - suspendedUsers;
    const totalRooms = await AllianceRoom.countDocuments();
    const totalSlots = await SlotReservation.countDocuments();
    const totalGiftCodes = await GiftCode.countDocuments();
    const activeGiftCodes = await GiftCode.countDocuments({ active: true });

    res.json({
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      rooms: { total: totalRooms },
      slots: { total: totalSlots },
      giftCodes: { total: totalGiftCodes, active: activeGiftCodes }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to get statistics' });
  }
});

// Update user (admin)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, gameId, gameName, automationEnabled, suspended, suspendedUntil } = req.body;
    
    const update: any = {};
    if (email !== undefined) update.email = email;
    if (password !== undefined) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }
    if (gameId !== undefined) update.gameId = gameId;
    if (gameName !== undefined) update.gameName = gameName;
    if (typeof automationEnabled === 'boolean') update.automationEnabled = automationEnabled;
    if (typeof suspended === 'boolean') update.suspended = suspended;
    if (suspendedUntil !== undefined) update.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;

    const updated = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('email gameId gameName automationEnabled suspended suspendedUntil createdAt updatedAt');
    
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update user' });
  }
});

// Delete user permanently (admin)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete user's memberships and related data
    await AllianceMembership.deleteMany({ userId: user._id });
    await SlotReservation.deleteMany({ reservedBy: user._id });
    
    // Delete rooms created by this user
    const userRooms = await AllianceRoom.find({ createdBy: user._id });
    for (const room of userRooms) {
      await AllianceMembership.deleteMany({ roomCode: room.code });
      await AllianceMessage.deleteMany({ roomCode: room.code });
      await AllianceRoom.deleteOne({ _id: room._id });
    }
    
    await User.findByIdAndDelete(id);
    res.json({ ok: true, message: 'User and all related data deleted permanently' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete user' });
  }
});

// List alliance rooms with owner and member count (admin)
router.get('/rooms', async (_req, res) => {
  try {
    const rooms = await AllianceRoom.find().sort({ createdAt: -1 }).populate('createdBy', 'email').lean();
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        const memberCount = await AllianceMembership.countDocuments({ roomCode: room.code });
        const members = await AllianceMembership.find({ roomCode: room.code }).populate('userId', 'email').lean();
        return {
          code: room.code,
          name: room.name,
          state: room.state,
          ownerEmail: (room.createdBy as any)?.email || 'Unknown',
          memberCount,
          suspended: (room as any).suspended || false,
          suspendedUntil: (room as any).suspendedUntil || null,
          members: members.map((m: any) => ({
            email: m.userId?.email || 'Unknown',
            role: m.role,
            joinedAt: m.joinedAt
          })),
          createdAt: room.createdAt
        };
      })
    );
    res.json(roomsWithDetails);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to list rooms' });
  }
});

// Update alliance room (admin)
router.put('/rooms/:code', async (req, res) => {
  try {
    const code = String(req.params.code);
    const { name, state, suspended, suspendedUntil } = req.body;
    
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (state !== undefined) update.state = state;
    if (typeof suspended === 'boolean') update.suspended = suspended;
    if (suspendedUntil !== undefined) update.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;

    const updated = await AllianceRoom.findOneAndUpdate(
      { code },
      { $set: update },
      { new: true }
    ).populate('createdBy', 'email');
    
    if (!updated) return res.status(404).json({ message: 'Room not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update room' });
  }
});

// Delete alliance room by code (admin override, no password required)
router.delete('/rooms/:code', async (req, res) => {
  try {
    const code = String(req.params.code);
    const room = await AllianceRoom.findOne({ code });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    
    await AllianceRoom.deleteOne({ _id: room._id });
    await AllianceMembership.deleteMany({ roomCode: room.code });
    await AllianceMessage.deleteMany({ roomCode: room.code });
    res.json({ ok: true, message: 'Room deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete room' });
  }
});

// Get room messages count
router.get('/rooms/:code/messages', async (req, res) => {
  try {
    const code = String(req.params.code);
    const count = await AllianceMessage.countDocuments({ roomCode: code });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to get message count' });
  }
});

// List all slot reservations grouped by state (admin)
router.get('/slots', async (_req, res) => {
  try {
    const reservations = await SlotReservation.find()
      .sort({ state: 1, date: -1, slotIndex: 1 })
      .populate('reservedBy', 'email')
      .lean();
    
    // Group by state
    const byState = new Map<string, any[]>();
    for (const r of reservations) {
      const state = r.state;
      if (!byState.has(state)) byState.set(state, []);
      byState.get(state)!.push({
        _id: r._id,
        state: r.state,
        allianceName: r.allianceName,
        date: r.date,
        slotIndex: r.slotIndex,
        assignedGameId: r.assignedGameId,
        assignedPlayerName: r.assignedPlayerName,
        reservedByEmail: (r.reservedBy as any)?.email || 'Unknown',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      });
    }
    
    const states = Array.from(byState.entries()).map(([state, items]) => ({
      state,
      count: items.length,
      reservations: items
    }));
    
    res.json(states);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to list slot reservations' });
  }
});

// Delete slot reservation by ID (admin)
router.delete('/slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SlotReservation.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Reservation not found' });
    res.json({ ok: true, message: 'Reservation deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete reservation' });
  }
});

router.delete('/gift/codes/:id', async (req, res) => {
  const { id } = req.params;
  await GiftCode.findByIdAndDelete(id);
  res.json({ ok: true });
});

// Get activity logs (admin)
router.get('/activity-logs', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;
    const query: any = {};
    if (type && type !== 'all') query.type = type;

    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .populate('userId', 'email')
      .lean();

    res.json(logs.map(log => ({
      _id: log._id,
      type: log.type,
      userId: log.userId,
      userEmail: log.userEmail,
      details: log.details,
      metadata: log.metadata,
      timestamp: log.timestamp
    })));
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to get activity logs' });
  }
});

// Helper function to log activity (can be imported and used in other routes)
export async function logActivity(
  type: 'user_register' | 'user_login' | 'room_create' | 'slot_reserve' | 'gift_redeem' | 'user_suspend' | 'room_suspend',
  userEmail: string,
  details: string,
  metadata?: Record<string, any>,
  userId?: any
) {
  try {
    await ActivityLog.create({
      type,
      userId,
      userEmail,
      details,
      metadata,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Clear old activity logs (admin)
router.delete('/clear-old-logs', async (_req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await ActivityLog.deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
    res.json({ ok: true, message: `Cleared ${result.deletedCount} old log entries` });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to clear logs' });
  }
});

// Export all data (admin)
router.get('/export-data', async (_req, res) => {
  try {
    const users = await User.find().select('-passwordHash').lean();
    const rooms = await AllianceRoom.find().lean();
    const memberships = await AllianceMembership.find().lean();
    const slots = await SlotReservation.find().lean();
    const giftCodes = await GiftCode.find().lean();
    const activityLogs = await ActivityLog.find().limit(1000).sort({ timestamp: -1 }).lean();

    res.json({
      exportDate: new Date().toISOString(),
      counts: {
        users: users.length,
        rooms: rooms.length,
        memberships: memberships.length,
        slots: slots.length,
        giftCodes: giftCodes.length,
        activityLogs: activityLogs.length
      },
      data: {
        users,
        rooms,
        memberships,
        slots,
        giftCodes,
        activityLogs
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to export data' });
  }
});

// Health check (admin)
router.get('/health-check', async (_req, res) => {
  try {
    const mongoose = await import('mongoose');
    const db = mongoose.default.connection;
    
    const collections = await db.db?.listCollections().toArray();
    const collectionNames = collections?.map(c => c.name).join(', ') || 'unknown';

    res.json({
      status: db.readyState === 1 ? 'connected' : 'disconnected',
      database: db.name || 'unknown',
      collections: collectionNames,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Health check failed' });
  }
});

// Get all support tickets (admin)
router.get('/support/tickets', async (req, res) => {
  try {
    const { status, type, priority } = req.query;
    
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'email gameId')
      .populate('reportedUserId', 'email gameId')
      .lean();

    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch tickets' });
  }
});

// Get ticket statistics (admin)
router.get('/support/stats', async (_req, res) => {
  try {
    const [total, pending, inProgress, resolved, closed, byType] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      total,
      pending,
      inProgress,
      resolved,
      closed,
      byType: byType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch stats' });
  }
});

// Get a specific ticket (admin)
router.get('/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'email gameId gameName')
      .populate('reportedUserId', 'email gameId gameName')
      .lean();
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch ticket' });
  }
});

// Update ticket status and priority (admin)
router.put('/support/tickets/:id/status', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo } = req.body;

    const update: any = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (status === 'resolved' || status === 'closed') {
      update.resolvedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Ticket updated successfully', ticket });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update ticket' });
  }
});

// Add admin remark to ticket
router.post('/support/tickets/:id/remarks', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    if (!remark) {
      return res.status(400).json({ message: 'Remark is required' });
    }

    const user = await User.findById(req.userId).select('email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      {
        $push: {
          adminRemarks: {
            remark,
            addedBy: user.email,
            addedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Remark added successfully', ticket });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to add remark' });
  }
});

// Delete ticket (admin)
router.delete('/support/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findByIdAndDelete(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete ticket' });
  }
});

export default router;
