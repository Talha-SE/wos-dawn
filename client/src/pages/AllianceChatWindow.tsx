import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'
import { Mic, Send } from 'lucide-react'

type Room = { code: string; name: string; state: number; isOwner?: boolean }
type Message = { _id: string; roomCode: string; senderEmail: string; senderId: string; content: string; createdAt: string }

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

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-140px)] md:min-h-[calc(100vh-160px)]">
      {joined?.code ? (
        <section className="glass flex flex-col flex-1 border border-white/10 rounded-2xl px-3 md:px-6 py-3 md:py-6 shadow-lg min-h-0">
          {/* Mobile room header */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <div className="text-sm text-white/80 font-medium truncate">{joined?.name} • State {joined?.state}</div>
            <button
              onClick={() => setShowMobileDetails((v) => !v)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10"
            >
              {showMobileDetails ? 'Hide' : 'Details'}
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[2.6fr_1fr] gap-4 md:gap-5 flex-1 min-h-0">
            <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 flex-1 min-h-[320px] min-h-0">
              <div
                ref={listRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}
              >
                {messages.map((msg) => {
                  const mine = msg.senderEmail === user?.email
                  const canDelete = !msg._id.startsWith('temp-') && (mine || joined?.isOwner)
                  return (
                    <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group max-w-[70%] rounded-3xl px-4 py-2.5 border ${mine ? 'bg-gradient-to-b from-primary/30 to-primary/20 text-white border-primary/25' : 'bg-gradient-to-b from-white/10 to-white/5 text-white/95 border-white/10'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-[10px] text-white/50">{mine ? 'You' : msg.senderEmail}</div>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => deleteMessage(msg)}
                              disabled={deletingId === msg._id}
                              className={`text-[10px] uppercase tracking-wider ${mine ? 'text-white/60' : 'text-white/40'} hover:text-red-400 transition disabled:opacity-60`}
                            >
                              {deletingId === msg._id ? 'Deleting…' : 'Delete'}
                            </button>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          {!mine && (
                            <span className="text-[10px] text-white/50 shrink-0">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          )}
                          <div className={`text-sm leading-relaxed whitespace-pre-wrap ${mine ? 'text-right' : 'text-left'} flex-1`}>{msg.content}</div>
                          {mine && (
                            <span className="text-[10px] text-white/50 shrink-0">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
              <div
                className="sticky border-t border-white/10 p-3 bg-slate-900/70 backdrop-blur md:backdrop-blur-sm z-10"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
              >
                <div className="flex items-center gap-3 min-w-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
                  <button
                    type="button"
                    onClick={toggleRecord}
                    disabled={sending || transcribing}
                    className={`h-11 w-11 rounded-2xl border transition grid place-items-center ${recording ? 'bg-primary text-white border-primary/50 animate-pulse' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                    title={recording ? 'Stop recording' : 'Voice typing'}
                  >
                    <Mic size={18} />
                  </button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message"
                    name="chat-message"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    inputMode="text"
                    className="flex-1 min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                  <Button onClick={sendMessage} disabled={!messageText.trim() || sending} className="px-3 md:px-5 flex-shrink-0 h-11">
                    {sending ? 'Sending…' : (
                      <>
                        <span className="md:hidden grid place-items-center"><Send size={16} /></span>
                        <span className="hidden md:inline">Send</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop details panel */}
            <div className="hidden lg:flex flex-col space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="text-sm text-white/70 font-medium">Share room access</div>
                <p className="text-xs text-white/45">Copy the invite details and share with trusted alliance members.</p>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 space-y-2 text-xs text-white/70">
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-wider text-white/40">Code</span>
                    <span className="font-mono text-white text-sm break-all">{joined.code}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-wider text-white/40">Password</span>
                    <span className="font-mono text-white text-sm">{currentPassword ? '•'.repeat(5) : 'ask owner'}</span>
                  </div>
                </div>
                <Button variant="subtle" onClick={copyShare}>{copied ? 'Copied!' : 'Copy invite details'}</Button>
              </div>

              {joined?.isOwner && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm text-white/70 font-medium">Owner tools</div>
                  <Input value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} placeholder="Room password" type="password" />
                  <Button variant="danger" onClick={onDeleteRoom} disabled={!deletePwd.trim() || deleting}>{deleting ? 'Deleting…' : 'Delete this room…'}</Button>
                </div>
              )}
            </div>
            {/* Mobile details panel (collapsible) */}
            {showMobileDetails && (
              <div className="lg:hidden space-y-4 mt-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="text-sm text-white/70 font-medium">Share room access</div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 space-y-2 text-xs text-white/70">
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase tracking-wider text-white/40">Code</span>
                      <span className="font-mono text-white text-sm break-all">{joined.code}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase tracking-wider text-white/40">Password</span>
                      <span className="font-mono text-white text-sm">{currentPassword ? '•'.repeat(5) : 'ask owner'}</span>
                    </div>
                  </div>
                  <Button variant="subtle" onClick={copyShare}>{copied ? 'Copied!' : 'Copy invite details'}</Button>
                </div>
                {joined?.isOwner && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="text-sm text-white/70 font-medium">Owner tools</div>
                    <Input value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} placeholder="Room password" type="password" />
                    <Button variant="danger" onClick={onDeleteRoom} disabled={!deletePwd.trim() || deleting}>{deleting ? 'Deleting…' : 'Delete this room…'}</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
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
        </>
      )}
    </div>
  )}
