import { useEffect, useRef, useState } from 'react'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [gameId, setGameId] = useState(user?.gameId || '')
  const [gameName, setGameName] = useState(user?.gameName || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  const nameTimer = useRef<number | null>(null)

  useEffect(() => { setEmail(user?.email || ''); setGameId(user?.gameId || ''); setGameName(user?.gameName || '') }, [user])

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!gameId?.trim()) {
      setSavedAt(null)
      return
    }
    timer.current = window.setTimeout(async () => {
      try {
        setSaving(true)
        const { data } = await api.put('/user/me/game', { gameId: gameId.trim() })
        setUser(data)
        setSavedAt(Date.now())
      } finally {
        setSaving(false)
      }
    }, 600)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [gameId])

  useEffect(() => {
    if (nameTimer.current) window.clearTimeout(nameTimer.current)
    if (!gameName?.trim()) {
      return
    }
    nameTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true)
        const { data } = await api.put('/user/me/game-name', { gameName: gameName.trim() })
        setUser(data)
        setSavedAt(Date.now())
      } finally {
        setSaving(false)
      }
    }, 600)
    return () => { if (nameTimer.current) window.clearTimeout(nameTimer.current) }
  }, [gameName])

  return (
    <div className="w-full max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-5">
      {/* Header Card */}
      <div className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-fadeUp">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">{user?.email?.[0].toUpperCase() || 'U'}</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Profile Settings</h1>
            <p className="text-sm text-white/60 mt-0.5">Manage your account and game identity</p>
          </div>
        </div>
      </div>

      {/* Game Profile Section */}
      <section className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.05s' }}>
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">Commander Identity</h2>
          <p className="text-sm text-white/60 mt-1">Your Whiteout Survival game profile</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/70 mb-2 block">Game ID</label>
              <Input 
                value={gameId} 
                onChange={(e) => setGameId(e.target.value)} 
                placeholder="Enter your game ID" 
                className="font-mono bg-white/5 border-white/10 focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/70 mb-2 block">In-game Name</label>
              <Input 
                value={gameName} 
                onChange={(e) => setGameName(e.target.value)} 
                placeholder="Enter your name" 
                className="bg-white/5 border-white/10 focus:border-blue-500/50"
              />
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${saving ? 'bg-blue-400 animate-pulse' : savedAt ? 'bg-green-400' : 'bg-white/30'}`} />
              <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                {saving ? 'Syncing...' : savedAt ? 'Synced' : 'Status'}
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-white/50">Active ID</span>
                <span className="text-sm font-mono font-semibold text-white">{user?.gameId || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-white/50">Active Name</span>
                <span className="text-sm font-semibold text-white">{user?.gameName || 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account Details Section */}
      <section className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">Account Details</h2>
          <p className="text-sm text-white/60 mt-1">Manage your login credentials</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">Email Address</label>
            <Input value={user?.email || ''} disabled className="bg-white/5 border-white/10 opacity-60" />
          </div>
        </div>
      </section>
    </div>
  )
}

