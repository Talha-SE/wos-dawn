import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [displayName, setDisplayName] = useState('')
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
    <div className="w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="glass rounded-2xl px-6 py-6 md:px-8 border border-white/10 shadow-lg">
          <div className="card-header">
            <div>
              <div className="badge mb-3">Account</div>
              <h1 className="font-display text-2xl md:text-3xl text-white tracking-tight">Profile settings</h1>
              <p className="subtext mt-2">Manage your account and in-game identity.</p>
            </div>
          </div>
        </div>

        <section className="glass rounded-2xl px-6 py-6 md:px-8 border border-white/10 shadow-lg animate-fadeUp">
          <div className="flex flex-col gap-8">
            <div>
              <div className="badge mb-3">User Profile</div>
              <h2 className="font-display text-xl md:text-2xl text-white tracking-tight">Account details</h2>
              <p className="subtext mt-2">Manage your sign-in identity.</p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Email</label>
                  <Input value={user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Name</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your name" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="badge mb-3">Account Security</div>
              <h2 className="font-display text-xl md:text-2xl text-white tracking-tight">Password & email</h2>
              <p className="subtext mt-2">Update credentials to keep your account secure.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">New Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter new email" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">New Password</label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">Confirm Password</label>
                    <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" disabled>Cancel</Button>
              <Button disabled>Save changes</Button>
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl px-6 py-6 md:px-8 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.08s' }}>
          <div className="mb-5">
            <div className="badge mb-3">Game Profile</div>
            <h2 className="font-display text-xl md:text-2xl text-white tracking-tight">Commander Identity</h2>
            <p className="subtext mt-2">Enter or update your Whiteout Survival in-game details.</p>
          </div>
          <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 items-end">
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">Game ID</label>
                <Input value={gameId} onChange={(e) => setGameId(e.target.value)} placeholder="Enter your game ID" className="font-mono" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">In-game Name</label>
                <Input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Enter your in-game name/tag" />
              </div>
            </div>
            <div className="glass-soft rounded-2xl p-5 border border-white/10 space-y-3">
              <h3 className="text-sm text-white/60 uppercase tracking-wide">Sync state</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Status</span>
                <span className={`text-sm font-medium ${saving ? 'text-primary' : savedAt ? 'text-emerald-300' : 'text-white/60'}`}>{saving ? 'Saving…' : savedAt ? 'Saved' : 'Idle'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Active ID</span>
                <span className="text-base font-semibold text-white/90">{user?.gameId || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Active Name</span>
                <span className="text-base font-semibold text-white/90">{user?.gameName || 'Not set'}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

