import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ProfilePage from './ProfilePage'
import PrivateRedeem from './PrivateRedeem'
import AllianceRedeem from './AllianceRedeem'
import Svs from './Svs'
import ChatAi from './ChatAi'
import AllianceChatWindow from './AllianceChatWindow'
import ContactAdmin from './ContactAdmin'
import Notifications from './Notifications'
import NotificationBell from '../components/NotificationBell'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import TranslateSwitcher from '../components/TranslateSwitcher'
import logo from '../assets/wos-dawn.png'
import { Menu, LogOut, MessageSquare } from 'lucide-react'

//

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showDiscordModal, setShowDiscordModal] = useState(false)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const headerRef = useRef<HTMLElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(72)
  const [isMd, setIsMd] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
  function getTitle(p: string) {
    if (p.includes('/profile')) return 'Profile'
    if (p.includes('/redeem/private')) return 'Private Redeem'
    if (p.includes('/redeem/alliance')) return 'Alliance Redeem'
    if (p.includes('/svs')) return 'SVS'
    if (p.includes('/chat-ai')) return 'Chat AI'
    if (p.includes('/alliance-chat')) return 'Alliance Chat Window'
    if (p.includes('/contact-admin')) return 'Contact Admin'
    if (p.includes('/notifications')) return 'Notifications'
    return 'Dashboard'
  }
  const title = getTitle(location.pathname)
  const sidebarWidth = collapsed ? 80 : 256
  const headerStyle: React.CSSProperties = isMd ? {
    left: `${sidebarWidth}px`,
    width: `calc(100% - ${sidebarWidth}px)`
  } : {
    left: 0,
    width: '100%'
  }
  const headerPad = isMd ? 24 : 12
  const mainStyle: React.CSSProperties = {
    paddingTop: headerHeight + headerPad
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    const offset = headerHeight + headerPad
    document.documentElement.style.setProperty('--dashboard-header-offset', `${offset}px`)
    return () => {
      document.documentElement.style.removeProperty('--dashboard-header-offset')
    }
  }, [headerHeight, headerPad])

  useEffect(() => {
    const updateHeight = () => {
      if (!headerRef.current) return
      setHeaderHeight(headerRef.current.getBoundingClientRect().height)
    }
    updateHeight()
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      observer = new ResizeObserver(() => updateHeight())
      observer.observe(headerRef.current)
    }
    const onResize = () => {
      updateHeight()
      setIsMd(window.innerWidth >= 768)
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
    }
  }, [])

  function onLogout() { logout(); nav('/login') }

  //

  //

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="fixed top-0 right-0 z-[120] border-b border-white/10 bg-slate-900/95 backdrop-blur-xl transition-[left,width] duration-300"
        ref={headerRef}
        style={headerStyle}
      >
        {/* Mobile Header - Minimal 3 buttons */}
        <div className="md:hidden px-3 py-2 flex items-center justify-between gap-2">
          <button
            type="button"
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white grid place-items-center transition-all active:scale-95"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <TranslateSwitcher />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex mx-auto max-w-7xl px-8 py-4 items-center gap-3 justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <img src={logo} alt="WOS Dawn" className="h-12 w-12 rounded-2xl object-cover shadow-xl" />
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-white/40">WOS Dawn</div>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display text-2xl text-white tracking-tight whitespace-nowrap truncate">{title}</h1>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/40">Command Center</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <NotificationBell />
            <TranslateSwitcher />
            {user?.email && <span>{user.email}</span>}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main
          className={`flex-1 ${location.pathname.includes('/alliance-chat') || location.pathname.includes('/chat-ai') || location.pathname.includes('/contact-admin') || location.pathname.includes('/notifications') ? '' : 'px-3 md:px-8'} pb-10 transition-all duration-300 ml-0 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}
          style={mainStyle}
        >
          <div className={location.pathname.includes('/alliance-chat') || location.pathname.includes('/chat-ai') || location.pathname.includes('/contact-admin') || location.pathname.includes('/notifications') ? '' : 'space-y-6 animate-fadeUp'} style={{ animationDelay: '0.08s' }}>
            <Routes>
              <Route path="/" element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="redeem" element={<Navigate to="redeem/private" replace />} />
              <Route path="redeem/private" element={<PrivateRedeem />} />
              <Route path="redeem/alliance" element={<AllianceRedeem />} />
              <Route path="svs" element={<Svs />} />
              <Route path="chat-ai" element={<ChatAi />} />
              <Route path="alliance-chat" element={<AllianceChatWindow />} />
              <Route path="alliance-chat/:code" element={<AllianceChatWindow />} />
              <Route path="contact-admin" element={<ContactAdmin />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="*" element={<Navigate to="profile" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {showDiscordModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            onClick={() => setShowDiscordModal(false)}
          />
          <div className="relative w-full max-w-md rounded-[2rem] bg-slate-800/95 backdrop-blur-sm shadow-[0_32px_80px_-20px_rgba(107,70,193,0.6)] p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 flex items-center justify-center shadow-[0_8px_30px_rgba(107,70,193,0.8)]">
                <MessageSquare size={24} className="text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Join the WOS Dawn Discord</h2>
                <p className="text-sm text-white/80 leading-relaxed">
                  Connect with other commanders, get quick updates, and share alliance strategies in our community server.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
              <a
                href="https://discord.gg/Q8J5sgWNb4"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-indigo-600 to-violet-500 hover:from-indigo-500 hover:to-violet-400 text-white text-sm font-semibold px-6 py-3 shadow-[0_12px_30px_rgba(107,70,193,0.8)] transition-all hover:shadow-[0_16px_40px_rgba(107,70,193,0.9)] hover:-translate-y-px active:scale-95"
              >
                Join Discord
              </a>
              <button
                type="button"
                onClick={() => {
                  setShowDiscordModal(false)
                  // Update localStorage to track when the modal was last shown
                  localStorage.setItem('discordModalLastShown', new Date().toISOString())
                }}
                className="text-sm text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
