import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import SlotReservation from '../models/SlotReservation'

const router = Router()

// List reservations by state and date (YYYY-MM-DD UTC)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const state = String(req.query.state || '').trim()
    const date = String(req.query.date || '').trim()
    if (!state || !date) return res.status(400).json({ message: 'state and date are required' })

    const items = await SlotReservation.find({ state, date }).sort({ slotIndex: 1 }).lean()
    res.json({ ok: true, items })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to list slots' })
  }
})

// Reserve a slot (unique per state + date + slotIndex)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { state, allianceName, date, slotIndex, assignedGameId, assignedPlayerName } = req.body as {
      state: string
      allianceName: string
      date: string
      slotIndex: number
      assignedGameId?: string
      assignedPlayerName?: string
    }
    if (!state || !allianceName || !date || typeof slotIndex !== 'number') {
      return res.status(400).json({ message: 'state, allianceName, date, slotIndex are required' })
    }
    if (slotIndex < 0 || slotIndex > 47) return res.status(400).json({ message: 'slotIndex must be 0-47' })

    const doc = await SlotReservation.create({
      state: state.trim(),
      allianceName: allianceName.trim(),
      date: date.trim(),
      slotIndex,
      assignedGameId: assignedGameId?.trim(),
      assignedPlayerName: assignedPlayerName?.trim(),
      reservedBy: req.userId!,
    })
    res.status(201).json({ ok: true, item: doc })
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Slot already taken' })
    res.status(500).json({ message: e?.message || 'Failed to reserve slot' })
  }
})

export default router
