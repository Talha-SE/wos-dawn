import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Gift, User, Menu, Shield, MessageSquare, ChevronDown } from 'lucide-react'
import api from '../services/api'
import logo from '../assets/wos-dawn.png'

type JoinedRoom = { code: string; name: string; state: number }

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { pathname } = useLocation()
  const [openRedeem, setOpenRedeem] = useState(true)
  const [openJoined, setOpenJoined] = useState(true)
  const [rooms, setRooms] = useState<JoinedRoom[]>([])

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data } = await api.get<JoinedRoom[]>('/alliance/my-rooms')
        if (alive) setRooms(data || [])
      } catch { /* noop */ }
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { alive = false; window.removeEventListener('focus', onFocus) }
  }, [])
  return (
    <aside className={`fixed left-0 top-0 bottom-0 z-40 md:z-20 bg-slate-900/95 border-r border-white/10 transition-all duration-300 w-64 ${collapsed ? 'md:w-20' : 'md:w-64'} transform md:transform-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="h-full flex flex-col px-4 py-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <img src={logo} alt="WOS Dawn" className="h-10 w-10 rounded-2xl object-cover shadow-lg" />
              <div>
                <div className="font-display text-base tracking-tight text-white">WOS Dawn</div>
                <div className="text-[10px] uppercase tracking-wider text-white">Console</div>
              </div>
            </div>
          )}
          <button
            onClick={() => { if (onMobileClose) onMobileClose(); else onToggle() }}
            className={`${collapsed ? 'mx-auto' : ''} h-9 w-9 rounded-lg border border-white/10 bg-white/5 text-white transition hover:border-primary/40 hover:bg-white/10 grid place-items-center`}
            aria-label="Toggle sidebar"
          >
            <Menu size={16} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto ${collapsed ? 'flex flex-col items-center gap-2' : 'flex flex-col gap-1'} scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent`}>
          {!collapsed && <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-white font-medium">Main</div>}
          <NavItem
            to="/dashboard/profile"
            active={pathname.includes('/profile')}
            icon={<User size={18} />}
            collapsed={collapsed}
            label="Profile"
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
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2 mt-3 text-[10px] uppercase tracking-wider text-white font-medium">Redeem</div>
              <button
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg ${pathname.includes('/redeem') ? 'bg-white/10 text-white' : 'text-white hover:bg-white/5'} justify-between text-white`}
                onClick={() => setOpenRedeem((v) => !v)}
                aria-expanded={openRedeem}
              >
                <span className="flex items-center gap-3">
                  <span className="grid place-items-center"><Gift size={18} /></span>
                  <span className="text-white">Redeem Gift</span>
                </span>
                <span className={`transition-transform ${openRedeem ? 'rotate-180' : ''}`}><ChevronDown size={16} /></span>
              </button>
              {openRedeem && (
                <div className="pl-6 flex flex-col gap-1 text-white">
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

          {!collapsed && <div className="px-3 py-2 mt-3 text-[10px] uppercase tracking-wider text-white font-medium">Utilities</div>}
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
            label="Chat AI"
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
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2 mt-3 text-[10px] uppercase tracking-wider text-white font-medium">Alliance</div>
              <NavItem
                to="/dashboard/alliance-chat"
                active={pathname === '/dashboard/alliance-chat'}
                icon={<MessageSquare size={18} />}
                collapsed={false}
                label="Alliance Chat"
                onNavigate={onMobileClose}
              />
              <button
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg ${pathname.startsWith('/dashboard/alliance-chat/') ? 'bg-white/10 text-white' : 'text-white hover:bg-white/5'} justify-between text-white`}
                onClick={() => setOpenJoined((v) => !v)}
                aria-expanded={openJoined}
              >
                <span className="flex items-center gap-3">
                  <span className="grid place-items-center"><MessageSquare size={18} /></span>
                  <span className="text-white">Joined Rooms</span>
                </span>
                <span className={`transition-transform ${openJoined ? 'rotate-180' : ''}`}><ChevronDown size={16} /></span>
              </button>
              {openJoined && (
                <div className="pl-6 flex flex-col gap-1 text-white">
                  {rooms.length === 0 && (
                    <div className="px-3 py-2 text-sm text-white/60">No rooms yet</div>
                  )}
                  {rooms.map((r) => (
                    <NavItem
                      key={r.code}
                      to={`/dashboard/alliance-chat/${r.code}`}
                      active={pathname === `/dashboard/alliance-chat/${r.code}`}
                      icon={<span className="w-3 h-3 rounded-full bg-white/40" />}
                      collapsed={false}
                      label={`${r.name} • ${r.state}`}
                      onNavigate={onMobileClose}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {!collapsed && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="rounded-lg bg-white/5 px-3 py-3">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold mb-1">Status</div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Auto redemption synced. Monitor profiles in real time.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function NavItem({ to, active, icon, label, collapsed, onNavigate }: { to: string; active: boolean; icon: React.ReactNode; label: string; collapsed: boolean; onNavigate?: () => void }) {
  if (collapsed) {
    return (
      <Link
        to={to}
        className={`grid place-items-center w-12 h-12 rounded-xl border border-white/10 ${active ? 'bg-white/15 text-white' : 'text-white hover:bg-white/10'}`}
        onClick={onNavigate}
        title={label}
      >
        {icon}
      </Link>
    )
  }
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg ${active ? 'bg-white/10 text-white' : 'text-white hover:bg-white/5'}`}
      onClick={onNavigate}
    >
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1.5 rounded-r-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
      <span className="grid place-items-center shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

