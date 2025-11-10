import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { SupportTicket } from '../models/SupportTicket';
import { User } from '../models/User';

const router = Router();

// Create a new support ticket
router.post('/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, subject, message, reportedUserEmail } = req.body;

    if (!type || !subject || !message) {
      return res.status(400).json({ message: 'Type, subject, and message are required' });
    }

    const user = await User.findById(req.userId).select('email');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const ticketData: any = {
      userId: req.userId,
      userEmail: user.email,
      type,
      subject,
      message,
      status: 'pending',
      priority: 'medium'
    };

    // If reporting a user, try to find and link the reported user
    if (type === 'report_user' && reportedUserEmail) {
      const reportedUser = await User.findOne({ email: reportedUserEmail }).select('_id email');
      if (reportedUser) {
        ticketData.reportedUserId = reportedUser._id;
        ticketData.reportedUserEmail = reportedUser.email;
      } else {
        ticketData.reportedUserEmail = reportedUserEmail;
      }
    }

    const ticket = await SupportTicket.create(ticketData);

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket: {
        _id: ticket._id,
        type: ticket.type,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create support ticket' });
  }
});

// Get user's own tickets
router.get('/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;
    
    const query: any = { userId: req.userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .select('-adminRemarks')
      .lean();

    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch tickets' });
  }
});

// Get a specific ticket with full details including admin remarks
router.get('/tickets/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({ _id: id, userId: req.userId }).lean();
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch ticket' });
  }
});

// Get ticket statistics for user
router.get('/tickets/stats/summary', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [total, pending, inProgress, resolved] = await Promise.all([
      SupportTicket.countDocuments({ userId: req.userId }),
      SupportTicket.countDocuments({ userId: req.userId, status: 'pending' }),
      SupportTicket.countDocuments({ userId: req.userId, status: 'in_progress' }),
      SupportTicket.countDocuments({ userId: req.userId, status: 'resolved' })
    ]);

    res.json({
      total,
      pending,
      inProgress,
      resolved,
      closed: total - pending - inProgress - resolved
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch ticket stats' });
  }
});

export default router;
