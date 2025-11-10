import { useState, useEffect } from 'react';
import { Send, Mail, AlertCircle, CheckCircle, Clock, XCircle, Loader, Eye, MessageSquare, User as UserIcon } from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';

type TicketType = 'report_user' | 'report_issue' | 'feature_request' | 'account_issue' | 'technical_support' | 'other';
type TicketStatus = 'pending' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface Ticket {
  _id: string;
  userId: string;
  type: TicketType;
  subject: string;
  message: string;
  status: TicketStatus;
  priority?: TicketPriority;
  reportedUserId?: string;
  reportedUserEmail?: string;
  adminRemarks: Array<{
    message: string;
    addedBy: string;
    addedAt: Date;
  }>;
  createdAt: string;
  updatedAt: string;
}

const ticketTypeLabels: Record<TicketType, string> = {
  report_user: 'Report a User',
  report_issue: 'Report an Issue',
  feature_request: 'Feature Request',
  account_issue: 'Account Issue',
  technical_support: 'Technical Support',
  other: 'Other'
};

const ticketTypeDescriptions: Record<TicketType, string> = {
  report_user: 'Report inappropriate behavior or violations',
  report_issue: 'Report bugs or problems with the platform',
  feature_request: 'Suggest new features or improvements',
  account_issue: 'Issues with your account or profile',
  technical_support: 'Get help with technical problems',
  other: 'Any other inquiries or concerns'
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

export default function ContactAdmin() {
  const [activeTab, setActiveTab] = useState<'new' | 'tickets'>('new');
  const [ticketType, setTicketType] = useState<TicketType>('report_issue');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reportedUserEmail, setReportedUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data } = await api.get<Ticket[]>('/support/tickets');
      setTickets(data);
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!subject.trim() || !message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (ticketType === 'report_user' && !reportedUserEmail.trim()) {
      setError('Please provide the email of the user you want to report');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        type: ticketType,
        subject: subject.trim(),
        message: message.trim()
      };

      if (ticketType === 'report_user') {
        payload.reportedUserEmail = reportedUserEmail.trim();
      }

      await api.post('/support/tickets', payload);
      
      setSuccess('Your ticket has been submitted successfully! The admin will review it soon.');
      setSubject('');
      setMessage('');
      setReportedUserEmail('');
      setTicketType('report_issue');
      
      // Refresh tickets list if we're on that tab
      if (activeTab === 'tickets') {
        loadTickets();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewTicket = async (ticketId: string) => {
    try {
      const { data } = await api.get<Ticket>(`/support/tickets/${ticketId}`);
      setSelectedTicket(data);
    } catch (err: any) {
      setError('Failed to load ticket details');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Mail className="text-blue-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Contact Admin</h1>
              <p className="text-white/60 text-sm mt-1">Submit tickets, report issues, or request features</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'new'
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Send size={18} />
            New Ticket
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'tickets'
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <MessageSquare size={18} />
            My Tickets
            {tickets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold">
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {/* New Ticket Form */}
        {activeTab === 'new' && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Ticket Type Selection */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">Select Ticket Type *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(ticketTypeLabels) as TicketType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTicketType(type);
                        setReportedUserEmail(''); // Reset reported user email when changing type
                      }}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        ticketType === type
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-white mb-1">{ticketTypeLabels[type]}</div>
                      <div className="text-xs text-white/60">{ticketTypeDescriptions[type]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reported User Email (only for report_user type) */}
              {ticketType === 'report_user' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    User Email to Report *
                  </label>
                  <Input
                    type="email"
                    value={reportedUserEmail}
                    onChange={(e) => setReportedUserEmail(e.target.value)}
                    placeholder="Enter the email of the user you want to report"
                    className="w-full"
                    required
                  />
                  <p className="mt-1.5 text-xs text-white/50">
                    Provide the email address of the user you are reporting
                  </p>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Subject *</label>
                <Input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your ticket"
                  className="w-full"
                  maxLength={200}
                  required
                />
                <p className="mt-1.5 text-xs text-white/50">
                  {subject.length}/200 characters
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Message *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide detailed information about your request..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  rows={8}
                  maxLength={2000}
                  required
                />
                <p className="mt-1.5 text-xs text-white/50">
                  {message.length}/2000 characters
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300">
                  <CheckCircle size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-base font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Ticket
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* My Tickets List */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {loadingTickets ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                <Loader size={32} className="animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-white/60">Loading your tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                <MessageSquare size={48} className="text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Tickets Yet</h3>
                <p className="text-white/60 mb-6">You haven't submitted any tickets yet</p>
                <Button onClick={() => setActiveTab('new')}>
                  <Send size={18} />
                  Create Your First Ticket
                </Button>
              </div>
            ) : (
              <>
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => viewTicket(ticket._id)}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
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
                        <h3 className="text-lg font-semibold text-white mb-1 truncate">{ticket.subject}</h3>
                        <p className="text-sm text-white/60 line-clamp-2">{ticket.message}</p>
                      </div>
                      <button className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">
                        <Eye size={18} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.adminRemarks.length > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-400">
                          <MessageSquare size={14} />
                          {ticket.adminRemarks.length} admin {ticket.adminRemarks.length === 1 ? 'remark' : 'remarks'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Ticket Detail Modal */}
        {selectedTicket && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="bg-slate-900 border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-white/10 p-6 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
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
                  <h2 className="text-2xl font-bold text-white">{selectedTicket.subject}</h2>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Original Message */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-2">Your Message</h3>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-white/80 whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                  {selectedTicket.reportedUserEmail && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
                      <UserIcon size={16} />
                      <span>Reported user: <span className="text-white/80 font-medium">{selectedTicket.reportedUserEmail}</span></span>
                    </div>
                  )}
                </div>

                {/* Admin Remarks */}
                {selectedTicket.adminRemarks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/60 mb-3">Admin Remarks</h3>
                    <div className="space-y-3">
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
                  </div>
                )}

                {/* Ticket Info */}
                <div className="pt-4 border-t border-white/10 text-xs text-white/50 space-y-1">
                  <p>Ticket ID: {selectedTicket._id}</p>
                  <p>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  <p>Last Updated: {new Date(selectedTicket.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
