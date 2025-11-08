import { useEffect, useMemo, useRef, useState } from 'react'
import Input from '../components/Input'
import Button from '../components/Button'
import { useAuth } from '../state/AuthContext'
import api from '../services/api'

const SITE_URL = 'https://wos-giftcode.centurygame.com/'

export default function PrivateRedeem() {
  const { user, setUser } = useAuth()
  const [gameId, setGameId] = useState(user?.gameId || '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const timer = useRef<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [iframeReady, setIframeReady] = useState(false)

  useEffect(() => { setGameId(user?.gameId || '') }, [user?.gameId])

  // Debounced save to your profile
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

  const isNineDigits = /^\d{9}$/.test(gameId.trim())

  const bookmarkletHref = useMemo(() => {
    const id = (gameId || '').trim()
    const js = `javascript:(function(){var id="${id}";try{var inputs=[].slice.call(document.querySelectorAll('input'));var box=inputs.find(x=>/player id|id/i.test(x.placeholder||'')||x.type==='tel'||x.maxLength>=9)||inputs[0];if(box){box.focus();box.value=id;box.dispatchEvent(new Event('input',{bubbles:true}));}var btn=[].slice.call(document.querySelectorAll('button,input[type=button],input[type=submit]')).find(x=>/login/i.test((x.textContent||x.value||'')));if(btn){btn.click();}}catch(e){alert('Autofill failed');}})();`
    return js
  }, [gameId])

  function openInNewTab() {
    window.open(SITE_URL, '_blank', 'noopener,noreferrer')
  }

  async function copyId() {
    try { await navigator.clipboard.writeText(gameId.trim()) } catch {}
  }

  function attemptAutofill() {
    if (!iframeRef.current || !isNineDigits) return
    try {
      const doc = iframeRef.current.contentDocument
      if (!doc) return
      const input = Array.from(doc.querySelectorAll('input')).find((el) => {
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase()
        const aria = (el.getAttribute('aria-label') || '').toLowerCase()
        return placeholder.includes('player') || aria.includes('player') || el.id.toLowerCase().includes('player')
      }) as HTMLInputElement | undefined
      if (input) {
        input.focus()
        input.value = gameId.trim()
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      const loginButton = Array.from(doc.querySelectorAll('button, input[type="button"], input[type="submit"]')).find((el) => {
        const text = (el.textContent || el.getAttribute('value') || '').toLowerCase()
        return text.includes('login')
      }) as HTMLButtonElement | HTMLInputElement | undefined
      if (loginButton) {
        ;(loginButton as HTMLElement).click()
      }
    } catch (err) {
      // cross-origin protection might block access; silently ignore
    }
  }

  useEffect(() => {
    if (!iframeReady || !isNineDigits) return
    const id = setTimeout(() => attemptAutofill(), 650)
    return () => clearTimeout(id)
  }, [iframeReady, gameId, isNineDigits])

  return (
    <div className="space-y-4">
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
            <span className="ml-3">Length:</span>
            <span className={`${isNineDigits ? 'text-emerald-300' : 'text-amber-300'}`}>{gameId.trim().length}/9</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" onClick={copyId}>Copy ID</Button>
          <a className="button h-11 grid place-items-center px-4 rounded-xl" href={bookmarkletHref} title="Drag to bookmarks bar to autofill & login on the official site">Autofill</a>
          <Button onClick={attemptAutofill} disabled={!isNineDigits || !iframeReady} variant="subtle">Retry fill</Button>
          <Button onClick={openInNewTab}>Open site</Button>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden shadow-lg">
        <div className="px-4 py-2 text-xs text-white/60 bg-white/5 border-b border-white/10">
          Official site: wos-giftcode.centurygame.com
        </div>
        <div className="relative h-[70vh] bg-black/20">
          <iframe
            title="Gift Code Center"
            src={SITE_URL}
            className="w-full h-full"
            sandbox="allow-scripts allow-forms allow-popups"
            ref={iframeRef}
            onLoad={() => setIframeReady(true)}
          />
          {!isNineDigits && (
            <div className="absolute inset-x-0 top-2 mx-auto w-fit text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              Enter a 9-digit ID to use Autofill
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-white/45">
        Note: Modern browsers block typing into third‑party pages inside iframes for security. Use the Autofill bookmarklet or the Copy ID + Open site buttons.
      </div>
    </div>
  )
}
