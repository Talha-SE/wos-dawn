import { useEffect, useRef, useState } from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import { useAuth } from '../state/AuthContext'
import api from '../services/api'

export default function AllianceRedeem() {
  const { user, setUser } = useAuth()
  const [gameId, setGameId] = useState(user?.gameId || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => { setGameId(user?.gameId || '') }, [user?.gameId])

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    const trimmed = gameId.trim()
    if (!trimmed) { setSavedAt(null); return }
    timer.current = window.setTimeout(async () => {
      try {
        setSaving(true)
        const { data } = await api.put('/user/me/game', { gameId: trimmed })
        setUser(data)
        setSavedAt(Date.now())
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [gameId])

  return (
    <div className="relative">
      <div className="absolute inset-0 z-30 flex items-center justify-center px-4">
        <div className="px-6 py-5 rounded-3xl border border-white/20 bg-slate-950/85 backdrop-blur-2xl shadow-2xl text-center text-white max-w-xl">
          <div className="text-xs uppercase tracking-[0.45em] text-primary mb-3">Coming Soon</div>
          <h2 className="font-display text-xl md:text-2xl">Alliance Redeem is being crafted</h2>
          <p className="text-white/60 text-sm mt-3">We’re building tools to redeem alliance rewards in one seamless experience. Stay tuned.</p>
        </div>
      </div>

      <div className="space-y-4 blur-sm pointer-events-none select-none">
        <div className="glass rounded-2xl px-4 md:px-6 py-4 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">Game ID</label>
            <Input
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="Enter 9-digit game ID"
              className="font-mono"
              maxLength={9}
            />
            <div className="flex items-center gap-3 mt-2 text-xs text-white/60">
              <span>Status:</span>
              <span className={`${saving ? 'text-primary' : savedAt ? 'text-emerald-300' : 'text-white/60'}`}>{saving ? 'Saving…' : savedAt ? 'Saved' : 'Idle'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" disabled>Coming soon</Button>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-lg p-6 text-white/70">
          Alliance redeem workflow will appear here. Provide the target page or steps you'd like embedded or automated, and I'll wire it in.
        </div>
      </div>
    </div>
  )
}
