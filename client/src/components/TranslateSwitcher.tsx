import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Globe, Search, Check } from 'lucide-react'
import { LANGUAGES, LANGUAGE_OPTIONS, NONE_OPTION, type LanguageOption } from '../constants/languages'
const GOOGLE_TRANSLATE_OVERLAYS = ['#goog-gt-tt', '.goog-te-banner-frame', '.goog-te-balloon-frame', 'iframe.goog-te-menu-frame']
const TRANSLATE_CONTAINER_ID = 'google_translate_element_container'

const COUNTRY_TO_LANG: Record<string, string[]> = {
  // Americas
  US: ['en'],
  CA: ['en', 'fr'],
  MX: ['es'],
  GT: ['es'],
  HN: ['es'],
  SV: ['es'],
  NI: ['es'],
  CR: ['es'],
  DO: ['es'],
  PA: ['es'],
  PR: ['es'],
  AR: ['es'],
  BO: ['es'],
  CL: ['es'],
  CO: ['es'],
  EC: ['es'],
  PE: ['es'],
  PY: ['es'],
  UY: ['es'],
  VE: ['es'],
  BR: ['pt'],

  // Europe
  GB: ['en'],
  IE: ['en'],
  ES: ['es'],
  FR: ['fr'],
  BE: ['fr', 'nl'],
  NL: ['nl'],
  LU: ['fr', 'de'],
  DE: ['de'],
  AT: ['de'],
  CH: ['de', 'fr', 'it'],
  PT: ['pt'],
  IT: ['it'],
  PL: ['pl'],
  CZ: ['cs'],
  SK: ['sk', 'cs'],
  HU: ['hu'],
  RO: ['ro'],
  BG: ['bg'],
  GR: ['el'],
  SE: ['sv'],
  NO: ['no'],
  DK: ['da'],
  FI: ['fi'],
  UA: ['uk'],
  RU: ['ru'],
  CY: ['el', 'tr'],

  // Middle East & North Africa
  MA: ['ar'],
  DZ: ['ar'],
  TN: ['ar'],
  EG: ['ar'],
  SA: ['ar'],
  AE: ['ar'],
  QA: ['ar'],
  KW: ['ar'],
  BH: ['ar'],
  OM: ['ar'],
  JO: ['ar'],
  SY: ['ar'],
  LB: ['ar'],
  IQ: ['ar'],
  YE: ['ar'],
  IR: ['fa'],
  TR: ['tr'],
  IL: ['he'],
  PS: ['ar'],

  // South & Central Asia
  AF: ['fa', 'ps'],
  AM: ['hy'],
  AZ: ['az'],
  GE: ['ka'],
  KZ: ['kk', 'ru'],
  KG: ['ky', 'ru'],
  TJ: ['tg'],
  TM: ['tk'],
  UZ: ['uz'],
  NP: ['ne'],
  IN: ['hi', 'en', 'ta', 'mr', 'bn', 'gu'],
  PK: ['en', 'ur'],
  BD: ['bn', 'en'],
  LK: ['si', 'ta', 'en'],
  MV: ['dv'],
  BT: ['dz'],

  // East & Southeast Asia
  CN: ['zh-CN'],
  HK: ['zh-TW', 'zh-CN'],
  MO: ['zh-CN', 'pt'],
  TW: ['zh-TW'],
  JP: ['ja'],
  KP: ['ko'],
  KR: ['ko'],
  MN: ['mn'],
  ID: ['id'],
  MY: ['ms', 'en'],
  SG: ['ms', 'en', 'zh-CN', 'ta'],
  BN: ['ms'],
  TH: ['th'],
  LA: ['lo'],
  KH: ['km'],
  VN: ['vi'],
  PH: ['tl', 'en'],
  TL: ['pt'],
  MM: ['my'],

  // Oceania & others
  AU: ['en'],
  NZ: ['en'],
  KE: ['sw', 'en'],
  TZ: ['sw'],
  UG: ['sw', 'en'],
  ZA: ['en', 'af'],
  ET: ['am', 'en'],
  NG: ['en'],
  GH: ['en'],
}

declare global {
  interface Window {
    google?: any
    googleTranslateElementInit?: () => void
  }
}

let translateInitialized = false
let fadeTimeout: number | undefined

