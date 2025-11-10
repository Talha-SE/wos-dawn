import { Router, Response } from 'express'
import { Types } from 'mongoose'
import bcrypt from 'bcryptjs'
import { requireAuth, AuthRequest } from '../middleware/auth'
import AllianceRoom from '../models/AllianceRoom'
import AllianceMembership from '../models/AllianceMembership'
import AllianceMessage from '../models/AllianceMessage'
import { User } from '../models/User'

const router = Router()
type Client = { res: Response }

// List rooms current user has joined (including owner)
router.get('/my-rooms', requireAuth, async (req: AuthRequest, res) => {
  try {
    const memberships = await AllianceMembership.find({ userId: req.userId }).lean()
    const codes = memberships.map((m) => m.roomCode)
    if (codes.length === 0) return res.json([])
    const rooms = await AllianceRoom.find({ code: { $in: codes } })
      .select('code name state -_id')
      .lean()
    // Maintain membership order (most recent first)
    const order = new Map(codes.map((c, i) => [c, i]))
    rooms.sort((a: any, b: any) => (order.get(a.code)! - order.get(b.code)!))
    res.json(rooms)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to list my rooms' })
  }
})

// Room meta (name/state) with isOwner and isMember flags
router.get('/rooms/:code/meta', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const room = await AllianceRoom.findOne({ code })
    if (!room) return res.status(404).json({ message: 'Room not found' })
    const isOwner = String(room.createdBy) === String(req.userId)
    const isMember = !!(await AllianceMembership.findOne({ roomCode: code, userId: req.userId }))

    // Only the owner or a member can see room meta; others must join first.
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Join the room first' })
    }

    res.json({ code: room.code, name: room.name, state: room.state, isOwner, isMember })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load room meta' })
  }
})

const roomStreams = new Map<string, Set<Client>>()
// Track typing status per room with auto-expiry
const roomTypingTimers = new Map<string, Map<string, NodeJS.Timeout>>()

function makeRandom(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function makeCode(name: string, state: number) {
  const core = name.trim().replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `${state}-${core}-${makeRandom(5)}`
}

router.post('/rooms', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, state, password } = req.body as { name: string; state: number; password: string }
    if (!name || !state || !password) return res.status(400).json({ message: 'name, state, password are required' })

    let code = makeCode(name, Number(state))
    // ensure unique code (retry a few times)
    for (let i = 0; i < 5; i++) {
      const exists = await AllianceRoom.findOne({ code })
      if (!exists) break
      code = makeCode(name, Number(state))
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const doc = await AllianceRoom.create({
      code,
      name,
      state: Number(state),
      passwordHash,
      createdBy: req.userId!
    })

    await AllianceMembership.create({ roomCode: doc.code, userId: req.userId!, role: 'owner' })

    res.status(201).json({ code: doc.code, name: doc.name, state: doc.state })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create room' })
  }
})

router.post('/join', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code, password } = req.body as { code: string; password: string }
    if (!code || !password) return res.status(400).json({ message: 'code and password required' })
    const room = await AllianceRoom.findOne({ code: code.trim() })
    if (!room) return res.status(404).json({ message: 'Room not found' })
    const ok = await bcrypt.compare(password, room.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid password' })
    const isOwner = String(room.createdBy) === String(req.userId)
    await AllianceMembership.findOneAndUpdate(
      { roomCode: room.code, userId: req.userId },
      { roomCode: room.code, userId: req.userId, role: isOwner ? 'owner' : 'member' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.json({ code: room.code, name: room.name, state: room.state, isOwner })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to join room' })
  }
})

router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])
    const num = parseInt(q.replace(/[^0-9]/g, ''), 10)
    const nameRegex = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, r => `\\${r}`), 'i')

    const rooms = await AllianceRoom.find({
      $or: [
        { name: nameRegex },
        ...(isNaN(num) ? [] : [{ state: num }])
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('code name state -_id')

    res.json(rooms)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to search rooms' })
  }
})

export default router

