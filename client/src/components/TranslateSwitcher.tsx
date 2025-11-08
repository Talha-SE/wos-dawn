import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Globe, Search, Check } from 'lucide-react'

type Language = { code: string; label: string }

const LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'zh-CN', label: '中文 (Simplified Chinese)' },
  { code: 'zh-TW', label: '中文 (Traditional Chinese)' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'it', label: 'Italiano' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย (Thai)' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'pl', label: 'Polski' },
  { code: 'uk', label: 'Українська' }
]

const DEFAULT_OPTION: Language = { code: '__default', label: 'Default' }
const LANGUAGE_OPTIONS: Language[] = [DEFAULT_OPTION, ...LANGUAGES]

const COUNTRY_TO_LANG: Record<string, string[]> = {
  US: ['en'], GB: ['en'], AU: ['en'], NZ: ['en'], IE: ['en'],
  CA: ['en', 'fr'],
  IN: ['hi', 'en'], PK: ['en'], BD: ['en'],
  ES: ['es'], MX: ['es'], AR: ['es'], CO: ['es'], CL: ['es'], PE: ['es'], VE: ['es'], UY: ['es'], PY: ['es'], BO: ['es'], EC: ['es'], GT: ['es'], HN: ['es'], SV: ['es'], NI: ['es'], CR: ['es'], DO: ['es'], PA: ['es'], PR: ['es'],
  FR: ['fr'], BE: ['fr', 'nl'], CH: ['de', 'fr', 'it'],
  DE: ['de'], AT: ['de'],
  PT: ['pt'], BR: ['pt'],
  JP: ['ja'],
  CN: ['zh-CN'], HK: ['zh-TW', 'zh-CN'], TW: ['zh-TW'], SG: ['zh-CN', 'en'],
  RU: ['ru'],
  SA: ['ar'], AE: ['ar'], EG: ['ar'], QA: ['ar'], KW: ['ar'], JO: ['ar'], MA: ['ar'], DZ: ['ar'], TN: ['ar'], IQ: ['ar'],
  IT: ['it'],
  KR: ['ko'],
  TR: ['tr'],
  VN: ['vi'],
  TH: ['th'],
  MY: ['ms', 'en'],
  ID: ['id'],
  PH: ['en'],
  PL: ['pl'],
  UA: ['uk']
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
    return localStorage.getItem('wos_auto_translate') === '1'
  })

  function persistAuto(v: boolean) {
    setAutoEnabled(v)
    localStorage.setItem('wos_auto_translate', v ? '1' : '0')
  }

  function findLanguageCandidate(code?: string): Language | undefined {
    if (!code) return undefined
    const normalized = code.toLowerCase()
    return LANGUAGES.find((l) => l.code.toLowerCase() === normalized || normalized.startsWith(l.code.toLowerCase()))
  }

  async function detectAndApply() {
    try {
      const resp = await fetch('https://ipapi.co/json/')
      const geo = await resp.json()
      const candidates: string[] = []

      if (typeof geo?.languages === 'string' && geo.languages.trim()) {
        geo.languages.split(',').forEach((lang: string) => {
          const trimmed = lang.trim()
          if (!trimmed) return
          candidates.push(trimmed)
          if (trimmed.includes('-')) candidates.push(trimmed.split('-')[0])
        })
      }

      const countryCodes: string[] = []
      if (geo?.country_code) countryCodes.push(String(geo.country_code).toUpperCase())
      if (geo?.country_calling_code) {
        const cc = String(geo.country_calling_code).replace('+', '')
        if (cc === '1' && geo?.country_name === 'Canada') countryCodes.push('CA')
      }

      countryCodes.forEach((cc) => {
        const mapped = COUNTRY_TO_LANG[cc]
        if (mapped) candidates.push(...mapped)
      })

      const navLanguages = navigator.languages || (navigator.language ? [navigator.language] : [])
      navLanguages.forEach((lang) => {
        if (lang) {
          candidates.push(lang)
          if (lang.includes('-')) candidates.push(lang.split('-')[0])
        }
      })

      candidates.push('en')

      const match = candidates.map((c) => findLanguageCandidate(c)).find(Boolean)
      if (match) {
        applyLanguage(match)
      } else {
        applyLanguage(LANGUAGES[0])
      }
    } catch {
      const navLanguages = navigator.languages || (navigator.language ? [navigator.language] : [])
      const match = navLanguages.map((lang) => findLanguageCandidate(lang)).find(Boolean)
      applyLanguage(match || LANGUAGES[0])
    }
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
  }, [ready, autoEnabled])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyLanguage(lang: Language) {
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
    fadeTimeout = window.setTimeout(() => {
      document.documentElement.classList.remove('translate-fading')
      document.body.classList.remove('translate-fading')
    }, 650)
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
          if (next && ready) detectAndApply()
        }}
        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${autoEnabled ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
        aria-pressed={autoEnabled}
        title="Auto-detect language by IP"
      >
        <Check size={14} className={`${autoEnabled ? 'opacity-100' : 'opacity-50'}`} />
        <span>Auto Translate</span>
      </button>
      <div ref={menuRef} className="relative">
        <div id="google_translate_element_container" className="hidden" />
        <button
          type="button"
          onClick={() => ready && setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:text-white hover:bg-white/10 ${!ready ? 'cursor-not-allowed opacity-60' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe size={16} />
          <span>{current.label}</span>
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
                    onClick={() => applyLanguage(lang)}
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