export default function TranslateSwitcher() {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [current, setCurrent] = useState<LanguageOption>(NONE_OPTION)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [autoEnabled, setAutoEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('wos_auto_translate')
    if (stored === null) {
      localStorage.setItem('wos_auto_translate', '1')
      return true
    }
    return stored === '1'
  })

  function persistAuto(v: boolean) {
    setAutoEnabled(v)
    localStorage.setItem('wos_auto_translate', v ? '1' : '0')
  }

  function clearGoogTransCookies() {
    try {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
      const host = window.location.hostname
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${host}`
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`
    } catch {}
  }

  function findLanguageCandidate(code?: string): LanguageOption | undefined {
    if (!code) return undefined
    const normalized = code.toLowerCase()
    return LANGUAGES.find((l) => l.code.toLowerCase() === normalized || normalized.startsWith(l.code.toLowerCase()))
  }

  const getTranslateSelect = () => document.querySelector<HTMLSelectElement>(`#${TRANSLATE_CONTAINER_ID} select`)

  const dispatchSelectChange = (select: HTMLSelectElement) => {
    const event = new Event('change', { bubbles: true })
    select.dispatchEvent(event)
  }

  const initTranslate = useCallback(() => {
    if (translateInitialized) return
    if (!window.google?.translate?.TranslateElement) return
    try {
      translateInitialized = true
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map((l) => l.code).join(','),
          autoDisplay: false
        },
        TRANSLATE_CONTAINER_ID
      )
      setReady(true)
    } catch {
      translateInitialized = false
    }
  }, [])

  const initTranslateWithRetry = useCallback((attempt = 0) => {
    if (translateInitialized) return
    if (window.google?.translate?.TranslateElement) {
      initTranslate()
      return
    }
    if (attempt < 6) {
      window.setTimeout(() => initTranslateWithRetry(attempt + 1), 350)
    }
  }, [initTranslate])

  function clearAllTranslationData(options: { preserveDom?: boolean } = {}) {
    const { preserveDom = false } = options
    // Clear cookies
    clearGoogTransCookies()

    // Clear localStorage
    try {
      localStorage.removeItem('wos_manual_lang')
      localStorage.removeItem('wos_geo_cc')
      localStorage.removeItem('wos_geo_cc_ts')
    } catch {}

    // Clear sessionStorage if any translation data exists
    try {
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.includes('googtrans') || key.includes('translate')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch {}

    // Clear Cache Storage entries (best-effort)
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key).catch(() => undefined)
          })
        }).catch(() => undefined)
      }
    } catch {}

    // Unregister service workers related to translations (best-effort)
    try {
      if (navigator.serviceWorker?.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => {
            if (reg.active?.scriptURL.includes('translate')) {
              reg.unregister().catch(() => undefined)
            }
          })
        }).catch(() => undefined)
      }
    } catch {}

    // Reset resource timings to avoid stale translation responses
    try {
      window.performance?.clearResourceTimings?.()
    } catch {}

    // Reset Google Translate element
    const select = getTranslateSelect()
    if (select) {
      select.selectedIndex = 0
      dispatchSelectChange(select)
    } else if (translateInitialized) {
      translateInitialized = false
      setReady(false)
      initTranslateWithRetry()
    }

    // Remove translation classes from body
    document.body.classList.remove('translated-ltr', 'translated-rtl')
    document.documentElement.classList.remove('translated-ltr', 'translated-rtl')

    // Remove any Google Translate overlays without destroying the gadget itself
    const overlaySelectors = preserveDom
      ? GOOGLE_TRANSLATE_OVERLAYS.filter((selector) => selector !== 'iframe.goog-te-menu-frame')
      : GOOGLE_TRANSLATE_OVERLAYS
    const extraSelectors = preserveDom ? [] : ['[id^="goog-gt-"]']
    const selectors = [...overlaySelectors, ...extraSelectors]
    const gtElements = selectors.length ? document.querySelectorAll(selectors.join(',')) : []
    gtElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el)
    })
  }

  async function detectAndApply() {
    clearAllTranslationData({ preserveDom: true })
    const cacheKey = 'wos_geo_cc'
    const tsKey = 'wos_geo_cc_ts'
    const cached = localStorage.getItem(cacheKey)
    const cachedTs = Number(localStorage.getItem(tsKey) || 0)
    const ttlMs = 24 * 60 * 60 * 1000 // 24h
    if (cached && cachedTs && Date.now() - cachedTs < ttlMs) {
      const cc = cached.toUpperCase()
      const primary = COUNTRY_TO_LANG[cc]?.[0]
      const match = findLanguageCandidate(primary)
      applyLanguage(match || NONE_OPTION, 'auto')
      return
    }
    async function getCC(): Promise<string | undefined> {
      try {
        const r1 = await fetch('https://ipapi.co/json/')
        const j1 = await r1.json().catch(() => ({}))
        if (j1?.country_code) return String(j1.country_code)
      } catch { /* noop */ }
      try {
        const r2 = await fetch('https://ipwho.is/?fields=country_code')
        const j2 = await r2.json().catch(() => ({}))
        if (j2?.country_code) return String(j2.country_code)
      } catch { /* noop */ }
      return undefined
    }
    const code = await getCC()
    const cc = String(code || '').toUpperCase()
    if (cc) { localStorage.setItem(cacheKey, cc); localStorage.setItem(tsKey, String(Date.now())) }
    if (cc && COUNTRY_TO_LANG[cc]?.length) {
      const primary = COUNTRY_TO_LANG[cc][0]
      const match = findLanguageCandidate(primary)
      applyLanguage(match || NONE_OPTION)
      return
    }
    // Fallback: try browser language only if CC is missing/unmapped
    const navLanguages: string[] = (navigator.languages as any) || (navigator.language ? [navigator.language] : [])
    const navMatch = navLanguages.map((l) => findLanguageCandidate(l)).find(Boolean)
    applyLanguage(navMatch || NONE_OPTION, 'auto')
  }

  useEffect(() => {
    if (window.google?.translate?.TranslateElement) {
      initTranslate()
    } else {
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script')
        script.id = 'google-translate-script'
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
        document.body.appendChild(script)
      }

      window.googleTranslateElementInit = () => {
        initTranslate()
      }

      initTranslateWithRetry()
    }

    return () => {
      if (window.googleTranslateElementInit === initTranslate) {
        window.googleTranslateElementInit = undefined
      }
    }
  }, [initTranslate, initTranslateWithRetry])

  useEffect(() => {
    if (ready && autoEnabled) detectAndApply()
    if (ready && !autoEnabled) restoreManual()
  }, [ready, autoEnabled])

  useEffect(() => {
    function onPageShow() {
      if (ready && autoEnabled) detectAndApply()
      if (ready && !autoEnabled) restoreManual()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [ready, autoEnabled])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyLanguage(lang: LanguageOption, source: 'manual' | 'auto' = 'manual', attempt = 0) {
    if (lang.code === NONE_OPTION.code) {
      clearAllTranslationData()
      setCurrent(lang)
      setOpen(false)
      setQuery('')
      if (source === 'manual') {
        try { localStorage.setItem('wos_manual_lang', NONE_OPTION.code) } catch {}
      }
      return
    }

    const select = getTranslateSelect()
    if (!select) {
      initTranslateWithRetry()
      if (attempt < 6) {
        window.setTimeout(() => applyLanguage(lang, source, attempt + 1), 300)
      }
      return
    }

    if (fadeTimeout) window.clearTimeout(fadeTimeout)
    document.documentElement.classList.add('translate-fading')
    document.body.classList.add('translate-fading')

    select.value = lang.code
    dispatchSelectChange(select)

    setCurrent(lang)
    setOpen(false)
    setQuery('')
    if (source === 'manual') {
      try { localStorage.setItem('wos_manual_lang', lang.code) } catch {}
    }
    fadeTimeout = window.setTimeout(() => {
      document.documentElement.classList.remove('translate-fading')
      document.body.classList.remove('translate-fading')
    }, 650)
  }

  function restoreManual() {
    const saved = localStorage.getItem('wos_manual_lang')
    // If no manual selection saved or it's "None", clear everything
    if (!saved || saved === NONE_OPTION.code) {
      clearAllTranslationData()
      setCurrent(NONE_OPTION)
      setOpen(false)
      setQuery('')
      // Force page reload to clear any translation artifacts
      if (document.body.classList.contains('translated-ltr') || document.body.classList.contains('translated-rtl')) {
        // no-op
      }
      return
    }
    const lang = LANGUAGE_OPTIONS.find((l) => l.code === saved) || NONE_OPTION
    clearAllTranslationData({ preserveDom: true })
    applyLanguage(lang, 'manual')
  }

  const filtered = useMemo(() => {
    const base = LANGUAGE_OPTIONS
    if (!query.trim()) return base
    const lower = query.toLowerCase()
    return base.filter((lang) => lang.label.toLowerCase().includes(lower) || lang.code.toLowerCase().includes(lower))
  }, [query])

  return (
    <div ref={wrapperRef} className="flex items-center gap-1.5 md:gap-2">
      <button
        type="button"
        onClick={() => {
          const next = !autoEnabled
          persistAuto(next)
          if (next) {
            clearAllTranslationData({ preserveDom: true })
          }
          if (next && ready) {
            // Turning auto ON - detect and apply
            detectAndApply()
          } else {
            // Turning auto OFF - restore manual or clear to none (no translation)
            const manualLang = localStorage.getItem('wos_manual_lang')
            if (!manualLang || manualLang === NONE_OPTION.code) {
              // No manual selection, go back to none (no translation)
              clearAllTranslationData()
              setCurrent(NONE_OPTION)
              // Reload to ensure clean state
              // no-op
            } else {
              // Restore the manual selection
              restoreManual()
            }
          }
        }}
        className={`flex items-center gap-2 rounded-full border transition h-10 md:px-2.5 md:py-2 ${autoEnabled ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' : 'bg-slate-900/90 border-white/15 text-white/80 hover:text-white hover:bg-slate-800/90'} md:w-auto w-10 justify-center md:justify-start`}
        aria-pressed={autoEnabled}
        title={autoEnabled ? 'Auto-translate enabled' : 'Auto-translate disabled'}
      >
        <Check size={18} className={`${autoEnabled ? 'text-emerald-400' : 'text-white/50'} md:w-3.5 md:h-3.5`} />
        <span className={`hidden md:inline text-sm whitespace-nowrap ${autoEnabled ? 'text-emerald-300 font-medium' : ''}`}>Auto Translate</span>
      </button>
      <div ref={menuRef} className="relative">
        <div id="google_translate_element_container" className="hidden" />
        <button
          type="button"
          onClick={() => ready && setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/90 transition hover:text-white hover:bg-slate-800 h-10 ${!ready ? 'cursor-not-allowed opacity-60' : ''} md:px-3 md:py-2 w-10 md:w-auto justify-center md:justify-start text-white/80`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe size={18} className="md:w-4 md:h-4" />
          <span className="hidden md:inline text-sm whitespace-nowrap">{current.label}</span>
          <ChevronDown size={14} className={`hidden md:inline transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && ready && (
          <div className="absolute left-0 md:right-0 md:left-auto mt-2 w-64 rounded-2xl border border-white/15 bg-slate-950 shadow-2xl backdrop-blur-lg p-2 z-50">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-white/15 px-3 py-2 text-sm text-white/75">
              <Search size={14} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search language"
                className="flex-1 bg-transparent text-white placeholder-white/50 focus:outline-none"
              />
            </div>
            <ul className="mt-2 max-h-64 overflow-y-auto text-sm text-white/85" role="listbox">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-xs text-white/50">No matches found</li>
              )}
              {filtered.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => {
                      if (lang.code === NONE_OPTION.code) {
                        // Turn off all translations and clear cache
                        try {
                          persistAuto(false)
                          clearAllTranslationData()
                          localStorage.setItem('wos_manual_lang', NONE_OPTION.code)
                        } catch {}
                        setCurrent(NONE_OPTION)
                        setOpen(false)
                        setQuery('')
                        // Reload to ensure completely clean state
                        // no-op
                      } else {
                        clearAllTranslationData({ preserveDom: true })
                        applyLanguage(lang, 'manual')
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition hover:bg-slate-800/70 ${current.code === lang.code ? 'bg-primary/25 text-primary' : ''}`}
                    role="option"
                    aria-selected={current.code === lang.code}
                  >
                    {lang.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
