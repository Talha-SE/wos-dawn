const SW_PATH = '/notification-sw.js'
const PROMPT_KEY = 'wos_notifications_prompt_at'
const PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 6 // 6 hours
const ROOM_TS_PREFIX = 'wos_room_notification_ts_'

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

function safeNow(): number {
  try {
    return Date.now()
  } catch {
    return 0
  }
}

function readNumber(key: string): number {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    return raw ? Number(raw) : 0
  } catch {
    return 0
  }
}

function writeNumber(key: string, value: number) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(value))
    }
  } catch {
    // ignore quota errors
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export async function bootstrapNotificationChannel(): Promise<ServiceWorkerRegistration | null> {
  if (!isNotificationSupported()) return null
  if (!('serviceWorker' in navigator)) return null
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SW_PATH, { scope: '/' })
      .catch(() => null)
  }
  try {
    const registered = await registrationPromise
    if (registered) return registered
    if ('serviceWorker' in navigator) {
      return await navigator.serviceWorker.ready
    }
  } catch {
    // swallow
  }
  return null
}

export async function gentlyRequestNotificationPermission(force = false): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const now = safeNow()
  if (!force) {
    const lastPrompt = readNumber(PROMPT_KEY)
    if (lastPrompt && now - lastPrompt < PROMPT_COOLDOWN_MS) {
      return false
    }
  }
  writeNumber(PROMPT_KEY, now)

  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

function normaliseMessage(message?: string | null): string {
  if (!message) return 'New alliance message awaiting you'
  const condensed = message.replace(/\s+/g, ' ').trim()
  if (!condensed) return 'New alliance message awaiting you'
  return condensed.length > 160 ? `${condensed.slice(0, 157)}…` : condensed
}

export interface RoomNotificationPayload {
  roomCode: string
  roomName: string
  senderName?: string | null
  message?: string | null
  roomUrl?: string
  timestamp?: number
}

export async function showRoomNotification(payload: RoomNotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) return false

  const permission = Notification.permission
  if (permission !== 'granted') {
    if (permission === 'default') {
      const granted = await gentlyRequestNotificationPermission()
      if (!granted) return false
    } else {
      return false
    }
  }

  const registration = await bootstrapNotificationChannel()
  if (!registration) return false

  const timestamp = payload.timestamp ?? safeNow()
  const cacheKey = `${ROOM_TS_PREFIX}${payload.roomCode}`
  const lastShown = readNumber(cacheKey)
  if (lastShown && timestamp <= lastShown) {
    return false
  }

  const senderLabel = payload.senderName && payload.senderName.trim()
    ? payload.senderName.trim()
    : 'New message'
  const messageBody = normaliseMessage(payload.message)
  const body = `${senderLabel}: ${messageBody}`
  const tag = `alliance-room-${payload.roomCode}`
  const roomUrl = payload.roomUrl || `/dashboard/alliance-chat/${payload.roomCode}`

  try {
    await registration.showNotification(`${payload.roomName} • Alliance Chat`, {
      body,
      icon: '/notification-icon.svg',
      badge: '/notification-icon.svg',
      tag,
      data: {
        url: roomUrl,
        roomUrl,
        roomCode: payload.roomCode,
        timestamp
      }
    })
    writeNumber(cacheKey, timestamp)
    return true
  } catch {
    return false
  }
}
