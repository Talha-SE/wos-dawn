import { useEffect, useMemo, useState } from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import { Clock, ShieldCheck, User as UserIcon, MapPin, CalendarDays } from 'lucide-react'

type SlotItem = {
  _id: string
  state: string
  allianceName: string
  date: string
  slotIndex: number
  assignedGameId?: string
  assignedPlayerName?: string
}

function toDateUTCString(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function slotLabel(i: number) {
  const startMin = i * 30
  const endMin = startMin + 30
  const sh = String(Math.floor(startMin / 60)).padStart(2, '0')
  const sm = String(startMin % 60).padStart(2, '0')
  const eh = String(Math.floor(endMin / 60)).padStart(2, '0')
  const em = String(endMin % 60).padStart(2, '0')
  return `${sh}:${sm}–${eh}:${em} UTC`
}

export default function Svs() {
  const { user } = useAuth()
  const [stateName, setStateName] = useState('')
  const [allianceName, setAllianceName] = useState('')
  const [date, setDate] = useState(() => toDateUTCString(new Date()))
  const [gameId, setGameId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [reserving, setReserving] = useState<number | null>(null)
  const [items, setItems] = useState<SlotItem[]>([])
  const map = useMemo(() => new Map(items.map((i) => [i.slotIndex, i])), [items])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [durationInput, setDurationInput] = useState<string>('30')
  const [durationBySlot, setDurationBySlot] = useState<Record<number, number>>({})

  useEffect(() => {
    setGameId(user?.gameId || '')
    setPlayerName(user?.gameName || '')
  }, [user])

  async function load() {
    if (!stateName.trim()) return
    setLoading(true)
    try {
      const { data } = await api.get('/slots', { params: { state: stateName.trim(), date } })
      setItems(data?.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (stateName.trim()) load() }, [stateName, date])

  function requestReserve(i: number) {
    if (!stateName.trim() || !allianceName.trim()) return
    setPendingIndex(i)
    setConfirmOpen(true)
    setDurationInput('30')
  }

  async function reserve(i: number) {
    if (!stateName.trim() || !allianceName.trim()) return
    setReserving(i)
    try {
      await api.post('/slots', {
        state: stateName.trim(),
        allianceName: allianceName.trim(),
        date,
        slotIndex: i,
        assignedGameId: gameId.trim() || undefined,
        assignedPlayerName: playerName.trim() || undefined,
      })
      await load()
      const parsed = Math.max(30, Number(durationInput) || 30)
      setDurationBySlot((prev) => ({ ...prev, [i]: parsed }))
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to reserve'
      alert(msg)
    } finally {
      setReserving(null)
      setConfirmOpen(false)
      setPendingIndex(null)
    }
  }

  const slots = useMemo(() => Array.from({ length: 48 }, (_, i) => i), [])

  return (
    <div className="w-full">
      <div className="w-full max-w-none space-y-6">
        <section className="glass rounded-2xl px-4 py-6 md:px-8 border border-white/10 shadow-lg">
          <div className="mb-5">
            <div className="badge mb-3">SVS Scheduler</div>
            <h2 className="font-display text-xl md:text-2xl text-white tracking-tight">Assign alliance time slots</h2>
            <p className="subtext mt-2">All times are in UTC. Each slot is 30 minutes.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50 block">State</label>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                <MapPin size={16} className="text-primary/70" />
                <Input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Enter state number/name" className="bg-transparent border-none focus:ring-0 px-0" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50 block">Alliance</label>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                <ShieldCheck size={16} className="text-primary/70" />
                <Input value={allianceName} onChange={(e) => setAllianceName(e.target.value)} placeholder="Enter alliance name" className="bg-transparent border-none focus:ring-0 px-0" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-white/50 block">Date (UTC)</label>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                <Clock size={16} className="text-primary/70" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none focus:ring-0 px-0" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/50 block">Player Game ID</label>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                  <UserIcon size={16} className="text-primary/70" />
                  <Input value={gameId} onChange={(e) => setGameId(e.target.value)} placeholder="e.g. 1234567890" className="bg-transparent border-none focus:ring-0 px-0 font-mono" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/50 block">Player Name / Tag</label>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                  <UserIcon size={16} className="text-primary/70" />
                  <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Kitsuya" className="bg-transparent border-none focus:ring-0 px-0" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-between items-center text-white/60 text-sm">
            <div className="hidden sm:flex items-center gap-2">
              <Clock size={14} />
              <span>Slots auto-refresh on assignment.</span>
            </div>
            <Button onClick={load} disabled={!stateName.trim() || loading} className="px-5">{loading ? 'Refreshing…' : 'Load Slots'}</Button>
          </div>
        </section>

        <section className="glass rounded-2xl px-4 py-6 md:px-8 border border-white/10 shadow-lg">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg text-white">Slots for {stateName || '—'} on {date}</h3>
            {loading && <div className="flex items-center gap-2 text-white/60 text-sm"><Clock size={14} /> Loading…</div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {slots.map((i) => {
              const taken = map.get(i)
              return (
                <button
                  key={i}
                  disabled={!!taken || reserving === i || !stateName.trim() || !allianceName.trim()}
                  onClick={() => requestReserve(i)}
                  className={`group relative overflow-hidden rounded-[26px] border px-6 py-5 text-left transition-all duration-300 min-h-[120px] flex flex-col justify-between shadow-lg/20 backdrop-blur-sm ${taken ? 'cursor-not-allowed border-emerald-400/30 bg-gradient-to-br from-emerald-400/20 via-emerald-300/10 to-transparent' : 'border-white/12 bg-white/6 hover:border-primary/60 hover:bg-primary/10'} ${reserving === i ? 'opacity-60' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-2 text-xs text-white/60 font-medium">
                    <Clock size={12} />
                    <span>{slotLabel(i)}</span>
                  </div>
                  {taken ? (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-sm font-semibold text-emerald-300 truncate tracking-wide">{taken.assignedPlayerName || 'Reserved'}</div>
                      <div className="flex items-center justify-between text-[11px] text-white/60">
                        <span className="font-mono truncate">ID: {taken.assignedGameId || '—'}</span>
                        <span className="opacity-60">State {taken.state}</span>
                      </div>
                      <div className="text-[11px] text-white/70 truncate">{taken.allianceName}</div>
                      {durationBySlot[i] && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                          <CalendarDays size={12} className="opacity-80" />
                          <span>Duration: {durationBySlot[i]} days</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white/85 tracking-wide">Available</span>
                      <ShieldCheck size={18} className="text-white/35 group-hover:text-primary/80 transition-colors" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
        {confirmOpen && pendingIndex !== null && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
            <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
              <div className="flex items-center gap-3 mb-2 text-white">
                <ShieldCheck size={18} className="text-primary" />
                <h4 className="font-display text-lg">Confirm Reservation</h4>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Reserve <span className="font-semibold text-white">{slotLabel(pendingIndex)}</span> for
                <span className="font-semibold text-white"> {allianceName || '—'}</span> in
                <span className="font-semibold text-white"> state {stateName || '—'}</span>?
              </p>
              <div className="mt-4 space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/50 block">Duration (days, min 30)</label>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 flex items-center gap-2 focus-within:border-primary/50 focus-within:bg-white/10 transition-colors">
                  <CalendarDays size={16} className="text-primary/70" />
                  <Input type="number" min={30} value={durationInput} onChange={(e) => setDurationInput(e.target.value)} placeholder="30" className="bg-transparent border-none focus:ring-0 px-0 w-full" />
                </div>
                {Number(durationInput) < 30 && (
                  <div className="text-[11px] text-red-300">Minimum duration is 30 days.</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { setConfirmOpen(false); setPendingIndex(null) }}
                  className="h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => { if (pendingIndex !== null) reserve(pendingIndex) }}
                  disabled={reserving !== null || !(Number(durationInput) >= 30)}
                  className="h-11 rounded-xl"
                >
                  {reserving !== null ? 'Reserving…' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
