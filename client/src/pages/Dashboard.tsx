import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ProfilePage from './ProfilePage'
import PrivateRedeem from './PrivateRedeem'
import AllianceRedeem from './AllianceRedeem'
import Svs from './Svs'
import ChatAi from './ChatAi'
import AllianceChatWindow from './AllianceChatWindow'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import TranslateSwitcher from '../components/TranslateSwitcher'
import logo from '../assets/wos-dawn.png'

//

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const headerRef = useRef<HTMLElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(72)
  function getTitle(p: string) {
    if (p.includes('/profile')) return 'Profile'
    if (p.includes('/redeem/private')) return 'Private Redeem'
    if (p.includes('/redeem/alliance')) return 'Alliance Redeem'
    if (p.includes('/svs')) return 'SVS'
    if (p.includes('/chat-ai')) return 'Chat AI'
    if (p.includes('/alliance-chat')) return 'Alliance Chat Window'
    return 'Dashboard'
  }
  const title = getTitle(location.pathname)
  const sidebarWidth = collapsed ? 80 : 256
  const headerStyle: React.CSSProperties = {
    left: `${sidebarWidth}px`,
    width: `calc(100% - ${sidebarWidth}px)`
  }
  const mainStyle: React.CSSProperties = {
    paddingTop: headerHeight + 24
  }

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
    window.addEventListener('resize', updateHeight)
    return () => {
      window.removeEventListener('resize', updateHeight)
      observer?.disconnect()
    }
  }, [])

  function onLogout() { logout(); nav('/login') }

  //

  //

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="fixed top-0 right-0 z-40 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl transition-[left,width] duration-300"
        ref={headerRef}
        style={headerStyle}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <img src={logo} alt="WOS Dawn" className="h-12 w-12 rounded-2xl object-cover shadow-xl" />
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">WOS Dawn</div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg md:text-2xl text-white tracking-tight">{title}</h1>
                <span className="hidden md:inline-block rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/40">Command Center</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/70">
            <TranslateSwitcher />
            {user?.email && <span className="hidden sm:inline">{user.email}</span>}
            <button onClick={onLogout} className="button-ghost h-10 px-4">Logout</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <main
          className={`flex-1 px-4 md:px-8 pb-10 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}
          style={mainStyle}
        >
          <div className="space-y-6 animate-fadeUp" style={{ animationDelay: '0.08s' }}>
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
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}
