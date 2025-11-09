import { useEffect, useState } from 'react'
import Input from '../../components/Input'
import Button from '../../components/Button'
import api from '../../services/api'

type Code = { _id: string; code: string; active?: boolean; expiresAt?: string }

export default function GiftCodes() {
  const [items, setItems] = useState<Code[]>([])
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const secret = localStorage.getItem('admin_secret') || ''
  const hasSecret = !!secret

  async function load() {
    if (!hasSecret) return
    setLoading(true)
    try {
      const { data } = await api.get('/admin/gift/codes/all', { headers: { 'x-admin-secret': secret } })
      setItems(data || [])
    } catch { setItems([]) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!code.trim()) return
    try {
      await api.post('/admin/gift/codes', { code: code.trim(), expiresAt: expiresAt || undefined, active: true }, { headers: { 'x-admin-secret': secret } })
      setCode('')
      setExpiresAt('')
      await load()
    } catch {}
  }

  async function toggle(id: string, active: boolean) {
    try {
      await api.put(`/admin/gift/codes/${id}`, { active }, { headers: { 'x-admin-secret': secret } })
      await load()
    } catch {}
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/gift/codes/${id}`, { headers: { 'x-admin-secret': secret } })
      await load()
    } catch {}
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-white">Gift Codes</h1>
      {!hasSecret && <div className="text-white/60 text-sm">Set Admin Secret in Settings to manage gift codes.</div>}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="bg-transparent border-none text-white" />
          <Input type="date" placeholder="Expires" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="bg-transparent border-none text-white" />
          <Button onClick={create} disabled={!hasSecret}>Create</Button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-white/10 text-white/80">
            <tr>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Active</th>
              <th className="text-left px-4 py-2">Expires</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {items.map((c) => (
              <tr key={c._id} className="odd:bg-white/[0.02]">
                <td className="px-4 py-2 font-mono">{c.code}</td>
                <td className="px-4 py-2">{c.active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2 space-x-2">
                  <Button variant="subtle" onClick={() => toggle(c._id, !c.active)} disabled={!hasSecret}>{c.active ? 'Disable' : 'Enable'}</Button>
                  <Button variant="danger" onClick={() => remove(c._id)} disabled={!hasSecret}>Delete</Button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-4 py-6 text-white/50" colSpan={4}>{loading ? 'Loading…' : 'No gift codes'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
