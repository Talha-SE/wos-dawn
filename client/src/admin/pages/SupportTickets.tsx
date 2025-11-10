import { useState, useEffect } from 'react';
import { 
  Headphones, 
  Filter, 
  Search, 
  Eye, 
  MessageSquare, 
  User as UserIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Send,
  Trash2,
  Mail
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';

type TicketType = 'report_user' | 'report_issue' | 'feature_request' | 'account_issue' | 'technical_support' | 'other';
type TicketStatus = 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface Ticket {
  _id: string;
  userId: {
    _id: string;
    email: string;
    gameProfile?: {
      playerName?: string;
      playerId?: string;
    };
  };
  type: TicketType;
  subject: string;
  message: string;
  status: TicketStatus;
  priority?: TicketPriority;
  reportedUserId?: {
    _id: string;
    email: string;
    gameProfile?: {
      playerName?: string;
      playerId?: string;
    };
  };
  reportedUserEmail?: string;
  adminRemarks: Array<{
    message: string;
    addedBy: string;
    addedAt: Date;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TicketStats {
  total: number;
  pending: number;
  in_progress: number;
  resolved: number;
  closed: number;
  rejected: number;
  byType: Record<string, number>;
}

const ticketTypeLabels: Record<TicketType, string> = {
  report_user: 'Report User',
  report_issue: 'Report Issue',
  feature_request: 'Feature Request',
  account_issue: 'Account Issue',
  technical_support: 'Technical Support',
  other: 'Other'
};

const statusColors: Record<TicketStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
  closed: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30'
};

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  pending: <Clock size={16} />,
  in_progress: <Loader size={16} className="animate-spin" />,
  resolved: <CheckCircle size={16} />,
  closed: <XCircle size={16} />,
  rejected: <AlertCircle size={16} />
};

const priorityColors: Record<TicketPriority, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400'
};

