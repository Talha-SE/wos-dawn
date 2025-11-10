import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, AlertCircle, Info, MessageSquare, Clock, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

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

const priorityColors = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400'
};

const typeIcons = {
  suspension: <AlertCircle size={20} className="text-red-400" />,
  warning: <AlertCircle size={20} className="text-yellow-400" />,
  info: <Info size={20} className="text-blue-400" />,
  room_transfer: <MessageSquare size={20} className="text-purple-400" />,
  account_action: <Clock size={20} className="text-orange-400" />
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const { data } = await api.get<{ count: number }>('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ notifications: Notification[] }>('/notifications', {
        params: { limit: 20 }
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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      const deleted = notifications.find(n => n._id === id);
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      nav(notification.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-white transition-all"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div>
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-white/60">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-white/60">
                <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-blue-500 rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={48} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 transition-all ${
                      notification.read 
                        ? 'bg-transparent hover:bg-white/5' 
                        : 'bg-blue-500/10 hover:bg-blue-500/20'
                    } ${notification.actionUrl ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {typeIcons[notification.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold text-sm ${
                            notification.read ? 'text-white/80' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          <button
                            onClick={(e) => deleteNotification(notification._id, e)}
                            className="flex-shrink-0 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className={`text-xs mb-2 ${
                          notification.read ? 'text-white/50' : 'text-white/70'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/40">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <Check size={12} />
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-white/5 text-center">
              <button
                onClick={() => {
                  nav('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
