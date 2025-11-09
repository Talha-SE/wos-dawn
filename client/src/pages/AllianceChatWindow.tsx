import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import { BookOpenCheck, ChevronLeft, ChevronRight, Mic, Send, X } from 'lucide-react'

type Room = { code: string; name: string; state: number; isOwner?: boolean }
type Message = { _id: string; roomCode: string; senderEmail: string; senderId: string; content: string; createdAt: string }

type TutorialSlide = {
  title: string
  headline: string
  bullets: string[]
  accent?: string
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
  const mediaRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialIndex, setTutorialIndex] = useState(0)
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)

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

  async function toggleRecord() {
    if (recording) {
      setRecording(false)
      recRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRef.current = stream
      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      recRef.current = rec
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mime })
          chunksRef.current = []
          stream.getTracks().forEach((t) => t.stop())
          mediaRef.current = null
          setTranscribing(true)
          const b64 = await new Promise<string>((resolve, reject) => {
            const fr = new FileReader()
            fr.onerror = () => reject(new Error('read'))
            fr.onloadend = () => resolve(String(fr.result).split(',')[1] || '')
            fr.readAsDataURL(blob)
          })
          const { data } = await api.post('/ai/transcribe', {
            audioBase64: b64,
            mimeType: blob.type || 'audio/webm',
            fileName: 'voice.webm',
            sourceLanguage: 'autodetect'
          })
          const t: string = data?.text || ''
          if (t) setMessageText((prev) => (prev ? prev + ' ' + t : t))
        } catch (err) {
          console.error(err)
        } finally {
          setTranscribing(false)
        }
      }
      rec.start()
      setRecording(true)
    } catch (e) {
      console.error('mic', e)
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
    } catch {
      setMessages([])
    }
  }

  function attachStream(code: string) {
    detachStream()
    const token = localStorage.getItem('token')
    const base = (api.defaults.baseURL || '').replace(/\/$/, '') || '/api'
    const streamUrl = `${base}/alliance/rooms/${code}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`
    const source = new EventSource(streamUrl)
    source.onmessage = (event) => handleSse(event as MessageEvent)
    source.onerror = () => {
      source.close()
    }
    sseRef.current = source
  }

  function detachStream() {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
  }

  function handleSse(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      if (data?.type === 'message' && data.payload) {
        const payload: Message = data.payload
        setMessages((prev) => {
          const filtered = prev.filter((m) => !(m._id.startsWith('temp-') && m.content === payload.content && m.senderEmail === payload.senderEmail))
          return [...filtered, payload]
        })
        if (notificationSoundRef.current && payload.senderEmail !== user?.email) {
          notificationSoundRef.current.currentTime = 0
          notificationSoundRef.current.play().catch(() => undefined)
        }
        scrollToBottom()
      } else if (data?.type === 'message_deleted' && data.payload?._id) {
        const id = data.payload._id as string
        setMessages((prev) => prev.filter((m) => m._id !== id))
      }
    } catch (err) {
      console.error('SSE parse error', err)
    }
  }

  async function sendMessage() {
    if (!joined?.code || !messageText.trim() || sending) return
    const content = messageText.trim()
    setSending(true)
    const optimistic: Message = {
      _id: `temp-${Date.now()}`,
      roomCode: joined.code,
      senderEmail: user?.email || 'You',
      senderId: 'me',
      content,
      createdAt: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimistic])
    setMessageText('')
    scrollToBottom()
    try {
      await api.post(`/alliance/rooms/${joined.code}/messages`, { content })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id))
    } finally {
      setSending(false)
    }
  }

  // Keep list pinned to bottom when messages length changes
  useLayoutEffect(() => {
    scrollToBottom()
  }, [messages.length, joined?.code])

  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
      detachStream()
    }
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
        <audio ref={notificationSoundRef} className="hidden" preload="auto">
          <source src="/sounds/alliance-message.mp3" type="audio/mpeg" />
        </audio>
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
          {/* Fixed Header */}
          <div className="flex-none bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 px-4 md:px-6 py-3.5 shadow-xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => {
                    setJoined(null)
                    nav('/dashboard/alliance-chat')
                  }}
                  className="flex-none p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  title="Leave room"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-semibold text-white truncate">{joined.name}</h2>
                  <p className="text-xs text-white/50">State {joined.state} • {joined.code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileDetails((v) => !v)}
                className="flex-none px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:bg-white/10 transition-all active:scale-95"
              >
                {showMobileDetails ? 'Hide Info' : 'Info'}
              </button>
            </div>
          </div>

          {/* Info Panel (collapsible) */}
          {showMobileDetails && (
            <div className="flex-none bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/10 px-4 md:px-6 py-4 shadow-lg animate-in slide-in-from-top duration-200">
              <div className="max-w-7xl mx-auto space-y-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Room Access</div>
                    <div className="text-xs text-white/40">Share with alliance</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-950/50 rounded-lg p-3 border border-white/5">
                      <div className="text-xs text-white/40 mb-1">Room Code</div>
                      <div className="font-mono text-sm text-white">{joined.code}</div>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-3 border border-white/5">
                      <div className="text-xs text-white/40 mb-1">Password</div>
                      <div className="font-mono text-sm text-white">{currentPassword ? '•'.repeat(8) : 'Ask owner'}</div>
                    </div>
                  </div>
                  <Button variant="subtle" onClick={copyShare} className="w-full text-sm">
                    {copied ? '✓ Copied to Clipboard!' : 'Copy Full Invite'}
                  </Button>
                </div>
                
                {joined?.isOwner && (
                  <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      <div className="text-sm font-semibold text-red-400">Owner Controls</div>
                    </div>
                    <Input
                      value={deletePwd}
                      onChange={(e) => setDeletePwd(e.target.value)}
                      placeholder="Enter room password to confirm deletion"
                      type="password"
                      className="text-sm bg-slate-950/50"
                    />
                    <Button
                      variant="danger"
                      onClick={onDeleteRoom}
                      disabled={!deletePwd.trim() || deleting}
                      className="w-full text-sm"
                    >
                      {deleting ? 'Deleting Room...' : 'Delete Room Permanently'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages Area (scrollable) */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overscroll-contain bg-slate-950 scrollbar-elegant"
          >
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Send size={24} className="text-white/30" />
                  </div>
                  <h3 className="text-lg font-semibold text-white/80 mb-2">No messages yet</h3>
                  <p className="text-sm text-white/40 max-w-xs">
                    Start the conversation! Send a message to your alliance members.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = msg.senderEmail === user?.email
                  const canDelete = !msg._id.startsWith('temp-') && (mine || joined?.isOwner)
                  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  
                  return (
                    <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                      <div className="max-w-[85%] md:max-w-[60%] lg:max-w-[50%]">
                        {/* Sender info for received messages */}
                        {!mine && (
                          <div className="text-[11px] font-medium text-blue-400/70 mb-1.5 px-4">
                            {msg.senderEmail.split('@')[0]}
                          </div>
                        )}
                        
                        {/* Message bubble */}
                        <div className={`relative group rounded-2xl px-4 py-3 ${
                          mine
                            ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20 rounded-tr-md'
                            : 'bg-gradient-to-br from-white/10 to-white/5 text-white/95 border border-white/10 shadow-lg rounded-tl-md'
                        }`}>
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                          
                          <div className={`flex items-center gap-2 mt-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[11px] ${mine ? 'text-white/70' : 'text-white/50'}`}>
                              {time}
                            </span>
                            
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => deleteMessage(msg)}
                                disabled={deletingId === msg._id}
                                className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${
                                  mine ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-white/40 hover:text-red-400 hover:bg-red-400/10'
                                } transition disabled:opacity-40 opacity-0 group-hover:opacity-100`}
                              >
                                {deletingId === msg._id ? '•••' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Fixed Typing Bar */}
          <div className="flex-none bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 border-t border-white/10 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
              <div className="flex items-end gap-2.5">
                {/* Voice Button */}
                <button
                  type="button"
                  onClick={toggleRecord}
                  disabled={sending || transcribing}
                  className={`flex-none h-12 w-12 rounded-full transition-all duration-200 grid place-items-center shadow-lg ${
                    recording
                      ? 'bg-red-500 text-white shadow-red-500/50 scale-110 ring-4 ring-red-500/20'
                      : 'bg-gradient-to-br from-white/15 to-white/10 text-white/70 hover:text-white hover:from-white/20 hover:to-white/15 active:scale-95 border border-white/10'
                  }`}
                  title={recording ? 'Stop recording' : 'Voice message'}
                >
                  <Mic size={20} className={recording ? 'animate-pulse' : ''} />
                </button>

                {/* Input Field */}
                <div className="flex-1 relative">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={transcribing ? 'Transcribing voice...' : 'Type your message...'}
                    disabled={transcribing}
                    name="chat-message"
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    inputMode="text"
                    className="w-full h-12 bg-gradient-to-br from-white/15 to-white/10 border border-white/10 focus:border-blue-500/50 focus:from-white/20 focus:to-white/15 focus:ring-2 focus:ring-blue-500/20 rounded-full px-5 py-3 pr-12 text-[15px] text-white placeholder:text-white/40 shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  {transcribing && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim() || sending}
                  className={`flex-none h-12 w-12 rounded-full transition-all duration-200 grid place-items-center shadow-lg ${
                    messageText.trim() && !sending
                      ? 'bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 active:scale-95'
                      : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  }`}
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Room selection/creation view (normal dashboard layout)
  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-160px)]">
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
