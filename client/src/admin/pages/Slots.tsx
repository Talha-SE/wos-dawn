import { useEffect, useState } from 'react'
import Button from '../../components/Button'
import api from '../../services/api'

type Reservation = {
  _id: string
  state: string
  allianceName: string
  date: string
  slotIndex: number
  assignedGameId?: string
  assignedPlayerName?: string
  reservedByEmail: string
  createdAt: string
  updatedAt: string
}

type StateGroup = {
  state: string
  count: number
  reservations: Reservation[]
}

export default function Slots() {
  const [states, setStates] = useState<StateGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedState, setExpandedState] = useState<string | null>(null)
  const secret = localStorage.getItem('admin_secret') || ''

  async function load() {
    if (!secret) return
    setLoading(true)
    try {
      const { data } = await api.get<StateGroup[]>('/admin/slots', { headers: { 'x-admin-secret': secret } })
      setStates(Array.isArray(data) ? data : [])
    } catch {
      setStates([])
    } finally { setLoading(false) }
  }

  async function deleteReservation(id: string, state: string) {
    if (!confirm('Delete this slot reservation? The slot will become available again.')) return
    try {
      await api.delete(`/admin/slots/${id}`, { headers: { 'x-admin-secret': secret } })
      setStates(prev => prev.map(s => 
        s.state === state 
          ? { ...s, reservations: s.reservations.filter(r => r._id !== id), count: s.count - 1 }
          : s
      ).filter(s => s.count > 0))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete reservation')
    }
  }

  async function deleteAllForState(state: string) {
    if (!confirm(`Delete ALL ${state} slot reservations for State ${state}? This cannot be undone!`)) return
    try {
      const stateReservations = states.find(s => s.state === state)?.reservations || []
      for (const reservation of stateReservations) {
        await api.delete(`/admin/slots/${reservation._id}`, { headers: { 'x-admin-secret': secret } })
      }
      setStates(prev => prev.filter(s => s.state !== state))
      alert(`Deleted all reservations for State ${state}`)
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete reservations')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">SVS Slot Reservations</h1>
        <Button onClick={load} disabled={loading || !secret}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>
      {!secret && <div className="text-white/60 text-sm">Set Admin Secret in Settings to view slot reservations.</div>}
      <div className="space-y-3">
        {states.map((stateGroup) => (
          <div key={stateGroup.state} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-white">State {stateGroup.state}</h3>
                <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">{stateGroup.count} reservations</span>
              </div>
              <div className="flex gap-2">
                <Button variant="subtle" size="sm" onClick={() => setExpandedState(expandedState === stateGroup.state ? null : stateGroup.state)}>
                  {expandedState === stateGroup.state ? 'Hide' : 'Show'} Details
                </Button>
                <Button variant="danger" size="sm" onClick={() => deleteAllForState(stateGroup.state)}>
                  Clear State
                </Button>
              </div>
            </div>
            {expandedState === stateGroup.state && stateGroup.reservations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/10 text-white/80">
                      <tr>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Slot</th>
                        <th className="text-left px-3 py-2">Alliance</th>
                        <th className="text-left px-3 py-2">Player</th>
                        <th className="text-left px-3 py-2">Game ID</th>
                        <th className="text-left px-3 py-2">Reserved By</th>
                        <th className="text-left px-3 py-2">Created</th>
                        <th className="text-left px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/80">
                      {stateGroup.reservations.map((r) => (
                        <tr key={r._id} className="odd:bg-white/[0.02] hover:bg-white/5">
                          <td className="px-3 py-2">{r.date}</td>
                          <td className="px-3 py-2 font-mono">{r.slotIndex}</td>
                          <td className="px-3 py-2">{r.allianceName}</td>
                          <td className="px-3 py-2">{r.assignedPlayerName || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.assignedGameId || '—'}</td>
                          <td className="px-3 py-2 text-xs">{r.reservedByEmail}</td>
                          <td className="px-3 py-2 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2">
                            <Button variant="danger" size="sm" onClick={() => deleteReservation(r._id, stateGroup.state)}>
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {states.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            {loading ? 'Loading slot reservations…' : (secret ? 'No slot reservations found' : 'Set Admin Secret in Settings')}
          </div>
        )}
      </div>
    </div>
  )
}
