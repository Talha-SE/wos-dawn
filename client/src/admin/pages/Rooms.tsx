import { useEffect, useState } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import api from '../../services/api'

type Member = { email: string; role: string; joinedAt: string }
type Room = {
  code: string
  name: string
  state: number
  ownerEmail: string
  memberCount: number
  members: Member[]
  suspended?: boolean
  suspendedUntil?: string
  createdAt: string
}

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCode, setExpandedCode] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', state: 0, suspended: false, suspendedUntil: '' })
  const [messageCount, setMessageCount] = useState<{ [key: string]: number }>({})

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get<Room[]>('/admin/rooms')
      setRooms(Array.isArray(data) ? data : [])
    } catch {
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  async function loadMessageCount(code: string) {
    if (messageCount[code] !== undefined) return
    try {
      const { data } = await api.get(`/admin/rooms/${code}/messages`)
      setMessageCount(prev => ({ ...prev, [code]: data.count }))
    } catch {
      setMessageCount(prev => ({ ...prev, [code]: 0 }))
    }
  }

  function startEdit(room: Room) {
    setEditingCode(room.code)
    setEditForm({
      name: room.name,
      state: room.state,
      suspended: room.suspended || false,
      suspendedUntil: room.suspendedUntil ? room.suspendedUntil.split('T')[0] : ''
    })
  }

  function cancelEdit() {
    setEditingCode(null)
    setEditForm({ name: '', state: 0, suspended: false, suspendedUntil: '' })
  }

  async function saveEdit(code: string) {
    try {
      await api.put(
        `/admin/rooms/${code}`,
        {
          name: editForm.name,
          state: editForm.state,
          suspended: editForm.suspended,
          suspendedUntil: editForm.suspendedUntil || null
        }
      )
      await load()
      cancelEdit()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to update room')
    }
  }

  async function suspendRoom(code: string, hours: number) {
    const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    try {
      await api.put(`/admin/rooms/${code}`, { suspended: true, suspendedUntil })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to suspend room')
    }
  }

  async function unsuspendRoom(code: string) {
    try {
      await api.put(`/admin/rooms/${code}`, { suspended: false, suspendedUntil: null })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to unsuspend room')
    }
  }

  async function deleteRoom(code: string) {
    if (!confirm(`Delete room ${code}? This will remove all members and messages.`)) return
    try {
      await api.delete(`/admin/rooms/${code}`)
      setRooms(prev => prev.filter(r => r.code !== code))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete room')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Alliance Room Management</h1>
        <Button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>
      <div className="space-y-3">
        {rooms.map((room) => (
          <div key={room.code} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {editingCode === room.code ? (
              // Edit mode
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Room Name</label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">State</label>
                    <Input type="number" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: parseInt(e.target.value) || 0 })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Suspend Until</label>
                    <Input type="date" value={editForm.suspendedUntil} onChange={(e) => setEditForm({ ...editForm, suspendedUntil: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={editForm.suspended} onChange={(e) => setEditForm({ ...editForm, suspended: e.target.checked })} className="rounded" />
                  <span>Suspended</span>
                </label>
                <div className="flex gap-2">
                  <Button onClick={() => saveEdit(room.code)}>Save Changes</Button>
                  <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{room.name}</h3>
                      <span className="text-xs px-2 py-1 rounded bg-white/10 text-white/70">State {room.state}</span>
                      {room.suspended && (
                        <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400 border border-red-600/30">Suspended</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-white/60 font-mono">{room.code}</div>
                    <div className="mt-2 text-sm text-white/70">
                      Owner: <span className="text-white">{room.ownerEmail}</span> · Members: <span className="text-white">{room.memberCount}</span>
                      {messageCount[room.code] !== undefined && (
                        <> · Messages: <span className="text-white">{messageCount[room.code]}</span></>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Created: {new Date(room.createdAt).toLocaleString()}
                    </div>
                    {room.suspended && room.suspendedUntil && (
                      <div className="mt-1 text-xs text-red-400">
                        Suspended until: {new Date(room.suspendedUntil).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="subtle" size="sm" onClick={() => {
                      setExpandedCode(expandedCode === room.code ? null : room.code)
                      if (expandedCode !== room.code) loadMessageCount(room.code)
                    }}>
                      {expandedCode === room.code ? 'Hide' : 'Details'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => startEdit(room)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteRoom(room.code)}>Delete</Button>
                  </div>
                </div>
                {expandedCode === room.code && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    {room.members.length > 0 && (
                      <div>
                        <div className="text-sm font-semibold text-white/80 mb-2">Members ({room.members.length})</div>
                        <div className="space-y-1">
                          {room.members.map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-1">
                              <span className="text-white/70">{member.email}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">{member.role}</span>
                                <span className="text-xs text-white/50">{new Date(member.joinedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                      {room.suspended ? (
                        <Button variant="secondary" size="sm" onClick={() => unsuspendRoom(room.code)}>Unsuspend Room</Button>
                      ) : (
                        <>
                          <Button variant="danger" size="sm" onClick={() => suspendRoom(room.code, 24)}>Suspend 24h</Button>
                          <Button variant="danger" size="sm" onClick={() => suspendRoom(room.code, 72)}>Suspend 3d</Button>
                          <Button variant="danger" size="sm" onClick={() => suspendRoom(room.code, 168)}>Suspend 7d</Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            {loading ? 'Loading rooms…' : 'No alliance rooms found'}
          </div>
        )}
      </div>
    </div>
  )
}
