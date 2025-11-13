import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import {
  BookOpenCheck,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Info,
  Crown,
  ListChecks,
  Loader2,
  Mic,
  Send,
  Share2,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserMinus,
  Users,
  X
} from 'lucide-react'
import notificationMp3 from '../assets/room-message-notification.mp3'
import { gentlyRequestNotificationPermission, showRoomNotification } from '../utils/notificationClient'

type Room = { code: string; name: string; state: number; isOwner?: boolean }
type Message = { _id: string; roomCode: string; senderEmail: string; senderId: string; senderName?: string; content: string; createdAt: string }

type AllianceMember = {
  userId: string
  email: string
  displayName: string
  role: 'owner' | 'member'
  joinedAt: string
}

type TutorialSlide = {
  title: string
  headline: string
  bullets: string[]
  accent?: string
}

type HeaderStat = {
  label: string
  value: string
  subtle?: string
  mono?: boolean
}

function formatActivityLabel(dateStr?: string) {
  if (!dateStr) return 'Awaiting activity'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'Awaiting activity'
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const yesterday = new Date(now.getTime())
  yesterday.setDate(now.getDate() - 1)

  const dayLabel = sameDay
    ? 'Today'
    : date.toDateString() === yesterday.toDateString()
      ? 'Yesterday'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${dayLabel} • ${timeLabel}`
}

function formatCreatedLabel(dateStr?: string | null) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getRoomInitials(name?: string | null) {
  if (!name) return 'AL'
  const trimmed = name.trim()
  if (!trimmed) return 'AL'
  const parts = trimmed.split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part.charAt(0).toUpperCase()).filter(Boolean)
  if (letters.length >= 2) return letters.join('')
  if (letters.length === 1) {
    const second = trimmed.replace(parts[0], '').trim().charAt(0)
    if (second) return (letters[0] + second.toUpperCase()).slice(0, 2)
    return (letters[0] + (trimmed.charAt(1)?.toUpperCase() || '')).slice(0, 2)
  }
  return trimmed.slice(0, 2).toUpperCase()
}

const tutorialSlides: TutorialSlide[] = [
  {
    title: 'Search alliance rooms',
    headline: 'Find active alliances in seconds',
    bullets: [
      'Use the global search bar to look up rooms by alliance name, code, or state number.',
      'Results update as you type—tap a result to prefill the join form instantly.',
      'No matches yet? Switch to Create to set up a fresh room for your squad.'
    ],
    accent: 'Discover'
  },
  {
    title: 'Create your room',
    headline: 'Launch a secure alliance hub',
    bullets: [
      'Enter a memorable alliance name and your state number to generate a unique room code.',
      'Protect the room with a strong password—owners are auto-added when creation succeeds.',
      'Share the generated code + password only with trusted teammates.'
    ],
    accent: 'Create'
  },
  {
    title: 'Join an existing room',
    headline: 'Jump into your alliance chat',
    bullets: [
      'Paste the invite code you received and enter the room password exactly.',
      'Need a reminder? Owners can reshare details via the Share room access card.',
      'Once authenticated, messages and streaming updates unlock instantly.'
    ],
    accent: 'Join'
  },
  {
    title: 'Share + collaborate',
    headline: 'Keep everyone aligned effortlessly',
    bullets: [
      'Use the Share room access card to copy an invite template with code, state, and link.',
      'Owners can tidy conversations by deleting messages or closing rooms when needed.',
      'Voice notes, instant messaging, and live updates keep alliances in sync 24/7.'
    ],
    accent: 'Engage'
  }
]

export default function AllianceChatWindow() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { code: routeCode } = useParams()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [stateNum, setStateNum] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<Room | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState<Room | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deletePwd, setDeletePwd] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showMobileDetails, setShowMobileDetails] = useState(false)

  const [q, setQ] = useState('')
  const [results, setResults] = useState<Room[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<number | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const typingBarRef = useRef<HTMLDivElement | null>(null)
  const mediaRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const recordStopTimerRef = useRef<number | null>(null)
  const recordingStartAtRef = useRef<number>(0)
  const recordActionAtRef = useRef<number>(0)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const lastSoundPlayedRef = useRef<number>(0)
  const [kbOffset, setKbOffset] = useState(0)
  // Typing indicator state and timers
  const [typingUsers, setTypingUsers] = useState<Record<string, { email: string; name?: string }>>({})
  const lastTypingSentRef = useRef<number>(0)
  const typingStopTimerRef = useRef<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [members, setMembers] = useState<AllianceMember[]>([])
  const [membersError, setMembersError] = useState<string | null>(null)
  const [rosterMeta, setRosterMeta] = useState<{ ownerId: string | null; createdAt?: string | null }>({ ownerId: null, createdAt: null })
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Generate consistent color for each user based on their email
  function getUserColor(email: string): string {
    const colors = [
      'text-purple-400',
      'text-pink-400',
      'text-rose-400',
      'text-orange-400',
      'text-amber-400',
      'text-yellow-400',
      'text-lime-400',
      'text-green-400',
      'text-emerald-400',
      'text-teal-400',
      'text-cyan-400',
      'text-sky-400',
      'text-blue-400',
      'text-indigo-400',
      'text-violet-400',
      'text-fuchsia-400'
    ]
    
    // Generate consistent hash from email
    let hash = 0
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash)
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Use hash to pick color consistently
    const index = Math.abs(hash) % colors.length
    return colors[index]
  }

  useEffect(() => {
    if (joined?.code) {
      gentlyRequestNotificationPermission().catch(() => undefined)
    }
  }, [joined?.code])

  function scrollToBottom() {
    if (!listRef.current) return
    // Use rAF to wait for layout; do twice to be safe after images/fonts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = listRef.current!
        el.scrollTop = el.scrollHeight
      })
    })
  }

  useEffect(() => {
    if (!showTutorial) return
    const handleKey = (event: KeyboardEvent) => {
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
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = originalOverflow
    }
  }, [showTutorial])

  const currentTutorial = tutorialSlides[tutorialIndex]
  const lastMessage = useMemo(() => (messages.length > 0 ? messages[messages.length - 1] : null), [messages])
  const roomInitials = useMemo(() => getRoomInitials(joined?.name), [joined?.name])
  const headerStats = useMemo<HeaderStat[]>(() => {
    if (!joined) return []
    const stats: HeaderStat[] = []
    stats.push({
      label: 'Role',
      value: joined.isOwner ? 'Commander' : 'Member',
      subtle: joined.isOwner ? 'Full control' : 'Alliance access'
    })
    stats.push({
      label: 'State',
      value: `#${joined.state}`,
      subtle: 'Battlefield',
      mono: true
    })
    stats.push({
      label: 'Members',
      value: members.length ? String(members.length) : '—',
      subtle: members.length ? 'Active roster' : 'Waiting to join'
    })
    const activitySource = lastMessage?.createdAt || rosterMeta?.createdAt || null
    if (activitySource) {
      stats.push({
        label: 'Last activity',
        value: formatActivityLabel(activitySource)
      })
    }
    if (rosterMeta?.createdAt) {
      const createdLabel = formatCreatedLabel(rosterMeta.createdAt)
      stats.push({
        label: 'Created',
        value: createdLabel
      })
    }
    return stats.slice(0, 4)
  }, [joined, members.length, rosterMeta?.createdAt, lastMessage?.createdAt])
  const statusTone = sseConnected ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : 'bg-red-500/15 border-red-400/40 text-red-200'
  const statusPulse = sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
  const statusLabel = sseConnected ? 'Live' : 'Reconnecting…'

  useEffect(() => {
    if (!showSettings || !joined?.code) return
    loadMembers(joined.code)
  }, [showSettings, joined?.code])

  useEffect(() => {
    if (!joined?.code) {
      setShowSettings(false)
      setMembers([])
      setRosterMeta({ ownerId: null, createdAt: null })
      setMembersError(null)
    }
  }, [joined?.code])

  async function waitForChunks(timeout = 500) {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (chunksRef.current.length > 0) return
      await new Promise((r) => setTimeout(r, 40))
    }
  }

  async function transcribeOnce(blob: Blob, mimeHint: string, timeoutMs = 15000): Promise<string> {
    const b64 = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onerror = () => reject(new Error('read'))
      fr.onloadend = () => resolve(String(fr.result).split(',')[1] || '')
      fr.readAsDataURL(blob)
    })
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const { data } = await api.post('/ai/transcribe', {
        audioBase64: b64,
        mimeType: blob.type || mimeHint || 'audio/webm',
        fileName: ((blob.type || mimeHint).includes('ogg') ? 'voice.ogg' : 'voice.webm'),
        sourceLanguage: 'autodetect'
      }, { signal: ctrl.signal as any })
      return String(data?.text || '')
    } finally {
      clearTimeout(to)
    }
  }

  async function transcribeWithRetry(blob: Blob, mimeHint: string): Promise<string> {
    const first = await transcribeOnce(blob, mimeHint).catch(() => '')
    if (first && first.trim()) return first
    // If blob is too small, likely too short/silent — don't spam retries
    if (blob.size < 1200) return ''
    // brief pause before retry to allow backend readiness
    await new Promise((r) => setTimeout(r, 300))
    const second = await transcribeOnce(blob, mimeHint).catch(() => '')
    return second
  }

  async function toggleRecord() {
    // simple debounce to prevent rapid double toggles
    const now = Date.now()
    if (now - recordActionAtRef.current < 500) return
    recordActionAtRef.current = now

    if (recording) {
      const elapsed = Date.now() - recordingStartAtRef.current
      const minMs = 600
      const doStop = () => {
        try { recRef.current?.requestData() } catch {}
        try { recRef.current?.stop() } catch {}
        if (recordStopTimerRef.current) { window.clearTimeout(recordStopTimerRef.current); recordStopTimerRef.current = null }
        setRecording(false)
      }
      if (elapsed < minMs) {
        setTimeout(doStop, minMs - elapsed)
      } else {
        doStop()
      }
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = stream
      chunksRef.current = []
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ] as const
      let mime = ''
      for (const c of candidates) { if (MediaRecorder.isTypeSupported(c)) { mime = c; break } }
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } as any : undefined)
      recRef.current = rec
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onerror = () => {
        try { rec.stop() } catch {}
      }
      rec.onstop = async () => {
        if (recordStopTimerRef.current) { window.clearTimeout(recordStopTimerRef.current); recordStopTimerRef.current = null }
        setRecording(false)
        try {
          if (chunksRef.current.length === 0) {
            await waitForChunks(400)
          }
          const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: (mime || 'audio/webm') }) : null
          chunksRef.current = []
          stream.getTracks().forEach((t) => t.stop())
          mediaRef.current = null
          if (!blob || blob.size === 0) return
          setTranscribing(true)
          const t: string = await transcribeWithRetry(blob, mime)
          if (t) setMessageText((prev) => (prev ? prev + ' ' + t : t))
        } catch (err) {
          console.error(err)
        } finally {
          setTranscribing(false)
        }
      }
      // start with small timeslice so browsers flush data reliably
      rec.start(200)
      recordingStartAtRef.current = Date.now()
      setRecording(true)
      recordStopTimerRef.current = window.setTimeout(() => {
        try { rec.requestData() } catch {}
        try { rec.stop() } catch {}
      }, 60000)
    } catch (e: any) {
      console.error('mic', e)
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
        try { alert('Microphone permission denied. Please allow mic access and try again.') } catch {}
      }
      try { mediaRef.current?.getTracks().forEach((t) => t.stop()); mediaRef.current = null } catch {}
      chunksRef.current = []
      setRecording(false)
    }
  }

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    searchTimer.current = window.setTimeout(async () => {
      try {
        const { data } = await api.get<Room[]>('/alliance/search', { params: { q } })
        setResults(data || [])
      } catch { /* noop */ }
      finally { setSearching(false) }
    }, 400)
  }, [q])

  async function onCreate() {
    const s = parseInt(stateNum, 10)
    if (!name.trim() || !s || !password.trim()) return
    setCreating(true)
    try {
      const { data } = await api.post<Room>('/alliance/rooms', { name: name.trim(), state: s, password })
      setCreated(data)
      setTab('join')
      setJoinCode(data.code)
      setJoinPassword(password)
      setCurrentPassword(password)
    } finally { setCreating(false) }
  }

  async function deleteMessage(msg: Message) {
    if (!joined?.code || msg._id.startsWith('temp-') || deletingId === msg._id) return
    const mine = msg.senderEmail === user?.email
    const owner = joined?.isOwner
    if (!mine && !owner) return
    const confirmed = window.confirm('Delete this message for everyone?')
    if (!confirmed) return
    setDeletingId(msg._id)
    try {
      await api.delete(`/alliance/rooms/${joined.code}/messages/${msg._id}`)
      setMessages((prev) => prev.filter((m) => m._id !== msg._id))
    } catch (err) {
      console.error('Failed to delete message', err)
      alert('Failed to delete message.')
    } finally {
      setDeletingId(null)
    }
  }

  // Copy invite helper and feedback
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  useEffect(() => {
    if (!codeCopied) return
    const id = window.setTimeout(() => setCodeCopied(false), 1600)
    return () => window.clearTimeout(id)
  }, [codeCopied])

  function copyShare() {
    if (!joined) return
    const shareText = `Alliance room: ${joined.name} (State ${joined.state})\nRoom code: ${joined.code}\nPassword: ${currentPassword || 'ask owner'}\nJoin at: ${window.location.origin}/dashboard/alliance-chat/${joined.code}`
    navigator.clipboard.writeText(shareText).then(() => setCopied(true))
  }

  async function onJoin() {
    if (!joinCode.trim() || !joinPassword.trim()) return
    setJoining(true)
    try {
      const { data } = await api.post<Room>('/alliance/join', { code: joinCode.trim(), password: joinPassword })
      setJoined(data)
      setShowDelete(false)
      setCurrentPassword(joinPassword)
      await loadMessages(data.code)
      try { localStorage.setItem(`wos_room_seen_${data.code}`, String(Date.now())); window.dispatchEvent(new Event('alliance:rooms-refresh')) } catch {}
      attachStream(data.code)
      nav(`/dashboard/alliance-chat/${data.code}`)
    } finally { setJoining(false) }
  }

  async function onDeleteRoom() {
    if (!joined?.code || !deletePwd.trim()) return
    setDeleting(true)
    try {
      await api.delete(`/alliance/rooms/${joined.code}`, { data: { password: deletePwd } })
      setJoined(null)
      setShowDelete(false)
      setDeletePwd('')
      setTab('create')
      detachStream()
      setMessages([])
      setCurrentPassword('')
    } finally {
      setDeleting(false)
    }
  }

  async function loadMessages(code: string) {
    try {
      const { data } = await api.get<Message[]>(`/alliance/rooms/${code}/messages`)
      setMessages(data)
      scrollToBottom()
      try { localStorage.setItem(`wos_room_seen_${code}`, String(Date.now())); window.dispatchEvent(new Event('alliance:rooms-refresh')) } catch {}
    } catch {
      setMessages([])
    }
  }

  async function loadMembers(code: string) {
    if (!code) return
    setMembersLoading(true)
    try {
      const { data } = await api.get<{
        room: { ownerId: string | null; createdAt?: string | null }
        members: AllianceMember[]
      }>(`/alliance/rooms/${code}/members`)
      setMembers(Array.isArray(data?.members) ? data.members : [])
      setRosterMeta({ ownerId: data?.room?.ownerId || null, createdAt: data?.room?.createdAt || null })
      setMembersError(null)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load members'
      setMembersError(message)
    } finally {
      setMembersLoading(false)
    }
  }

  async function removeMember(member: AllianceMember) {
    if (!joined?.code || !joined?.isOwner || member.role === 'owner') return
    const confirmed = window.confirm(`Remove ${member.displayName || member.email} from this alliance?`)
    if (!confirmed) return
    setRemovingMemberId(member.userId)
    try {
      await api.delete(`/alliance/rooms/${joined.code}/members/${member.userId}`)
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId))
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to remove member.'
      alert(message)
    } finally {
      setRemovingMemberId(null)
    }
  }

  function attachStream(code: string) {
    detachStream()
    const token = localStorage.getItem('token')
    const base = (api.defaults.baseURL || '').replace(/\/$/, '') || '/api'
    const streamUrl = `${base}/alliance/rooms/${code}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
    console.log('Connecting to SSE stream:', streamUrl)
    const source = new EventSource(streamUrl)
    
    source.onopen = () => {
      console.log('SSE connection opened successfully')
      setSseConnected(true)
    }
    
    source.onmessage = (event) => {
      console.log('SSE message received:', event.data)
      handleSse(event as MessageEvent)
    }
    
    source.onerror = (error) => {
      console.error('SSE connection error:', error)
      console.log('SSE readyState:', source.readyState)
      setSseConnected(false)
      
      // ReadyState 2 means closed - try to reconnect
      if (source.readyState === EventSource.CLOSED) {
        console.log('SSE connection closed, attempting to reconnect in 3 seconds...')
        source.close()
        setTimeout(() => {
          if (joined?.code === code) {
            console.log('Reconnecting SSE...')
            attachStream(code)
          }
        }, 3000)
      }
    }
    
    sseRef.current = source
  }

  function detachStream() {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
    setSseConnected(false)
    // Clear typing state and timers on disconnect
    setTypingUsers({})
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current)
      typingStopTimerRef.current = null
    }
  }

  function handleSse(event: MessageEvent) {
    try {
      console.log('Raw SSE event data:', event.data)
      const data = JSON.parse(event.data)
      console.log('Parsed SSE data:', data)
      
      if (data?.type === 'message' && data.payload) {
        const payload: Message = data.payload
        console.log('Adding message to state:', payload)
        console.log('Is my message?', payload.senderEmail === user?.email)
        
        setMessages((prev) => {
          console.log('Current messages before update:', prev.length)
          const filtered = prev.filter((m) => !(m._id.startsWith('temp-') && m.content === payload.content && m.senderEmail === payload.senderEmail))
          const newMessages = [...filtered, payload]
          console.log('Messages after update:', newMessages.length)
          return newMessages
        })
        
        if (notificationSoundRef.current && payload.senderEmail !== user?.email) {
          const now = Date.now()
          let globalOk = true
          try {
            const g = Number(localStorage.getItem('wos_sound_global_at') || 0)
            globalOk = now - g > 700
          } catch {}
          if (now - lastSoundPlayedRef.current > 700 && globalOk) {
            lastSoundPlayedRef.current = now
            try { localStorage.setItem('wos_sound_global_at', String(now)) } catch {}
            console.log('Playing notification sound for incoming message')
            try {
              notificationSoundRef.current.volume = 0.8
            } catch {}
            notificationSoundRef.current.currentTime = 0
            notificationSoundRef.current.play().catch(() => undefined)
          }
        }

        if (joined?.code === payload.roomCode && payload.senderEmail !== user?.email) {
          const isForeground = typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()
          if (!isForeground) {
            const ts = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now()
            const timestamp = Number.isFinite(ts) ? ts : Date.now()
            const senderLabel = payload.senderName && payload.senderName.trim()
              ? payload.senderName.trim()
              : (payload.senderEmail || 'Alliance member')
            void showRoomNotification({
              roomCode: payload.roomCode,
              roomName: joined.name,
              senderName: senderLabel,
              message: payload.content,
              roomUrl: `/dashboard/alliance-chat/${payload.roomCode}`,
              timestamp
            })
          }
        }
        scrollToBottom()
      } else if (data?.type === 'typing' && data.payload) {
        const p = data.payload as { senderId: string; senderEmail: string; typing: boolean }
        // Ignore own typing events
        if (p.senderEmail === user?.email) return
        setTypingUsers((prev) => {
          const next = { ...prev }
          if (p.typing) next[p.senderId] = { email: p.senderEmail }
          else delete next[p.senderId]
          return next
        })
      } else if (data?.type === 'member_removed' && data.payload?.userId) {
        const removedId = String(data.payload.userId)
        setMembers((prev) => prev.filter((m) => m.userId !== removedId))
      } else if (data?.type === 'message_deleted' && data.payload?._id) {
        const id = data.payload._id as string
        console.log('Removing deleted message:', id)
        setMessages((prev) => prev.filter((m) => m._id !== id))
      } else {
        console.log('Unknown SSE message type:', data?.type)
      }
    } catch (err) {
      console.error('SSE parse error', err, 'Raw data:', event.data)
    }
  }

  // Emit typing (throttled) and schedule stop after idle
  async function emitTypingKeepAlive() {
    try {
      if (!joined?.code) return
      const now = Date.now()
      if (now - lastTypingSentRef.current > 1200) {
        lastTypingSentRef.current = now
        await api.post(`/alliance/rooms/${joined.code}/typing`, { typing: true })
      }
      if (typingStopTimerRef.current) window.clearTimeout(typingStopTimerRef.current)
      typingStopTimerRef.current = window.setTimeout(async () => {
        try { if (joined?.code) await api.post(`/alliance/rooms/${joined.code}/typing`, { typing: false }) } catch {}
      }, 1800)
    } catch {}
  }

  async function sendMessage() {
    if (!joined?.code || !messageText.trim() || sending) return
    const content = messageText.trim()
    console.log('Sending message:', content, 'to room:', joined.code)
    setSending(true)
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      roomCode: joined.code,
      senderEmail: user?.email || 'You',
      senderId: 'me',
      content,
      createdAt: new Date().toISOString()
    }
    console.log('Adding optimistic message:', optimistic)
    setMessages((prev) => [...prev, optimistic])
    setMessageText('')
    scrollToBottom()
    try {
      console.log('Calling API to send message...')
      const response = await api.post(`/alliance/rooms/${joined.code}/messages`, { content })
      console.log('Message sent successfully, API response:', response.data)
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id))
    } finally {
      setSending(false)
    }
  }

  // Keep list pinned to bottom when messages length changes
  useLayoutEffect(() => {
    scrollToBottom()
    if (joined?.code && typeof document !== 'undefined' && document.visibilityState === 'visible') {
      try { localStorage.setItem(`wos_room_seen_${joined.code}`, String(Date.now())); window.dispatchEvent(new Event('alliance:rooms-refresh')) } catch {}
    }
  }, [messages.length, joined?.code])

  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
      detachStream()
      try { recRef.current?.stop() } catch {}
      try { mediaRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
      mediaRef.current = null
      recRef.current = null
      chunksRef.current = []
      if (recordStopTimerRef.current) { window.clearTimeout(recordStopTimerRef.current); recordStopTimerRef.current = null }
    }
  }, [])

  // Stabilize bottom bar on mobile keyboards using VisualViewport
  useEffect(() => {
    const vv = (window as any).visualViewport as VisualViewport | undefined
    if (!vv) return
    const onVV = () => {
      try {
        const bottom = Math.max(0, Math.round(window.innerHeight - (vv.offsetTop + vv.height)))
        setKbOffset(bottom)
        // Adjust message list padding to keep last message visible
        if (listRef.current && typingBarRef.current) {
          const barH = typingBarRef.current.offsetHeight || 88
          listRef.current.style.paddingBottom = `${barH + 16 + bottom}px`
        }
      } catch {}
    }
    vv.addEventListener('resize', onVV)
    vv.addEventListener('scroll', onVV)
    onVV()
    return () => { vv.removeEventListener('resize', onVV); vv.removeEventListener('scroll', onVV) }
  }, [])

  // Auto-open room when navigated via /alliance-chat/:code
  useEffect(() => {
    async function hydrate(c: string) {
      try {
        const { data } = await api.get(`/alliance/rooms/${c}/meta`)
        if (data?.isMember) {
          const meta: Room = { code: data.code, name: data.name, state: data.state, isOwner: data.isOwner }
          setJoined(meta)
          setTab('join')
          setJoinCode(c)
          setCurrentPassword('')
          await loadMessages(c)
          attachStream(c)
        } else {
          // Not a member: prefill join form
          setJoined(null)
          setTab('join')
          setJoinCode(c)
        }
      } catch {
        // invalid code
      }
    }
    detachStream()
    setMessages([])
    if (routeCode) {
      hydrate(String(routeCode))
    } else {
      setJoined(null)
      setTab('create')
      setJoinCode('')
      setJoinPassword('')
      setCurrentPassword('')
      setName('')
      setStateNum('')
      setPassword('')
      setCreated(null)
      setDeletePwd('')
      setShowDelete(false)
      setQ('')
      setResults([])
    }
  }, [routeCode])

  function openTutorial() {
    setTutorialIndex(0)
    setShowTutorial(true)
  }

  function closeTutorial() {
    setShowTutorial(false)
    setTutorialIndex(0)
  }

  function goNextTutorial() {
    if (tutorialIndex < tutorialSlides.length - 1) {
      setTutorialIndex((idx) => idx + 1)
    } else {
      closeTutorial()
    }
  }

  function goPrevTutorial() {
    setTutorialIndex((idx) => Math.max(idx - 1, 0))
  }

  // When room is joined, render full-screen chat that breaks out of dashboard container
  if (joined?.code) {
    return (
      <>
        <audio ref={notificationSoundRef} className="hidden" preload="auto" src={notificationMp3} />
        {/* Fixed full-screen container that prevents content from hiding */}
        <div className="fixed left-0 right-0 bottom-0 top-[var(--dashboard-header-offset,3.75rem)] z-30 flex flex-col bg-transparent md:relative md:inset-auto md:top-auto md:bottom-auto md:left-auto md:right-auto md:z-auto md:bg-transparent md:h-[calc(100vh-160px)]">
          {/* Header */}
          <div className="relative flex-none bg-slate-950/90 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50 overflow-hidden">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),transparent_55%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(147,51,234,0.18),transparent_50%)]" />
            </div>
            <div className="relative px-3 py-3 md:px-6 md:py-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => {
                        setJoined(null)
                        nav('/dashboard/alliance-chat')
                      }}
                      className="flex-none p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all active:scale-95"
                      title="Leave room"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex-none h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 shadow-lg shadow-blue-500/40 grid place-items-center text-lg font-semibold text-white">
                        {roomInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h2 className="text-base md:text-lg font-semibold text-white tracking-tight truncate">{joined.name}</h2>
                          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusTone}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusPulse}`} />
                            <span className="hidden sm:inline">{statusLabel}</span>
                            <span className="sm:hidden">{sseConnected ? 'On' : 'Off'}</span>
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(joined.code).then(() => setCodeCopied(true))
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
                          >
                            <span className="font-mono text-white/80">{joined.code}</span>
                            <Share2 size={12} />
                          </button>
                          <span>•</span>
                          <span className="font-medium text-white/80">State #{joined.state}</span>
                          {currentPassword && (
                            <span className="hidden sm:inline text-white/50">
                              Password stored
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMobileDetails((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                      <Info size={14} /> {showMobileDetails ? 'Hide' : 'Info'}
                    </button>
                    <Button
                      type="button"
                      variant="subtle"
                      onClick={() => setShowSettings(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm"
                      title="Alliance settings"
                    >
                      <Settings2 size={16} />
                      <span className="hidden sm:inline">Settings</span>
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {headerStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">{stat.label}</div>
                      <div className={`mt-1 text-sm font-semibold text-white ${stat.mono ? 'font-mono tracking-wide text-white/90' : ''}`}>{stat.value}</div>
                      {stat.subtle && <div className="text-[11px] text-white/40 mt-1">{stat.subtle}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Info Panel (collapsible) */}
            {showMobileDetails && (
              <div className="relative px-3 pb-4 md:px-6 md:pb-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 md:p-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    Room Access
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="text-[11px] text-white/40 mb-1 uppercase tracking-widest">Code</div>
                      <div className="font-mono text-sm text-white truncate">{joined.code}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="text-[11px] text-white/40 mb-1 uppercase tracking-widest">Password</div>
                      <div className="font-mono text-sm text-white/80">{currentPassword ? '•'.repeat(6) : 'Ask owner'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                      <div className="text-[11px] text-white/40 mb-1 uppercase tracking-widest">Share link</div>
                      <button
                        type="button"
                        onClick={copyShare}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
                      >
                        {copied ? '✓ Copied!' : 'Copy invite'}
                        <Share2 size={12} />
                      </button>
                    </div>
                  </div>
                  {joined?.isOwner && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                        Owner Controls
                      </div>
                      <Input
                        value={deletePwd}
                        onChange={(e) => setDeletePwd(e.target.value)}
                        placeholder="Password to delete"
                        type="password"
                        className="text-sm bg-white/5 border-white/10"
                      />
                      <Button
                        variant="danger"
                        onClick={onDeleteRoom}
                        disabled={!deletePwd.trim() || deleting}
                        className="w-full text-sm"
                      >
                        {deleting ? 'Deleting…' : 'Delete Room'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {showSettings && (
            <div className="fixed inset-0 z-[85] flex items-center justify-center px-4 md:px-6">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
              <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/98 shadow-2xl">
                <div className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/70">
                      <Settings2 size={14} />
                      Alliance Room
                    </div>
                    <h3 className="text-lg md:text-xl font-semibold text-white mt-1">Alliance settings & roster</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="rounded-full border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition p-1.5"
                    aria-label="Close settings"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid md:grid-cols-[1.6fr_1fr] gap-4 md:gap-6 px-5 md:px-8 py-5 md:py-6 overflow-y-auto max-h-[90vh]">
                  <div className="space-y-4 md:space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-white/10">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <Users size={18} />
                          Members <span className="text-white/60">({members.length})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <button
                            type="button"
                            onClick={() => joined?.code && loadMembers(joined.code)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
                          >
                            Refresh
                          </button>
                          {membersLoading && <Loader2 className="animate-spin" size={16} />}
                        </div>
                      </div>
                      <div className="max-h-80 md:max-h-96 overflow-y-auto px-4 md:px-5 py-4 space-y-3 scrollbar-elegant">
                        {membersError && (
                          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {membersError}
                          </div>
                        )}
                        {!membersError && members.length === 0 && !membersLoading && (
                          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/50">
                            No members yet. Share your invite link to bring your alliance together.
                          </div>
                        )}
                        {members.map((member) => {
                          const initials = (member.displayName?.[0] || member.email?.[0] || '?').toUpperCase()
                          const joinedLabel = member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'
                          const isOwner = member.role === 'owner'
                          return (
                            <div
                              key={member.userId}
                              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 md:px-4 md:py-4"
                            >
                              <div className="flex-none h-10 w-10 rounded-full bg-gradient-to-br from-primary/60 to-blue-500/60 text-white font-semibold grid place-items-center shadow-lg">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm md:text-base font-medium text-white truncate" title={member.displayName || member.email}>
                                    {member.displayName || member.email}
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                                      isOwner ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-white/10 text-white/60 border border-white/10'
                                    }`}
                                  >
                                    {isOwner ? (
                                      <>
                                        <Crown size={12} /> Owner
                                      </>
                                    ) : (
                                      'Member'
                                    )}
                                  </span>
                                </div>
                                <div className="text-xs text-white/50 truncate" title={member.email}>
                                  {member.email}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-xs text-white/40">
                                  <CalendarClock size={12} /> Joined {joinedLabel}
                                </div>
                              </div>
                              {joined?.isOwner && !isOwner && (
                                <button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  disabled={removingMemberId === member.userId}
                                  className="flex-none inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
                                >
                                  {removingMemberId === member.userId ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                  Remove
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 md:space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ShieldCheck size={18} /> Room overview
                      </div>
                      <div className="space-y-2 text-sm text-white/60">
                        <div className="flex items-center justify-between">
                          <span>Alliance name</span>
                          <span className="text-white font-medium">{joined.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>State</span>
                          <span className="text-white font-medium">{joined.state}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Room code</span>
                          <span className="text-white font-mono text-xs md:text-sm">{joined.code}</span>
                        </div>
                        {rosterMeta?.createdAt && (
                          <div className="flex items-center justify-between">
                            <span>Created</span>
                            <span className="text-white font-medium">{new Date(rosterMeta.createdAt).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Members</span>
                          <span className="text-white font-medium">{members.length}</span>
                        </div>
                      </div>
                      <Button variant="subtle" onClick={copyShare} className="w-full text-xs md:text-sm py-2">
                        Share invite details
                      </Button>
                    </div>
                    {joined?.isOwner ? (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                          <Crown size={18} /> Owner toolkit
                        </div>
                        <ul className="space-y-2 text-sm text-amber-100/90">
                          <li className="flex items-start gap-2">
                            <ShieldCheck size={14} className="mt-0.5" />
                            Guard access: remove inactive members and rotate passwords when needed.
                          </li>
                          <li className="flex items-start gap-2">
                            <ListChecks size={14} className="mt-0.5" />
                            Keep strategy aligned: pin important plans and review chat etiquette regularly.
                          </li>
                          <li className="flex items-start gap-2">
                            <Users size={14} className="mt-0.5" />
                            Nominate co-leads: promote trusted members outside the app to assist with coordination.
                          </li>
                        </ul>
                        <p className="text-xs text-amber-100/70">
                          You can still access destructive actions like deleting the room from the Info drawer.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <ListChecks size={18} /> Member guidelines
                        </div>
                        <ul className="space-y-2 text-sm text-white/70">
                          <li className="flex items-start gap-2">
                            <ShieldCheck size={14} className="mt-0.5" />
                            Respect alliance strategy and avoid sharing room credentials externally.
                          </li>
                          <li className="flex items-start gap-2">
                            <Users size={14} className="mt-0.5" />
                            Support teammates by sharing scouting intel and keeping communication active.
                          </li>
                          <li className="flex items-start gap-2">
                            <ListChecks size={14} className="mt-0.5" />
                            Signal leaders if someone leaves or needs a role change.
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area - Flexible scroll area with bottom padding for input */}
          <div className="relative flex-1 overflow-hidden">
            <div
              ref={listRef}
              className="h-full overflow-y-auto overscroll-contain px-3 md:px-6 py-4 space-y-4 scrollbar-elegant pb-24 md:pb-28"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Send size={24} className="text-white/30" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/80 mb-2">No messages yet</h3>
                  <p className="text-sm text-white/40 max-w-xs">
                    Start the conversation! Send a message to your alliance members.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const mine = msg.senderEmail === user?.email
                  const canDelete = !msg._id.startsWith('temp-') && (mine || joined?.isOwner)
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const prev = idx > 0 ? messages[idx - 1] : null
                  const sameAsPrev = !!(prev && prev.senderEmail === msg.senderEmail)
                  const showSenderLabel = !mine && !sameAsPrev
                  
                  return (
                    <div key={msg._id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                      {/* Delete button on LEFT for sent messages (mine) */}
                      {mine && canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg)}
                          disabled={deletingId === msg._id}
                          className="flex-none self-end mb-1 w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/40 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 active:scale-95 grid place-items-center"
                          title="Delete message"
                        >
                          {deletingId === msg._id ? (
                            <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      )}
                      
                      <div className={`group max-w-[75%] sm:max-w-[65%] md:max-w-[55%] lg:max-w-[45%]`}>
                        {/* Sender label only at start of a block from same sender */}
                        {showSenderLabel && (
                          <div className={`text-xs font-bold mb-1.5 px-1 drop-shadow-lg ${getUserColor(msg.senderEmail)}`}>
                            {(msg.senderName && msg.senderName.trim()) || msg.senderEmail.split('@')[0]}
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`relative group rounded-2xl px-4 py-3 ${
                          mine
                            ? 'bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 rounded-tr-md'
                            : 'bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 text-white border border-white/15 backdrop-blur-md shadow-lg shadow-violet-500/20 rounded-tl-md'
                        }`}>
                          <div className="flex items-end justify-between gap-3">
                            <div className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap break-words flex-1">
                              {msg.content}
                            </div>
                            <span className={`text-[10px] whitespace-nowrap self-end flex-none ${mine ? 'text-purple-200/70' : 'text-gray-400'}`}>
                              {time}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete button on RIGHT for received messages */}
                      {!mine && canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg)}
                          disabled={deletingId === msg._id}
                          className="flex-none self-end mb-1 w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/40 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 active:scale-95 grid place-items-center"
                          title="Delete message"
                        >
                          {deletingId === msg._id ? (
                            <div className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
              {/* Typing indicators for other users */}
              {Object.keys(typingUsers).length > 0 && (
                <div className="px-4 md:px-6">
                  {Object.entries(typingUsers).map(([id, u]) => (
                    <div key={id} className="mb-2 max-w-[65%] lg:max-w-[50%]">
                      <div className="text-[11px] font-medium text-white/60 mb-1 px-1">{u.email.split('@')[0]}</div>
                      <div className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/15 to-sky-500/20 border border-white/15 backdrop-blur-md shadow-lg">
                        <div className="flex items-end gap-1 h-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                        <span className="text-[11px] text-white/70">typing…</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Listening Popup */}
          {recording && (
            <div className="absolute bottom-24 left-0 right-0 z-50 flex justify-center px-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 text-white/90 backdrop-blur-md px-3 py-1.5 text-xs shadow-lg">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span>Listening… tap mic to stop</span>
              </div>
            </div>
          )}

          {/* Fixed Typing Bar - Positioned at bottom without hiding sidebar */}
          <div ref={typingBarRef} className="absolute left-0 right-0 flex justify-center px-3 md:px-6 pb-safe pb-3 md:pb-4 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent pt-4 pointer-events-none z-40" style={{ bottom: kbOffset }}>
            <div className="pointer-events-auto w-full max-w-4xl">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 rounded-full bg-gradient-to-r from-slate-900/98 via-slate-800/98 to-slate-900/98 backdrop-blur-xl border border-white/20 shadow-2xl px-2.5 md:px-4 py-2 md:py-2.5">
                {/* Voice Button */}
                <button
                  type="button"
                  onClick={toggleRecord}
                  disabled={sending || transcribing}
                  className={`flex-none h-10 w-10 md:h-11 md:w-11 rounded-full transition-all duration-200 grid place-items-center shadow-lg ${
                    recording
                      ? 'bg-red-500 text-white shadow-red-500/50 scale-105'
                      : transcribing
                        ? 'bg-white/10 text-white/50'
                        : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15 active:scale-95'
                  }`}
                  title={recording ? 'Stop recording' : 'Voice message'}
                >
                  {transcribing ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mic size={17} className={recording ? 'animate-pulse' : ''} />
                  )}
                </button>

                {/* Input Field */}
                <div className="flex-1 relative min-w-0">
                  <Input
                    value={messageText}
                    onChange={(e) => { setMessageText(e.target.value); if (e.target.value.trim()) emitTypingKeepAlive() }}
                    onFocus={() => { setTimeout(scrollToBottom, 50) }}
                    placeholder={transcribing ? 'Transcribing...' : 'Type a message...'}
                    disabled={transcribing}
                    name="chat-message"
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    inputMode="text"
                    className="border-none bg-transparent text-white placeholder:text-white/40 focus:ring-0 h-10 md:h-11 text-sm md:text-base px-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  {transcribing && (
                    <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sending}
                  className={`flex-none h-10 w-10 md:h-11 md:w-11 rounded-full transition-all duration-200 grid place-items-center shadow-lg ${
                    messageText.trim() && !sending
                      ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 active:scale-95'
                      : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {codeCopied && (
          <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--dashboard-header-offset,60px)+16px)] flex justify-center z-[55] animate-in fade-in slide-in-from-top duration-200">
            <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-white/70 shadow-lg shadow-blue-500/20">
              <Sparkles size={14} className="text-primary" />
              Room code copied
            </div>
          </div>
        )}
      </>
    )
  }

  // Room selection/creation view (normal dashboard layout)
  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-160px)] px-3 md:px-8">
      <audio ref={notificationSoundRef} className="hidden" preload="auto">
        <source src="/sounds/alliance-message.mp3" type="audio/mpeg" />
      </audio>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="subtle"
          onClick={openTutorial}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs md:text-sm"
        >
          <BookOpenCheck size={16} className="hidden md:inline" />
          Tutorial
        </Button>
      </div>
      
      <div className="glass rounded-2xl px-4 md:px-6 py-4 border border-white/10 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setTab('create')} className={`px-4 py-2 rounded-xl border ${tab === 'create' ? 'border-primary/50 bg-primary/20 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}>Create room</button>
                <button onClick={() => setTab('join')} className={`px-4 py-2 rounded-xl border ${tab === 'join' ? 'border-primary/50 bg-primary/20 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:text-white'}`}>Join room</button>
              </div>
              <div className="flex-1 md:max-w-md">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms by alliance or state" />
              </div>
            </div>
          </div>

          {q.trim() && (
            <div className="glass rounded-2xl px-4 md:px-6 py-4 border border-white/10 shadow-lg">
              <div className="text-sm text-white/60 mb-3">{searching ? 'Searching…' : `${results.length} result(s)`}</div>
              <div className="divide-y divide-white/10">
                {results.map((r) => (
                  <div key={r.code} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{r.name}</div>
                      <div className="text-xs text-white/50">State {r.state} • {r.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => { setTab('join'); setJoinCode(r.code) }}>Join</Button>
                      <Button variant="subtle" onClick={() => navigator.clipboard.writeText(r.code)}>Copy code</Button>
                    </div>
                  </div>
                ))}
                {results.length === 0 && !searching && (
                  <div className="py-6 text-white/50 text-sm">No rooms found</div>
                )}
              </div>
            </div>
          )}

          {tab === 'create' && (
            <section className="glass rounded-2xl px-6 py-6 md:px-8 border border-white/10 shadow-lg">
              <div className="badge mb-3">Create</div>
              <h2 className="section-title">Create an alliance room</h2>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Alliance name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frost Wolves" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">State</label>
                  <Input value={stateNum} onChange={(e) => setStateNum(e.target.value.replace(/[^0-9]/g, ''))} placeholder="e.g. 127" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Password</label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" type="password" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button onClick={onCreate} disabled={!name.trim() || !stateNum || !password.trim() || creating}>{creating ? 'Creating…' : 'Create room'}</Button>
                {created && (
                  <div className="text-sm text-white/70">Room code: <span className="font-mono text-white">{created.code}</span></div>
                )}
              </div>
            </section>
          )}

          {tab === 'join' && (
            <section className="glass rounded-2xl px-6 py-6 md:px-8 border border-white/10 shadow-lg">
              <div className="badge mb-3">Join</div>
              <h2 className="section-title">Join an alliance room</h2>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Room code</label>
                  <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 127-FROSTWOLVES-AB2DE" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-white/50 block">Password</label>
                  <Input value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} placeholder="Room password" type="password" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Button onClick={onJoin} disabled={!joinCode.trim() || !joinPassword.trim() || joining}>{joining ? 'Joining…' : 'Join room'}</Button>
                {joined && (
                  <div className="text-sm text-white/70">Joined <span className="text-white font-medium">{joined.name}</span> • State {joined.state}</div>
                )}
              </div>
            </section>
          )}
      
        {showTutorial && currentTutorial && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 md:px-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeTutorial} />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-2xl">
            <div className="flex items-center justify-between px-6 md:px-8 pt-6">
              <div className="text-xs uppercase tracking-[0.3em] text-primary/70">Alliance Chat</div>
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
                  onClick={goNextTutorial}
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
      </div>
    )
}
