import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Button from '../components/Button'
import api from '../services/api'
import { Settings, Mic, Send } from 'lucide-react'

type Msg = { role: 'user' | 'assistant' | 'system'; content: string; imageUrls?: string[] }

type AssistantPayload = {
  text: string
  images: string[]
  toolFiles: Array<{ id: string; mime?: string; name?: string }>
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...slice)
  }
  if (typeof btoa === 'function') return btoa(binary)
  const nodeBuffer = (globalThis as any)?.Buffer
  if (nodeBuffer) return nodeBuffer.from(binary, 'binary').toString('base64')
  return ''
}

function extractAssistantPayload(payload: any): AssistantPayload {
  const visited = new WeakSet<object>()
  const textParts: string[] = []
  const images: string[] = []
  const toolFiles: AssistantPayload['toolFiles'] = []
  const allowedTextKeys = new Set(['text', 'output_text', 'content', 'caption', 'value', 'markdown', 'html'])

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

  function pushToolFile(id: string | undefined, mime?: string, name?: string) {
    if (!id) return
    if (!toolFiles.find((t) => t.id === id)) toolFiles.push({ id, mime, name })
  }

  function walk(node: any, ctx?: string): void {
    if (node == null) return
    if (typeof node === 'string') {
      if (!ctx || !allowedTextKeys.has(ctx)) return
      const trimmed = node.trim()
      if (!trimmed) return
      if (/^[A-Za-z0-9_.-]+$/.test(trimmed) && !/[\s,.;:!?]/.test(trimmed)) return
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          walk(JSON.parse(trimmed), ctx)
        } catch {
          textParts.push(trimmed)
        }
      } else {
        textParts.push(trimmed)
      }
      return
    }

    if (Array.isArray(node)) {
      node.forEach((value) => walk(value, ctx))
      return
    }

    if (typeof node === 'object') {
      if (visited.has(node)) return
      visited.add(node)

      if (typeof (node as any).text === 'string') walk((node as any).text, 'text')
      if (typeof (node as any).output_text === 'string') walk((node as any).output_text, 'output_text')
      if (typeof (node as any).b64_json === 'string') pushImage((node as any).b64_json, (node as any).mime_type)
      if (typeof (node as any).imageBase64 === 'string') pushImage((node as any).imageBase64, (node as any).mimeType)
      if (typeof (node as any).image_url === 'string') pushImage((node as any).image_url)
      if (typeof (node as any).url === 'string' && /\.(png|jpe?g|gif|webp)(\?|$)/i.test((node as any).url)) pushImage((node as any).url)
      if (
        (typeof (node as any).type === 'string' && (node as any).type === 'tool_file' && typeof (node as any).file_id === 'string') ||
        (typeof (node as any).file_id === 'string' && (
          (typeof (node as any).mime_type === 'string' && (node as any).mime_type.startsWith('image/')) ||
          (typeof (node as any).content_type === 'string' && (node as any).content_type.startsWith('image/')) ||
          (typeof (node as any).file_name === 'string' && /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test((node as any).file_name))
        ))
      ) {
        const id = (node as any).file_id as string
        const mime = (node as any).mime_type || (node as any).content_type
        const name = (node as any).file_name
        pushToolFile(id, mime, name)
      }

      Object.entries(node).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'object' || Array.isArray(value)) walk(value, key)
      })
    }
  }

  walk(payload)
  const text = textParts.join('\n\n').trim()
  return { text, images, toolFiles }
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

  const MarkdownCode = ({ inline, className, children, ...props }: any) => (
    inline ? (
      <code className={`bg-black/30 rounded px-1.5 py-0.5 ${className||''}`} {...props}>{children}</code>
    ) : (
      <pre className={className} {...props}><code>{children}</code></pre>
    )
  )

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
      const cleaned = assistant.text || (assistant.images.length || assistant.toolFiles.length ? '' : 'I could not parse the response.')

      let urls = assistant.images
      if (!urls.length && assistant.toolFiles.length) {
        try {
          const responses = await Promise.all(
            assistant.toolFiles.map(async (file) => {
              const response = await api.get<ArrayBuffer>(`/ai/tool-file/${file.id}`, {
                responseType: 'arraybuffer'
              })
              const mime = file.mime || response.headers['content-type'] || 'image/png'
              const base64 = arrayBufferToBase64(response.data)
              return base64 ? `data:${mime};base64,${base64}` : ''
            })
          )
          urls = responses.filter(Boolean)
        } catch (err) {
          console.error('Failed to fetch tool files', err)
        }
      }

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: cleaned,
          imageUrls: urls.length ? urls : undefined
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
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 md:px-8 space-y-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 108px)' }}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/45 text-sm">
            Start a conversation with your AI assistant
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] md:max-w-[60%] rounded-3xl px-4 py-3 md:px-5 md:py-3 shadow-sm space-y-3 ${m.role === 'user' ? 'bg-gradient-to-b from-primary/40 to-primary/25 text-white border border-primary/30' : 'bg-white/10 text-white/90 border border-white/15'}`}>
              {m.content && (
                m.role === 'assistant' ? (
                  <div className="markdown-body text-sm leading-relaxed break-words [&_pre]:bg-black/30 [&_pre]:border [&_pre]:border-white/10 [&_pre]:rounded-xl [&_pre]:p-3 [&_code]:text-[13px] [&_code]:font-mono [&_h1]:text-lg [&_h2]:text-base [&_h1,h2]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_table]:w-full [&_th,td]:border [&_th,td]:border-white/10 [&_th,td]:p-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent underline" />,
                        code: MarkdownCode
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</div>
                )
              )}
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

      <div
        className="fixed left-0 right-0 z-40 px-3 pt-2 md:px-10"
        style={{ bottom: '0', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
      >
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
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
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
            className="flex-1 min-w-0 h-11 px-4 bg-white/5 border border-white/10 rounded-2xl md:rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
          />
          <Button onClick={send} disabled={!text.trim() || loading} className="h-11 rounded-2xl md:rounded-full px-3 md:px-6 flex-shrink-0">
            {loading ? 'Sending…' : (
              <>
                <span className="md:hidden grid place-items-center"><Send size={16} /></span>
                <span className="hidden md:inline">Send</span>
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}