// Owner-only delete room with password confirmation
router.delete('/rooms/:code', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const { password } = req.body as { password: string }
    if (!password) return res.status(400).json({ message: 'Password required' })

    const room = await AllianceRoom.findOne({ code })
    if (!room) return res.status(404).json({ message: 'Room not found' })
    if (String(room.createdBy) !== String(req.userId)) return res.status(403).json({ message: 'Only the owner can delete this room' })
    const ok = await bcrypt.compare(password, room.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid password' })

    await AllianceRoom.deleteOne({ _id: room._id })
    await AllianceMembership.deleteMany({ roomCode: room.code })
    await AllianceMessage.deleteMany({ roomCode: room.code })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete room' })
  }
})

router.get('/rooms/:code/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const membership = await AllianceMembership.findOne({ roomCode: code, userId: req.userId })
    if (!membership) return res.status(403).json({ message: 'Join the room first' })
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200)
    const docs = await AllianceMessage.find({ roomCode: code })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Attach senderName using user's gameName when available
    const userIds = Array.from(new Set(docs.map(d => String(d.senderId))))
    const users = await User.find({ _id: { $in: userIds } }).select('gameName email').lean()
    const userMap = new Map(users.map(u => [String(u._id), u]))
    const out = docs.reverse().map(d => {
      const u = userMap.get(String(d.senderId)) as any
      const senderName = (u?.gameName && String(u.gameName).trim()) || String(d.senderEmail).split('@')[0]
      return { ...d, senderName }
    })
    res.json(out)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to load messages' })
  }
})

router.post('/rooms/:code/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const { content } = req.body as { content: string }
    if (!content || !content.trim()) return res.status(400).json({ message: 'Message cannot be empty' })
    const trimmed = content.trim()
    if (trimmed.length > 1000) return res.status(400).json({ message: 'Message too long' })

    const membership = await AllianceMembership.findOne({ roomCode: code, userId: req.userId })
    if (!membership) return res.status(403).json({ message: 'Join the room first' })

    const user = await User.findById(req.userId).select('email gameName')
    if (!user) return res.status(401).json({ message: 'User not found' })

    const doc = await AllianceMessage.create({
      roomCode: code,
      senderId: req.userId!,
      senderEmail: user.email,
      content: trimmed
    })

    const messagePayload = {
      type: 'message',
      payload: {
        _id: doc._id,
        roomCode: doc.roomCode,
        senderEmail: doc.senderEmail,
        senderId: doc.senderId,
        senderName: (user.gameName && user.gameName.trim()) || String(user.email).split('@')[0],
        content: doc.content,
        createdAt: doc.createdAt
      }
    }
    
    console.log(`Broadcasting message to room ${code}, connected clients:`, roomStreams.get(code)?.size || 0)
    broadcastMessage(code, messagePayload)

    res.status(201).json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to send message' })
  }
})

// Realtime typing indicator (start/keepalive/stop)
router.post('/rooms/:code/typing', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const { typing } = req.body as { typing: boolean }

    // Only members can broadcast typing
    const membership = await AllianceMembership.findOne({ roomCode: code, userId: req.userId })
    if (!membership) return res.status(403).json({ message: 'Join the room first' })

    const user = await User.findById(req.userId).select('email')
    if (!user) return res.status(401).json({ message: 'User not found' })

    // Send typing event to SSE subscribers
    const payload = {
      type: 'typing',
      payload: {
        roomCode: code,
        senderId: req.userId,
        senderEmail: user.email,
        senderName: (user.gameName && user.gameName.trim()) || String(user.email).split('@')[0],
        typing: !!typing,
      }
    }
    broadcastMessage(code, payload)

    // Manage auto-timeout: if typing=true, keep alive for 4s unless renewed
    const byRoom = roomTypingTimers.get(code) || new Map<string, NodeJS.Timeout>()
    if (typing) {
      // Clear previous timer if any
      const key = String(req.userId)
      const existing = byRoom.get(key)
      if (existing) clearTimeout(existing)
      // Set a new timer to auto-stop typing after 4s
      const to = setTimeout(() => {
        // Broadcast stop only if room still active
        try {
          broadcastMessage(code, {
            type: 'typing',
            payload: { roomCode: code, senderId: req.userId, senderEmail: user.email, typing: false }
          })
        } catch {}
        byRoom.delete(key)
        if (byRoom.size === 0) roomTypingTimers.delete(code)
      }, 4000)
      byRoom.set(key, to)
      roomTypingTimers.set(code, byRoom)
    } else {
      // Explicit stop
      const key = String(req.userId)
      const existing = byRoom.get(key)
      if (existing) clearTimeout(existing)
      byRoom.delete(key)
      if (byRoom.size === 0) roomTypingTimers.delete(code)
    }

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update typing status' })
  }
})

