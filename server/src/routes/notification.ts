import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Notification } from '../models/Notification';

const router = Router();

// Get all notifications for the logged-in user
router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    const { 
      unreadOnly = 'false', 
      type,
      limit = '50',
      skip = '0'
    } = req.query;

    const query: any = { userId };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    if (type) {
      query.type = type;
    }

    // Filter out expired notifications
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({ 
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (err: any) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
router.get('/notifications/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    
    const count = await Notification.countDocuments({ 
      userId, 
      read: false,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({ count });
  } catch (err: any) {
    console.error('Failed to fetch unread count:', err);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const notification = await Notification.findOne({ _id: id, userId });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (err: any) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    await Notification.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Failed to mark all as read:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

// Delete a notification
router.delete('/notifications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await Notification.deleteOne({ _id: id, userId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (err: any) {
    console.error('Failed to delete notification:', err);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// Delete all read notifications
router.delete('/notifications/read/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const result = await Notification.deleteMany({ userId, read: true });

    res.json({ 
      message: 'Read notifications deleted',
      deletedCount: result.deletedCount 
    });
  } catch (err: any) {
    console.error('Failed to delete notifications:', err);
    res.status(500).json({ message: 'Failed to delete notifications' });
  }
});

export default router;
