import { useEffect, useState } from 'react'
import Button from '../../components/Button'
import api from '../../services/api'

type ActivityLog = {
  _id: string
  type: 'user_register' | 'user_login' | 'room_create' | 'slot_reserve' | 'gift_redeem' | 'user_suspend' | 'room_suspend'
  userId?: string
  userEmail: string
  details: string
  metadata?: any
  timestamp: string
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const secret = localStorage.getItem('admin_secret') || ''

  async function load() {
    if (!secret) return
    setLoading(true)
    try {
      const { data } = await api.get<ActivityLog[]>('/admin/activity-logs', {
        headers: { 'x-admin-secret': secret },
        params: { type: filter !== 'all' ? filter : undefined }
      })
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, filter])

  const activityTypeColors: Record<string, string> = {
    user_register: 'bg-green-600/20 text-green-400 border-green-600/30',
    user_login: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    room_create: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
    slot_reserve: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
    gift_redeem: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
    user_suspend: 'bg-red-600/20 text-red-400 border-red-600/30',
    room_suspend: 'bg-red-600/20 text-red-400 border-red-600/30'
  }

  const activityTypeLabels: Record<string, string> = {
    user_register: 'User Registration',
    user_login: 'User Login',
    room_create: 'Room Created',
    slot_reserve: 'Slot Reserved',
    gift_redeem: 'Gift Redeemed',
    user_suspend: 'User Suspended',
    room_suspend: 'Room Suspended'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Activity Logs</h1>
        <Button onClick={load} disabled={loading || !secret}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>

      {!secret && <div className="text-white/60 text-sm">Set Admin Secret in Settings to view activity logs.</div>}

      {/* Filter Options */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Activity
          </Button>
          <Button
            variant={filter === 'user_register' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('user_register')}
          >
            Registrations
          </Button>
          <Button
            variant={filter === 'user_login' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('user_login')}
          >
            Logins
          </Button>
          <Button
            variant={filter === 'room_create' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('room_create')}
          >
            Rooms
          </Button>
          <Button
            variant={filter === 'slot_reserve' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('slot_reserve')}
          >
            Slots
          </Button>
          <Button
            variant={filter === 'gift_redeem' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('gift_redeem')}
          >
            Redemptions
          </Button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.07] transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-xs px-2 py-1 rounded border ${activityTypeColors[log.type] || 'bg-white/10 text-white/70'}`}>
                    {activityTypeLabels[log.type] || log.type}
                  </span>
                  <span className="text-sm text-white/60">{log.userEmail}</span>
                </div>
                <div className="text-sm text-white/80">{log.details}</div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-white/50">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: <span className="text-white/70">{String(value)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-white/50 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            {loading ? 'Loading activity logs…' : (secret ? 'No activity logs found' : 'Set Admin Secret in Settings')}
          </div>
        )}
      </div>

      {/* Export Options */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">
              Showing {logs.length} activities
            </span>
            <Button variant="secondary" size="sm" onClick={() => {
              const dataStr = JSON.stringify(logs, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `activity-logs-${new Date().toISOString()}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              Export JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
