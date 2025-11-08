import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Button from '../components/Button'
import api from '../services/api'
import { Settings, Mic } from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string; imageUrls?: string[] }

type AssistantPayload = { text: string; images: string[] }

function extractAssistantPayload(payload: any): AssistantPayload {
  const visited = new WeakSet<object>()
  const textParts: string[] = []
  const images: string[] = []

  function pushImage(src: string | undefined, mime?: string) {
    if (!src) return
    let url = src
    if (src.startsWith('data:') || src.startsWith('http')) {
      url = src
    } else if (/^https?:\/\//i.test(src)) {
      url = src
    } else if (/^[A-Za-z0-9+/=]+$/.test(src.replace(/\s+/g, ''))) {
      const safeMime = mime || 'image/png'
      url = `data:${safeMime};base64,${src}`
    }
    if (!images.includes(url)) images.push(url)
  }

  function walk(node: any): void {
    if (node == null) return
    if (typeof node === 'string') {
      const trimmed = node.trim()
      if (!trimmed) return
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          walk(JSON.parse(trimmed))
        } catch {
          textParts.push(trimmed)
        }
      } else {
        textParts.push(trimmed)
      }
      return
    }

    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    if (typeof node === 'object') {
      if (visited.has(node)) return
      visited.add(node)

      if (typeof (node as any).text === 'string') walk((node as any).text)
      if (typeof (node as any).b64_json === 'string') pushImage((node as any).b64_json, (node as any).mime_type)
      if (typeof (node as any).imageBase64 === 'string') pushImage((node as any).imageBase64, (node as any).mimeType)
      if (typeof (node as any).image_url === 'string') pushImage((node as any).image_url)
      if (typeof (node as any).url === 'string' && /\.(png|jpe?g|gif|webp)(\?|$)/i.test((node as any).url)) pushImage((node as any).url)

      Object.values(node).forEach((value) => {
        if (typeof value === 'string' || typeof value === 'object') walk(value)
      })
    }
  }

  walk(payload)
  const text = textParts.join('\n\n').trim()
  return { text, images }
}

export default function ChatAi() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [tools, setTools] = useState<{ web_search: boolean; image_generation: boolean }>({ web_search: false, image_generation: false })
  const [showTools, setShowTools] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const mediaRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  function scrollToBottom() {
    if (!listRef.current) return
    // Wait for layout to settle, then snap to bottom of the scroll container
    requestAnimationFrame(() => {
      const el = listRef.current!
      el.scrollTop = el.scrollHeight
    })
  }

  useLayoutEffect(() => { scrollToBottom() }, [messages.length, loading])

  async function send() {
    const content = text.trim()
    if (!content || loading) return
    const next: Msg = { role: 'user', content }
    setMessages((m) => [...m, next])
    setText('')
    setLoading(true)
    try {
      const nextMessages = [...messages, next]
      const { data } = await api.post('/ai/chat', {
        messages: nextMessages,
        toolsEnabled: {
          web_search: tools.web_search,
          image_generation: tools.image_generation,
        },
      })

      const assistant = extractAssistantPayload(data)
      const cleaned = assistant.text || (assistant.images.length ? '' : 'I could not parse the response.')

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: cleaned,
          imageUrls: assistant.images.length ? assistant.images : undefined
        }
      ])
    } catch (e: any) {
      const err = e?.response?.data?.message || e?.message || 'Request failed'
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${err}` }])
    } finally {
      setLoading(false)
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) send()
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
          if (t) setText((prev) => (prev ? prev + ' ' + t : t))
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

  return (
    <div className="relative flex flex-col min-h-[calc(100vh-120px)] min-h-0 mt-2 md:mt-6">
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-8 pb-40 space-y-5">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/45 text-sm">
            Start a conversation with your AI assistant
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] md:max-w-[60%] rounded-3xl px-4 py-3 md:px-5 md:py-3 shadow-sm space-y-3 ${m.role === 'user' ? 'bg-gradient-to-b from-primary/40 to-primary/25 text-white border border-primary/30' : 'bg-white/10 text-white/90 border border-white/15'}`}>
              {m.content && <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</div>}
              {m.imageUrls && m.imageUrls.length > 0 && (
                <div className={`grid gap-2 ${m.imageUrls.length > 1 ? 'grid-cols-2' : ''}`}>
                  {m.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Generated"
                      className="w-full rounded-2xl border border-white/10 object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[60%] rounded-3xl px-4 py-3 bg-white/10 text-white/70 text-sm">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[env(safe-area-inset-bottom)] pt-2 md:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl md:rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-xl px-3 md:px-4 py-2.5 md:py-3">
        {showTools && (
          <div className="mb-3 flex items-center gap-3 pb-3 border-b border-white/10">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-white/10 transition">
                <input type="checkbox" className="peer absolute inset-0 opacity-0 cursor-pointer" checked={tools.web_search} onChange={(e) => setTools((t) => ({ ...t, web_search: e.target.checked }))} />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4 peer-checked:bg-primary" />
              </span>
              Web search
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-white/10 transition">
                <input type="checkbox" className="peer absolute inset-0 opacity-0 cursor-pointer" checked={tools.image_generation} onChange={(e) => setTools((t) => ({ ...t, image_generation: e.target.checked }))} />
                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4 peer-checked:bg-primary" />
              </span>
              Image generation
            </label>
          </div>
        )}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowTools((v) => !v)}
            className={`h-11 w-11 rounded-2xl border transition grid place-items-center md:h-11 md:w-11 ${showTools ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
            title="Toggle tools"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={toggleRecord}
            disabled={loading || transcribing}
            className={`h-11 w-11 rounded-2xl border transition grid place-items-center ${recording ? 'bg-primary text-white border-primary/50 animate-pulse' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
            title={recording ? 'Stop recording' : 'Voice typing'}
          >
            <Mic size={18} />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask anything"
            className="flex-1 h-11 px-4 bg-white/5 border border-white/10 rounded-2xl md:rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
          />
          <Button onClick={send} disabled={!text.trim() || loading} className="h-11 rounded-2xl md:rounded-full px-5 md:px-6">{loading ? 'Sending…' : 'Send'}</Button>
        </div>
        </div>
      </div>
    </div>
  )
}
