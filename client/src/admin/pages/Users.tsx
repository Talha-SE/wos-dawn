import { useEffect, useState } from 'react'
import Input from '../../components/Input'
import Button from '../../components/Button'
import api from '../../services/api'

type UserRow = {
  _id: string
  email: string
  passwordHash: string
  gameId?: string
  gameName?: string
  automationEnabled: boolean
  suspended: boolean
  suspendedUntil?: string
  createdAt: string
  updatedAt: string
}

export default function Users() {
  const [rows, setRows] = useState<UserRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    gameId: '',
    gameName: '',
    automationEnabled: false,
    suspended: false,
    suspendedUntil: ''
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const secret = localStorage.getItem('admin_secret') || ''

  async function load() {
    if (!secret) return
    setLoading(true)
    try {
      const { data } = await api.get<UserRow[]>('/admin/users', { headers: { 'x-admin-secret': secret } })
      setRows(Array.isArray(data) ? data : [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret])

  function startEdit(user: UserRow) {
    setEditingId(user._id)
    setEditForm({
      email: user.email,
      password: '',
      gameId: user.gameId || '',
      gameName: user.gameName || '',
      automationEnabled: user.automationEnabled,
      suspended: user.suspended,
      suspendedUntil: user.suspendedUntil ? user.suspendedUntil.split('T')[0] : ''
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ email: '', password: '', gameId: '', gameName: '', automationEnabled: false, suspended: false, suspendedUntil: '' })
  }

  async function saveEdit(userId: string) {
    try {
      const payload: any = {
        email: editForm.email,
        gameId: editForm.gameId,
        gameName: editForm.gameName,
        automationEnabled: editForm.automationEnabled,
        suspended: editForm.suspended,
        suspendedUntil: editForm.suspendedUntil || null
      }
      if (editForm.password) payload.password = editForm.password
      await api.put(`/admin/users/${userId}`, payload, { headers: { 'x-admin-secret': secret } })
      await load()
      cancelEdit()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to update user')
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete user "${email}" and all their data (rooms, memberships, slots)? This cannot be undone!`)) return
    try {
      await api.delete(`/admin/users/${userId}`, { headers: { 'x-admin-secret': secret } })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete user')
    }
  }

  async function suspendUser(userId: string, hours: number) {
    const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    try {
      await api.put(`/admin/users/${userId}`, { suspended: true, suspendedUntil }, { headers: { 'x-admin-secret': secret } })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to suspend user')
    }
  }

  async function unsuspendUser(userId: string) {
    try {
      await api.put(`/admin/users/${userId}`, { suspended: false, suspendedUntil: null }, { headers: { 'x-admin-secret': secret } })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to unsuspend user')
    }
  }

  const filtered = rows.filter(r => r.email.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">User Management</h1>
        <Button onClick={load} disabled={loading || !secret}>{loading ? 'Loading…' : 'Refresh'}</Button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <Input placeholder="Search by email..." value={q} onChange={(e) => setQ(e.target.value)} className="bg-transparent border-none text-white" />
      </div>
      {!secret && <div className="text-white/60 text-sm">Set Admin Secret in Settings to manage users.</div>}
      <div className="space-y-3">
        {filtered.map((user) => (
          <div key={user._id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {editingId === user._id ? (
              // Edit mode
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Email</label>
                    <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">New Password (leave blank to keep)</label>
                    <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="bg-white/10 border-white/20 text-white" placeholder="New password..." />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Game ID</label>
                    <Input value={editForm.gameId} onChange={(e) => setEditForm({ ...editForm, gameId: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Game Name</label>
                    <Input value={editForm.gameName} onChange={(e) => setEditForm({ ...editForm, gameName: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Suspend Until</label>
                    <Input type="date" value={editForm.suspendedUntil} onChange={(e) => setEditForm({ ...editForm, suspendedUntil: e.target.value })} className="bg-white/10 border-white/20 text-white" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={editForm.automationEnabled} onChange={(e) => setEditForm({ ...editForm, automationEnabled: e.target.checked })} className="rounded" />
                    <span>Automation Enabled</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input type="checkbox" checked={editForm.suspended} onChange={(e) => setEditForm({ ...editForm, suspended: e.target.checked })} className="rounded" />
                    <span>Suspended</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => saveEdit(user._id)}>Save Changes</Button>
                  <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{user.email}</h3>
                      {user.suspended && (
                        <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400 border border-red-600/30">Suspended</span>
                      )}
                      {user.automationEnabled && (
                        <span className="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 border border-green-600/30">Auto-Redeem</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      Created: {new Date(user.createdAt).toLocaleString()} • Updated: {new Date(user.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="subtle" size="sm" onClick={() => setExpandedId(expandedId === user._id ? null : user._id)}>
                      {expandedId === user._id ? 'Hide' : 'Details'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => startEdit(user)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => deleteUser(user._id, user.email)}>Delete</Button>
                  </div>
                </div>
                {expandedId === user._id && (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-white/60 text-xs mb-1">Password Hash</div>
                        <div className="flex items-center gap-2">
                          <code className="text-white/80 font-mono text-xs break-all">
                            {showPassword[user._id] ? user.passwordHash : '••••••••••••••••'}
                          </code>
                          <Button variant="ghost" size="sm" onClick={() => setShowPassword({ ...showPassword, [user._id]: !showPassword[user._id] })}>
                            {showPassword[user._id] ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-xs mb-1">Game Profile</div>
                        <div className="text-white/80">
                          {user.gameId && user.gameName ? `${user.gameName} (${user.gameId})` : '—'}
                        </div>
                      </div>
                    </div>
                    {user.suspended && user.suspendedUntil && (
                      <div className="text-sm">
                        <div className="text-white/60 text-xs mb-1">Suspended Until</div>
                        <div className="text-red-400">{new Date(user.suspendedUntil).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {user.suspended ? (
                        <Button variant="secondary" size="sm" onClick={() => unsuspendUser(user._id)}>Unsuspend</Button>
                      ) : (
                        <>
                          <Button variant="danger" size="sm" onClick={() => suspendUser(user._id, 24)}>Suspend 24h</Button>
                          <Button variant="danger" size="sm" onClick={() => suspendUser(user._id, 72)}>Suspend 3d</Button>
                          <Button variant="danger" size="sm" onClick={() => suspendUser(user._id, 168)}>Suspend 7d</Button>
                          <Button variant="danger" size="sm" onClick={() => suspendUser(user._id, 720)}>Suspend 30d</Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            {loading ? 'Loading users…' : (secret ? 'No users found' : 'Set Admin Secret in Settings')}
          </div>
        )}
      </div>
    </div>
  )
}
