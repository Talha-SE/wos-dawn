import { useEffect, useMemo, useState } from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import { Clock, ShieldCheck, User as UserIcon, MapPin, CalendarDays, XCircle } from 'lucide-react'

type SlotItem = {
  _id: string
  state: string
  allianceName: string
  date: string
  slotIndex: number
  assignedGameId?: string
  assignedPlayerName?: string
  reservedBy?: string
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
  const [cancellingId, setCancellingId] = useState<string | null>(null)

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

  async function cancelReservation(id: string) {
    setCancellingId(id)
    try {
      await api.delete(`/slots/${id}`)
      await load()
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to cancel'
      alert(msg)
    } finally {
      setCancellingId(null)
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
    <div className="w-full max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-fadeUp">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">SVS Scheduler</h1>
            <p className="text-sm text-white/60 mt-0.5">Manage alliance time slots • All times in UTC</p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <section className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.05s' }}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Slot Configuration</h2>
          <p className="text-xs text-white/60 mt-1">Fill in details to view and reserve slots</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">State</label>
            <Input 
              value={stateName} 
              onChange={(e) => setStateName(e.target.value)} 
              placeholder="State number" 
              className="bg-white/5 border-white/10 focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">Alliance Name</label>
            <Input 
              value={allianceName} 
              onChange={(e) => setAllianceName(e.target.value)} 
              placeholder="Alliance name" 
              className="bg-white/5 border-white/10 focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">Date (UTC)</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-white/5 border-white/10 focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">Player Game ID</label>
            <Input 
              value={gameId} 
              onChange={(e) => setGameId(e.target.value)} 
              placeholder="Game ID" 
              className="bg-white/5 border-white/10 focus:border-blue-500/50 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/70 mb-2 block">Player Name</label>
            <Input 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)} 
              placeholder="Player name" 
              className="bg-white/5 border-white/10 focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-end">
            <Button 
              onClick={load} 
              disabled={!stateName.trim() || loading} 
              className="w-full"
            >
              {loading ? 'Loading...' : 'Load Slots'}
            </Button>
          </div>
        </div>
      </section>

      {/* Slots Grid Section */}
      <section className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Time Slots</h3>
            <p className="text-xs text-white/60 mt-0.5">{stateName || '—'} • {date}</p>
          </div>
          {loading && <div className="flex items-center gap-2 text-sm text-blue-400"><Clock size={14} className="animate-spin" /> Loading...</div>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {slots.map((i) => {
              const taken = map.get(i)
              if (taken) {
                return (
                  <div
                    key={i}
                    className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 min-h-[100px] flex flex-col justify-between cursor-default border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-emerald-500/5 ${reserving === i ? 'opacity-60' : 'opacity-100'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium">
                      <Clock size={10} />
                      <span>{slotLabel(i)}</span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      <div className="text-xs font-semibold text-emerald-300 truncate">{taken.assignedPlayerName || 'Reserved'}</div>
                      <div className="text-[10px] text-white/60 font-mono truncate">ID: {taken.assignedGameId || '—'}</div>
                      <div className="text-[10px] text-white/50 truncate">{taken.allianceName}</div>
                    </div>
                    {taken.reservedBy === user?.id && (
                      <button
                        onClick={() => cancelReservation(taken._id)}
                        disabled={cancellingId === taken._id}
                        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20 active:scale-95"
                        title="Cancel this reservation"
                      >
                        <XCircle size={14} className="text-red-300" />
                        {cancellingId === taken._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                )
              }
              return (
                <button
                  key={i}
                  disabled={reserving === i || !stateName.trim() || !allianceName.trim()}
                  onClick={() => requestReserve(i)}
                  className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 min-h-[100px] flex flex-col justify-between border-white/10 bg-white/5 hover:border-blue-500/40 hover:bg-white/10 active:scale-95 ${reserving === i ? 'opacity-60' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium">
                    <Clock size={10} />
                    <span>{slotLabel(i)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-white/70">Available</span>
                  </div>
                </button>
              )
            })}
          </div>
      </section>

      {/* Confirmation Modal */}
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
  )
}
