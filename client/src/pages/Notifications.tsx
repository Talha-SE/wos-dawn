import { useState, useEffect } from 'react';
import { Bell, AlertCircle, Info, MessageSquare, Clock, Trash2, Check, CheckCheck } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

interface Notification {
  _id: string;
  type: 'suspension' | 'warning' | 'info' | 'room_transfer' | 'account_action';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
    name?: string;
  };
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

const typeColors = {
  suspension: 'bg-red-500/10 border-red-500/30 text-red-300',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  room_transfer: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  account_action: 'bg-orange-500/10 border-orange-500/30 text-orange-300'
};

const typeIcons = {
  suspension: <AlertCircle size={24} />,
  warning: <AlertCircle size={24} />,
  info: <Info size={24} />,
  room_transfer: <MessageSquare size={24} />,
  account_action: <Clock size={24} />
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const nav = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ notifications: Notification[] }>('/notifications', {
        params: { 
          unreadOnly: filter === 'unread' ? 'true' : 'false',
          limit: 100
        }
      });
      setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const deleteAllRead = async () => {
    if (!confirm('Delete all read notifications?')) return;
    try {
      await api.delete('/notifications/read/all');
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      console.error('Failed to delete notifications:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      nav(notification.actionUrl);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <Bell className="text-blue-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              <p className="text-white/60 text-sm mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'unread'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} className="px-4 py-2">
                <CheckCheck size={16} />
                Mark All Read
              </Button>
            )}
            {notifications.filter(n => n.read).length > 0 && (
              <button
                onClick={deleteAllRead}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 font-medium transition-all flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-white/60">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
            <Bell size={64} className="text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-white/60">
              {filter === 'unread' 
                ? 'You\'re all caught up! Check back later for updates.'
                : 'You don\'t have any notifications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white/5 backdrop-blur-sm border rounded-xl p-5 transition-all ${
                  notification.read
                    ? 'border-white/10 hover:bg-white/10'
                    : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 shadow-lg shadow-blue-500/5'
                } ${notification.actionUrl ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-xl border ${typeColors[notification.type]}`}>
                    {typeIcons[notification.type]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-1 ${
                          notification.read ? 'text-white/80' : 'text-white'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="p-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 transition-all"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification._id);
                          }}
                          className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`text-sm mb-3 ${
                      notification.read ? 'text-white/60' : 'text-white/80'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                      {notification.actionUrl && (
                        <span className="text-xs text-blue-400 font-medium">
                          Click to view →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