router.delete('/rooms/:code/messages/:messageId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const code = String(req.params.code)
    const messageId = String(req.params.messageId)
    if (!Types.ObjectId.isValid(messageId)) return res.status(400).json({ message: 'Invalid message id' })

    const membership = await AllianceMembership.findOne({ roomCode: code, userId: req.userId })
    if (!membership) return res.status(403).json({ message: 'Join the room first' })

    const message = await AllianceMessage.findOne({ _id: messageId, roomCode: code })
    if (!message) return res.status(404).json({ message: 'Message not found' })

    const isSender = String(message.senderId) === String(req.userId)
    const isOwner = membership.role === 'owner'
    if (!isSender && !isOwner) return res.status(403).json({ message: 'Not allowed to delete this message' })

    await AllianceMessage.deleteOne({ _id: message._id })

    broadcastMessage(code, {
      type: 'message_deleted',
      payload: {
        _id: message._id,
        roomCode: code
      }
    })

    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to delete message' })
  }
})

router.get('/rooms/:code/stream', requireAuth, async (req: AuthRequest, res) => {
  const code = String(req.params.code)
  const membership = await AllianceMembership.findOne({ roomCode: code, userId: req.userId })
  if (!membership) {
    console.log(`SSE: User ${req.userId} not a member of room ${code}`)
    res.writeHead(401)
    res.end()
    return
  }
  
  console.log(`SSE: Client connecting to room ${code}, user ${req.userId}`)
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable buffering for nginx
  })
  res.write(':ok\n\n') // Send initial comment to establish connection

  const client: Client = { res }
  if (!roomStreams.has(code)) roomStreams.set(code, new Set())
  roomStreams.get(code)!.add(client)
  
  console.log(`SSE: Room ${code} now has ${roomStreams.get(code)!.size} connected client(s)`)

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\n\n')
    } catch (err) {
      clearInterval(heartbeat)
    }
  }, 30000)

  req.on('close', () => {
    console.log(`SSE: Client disconnected from room ${code}`)
    clearInterval(heartbeat)
    roomStreams.get(code)?.delete(client)
    if (roomStreams.get(code)?.size === 0) {
      roomStreams.delete(code)
      console.log(`SSE: Room ${code} closed (no more clients)`)
    } else {
      console.log(`SSE: Room ${code} now has ${roomStreams.get(code)!.size} connected client(s)`)
    }
  })
})

function broadcastMessage(roomCode: string, data: unknown) {
  const clients = roomStreams.get(roomCode)
  if (!clients) {
    console.log(`No clients connected to room ${roomCode}`)
    return
  }
  
  console.log(`Broadcasting to ${clients.size} client(s) in room ${roomCode}`)
  const payload = `data: ${JSON.stringify(data)}\n\n`
  const deadClients: Client[] = []
  
  for (const client of clients) {
    try {
      const written = client.res.write(payload)
      if (!written) {
        console.log('Client buffer full, message queued')
      } else {
        console.log('Message sent to client successfully')
      }
    } catch (err) {
      console.error('Failed to write to SSE client:', err)
      deadClients.push(client)
    }
  }
  
  // Remove dead clients
  for (const deadClient of deadClients) {
    clients.delete(deadClient)
    console.log('Removed dead client')
  }
  
  if (clients.size === 0) {
    roomStreams.delete(roomCode)
    console.log(`Room ${roomCode} has no more clients, removing`)
  }
}
