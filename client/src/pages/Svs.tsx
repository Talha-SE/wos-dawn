import { useEffect, useMemo, useState } from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import { BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, Clock, ShieldCheck, Sparkles, User as UserIcon, X } from 'lucide-react'

type SlotItem = {
  _id: string
  state: string
  allianceName: string
  date: string
  slotIndex: number
  assignedGameId?: string
  assignedPlayerName?: string
  reservedBy: string
}

type TutorialSlide = {
  title: string
  headline: string
  bullets: string[]
  accent: string
}

const tutorialSlides: TutorialSlide[] = [
  {
    title: 'Set your battlefield basics',
    headline: 'Start with your state + alliance',
    bullets: [
      'Enter the state number and alliance name so we can pull the right SVS board.',
      'Pick the UTC date you want to schedule—slots refresh instantly for that day.',
      'Add your game ID and player name for auto-filled reservations later.'
    ],
    accent: 'Prepare'
  },
  {
    title: 'Preview the open timeline',
    headline: 'Load the grid of 30-minute slots',
    bullets: [
      'Tap “Load Slots” and review availability in a color-coded layout.',
      'Each tile shows the exact UTC window so your team stays aligned.',
      'Check the alliance label to confirm who already holds a spot.'
    ],
    accent: 'Explore'
  },
  {
    title: 'Claim your window',
    headline: 'Reserve a slot in two taps',
    bullets: [
      'Choose an “Available” tile to open the confirmation card.',
      'Confirm the alliance details and optional duration before submitting.',
      'Your reserved slot is highlighted and tagged as “Your Slot”.'
    ],
    accent: 'Reserve'
  },
  {
    title: 'Stay in control afterwards',
    headline: 'Cancel or adjust when plans change',
    bullets: [
      'Use “Cancel My Reservation” or the X icon on your tile to free the slot.',
      'The activity panel shows your latest actions and sync status.',
      'Update your commander profile for auto-filled IDs in future bookings.'
    ],
    accent: 'Refine'
  }
]

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
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialIndex, setTutorialIndex] = useState(0)

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

  async function cancelReservation() {
    if (!stateName.trim()) return
    console.log('Cancelling reservation with state:', stateName, 'date:', date)
    setCancelling(true)
    try {
      await api.delete('/slots', {
        params: { state: stateName.trim(), date }
      })
      console.log('Reservation cancelled successfully')
      await load()
      alert('Slot reservation cancelled successfully')
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to cancel reservation'
      console.error('Failed to cancel reservation:', e)
      alert(msg)
    } finally {
      setCancelling(false)
      setCancelConfirmOpen(false)
    }
  }

  const slots = useMemo(() => Array.from({ length: 48 }, (_, i) => i), [])
  const userReservation = useMemo(() => {
    const userId = user?.id || (user as any)?._id
    return userId ? items.find(item => item.reservedBy === String(userId)) : undefined
  }, [items, user])

  useEffect(() => {
    console.log('Modal state changed:', {
      cancelConfirmOpen,
      userReservation,
      shouldShowModal: cancelConfirmOpen && !!userReservation
    })
  }, [cancelConfirmOpen, userReservation])

  useEffect(() => {
    if (!showTutorial) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowTutorial(false)
        setTutorialIndex(0)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setTutorialIndex((idx) => Math.min(idx + 1, tutorialSlides.length - 1))
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setTutorialIndex((idx) => Math.max(idx - 1, 0))
      }
    }
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [showTutorial])

  const currentTutorial = tutorialSlides[tutorialIndex]

  function openTutorial() {
    setTutorialIndex(0)
    setShowTutorial(true)
  }

  function closeTutorial() {
    setShowTutorial(false)
    setTutorialIndex(0)
  }

  function goNextTutorial() {
    setTutorialIndex((idx) => (idx < tutorialSlides.length - 1 ? idx + 1 : idx))
  }

  function goPrevTutorial() {
    setTutorialIndex((idx) => Math.max(idx - 1, 0))
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 animate-fadeUp">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">SVS Scheduler</h1>
              <p className="text-sm text-white/60 mt-0.5">Manage alliance time slots • All times in UTC</p>
            </div>
          </div>
          <Button
            type="button"
            variant="subtle"
            onClick={openTutorial}
            className="inline-flex items-center gap-2 self-start md:self-auto px-3 py-2 text-xs md:text-sm"
          >
            <BookOpenCheck size={16} className="hidden md:inline" />
            SVS tutorial
          </Button>
        </div>
      </div>

      {/* Form Section */}
      <section className="glass rounded-2xl px-5 md:px-6 py-5 border border-white/10 shadow-lg animate-fadeUp" style={{ animationDelay: '0.05s' }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Slot Configuration</h2>
            <p className="text-xs text-white/60 mt-1">Fill in details to view and reserve slots</p>
          </div>
          {userReservation && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCancelConfirmOpen(true)}
              disabled={cancelling}
              className="flex items-center gap-2"
            >
              {cancelling ? 'Cancelling...' : 'Cancel My Reservation'}
            </Button>
          )}
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
              // Fix: Handle both _id and id properties from different API responses
              const userId = user?.id || (user as any)?._id
              const isMySlot = taken && userId && taken.reservedBy === String(userId)
              return (
              <div key={i} className="relative group/card">
                <button
                  disabled={!!taken || reserving === i || !stateName.trim() || !allianceName.trim()}
                  onClick={() => requestReserve(i)}
                  className={`w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 min-h-[120px] flex flex-col justify-between ${taken ? 'cursor-not-allowed border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-emerald-500/5' : 'border-white/10 bg-white/5 hover:border-blue-500/40 hover:bg-white/10 active:scale-95'} ${reserving === i ? 'opacity-60' : 'opacity-100'} ${isMySlot ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/25 via-blue-400/15 to-purple-500/10 shadow-lg shadow-blue-500/20' : ''}`}
                >
                  {/* Time Label */}
                  <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium">
                    <Clock size={10} />
                    <span>{slotLabel(i)}</span>
                  </div>
                  
                  {taken ? (
                    <div className="mt-2 space-y-1">
                      <div className={`text-xs font-semibold truncate ${isMySlot ? 'text-blue-200' : 'text-emerald-300'}`}>
                        {taken.assignedPlayerName || 'Reserved'}
                      </div>
                      <div className="text-[10px] text-white/60 font-mono truncate">ID: {taken.assignedGameId || '—'}</div>
                      <div className="text-[10px] text-white/50 truncate">{taken.allianceName}</div>
                      {isMySlot && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/40 text-[9px] font-medium text-blue-200">
                          <UserIcon size={8} />
                          <span>Your Slot</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-white/70">Available</span>
                    </div>
                  )}
                </button>
                
                {/* Enhanced Delete Button - Only visible for user's own slots */}
                {isMySlot && (
                  <div className="absolute top-2 right-2 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('Delete button clicked, opening modal')
                        console.log('User reservation:', userReservation)
                        setCancelConfirmOpen(true)
                      }}
                      disabled={cancelling}
                      className="group/btn w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-400 hover:via-red-500 hover:to-red-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg shadow-red-500/40 hover:shadow-red-500/60 border border-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete your reservation"
                      aria-label="Delete slot reservation"
                    >
                      <X size={16} className="group-hover/btn:rotate-90 transition-transform duration-200" />
                    </button>
                  </div>
                )}
              </div>
              )
            })}
          </div>
      </section>

      {showTutorial && currentTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 md:px-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeTutorial} />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-6 md:px-8 pt-6">
              <div className="text-xs uppercase tracking-[0.3em] text-primary/70 inline-flex items-center gap-2">
                <Sparkles size={14} /> SVS Playbook
              </div>
              <button
                type="button"
                onClick={closeTutorial}
                className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition p-1.5"
                aria-label="Close tutorial"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 md:px-8 pt-4 pb-2">
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-white/70">
                  Step {tutorialIndex + 1} of {tutorialSlides.length}
                </span>
                <span className="uppercase tracking-wide text-primary/80">{currentTutorial.accent}</span>
              </div>
              <h2 className="mt-4 text-2xl md:text-3xl font-semibold text-white tracking-tight">{currentTutorial.headline}</h2>
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl">{currentTutorial.title}</p>
              <ul className="mt-6 space-y-3 text-sm md:text-[15px] text-white/80">
                {currentTutorial.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(59,130,246,0.35)]" />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 md:px-8 pb-6 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-white/10">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                {tutorialSlides.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-10 rounded-full transition-all ${idx === tutorialIndex ? 'bg-primary shadow-[0_0_16px_rgba(59,130,246,0.6)]' : 'bg-white/15'}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={goPrevTutorial}
                  disabled={tutorialIndex === 0}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  <ChevronLeft size={16} />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (tutorialIndex === tutorialSlides.length - 1) closeTutorial()
                    else goNextTutorial()
                  }}
                  className="inline-flex items-center gap-2 text-sm"
                >
                  {tutorialIndex === tutorialSlides.length - 1 ? 'Done' : 'Next'}
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Cancel Confirmation Modal */}
      {cancelConfirmOpen && userReservation && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => {
            console.log('Modal backdrop clicked, closing modal')
            setCancelConfirmOpen(false)
          }} />
          <div className="relative w-full max-w-lg rounded-2xl border border-red-500/30 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 shadow-2xl shadow-red-500/20 animate-in zoom-in-95 duration-200">
            {/* Header with Icon */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 flex-shrink-0">
                <X size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-white">Delete Reservation</h4>
                <p className="text-sm text-white/60 mt-1">This action cannot be undone</p>
              </div>
            </div>
            
            {/* Warning Message */}
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-white/90 leading-relaxed">
                Are you sure you want to delete your reservation for <span className="font-bold text-red-400">{slotLabel(userReservation.slotIndex)}</span>?
              </p>
            </div>
            
            {/* Reservation Details Card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>Reservation Details</span>
              </div>
              <div className="grid gap-2.5">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Alliance</span>
                  <span className="text-sm font-semibold text-white">{userReservation.allianceName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Player</span>
                  <span className="text-sm font-semibold text-white">{userReservation.assignedPlayerName || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-sm text-white/60">Game ID</span>
                  <span className="text-sm font-mono font-semibold text-blue-400">{userReservation.assignedGameId || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/60">Time Slot</span>
                  <span className="text-sm font-semibold text-white">{slotLabel(userReservation.slotIndex)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setCancelConfirmOpen(false)}
                className="h-12 rounded-xl text-sm font-semibold border border-white/20 hover:bg-white/10"
              >
                Keep Slot
              </Button>
              <Button
                variant="danger"
                onClick={cancelReservation}
                disabled={cancelling}
                className="h-12 rounded-xl text-sm font-semibold bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30"
              >
                {cancelling ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <X size={16} />
                    Delete Slot
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
