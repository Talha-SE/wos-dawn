import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Gift, User, Menu, Shield, MessageSquare, ChevronDown, X, LogOut, Headphones } from 'lucide-react'
import api from '../services/api'
import logo from '../assets/wos-dawn.png'
import { useAuth } from '../state/AuthContext'
import notificationMp3 from '../assets/room-message-notification.mp3'
import { gentlyRequestNotificationPermission, showRoomNotification } from '../utils/notificationClient'

type JoinedRoom = { code: string; name: string; state: number }
type RoomSummary = { code: string; name: string; state: number; lastMessageAt: string | null }
type RoomMessagePreview = { content: string; senderName?: string; senderEmail: string; createdAt: string }

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const { token, refreshMe, logout } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSoundAtRef = useRef<number>(0)
  const fetchingPreviewRef = useRef<Record<string, boolean>>({})
  const previewCacheRef = useRef<Record<string, RoomMessagePreview | undefined>>({})
  const [openRedeem, setOpenRedeem] = useState(true)
  const [openJoined, setOpenJoined] = useState(true)
  const [rooms, setRooms] = useState<JoinedRoom[]>([])
  const [summaries, setSummaries] = useState<Record<string, string | null>>({})
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [roomsError, setRoomsError] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  function getLastSeen(code: string): number {
    try { return Number(localStorage.getItem(`wos_room_seen_${code}`) || 0) } catch { return 0 }
  }

  function markSeen(code: string) {
    try { localStorage.setItem(`wos_room_seen_${code}`, String(Date.now())) } catch {}
    window.dispatchEvent(new Event('alliance:rooms-refresh'))
  }

  function hasUnread(code: string): boolean {
    const last = summaries[code] ? new Date(String(summaries[code]!)).getTime() : 0
    const seen = getLastSeen(code)
    return last > 0 && last > seen
  }

  function getLastNotified(code: string): number {
    try { return Number(localStorage.getItem(`wos_room_notified_${code}`) || 0) } catch { return 0 }
  }

  function setLastNotified(code: string, ts: number) {
    try { localStorage.setItem(`wos_room_notified_${code}`, String(ts)) } catch {}
  }

  async function pollSummariesAndNotify() {
    if (!token) return
    try {
      const { data } = await api.get<RoomSummary[]>('/alliance/my-rooms/summary')
      const nextMap: Record<string, string | null> = {}
      ;(data || []).forEach((s) => { nextMap[s.code] = s.lastMessageAt ? String(s.lastMessageAt) : null })
      setSummaries(nextMap)
      // decide notifications
      const nowPath = pathname
      for (const s of (data || [])) {
        if (!s.lastMessageAt) continue
        const lastTs = new Date(s.lastMessageAt).getTime()
        const seenTs = getLastSeen(s.code)
        const notifiedTs = getLastNotified(s.code)
        const isCurrentRoom = nowPath === `/dashboard/alliance-chat/${s.code}`
        if (lastTs > 0 && lastTs > seenTs && lastTs > notifiedTs && !isCurrentRoom) {
          // throttle global sound
          const now = Date.now()
          if (now - lastSoundAtRef.current > 800) {
            lastSoundAtRef.current = now
            try {
              if (audioRef.current) {
                audioRef.current.currentTime = 0
                audioRef.current.volume = 0.8
                await audioRef.current.play().catch(() => undefined)
              }
            } catch {}
          }
          setLastNotified(s.code, lastTs)
          gentlyRequestNotificationPermission().catch(() => undefined)
          notifyRoomInBackground(s, lastTs)
        }
      }
    } catch {}
  }

  async function notifyRoomInBackground(room: RoomSummary, lastTimestamp: number) {
    const code = room.code
    if (fetchingPreviewRef.current[code]) return
    fetchingPreviewRef.current[code] = true
    try {
      let preview: RoomMessagePreview | undefined = previewCacheRef.current[code]
      const cachedTs = preview ? new Date(preview.createdAt).getTime() : 0
      if (!preview || cachedTs < lastTimestamp) {
        const { data } = await api.get<RoomMessagePreview[]>(`/alliance/rooms/${code}/messages`, { params: { limit: 1 } }).catch(() => ({ data: [] as RoomMessagePreview[] }))
        preview = data && data.length > 0 ? data[data.length - 1] : undefined
        if (preview) {
          previewCacheRef.current[code] = preview
        }
      }

      await showRoomNotification({
        roomCode: code,
        roomName: room.name,
        senderName: preview?.senderName || preview?.senderEmail,
        message: preview?.content,
        roomUrl: `/dashboard/alliance-chat/${code}`,
        timestamp: lastTimestamp
      })
    } finally {
      fetchingPreviewRef.current[code] = false
    }
  }

  function handleLogout() {
    logout()
    nav('/login')
  }

  const loadRooms = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    // bump sequence to ignore stale responses when multiple requests overlap
    const seq = ++fetchSeq.current

    if (!token) {
      setRooms([])
      setRoomsError(null)
      setLoadingRooms(false)
      return
    }

    if (!silent) setLoadingRooms(true)

    try {
      const [{ data: list }, { data: summary }] = await Promise.all([
        api.get<JoinedRoom[]>('/alliance/my-rooms'),
        api.get<RoomSummary[]>('/alliance/my-rooms/summary').catch(() => ({ data: [] as RoomSummary[] }))
      ])
      if (fetchSeq.current !== seq) return
      setRooms(list || [])
      const nextMap: Record<string, string | null> = {}
      ;(summary || []).forEach((s) => { nextMap[s.code] = s.lastMessageAt ? String(s.lastMessageAt) : null })
      setSummaries(nextMap)
      setRoomsError(null)
    } catch (err: any) {
      if (fetchSeq.current !== seq) return
      const status = err?.response?.status
      if (status && (status === 401 || status === 403)) {
        try {
          await refreshMe()
          const retry = await api.get<JoinedRoom[]>('/alliance/my-rooms')
          if (fetchSeq.current !== seq) return
          setRooms(retry.data || [])
          setRoomsError(null)
          return
        } catch (retryErr: any) {
          if (fetchSeq.current !== seq) return
          const retryStatus = retryErr?.response?.status
          if (retryStatus === 401) {
            setRooms([])
          }
        }
      }
      setRoomsError('Unable to load rooms')
    } finally {
      if (fetchSeq.current === seq && !silent) setLoadingRooms(false)
    }
  }, [token, refreshMe])

  useEffect(() => {
    if (!token) {
      setRooms([])
      setRoomsError(null)
      setLoadingRooms(false)
      return
    }

    loadRooms()
    const onFocus = () => loadRooms({ silent: true })
    window.addEventListener('focus', onFocus)
    // start lightweight polling for cross-room notifications
    const id = window.setInterval(() => { pollSummariesAndNotify() }, 10000)
    const onVis = () => { if (document.visibilityState === 'visible') { pollSummariesAndNotify() } }
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [token, loadRooms])

  useEffect(() => {
    const onRoomsRefresh = () => loadRooms({ silent: true })
    window.addEventListener('alliance:rooms-refresh', onRoomsRefresh)
    return () => window.removeEventListener('alliance:rooms-refresh', onRoomsRefresh)
  }, [loadRooms])

  return (
    <aside className={`fixed left-0 top-0 bottom-0 z-[160] md:z-20 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-white/10 shadow-2xl transition-all duration-300 ${collapsed ? 'md:w-20' : 'md:w-64'} w-64 transform md:transform-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="h-full flex flex-col overflow-hidden">
        <audio ref={audioRef} className="hidden" preload="auto" src={notificationMp3} />
        {/* Header */}
        <div className="flex-none px-4 py-5 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={logo} alt="WOS Dawn" className="h-11 w-11 rounded-xl object-cover shadow-lg ring-2 ring-blue-500/20" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
                </div>
                <div>
                  <div className="font-semibold text-base text-white">WOS Dawn</div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-blue-400/70 font-medium">Command Center</div>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="mx-auto relative">
                <img src={logo} alt="WOS Dawn" className="h-11 w-11 rounded-xl object-cover shadow-lg ring-2 ring-blue-500/20" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900" />
              </div>
            )}
            <button
              onClick={() => { if (mobileOpen && onMobileClose) onMobileClose(); else onToggle() }}
              className={`${collapsed ? 'hidden md:grid' : ''} h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 text-white/70 hover:text-white transition-all grid place-items-center active:scale-95`}
              aria-label="Toggle sidebar"
            >
              <Menu size={16} />
            </button>
            {/* Mobile close button */}
            {mobileOpen && (
              <button
                onClick={onMobileClose}
                className="md:hidden h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all grid place-items-center"
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20 px-3 py-4 ${collapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-1'}`}>
          {!collapsed && <div className="px-3 py-1.5 mb-1 text-[10px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Main</div>}
          <NavItem
            to="/dashboard/profile"
            active={pathname.includes('/profile')}
            icon={<User size={18} />}
            collapsed={collapsed}
            label="Profile"
            onNavigate={onMobileClose}
          />

          {collapsed ? (
            <>
              <NavItem
                to="/dashboard/alliance-chat"
                active={pathname === '/dashboard/alliance-chat'}
                icon={<MessageSquare size={18} />}
                collapsed={collapsed}
                label="Alliance Chat"
                onNavigate={onMobileClose}
              />
              <NavItem
                to="/dashboard/alliance-chat"
                active={pathname.startsWith('/dashboard/alliance-chat/')}
                icon={<MessageSquare size={18} />}
                collapsed={collapsed}
                label="Joined Rooms"
                onNavigate={onMobileClose}
              />
            </>
          ) : (
            <div className="flex flex-col gap-1 mt-4">
              <div className="px-3 py-1.5 mb-1 text-[10px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Alliance</div>
              <NavItem
                to="/dashboard/alliance-chat"
                active={pathname === '/dashboard/alliance-chat'}
                icon={<MessageSquare size={18} />}
                collapsed={false}
                label={
                  <span className="flex items-center gap-2">
                    <span>Alliance Chat</span>
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 text-[10px] leading-none animate-pulse">🔥 New</span>
                  </span>
                }
                onNavigate={onMobileClose}
              />
              <button
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${pathname.startsWith('/dashboard/alliance-chat/') ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-white border border-blue-500/20 shadow-lg shadow-blue-500/5' : 'text-white/80 hover:text-white hover:bg-white/5'} justify-between`}
                onClick={() => setOpenJoined((v) => !v)}
                aria-expanded={openJoined}
              >
                <span className="flex items-center gap-3">
                  <span className="grid place-items-center"><MessageSquare size={18} /></span>
                  <span className="font-medium">Joined Rooms</span>
                </span>
                <span className={`transition-transform duration-200 ${openJoined ? 'rotate-180' : ''}`}><ChevronDown size={14} /></span>
              </button>
              {openJoined && (
                <div className="pl-6 flex flex-col gap-0.5 mt-1 text-white">
                  {loadingRooms && rooms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-white/60 animate-pulse">Loading rooms…</div>
                  )}
                  {!loadingRooms && rooms.length === 0 && !roomsError && (
                    <div className="px-3 py-2 text-sm text-white/60">No rooms yet</div>
                  )}
                  {roomsError && (
                    <button
                      type="button"
                      onClick={() => loadRooms()}
                      className="px-3 py-2 text-sm text-rose-300/90 text-left hover:text-rose-200 transition"
                    >
                      {rooms.length === 0 ? 'Tap to retry loading rooms' : 'Reload rooms'}
                    </button>
                  )}
                  {rooms.map((r) => {
                    const unread = hasUnread(r.code)
                    return (
                      <NavItem
                        key={r.code}
                        to={`/dashboard/alliance-chat/${r.code}`}
                        active={pathname === `/dashboard/alliance-chat/${r.code}`}
                        icon={<span className="w-3 h-3 rounded-full bg-white/40" />}
                        collapsed={false}
                        title={`${r.name} • ${r.state}`}
                        label={
                          <span className="flex items-center justify-between w-full gap-2">
                            <span className="truncate">{`${r.name} • ${r.state}`}</span>
                            {unread && (
                              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-1.5 py-0.5 leading-none">
                                New
                              </span>
                            )}
                          </span>
                        }
                        onNavigate={() => { markSeen(r.code); if (onMobileClose) onMobileClose() }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {!collapsed && <div className="px-3 py-1.5 mt-4 mb-1 text-[10px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Utilities</div>}
          <NavItem
            to="/dashboard/svs"
            active={pathname.includes('/svs')}
            icon={<Shield size={18} />}
            collapsed={collapsed}
            label="SVS"
            onNavigate={onMobileClose}
          />
          <NavItem
            to="/dashboard/chat-ai"
            active={pathname.includes('/chat-ai')}
            icon={<MessageSquare size={18} />}
            collapsed={collapsed}
            label={
              <span className="flex items-center gap-2">
                <span>Chat AI</span>
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 text-[10px] leading-none animate-pulse">🔥 New</span>
              </span>
            }
            onNavigate={onMobileClose}
          />
          <NavItem
            to="/dashboard/contact-admin"
            active={pathname.includes('/contact-admin')}
            icon={<Headphones size={18} />}
            collapsed={collapsed}
            label={
              <span className="flex items-center gap-2">
                <span>Contact Admin</span>
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/30 to-pink-500/30 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 text-[10px] leading-none animate-pulse">🔥 New</span>
              </span>
            }
            onNavigate={onMobileClose}
          />
          
          {collapsed ? (
            <NavItem
              to="/dashboard/redeem/private"
              active={pathname.includes('/redeem')}
              icon={<Gift size={18} />}
              collapsed={collapsed}
              label="Redeem"
              onNavigate={onMobileClose}
            />
          ) : (
            <div className="flex flex-col gap-1 mt-4">
              <div className="px-3 py-1.5 mb-1 text-[10px] uppercase tracking-[0.15em] text-blue-400/60 font-semibold">Redeem</div>
              <button
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${pathname.includes('/redeem') ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-white border border-blue-500/20 shadow-lg shadow-blue-500/5' : 'text-white/80 hover:text-white hover:bg-white/5'} justify-between`}
                onClick={() => setOpenRedeem((v) => !v)}
                aria-expanded={openRedeem}
              >
                <span className="flex items-center gap-3">
                  <span className="grid place-items-center"><Gift size={18} /></span>
                  <span className="font-medium">Redeem Gift</span>
                </span>
                <span className={`transition-transform duration-200 ${openRedeem ? 'rotate-180' : ''}`}><ChevronDown size={14} /></span>
              </button>
              {openRedeem && (
                <div className="pl-6 flex flex-col gap-0.5 mt-1 text-white">
                  <NavItem
                    to="/dashboard/redeem/private"
                    active={pathname.includes('/redeem/private')}
                    icon={<span className="w-3 h-3 rounded-full bg-white/40" />}
                    collapsed={false}
                    label="Private Redeem"
                    onNavigate={onMobileClose}
                  />
                  <NavItem
                    to="/dashboard/redeem/alliance"
                    active={pathname.includes('/redeem/alliance')}
                    icon={<span className="w-3 h-3 rounded-full bg-white/40" />}
                    collapsed={false}
                    label="Alliance Redeem"
                    onNavigate={onMobileClose}
                  />
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Logout Button - Fixed at Bottom */}
        <div className="flex-none border-t border-white/10 p-3">
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 hover:from-red-500/30 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 transition-all grid place-items-center shadow-lg hover:shadow-red-500/20 active:scale-95"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 hover:from-red-500/30 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 transition-all shadow-lg hover:shadow-red-500/20 active:scale-95 font-medium"
              aria-label="Logout"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}

function NavItem({ to, active, icon, label, collapsed, onNavigate, title }: { to: string; active: boolean; icon: React.ReactNode; label: React.ReactNode; collapsed: boolean; onNavigate?: () => void; title?: string }) {
  if (collapsed) {
    return (
      <Link
        to={to}
        className={`grid place-items-center w-12 h-12 rounded-xl transition-all ${active ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/15 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10' : 'text-white/70 hover:text-white hover:bg-white/10 border border-white/10'}`}
        onClick={onNavigate}
        title={title || (typeof label === 'string' ? label : undefined)}
      >
        {icon}
      </Link>
    )
  }
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all overflow-hidden ${active ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-white' : 'text-white/80 hover:text-white hover:bg-white/5'}`}
      onClick={onNavigate}
    >
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full transition-all ${active ? 'bg-gradient-to-b from-blue-500 to-purple-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-transparent group-hover:bg-white/20'}`} />
      <span className="grid place-items-center shrink-0 relative z-10">{icon}</span>
      <span className="font-medium relative z-10">{label}</span>
    </Link>
  )
}

