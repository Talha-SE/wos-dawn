import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/Button'
import api from '../../services/api'
import { Users, MessageSquare, Calendar, Gift, TrendingUp, Activity, Database, Shield } from 'lucide-react'

type Stats = {
  users: { total: number; active: number; suspended: number }
  rooms: { total: number }
  slots: { total: number }
  giftCodes: { total: number; active: number }
}

type RecentUser = { email: string; createdAt: string }
type RecentRoom = { code: string; name: string; state: number }

export default function Overview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([])

  async function load() {
    setLoading(true)
    try {
      const [statsRes, usersRes, roomsRes] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<any[]>('/admin/users'),
        api.get<any[]>('/admin/rooms')
      ])
      
      setStats(statsRes.data)
      setRecentUsers((usersRes.data || []).slice(0, 5).map(u => ({ email: u.email, createdAt: u.createdAt })))
      setRecentRooms((roomsRes.data || []).slice(0, 5).map(r => ({ code: r.code, name: r.name, state: r.state })))
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const calculatePercentage = (value: number, total: number) => {
    if (!total) return 0
    return Math.round((value / total) * 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-white/60 text-sm mt-1">Welcome to WOS-DAWN Admin Panel</p>
        </div>
        <Button onClick={load} disabled={loading} variant="secondary">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Activity size={16} />
              Refresh
            </span>
          )}
        </Button>
      </div>

      {!stats && !loading && (
        <div className="rounded-2xl border border-yellow-600/30 bg-yellow-600/10 p-5 flex items-start gap-4">
          <Shield className="text-yellow-400 shrink-0" size={24} />
          <div>
            <h3 className="text-yellow-400 font-semibold mb-1">Unable to Load Data</h3>
            <p className="text-yellow-300/80 text-sm">
              There was an issue loading the dashboard data. Please check your connection and try again.
            </p>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Users Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-blue-700/5 to-transparent p-6 hover:border-blue-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="text-blue-400" size={24} />
              </div>
              <Link to="/admin/users" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="text-white/60 text-sm uppercase tracking-wide font-medium">Total Users</div>
            <div className="mt-2 text-4xl font-bold text-white tabular-nums">
              {loading ? '...' : stats?.users.total ?? '0'}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-medium">{stats?.users.active ?? 0}</span>
                <span className="text-white/50">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-medium">{stats?.users.suspended ?? 0}</span>
                <span className="text-white/50">Suspended</span>
              </div>
            </div>
            {stats?.users.total ? (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/50">Active Rate</span>
                  <span className="text-white/70 font-medium">
                    {calculatePercentage(stats.users.active, stats.users.total)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${calculatePercentage(stats.users.active, stats.users.total)}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Alliance Rooms Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-600/10 via-purple-700/5 to-transparent p-6 hover:border-purple-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <MessageSquare className="text-purple-400" size={24} />
              </div>
              <Link to="/admin/rooms" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Manage →
              </Link>
            </div>
            <div className="text-white/60 text-sm uppercase tracking-wide font-medium">Alliance Rooms</div>
            <div className="mt-2 text-4xl font-bold text-white tabular-nums">
              {loading ? '...' : stats?.rooms.total ?? '0'}
            </div>
            <div className="mt-4 text-xs text-white/50">
              Active chat rooms for alliance coordination
            </div>
          </div>
        </div>

        {/* SVS Slots Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-600/10 via-orange-700/5 to-transparent p-6 hover:border-orange-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Calendar className="text-orange-400" size={24} />
              </div>
              <Link to="/admin/slots" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="text-white/60 text-sm uppercase tracking-wide font-medium">SVS Reservations</div>
            <div className="mt-2 text-4xl font-bold text-white tabular-nums">
              {loading ? '...' : stats?.slots.total ?? '0'}
            </div>
            <div className="mt-4 text-xs text-white/50">
              State vs State battle slot registrations
            </div>
          </div>
        </div>

        {/* Gift Codes Card */}
        <div className="group relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-600/10 via-green-700/5 to-transparent p-6 hover:border-green-500/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Gift className="text-green-400" size={24} />
              </div>
              <Link to="/admin/gift-codes" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                Manage →
              </Link>
            </div>
            <div className="text-white/60 text-sm uppercase tracking-wide font-medium">Gift Codes</div>
            <div className="mt-2 text-4xl font-bold text-white tabular-nums">
              {loading ? '...' : stats?.giftCodes.total ?? '0'}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-medium">{stats?.giftCodes.active ?? 0}</span>
                <span className="text-white/50">Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-white/40" />
                <span className="text-white/60 font-medium">
                  {(stats?.giftCodes.total ?? 0) - (stats?.giftCodes.active ?? 0)}
                </span>
                <span className="text-white/50">Inactive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Users */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-400" />
              Recent Users
            </h3>
            <Link to="/admin/users" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View all
            </Link>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-2">
              {recentUsers.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-blue-400 text-xs font-bold">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{user.email}</div>
                      <div className="text-white/50 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">New</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50 text-sm">
              {loading ? 'Loading...' : 'No users registered yet'}
            </div>
          )}
        </div>

        {/* Recent Rooms */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-purple-400" />
              Recent Alliance Rooms
            </h3>
            <Link to="/admin/rooms" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View all
            </Link>
          </div>
          {recentRooms.length > 0 ? (
            <div className="space-y-2">
              {recentRooms.map((room, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{room.name}</div>
                    <div className="text-white/50 text-xs font-mono">{room.code}</div>
                  </div>
                  <div className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded shrink-0">
                    State {room.state}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/50 text-sm">
              {loading ? 'Loading...' : 'No alliance rooms created yet'}
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Database size={20} className="text-cyan-400" />
          System Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <div className="text-white/50 text-xs">Database</div>
              <div className="text-white text-sm font-medium">Connected</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <div className="text-white/50 text-xs">API Server</div>
              <div className="text-white text-sm font-medium">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <div className="text-white/50 text-xs">Authentication</div>
              <div className="text-white text-sm font-medium">Active</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <div>
              <div className="text-white/50 text-xs">Admin Panel</div>
              <div className="text-white text-sm font-medium">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