export default function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [remarkMessage, setRemarkMessage] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
  }, [filterStatus, filterType]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterType !== 'all') params.type = filterType;

      const { data } = await api.get<Ticket[]>('/admin/support/tickets', { params });
      setTickets(data);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get<TicketStats>('/admin/support/stats');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const viewTicket = async (ticketId: string) => {
    try {
      const { data } = await api.get<Ticket>(`/admin/support/tickets/${ticketId}`);
      setSelectedTicket(data);
      setRemarkMessage('');
    } catch (err: any) {
      console.error('Failed to load ticket:', err);
    }
  };

  const updateStatus = async (newStatus: TicketStatus, newPriority?: TicketPriority) => {
    if (!selectedTicket) return;
    
    setUpdatingStatus(true);
    try {
      const payload: any = { status: newStatus };
      if (newPriority) payload.priority = newPriority;

      await api.put(`/admin/support/tickets/${selectedTicket._id}/status`, payload);
      
      // Reload ticket and list
      await viewTicket(selectedTicket._id);
      await loadTickets();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Failed to update ticket status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const addRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !remarkMessage.trim()) return;

    setSubmittingRemark(true);
    try {
      await api.post(`/admin/support/tickets/${selectedTicket._id}/remarks`, {
        message: remarkMessage.trim()
      });
      
      // Reload ticket
      await viewTicket(selectedTicket._id);
      setRemarkMessage('');
    } catch (err: any) {
      console.error('Failed to add remark:', err);
      alert('Failed to add remark');
    } finally {
      setSubmittingRemark(false);
    }
  };

  const deleteTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

    setDeletingTicket(true);
    try {
      await api.delete(`/admin/support/tickets/${selectedTicket._id}`);
      setSelectedTicket(null);
      await loadTickets();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to delete ticket:', err);
      alert('Failed to delete ticket');
    } finally {
      setDeletingTicket(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.message.toLowerCase().includes(query) ||
        ticket.userId.email.toLowerCase().includes(query) ||
        ticket._id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <Headphones className="text-blue-400" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <p className="text-white/60 text-sm">Manage user support requests and tickets</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/60 uppercase tracking-wide">Total</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
            <div className="text-xs text-yellow-300/80 uppercase tracking-wide">Pending</div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-300">{stats.in_progress}</div>
            <div className="text-xs text-blue-300/80 uppercase tracking-wide">In Progress</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-300">{stats.resolved}</div>
            <div className="text-xs text-green-300/80 uppercase tracking-wide">Resolved</div>
          </div>
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-300">{stats.closed}</div>
            <div className="text-xs text-gray-300/80 uppercase tracking-wide">Closed</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-300">{stats.rejected}</div>
            <div className="text-xs text-red-300/80 uppercase tracking-wide">Rejected</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Types</option>
              <option value="report_user">Report User</option>
              <option value="report_issue">Report Issue</option>
              <option value="feature_request">Feature Request</option>
              <option value="account_issue">Account Issue</option>
              <option value="technical_support">Technical Support</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-white/60">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={48} className="text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Tickets Found</h3>
            <p className="text-white/60">No support tickets match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket._id}
                className="p-4 hover:bg-white/5 transition-all cursor-pointer"
                onClick={() => viewTicket(ticket._id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[ticket.status]}`}>
                        {statusIcons[ticket.status]}
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/80 border border-white/20">
                        {ticketTypeLabels[ticket.type]}
                      </span>
                      {ticket.priority && (
                        <span className={`text-xs font-semibold ${priorityColors[ticket.priority]}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1 truncate">{ticket.subject}</h3>
                    <p className="text-sm text-white/60 line-clamp-1 mb-2">{ticket.message}</p>
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} />
                        {ticket.userId.email}
                      </span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.adminRemarks.length > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <MessageSquare size={12} />
                          {ticket.adminRemarks.length} {ticket.adminRemarks.length === 1 ? 'remark' : 'remarks'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-slate-900 border border-white/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[selectedTicket.status]}`}>
                      {statusIcons[selectedTicket.status]}
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/80 border border-white/20">
                      {ticketTypeLabels[selectedTicket.type]}
                    </span>
                    {selectedTicket.priority && (
                      <span className={`text-xs font-semibold ${priorityColors[selectedTicket.priority]}`}>
                        {selectedTicket.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedTicket.subject}</h2>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1.5">
                      <UserIcon size={14} />
                      {selectedTicket.userId.email}
                    </span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateStatus(e.target.value as TicketStatus)}
                  disabled={updatingStatus}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={selectedTicket.priority || 'low'}
                  onChange={(e) => updateStatus(selectedTicket.status, e.target.value as TicketPriority)}
                  disabled={updatingStatus}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical</option>
                </select>

                <button
                  onClick={deleteTicket}
                  disabled={deletingTicket}
                  className="ml-auto px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  {deletingTicket ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Original Message */}
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">User Message</h3>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-white/80 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
                {selectedTicket.reportedUserEmail && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon size={16} className="text-red-400" />
                      <span className="text-white/60">Reported user:</span>
                      <span className="text-white font-medium">{selectedTicket.reportedUserEmail}</span>
                      {selectedTicket.reportedUserId && (
                        <span className="text-white/40 text-xs">
                          (ID: {selectedTicket.reportedUserId._id})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Remarks */}
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-3">Admin Remarks</h3>
                {selectedTicket.adminRemarks.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {selectedTicket.adminRemarks.map((remark, idx) => (
                      <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-blue-500/20">
                            <MessageSquare size={14} className="text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-blue-300">
                            Admin • {new Date(remark.addedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white/90 whitespace-pre-wrap">{remark.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm mb-4">No remarks yet</p>
                )}

                {/* Add Remark Form */}
                <form onSubmit={addRemark} className="space-y-3">
                  <textarea
                    value={remarkMessage}
                    onChange={(e) => setRemarkMessage(e.target.value)}
                    placeholder="Add a remark (will be visible to the user)..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 resize-none"
                    rows={4}
                    maxLength={1000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">{remarkMessage.length}/1000 characters</span>
                    <Button
                      type="submit"
                      disabled={submittingRemark || !remarkMessage.trim()}
                      className="px-4 py-2"
                    >
                      {submittingRemark ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Add Remark
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Ticket Info */}
              <div className="pt-4 border-t border-white/10 text-xs text-white/50 space-y-1">
                <p>Ticket ID: {selectedTicket._id}</p>
                <p>User ID: {selectedTicket.userId._id}</p>
                <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                <p>Last Updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
