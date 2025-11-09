import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import SlotReservation from '../models/SlotReservation'

const router = Router()

function serializeReservation(reservation: any) {
  return {
    _id: String(reservation._id),
    state: reservation.state,
    allianceName: reservation.allianceName,
    date: reservation.date,
    slotIndex: reservation.slotIndex,
    assignedGameId: reservation.assignedGameId || undefined,
    assignedPlayerName: reservation.assignedPlayerName || undefined,
    reservedBy: String(reservation.reservedBy),
    createdAt: reservation.createdAt,
    updatedAt: reservation.updatedAt
  }
}

// List reservations by state and date (YYYY-MM-DD UTC)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const state = String(req.query.state || '').trim()
    const date = String(req.query.date || '').trim()
    if (!state || !date) return res.status(400).json({ message: 'state and date are required' })

    const docs = await SlotReservation.find({ state, date }).sort({ slotIndex: 1 }).lean()
    const items = docs.map(serializeReservation)
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

    const trimmedState = state.trim()
    const trimmedAlliance = allianceName.trim()
    const trimmedDate = date.trim()
    const idx = Number(slotIndex)
    if (!Number.isInteger(idx)) return res.status(400).json({ message: 'slotIndex must be an integer' })
    if (idx < 0 || idx > 47) return res.status(400).json({ message: 'slotIndex must be 0-47' })

    const userId = req.userId!

    const [existing, slotConflict] = await Promise.all([
      SlotReservation.findOne({ state: trimmedState, date: trimmedDate, reservedBy: userId }),
      SlotReservation.findOne({ state: trimmedState, date: trimmedDate, slotIndex: idx })
    ])

    if (slotConflict && (!existing || String(slotConflict._id) !== String(existing._id))) {
      return res.status(409).json({ message: 'Slot already taken' })
    }

    if (existing) {
      existing.slotIndex = idx
      existing.allianceName = trimmedAlliance
      existing.assignedGameId = assignedGameId?.trim() || undefined
      existing.assignedPlayerName = assignedPlayerName?.trim() || undefined
      await existing.save()
      return res.json({ ok: true, item: serializeReservation(existing.toObject()) })
    }

    const doc = await SlotReservation.create({
      state: trimmedState,
      allianceName: trimmedAlliance,
      date: trimmedDate,
      slotIndex: idx,
      assignedGameId: assignedGameId?.trim() || undefined,
      assignedPlayerName: assignedPlayerName?.trim() || undefined,
      reservedBy: userId,
    })
    res.status(201).json({ ok: true, item: serializeReservation(doc.toObject()) })
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Slot already taken' })
    res.status(500).json({ message: e?.message || 'Failed to reserve slot' })
  }
})

export default router
