import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Globe, Search, Check } from 'lucide-react'

type Language = { code: string; label: string }

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'zh-CN', label: '中文 (Simplified Chinese)' },
  { code: 'zh-TW', label: '中文 (Traditional Chinese)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย (Thai)' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'pl', label: 'Polski' },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский (Russian)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'sv', label: 'Svenska' },
  { code: 'no', label: 'Norsk' },
  { code: 'da', label: 'Dansk' },
  { code: 'fi', label: 'Suomi' },
  { code: 'cs', label: 'Čeština' },
  { code: 'hu', label: 'Magyar' },
  { code: 'ro', label: 'Română' },
  { code: 'el', label: 'Ελληνικά (Greek)' },
  { code: 'he', label: 'עברית (Hebrew)' },
  { code: 'fa', label: 'فارسی (Persian)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'sk', label: 'Slovenčina (Slovak)' },
  { code: 'bg', label: 'Български (Bulgarian)' },
  { code: 'am', label: 'አማርኛ (Amharic)' },
  { code: 'af', label: 'Afrikaans' },
  { code: 'si', label: 'සිංහල (Sinhala)' },
  { code: 'az', label: 'Azərbaycan dili (Azerbaijani)' },
  { code: 'hy', label: 'Հայերեն (Armenian)' },
  { code: 'ka', label: 'ქართული (Georgian)' },
  { code: 'kk', label: 'Қазақ тілі (Kazakh)' },
  { code: 'ky', label: 'Кыргызча (Kyrgyz)' },
  { code: 'km', label: 'ភាសាខ្មែរ (Khmer)' },
  { code: 'lo', label: 'ລາວ (Lao)' },
  { code: 'mn', label: 'Монгол (Mongolian)' },
  { code: 'my', label: 'မြန်မာစာ (Burmese)' },
  { code: 'ne', label: 'नेपाली (Nepali)' },
  { code: 'dv', label: 'ދިވެހި (Dhivehi)' },
  { code: 'ps', label: 'پښتو (Pashto)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'tg', label: 'Тоҷикӣ (Tajik)' },
  { code: 'tk', label: 'Türkmençe (Turkmen)' },
  { code: 'uz', label: "Oʻzbek tili (Uzbek)" },
  { code: 'tl', label: 'Filipino (Tagalog)' },
  { code: 'dz', label: 'རྫོང་ཁ (Dzongkha)' }
]

const DEFAULT_OPTION: Language = { code: '__default', label: 'Default' }
const LANGUAGE_OPTIONS: Language[] = [DEFAULT_OPTION, ...LANGUAGES]

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
  PK: ['ur', 'en'],
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
  const [current, setCurrent] = useState<Language>(DEFAULT_OPTION)
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

  function findLanguageCandidate(code?: string): Language | undefined {
    if (!code) return undefined
    const normalized = code.toLowerCase()
    return LANGUAGES.find((l) => l.code.toLowerCase() === normalized || normalized.startsWith(l.code.toLowerCase()))
  }

  async function detectAndApply() {
    const cacheKey = 'wos_geo_cc'
    const tsKey = 'wos_geo_cc_ts'
    const cached = localStorage.getItem(cacheKey)
    const cachedTs = Number(localStorage.getItem(tsKey) || 0)
    const ttlMs = 24 * 60 * 60 * 1000 // 24h
    if (cached && cachedTs && Date.now() - cachedTs < ttlMs) {
      const cc = cached.toUpperCase()
      const primary = COUNTRY_TO_LANG[cc]?.[0]
      const match = findLanguageCandidate(primary)
      applyLanguage(match || DEFAULT_OPTION, 'auto')
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
      applyLanguage(match || DEFAULT_OPTION)
      return
    }
    // Fallback: try browser language only if CC is missing/unmapped
    const navLanguages: string[] = (navigator.languages as any) || (navigator.language ? [navigator.language] : [])
    const navMatch = navLanguages.map((l) => findLanguageCandidate(l)).find(Boolean)
    applyLanguage(navMatch || DEFAULT_OPTION, 'auto')
  }

  useEffect(() => {
    function initTranslate() {
      if (translateInitialized || !window.google?.translate?.TranslateElement) return
      translateInitialized = true
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map((l) => l.code).join(','),
          autoDisplay: false
        },
        'google_translate_element_container'
      )
      setReady(true)
    }

    if (window.google?.translate?.TranslateElement) {
      initTranslate()
      return
    }

    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      document.body.appendChild(script)
    }

    window.googleTranslateElementInit = () => {
      initTranslate()
    }
  }, [])

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

  function applyLanguage(lang: Language, source: 'manual' | 'auto' = 'manual') {
    const select = document.querySelector<HTMLSelectElement>('#google_translate_element_container select')
    if (!select) {
      setCurrent(lang)
      setOpen(false)
      setQuery('')
      return
    }
    if (fadeTimeout) window.clearTimeout(fadeTimeout)
    document.documentElement.classList.add('translate-fading')
    document.body.classList.add('translate-fading')
    if (lang.code === DEFAULT_OPTION.code) {
      select.selectedIndex = 0
      select.dispatchEvent(new Event('change'))
    } else {
      select.value = lang.code
      select.dispatchEvent(new Event('change'))
    }
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
    // If no manual selection saved or it's default, clear everything
    if (!saved || saved === DEFAULT_OPTION.code) {
      clearGoogTransCookies()
      setCurrent(DEFAULT_OPTION)
      setOpen(false)
      setQuery('')
      const select = document.querySelector<HTMLSelectElement>('#google_translate_element_container select')
      if (select) {
        select.selectedIndex = 0
        select.dispatchEvent(new Event('change'))
      }
      // Force page reload to clear any translation artifacts
      if (document.body.classList.contains('translated-ltr') || document.body.classList.contains('translated-rtl')) {
        window.location.reload()
      }
      return
    }
    const lang = LANGUAGE_OPTIONS.find((l) => l.code === saved) || DEFAULT_OPTION
    applyLanguage(lang, 'manual')
  }

  const filtered = useMemo(() => {
    const base = LANGUAGE_OPTIONS
    if (!query.trim()) return base
    const lower = query.toLowerCase()
    return base.filter((lang) => lang.label.toLowerCase().includes(lower) || lang.code.toLowerCase().includes(lower))
  }, [query])

  return (
    <div ref={wrapperRef} className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const next = !autoEnabled
          persistAuto(next)
          if (next && ready) {
            // Turning auto ON - detect and apply
            detectAndApply()
          } else {
            // Turning auto OFF - restore manual or clear to default
            const manualLang = localStorage.getItem('wos_manual_lang')
            if (!manualLang || manualLang === DEFAULT_OPTION.code) {
              // No manual selection, go back to default (no translation)
              clearGoogTransCookies()
              setCurrent(DEFAULT_OPTION)
              const select = document.querySelector<HTMLSelectElement>('#google_translate_element_container select')
              if (select) {
                select.selectedIndex = 0
                select.dispatchEvent(new Event('change'))
              }
              // Reload to ensure clean state
              setTimeout(() => window.location.reload(), 100)
            } else {
              // Restore the manual selection
              restoreManual()
            }
          }
        }}
        className={`flex items-center gap-2 rounded-full border px-2.5 py-2 text-sm whitespace-nowrap transition ${autoEnabled ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300' : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
        aria-pressed={autoEnabled}
        title={autoEnabled ? 'Disable auto-translate' : 'Enable auto-translate by IP detection'}
      >
        <Check size={14} className={`${autoEnabled ? 'text-emerald-300 opacity-100' : 'opacity-50'}`} />
        <span className={`hidden sm:inline ${autoEnabled ? 'text-emerald-300 font-medium' : ''}`}>Auto Translate</span>
        <span className={`sm:hidden ${autoEnabled ? 'text-emerald-300 font-medium' : ''}`}>Auto</span>
      </button>
      <div ref={menuRef} className="relative">
        <div id="google_translate_element_container" className="hidden" />
        <button
          type="button"
          onClick={() => ready && setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-2 text-sm text-white/70 transition hover:text-white hover:bg-white/10 ${!ready ? 'cursor-not-allowed opacity-60' : ''} max-w-[42vw] sm:max-w-none whitespace-nowrap overflow-hidden text-ellipsis`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe size={16} />
          <span className="hidden sm:inline">{current.label}</span>
          <span className="sm:hidden uppercase">{current.code}</span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && ready && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-xl p-2 z-50">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/70">
              <Search size={14} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search language"
                className="flex-1 bg-transparent text-white placeholder-white/40 focus:outline-none"
              />
            </div>
            <ul className="mt-2 max-h-64 overflow-y-auto text-sm text-white/80" role="listbox">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-xs text-white/40">No matches found</li>
              )}
              {filtered.map((lang) => (
                <li key={lang.code}>
                  <button
                    type="button"
                    onClick={() => {
                      if (lang.code === DEFAULT_OPTION.code) {
                        try {
                          persistAuto(false)
                          localStorage.setItem('wos_manual_lang', DEFAULT_OPTION.code)
                          localStorage.removeItem('wos_geo_cc')
                          localStorage.removeItem('wos_geo_cc_ts')
                          // Clear Google Translate cookie variants
                          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
                          const host = window.location.hostname
                          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${host}`
                          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}`
                        } catch {}
                        window.location.reload()
                      } else {
                        applyLanguage(lang, 'manual')
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition hover:bg-white/10 ${current.code === lang.code ? 'bg-primary/20 text-primary' : ''}`}
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
