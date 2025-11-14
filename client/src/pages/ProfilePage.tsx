import { useEffect, useRef, useState } from 'react'
import { Clock, Gamepad2, Mail, Radio, RefreshCcw, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [gameId, setGameId] = useState(user?.gameId || '')
  const [gameName, setGameName] = useState(user?.gameName || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [copiedField, setCopiedField] = useState<'gameId' | 'gameName' | 'email' | null>(null)
  const timer = useRef<number | null>(null)
  const nameTimer = useRef<number | null>(null)

  useEffect(() => {
    setGameId(user?.gameId || '')
    setGameName(user?.gameName || '')
  }, [user?.gameId, user?.gameName])

  useEffect(() => {
    if (!copiedField) return
    const id = window.setTimeout(() => setCopiedField(null), 1600)
    return () => window.clearTimeout(id)
  }, [copiedField])

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
    }, 500)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [gameId, setUser])

  useEffect(() => {
    if (nameTimer.current) window.clearTimeout(nameTimer.current)
    if (!gameName?.trim()) return
    nameTimer.current = window.setTimeout(async () => {
      try {
        setSaving(true)
        const { data } = await api.put('/user/me/game-name', { gameName: gameName.trim() })
        setUser(data)
        setSavedAt(Date.now())
      } finally {
        setSaving(false)
      }
    }, 500)
    return () => { if (nameTimer.current) window.clearTimeout(nameTimer.current) }
  }, [gameName, setUser])

  const initials = (user?.gameName || user?.email || 'Commander').slice(0, 2).toUpperCase()
  const syncState = saving ? 'Syncing' : savedAt ? 'Up to date' : 'Awaiting sync'
  const syncTone = saving ? 'bg-blue-500/15 text-blue-200 border-blue-500/30' : savedAt ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' : 'bg-white/10 text-white/70 border-white/15'

  const timelineItems = [
    savedAt
      ? {
          icon: RefreshCcw,
          title: 'Profile synced',
          meta: formatRelativeTime(savedAt),
          description: `Game identity updated ${formatExactTime(savedAt)}`
        }
      : null,
    {
      icon: ShieldCheck,
      title: 'Security scan',
      meta: 'All clear',
      description: 'No credential issues detected in the last review.'
    },
    {
      icon: Clock,
      title: 'Next suggested review',
      meta: 'In 30 days',
      description: 'Keep your commander identity current for smoother alliance ops.'
    }
  ].filter(Boolean) as { icon: any; title: string; meta: string; description: string }[]

  async function copyValue(value: string | undefined | null, field: typeof copiedField) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
    } catch (err) {
      console.error('Clipboard copy failed', err)
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-[110px]" />
        <div className="absolute -bottom-16 -left-10 h-80 w-80 rounded-full bg-purple-500/20 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-10 space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-950/85 shadow-[0_40px_80px_-50px_rgba(59,130,246,0.55)] animate-fadeUp">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_60%)] opacity-80" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 md:p-8">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-gradient-to-br from-blue-500 via-primary to-purple-600 shadow-[0_20px_45px_rgba(59,130,246,0.45)] grid place-items-center text-3xl font-semibold">
                {initials}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{user?.gameName || 'Commander'}</h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-white/60 border border-white/10">
                    <Sparkles size={12} /> Elite Member
                  </span>
                </div>
                <p className="text-sm md:text-base text-white/60">
                  {user?.email || 'No email registered'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    <Radio size={12} className="text-emerald-300" /> {syncState}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    <Gamepad2 size={12} /> Game ID {user?.gameId ? 'linked' : 'pending'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full lg:w-auto">
              <ProfileStat icon={Gamepad2} label="Game ID" value={user?.gameId || 'Not set'} onCopy={() => copyValue(user?.gameId, 'gameId')} copied={copiedField === 'gameId'} />
              <ProfileStat icon={UserIcon} label="In-game name" value={user?.gameName || 'Not set'} onCopy={() => copyValue(user?.gameName, 'gameName')} copied={copiedField === 'gameName'} />
              <ProfileStat icon={Mail} label="Email" value={user?.email || '—'} onCopy={() => copyValue(user?.email, 'email')} copied={copiedField === 'email'} />
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                  <ShieldCheck size={14} className="text-emerald-300" /> Status
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{syncState}</p>
                <p className="text-[11px] text-white/50 mt-1">{savedAt ? `Updated ${formatRelativeTime(savedAt)}` : 'Waiting for your first sync'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-950/60 backdrop-blur-xl shadow-[0_30px_60px_-40px_rgba(59,130,246,0.45)] animate-fadeUp" style={{ animationDelay: '0.05s' }}>
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white">Commander Identity</h2>
                <p className="text-sm text-white/60 mt-1">Link your Whiteout Survival presence for alliance automations.</p>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${syncTone}`}>
                <Radio size={12} /> {syncState}
              </span>
            </header>
            <div className="px-6 py-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/60">Game ID</label>
                  <Input
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    placeholder="Enter your commander ID"
                    className="font-mono bg-white/5 border-white/10 focus:border-primary/60 focus:ring-primary/30"
                  />
                  <div className="flex items-center justify-between text-[11px] text-white/45">
                    <span>Auto-saves after a short pause</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-white/60 hover:text-white hover:border-primary/50 transition"
                      onClick={() => copyValue(gameId, 'gameId')}
                    >
                      {copiedField === 'gameId' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/60">In-game name</label>
                  <Input
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="How should teammates find you?"
                    className="bg-white/5 border-white/10 focus:border-primary/60 focus:ring-primary/30"
                  />
                  <div className="flex items-center justify-between text-[11px] text-white/45">
                    <span>Displayed across alliance features</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-white/60 hover:text-white hover:border-primary/50 transition"
                      onClick={() => copyValue(gameName, 'gameName')}
                    >
                      {copiedField === 'gameName' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

type ProfileStatProps = {
  icon: any
  label: string
  value: string
  onCopy?: () => void
  copied?: boolean
}

function ProfileStat({ icon: Icon, label, value, onCopy, copied }: ProfileStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">
        <Icon size={14} /> {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white truncate" title={value}>{value}</p>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:text-white hover:border-primary/40 transition"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  )
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const seconds = Math.round(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.round(days / 7)
  return `${weeks}w ago`
}

function formatExactTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  })
}

