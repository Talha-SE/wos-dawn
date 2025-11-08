import { useEffect, useState } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import api from '../services/api'
import { useAuth } from '../state/AuthContext'

type Gift = { _id: string; code: string; expiresAt?: string; active: boolean }

export default function Redeem() {
  const { user, setUser } = useAuth()
  const [gameId, setGameId] = useState(user?.gameId || '')
  const [enabled, setEnabled] = useState(!!user?.automationEnabled)
  const [codes, setCodes] = useState<Gift[]>([])
  const [manualCode, setManualCode] = useState('')
  const [manualGameId, setManualGameId] = useState('')
  const [useCustomId, setUseCustomId] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => { loadCodes() }, [])
  useEffect(() => { setGameId(user?.gameId || ''); setEnabled(!!user?.automationEnabled) }, [user])

  async function loadCodes() {
    const { data } = await api.get<Gift[]>('/gift/codes')
    setCodes(data)
  }

  async function saveGameId() {
    const { data } = await api.put('/user/me/game', { gameId })
    setUser(data)
  }

  async function toggleAutomation(next: boolean) {
    setEnabled(next)
    const { data } = await api.put('/user/me/automation', { enabled: next })
    setUser(data)
  }

  async function redeemLatest() {
    setStatus('')
    try {
      const { data } = await api.post('/gift/redeem/latest')
      setStatus(`Redeemed latest code: ${data.code}`)
    } catch (e: any) {
      setStatus(e?.response?.data?.message || 'Failed to redeem latest')
    }
  }

  async function redeemManual() {
    if (!manualCode) return
    setStatus('')
    try {
      const redeemGameId = useCustomId && manualGameId ? manualGameId : user?.gameId
      if (!redeemGameId) {
        setStatus('Please set a Game ID first')
        return
      }

      // Use the by-id endpoint if custom ID is used, otherwise use the authenticated endpoint
      if (useCustomId && manualGameId) {
        const { data } = await api.post('/gift/redeem/by-id', { 
          gameId: manualGameId, 
          code: manualCode 
        })
        setStatus(data.message || 'Redeemed successfully')
      } else {
        await api.post('/gift/redeem', { code: manualCode })
        setStatus('Redeemed successfully')
      }
    } catch (e: any) {
      setStatus(e?.response?.data?.message || 'Failed to redeem')
    }
  }

  return (
    <div className="space-y-6">
      <section className="card animate-fadeUp">
        <div className="card-header">
          <div>
            <div className="badge mb-3">Setup</div>
            <h2 className="section-title">Redemption preferences</h2>
            <p className="subtext mt-2">Sync your commander ID and automation state to accelerate claim flows.</p>
          </div>
          <Button variant="ghost" onClick={redeemLatest}>Redeem latest</Button>
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">Game ID</label>
              <Input value={gameId} onChange={(e) => setGameId(e.target.value)} placeholder="Enter your game ID" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-3 text-sm text-white/80">
                <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition">
                  <input
                    id="auto2"
                    type="checkbox"
                    className="peer absolute inset-0 opacity-0 cursor-pointer"
                    checked={enabled}
                    onChange={(e) => toggleAutomation(e.target.checked)}
                  />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-primary" />
                </span>
                Enable auto redemption
              </label>
              {enabled && <span className="badge">Armed</span>}
            </div>
          </div>
          <div className="glass-soft rounded-2xl p-5 border border-white/10 space-y-3">
            <h3 className="text-sm text-white/60 uppercase tracking-wide">Sync state</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Active ID</span>
              <span className="text-base font-semibold text-white/90">{user?.gameId || 'Not synced'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Automation</span>
              <span className={`text-sm font-medium ${enabled ? 'text-emerald-300' : 'text-white/60'}`}>{enabled ? 'Enabled' : 'Paused'}</span>
            </div>
            <Button onClick={saveGameId} disabled={!gameId} className="w-full">Save changes</Button>
          </div>
        </div>
      </section>

      <section className="card animate-fadeUp" style={{ animationDelay: '0.05s' }}>
        <div className="card-header">
          <div>
            <div className="badge mb-3">Manual Redeem</div>
            <h2 className="section-title">Execute code</h2>
            <p className="subtext mt-2">Paste any gift code you discover and redeem instantly.</p>
          </div>
          <Button onClick={redeemManual} disabled={!manualCode || (useCustomId && !manualGameId)}>Redeem now</Button>
        </div>
        <div className="glass-soft rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <Input placeholder="Enter gift code" value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
          </div>
          
          {/* Toggle for custom Game ID */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-3 text-sm text-white/80">
              <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition">
                <input
                  type="checkbox"
                  className="peer absolute inset-0 opacity-0 cursor-pointer"
                  checked={useCustomId}
                  onChange={(e) => setUseCustomId(e.target.checked)}
                />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-purple-500" />
              </span>
              Redeem for different Game ID
            </label>
          </div>

          {useCustomId && (
            <div className="animate-fadeUp">
              <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">Alternative Game ID</label>
              <Input 
                placeholder="Enter target Game ID" 
                value={manualGameId} 
                onChange={(e) => setManualGameId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-white/40 mt-2">
                💡 Redeem this code for a different Game ID (useful for alt accounts)
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
            <span>Status feed</span>
            <span>{status ? 'Updated' : 'Idle'}</span>
          </div>
          <div className="min-h-[60px] rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/80">
            {status || 'Waiting for a redemption attempt'}
          </div>
        </div>
      </section>

      <section className="card animate-fadeUp" style={{ animationDelay: '0.1s' }}>
        <div className="card-header">
          <div>
            <div className="badge mb-3">Active Gift Codes</div>
            <h2 className="section-title">Available drops</h2>
            <p className="subtext mt-2">Curated list of currently active codes ready for dispatch.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map(c => (
            <div key={c._id} className="glass-soft rounded-2xl border border-white/10 p-4 flex items-center justify-between gap-4 animate-fadeUp" style={{ animationDelay: '0.12s' }}>
              <div>
                <div className="font-mono text-lg text-white/90">{c.code}</div>
                <div className="text-xs text-white/50 mt-1">{c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleString()}` : 'No expiry'}</div>
              </div>
              <Button variant="subtle" onClick={() => setManualCode(c.code)}>Load</Button>
            </div>
          ))}
          {!codes.length && (
            <div className="glass-soft rounded-2xl border border-dashed border-white/10 p-6 text-sm text-white/60">
              No active codes available. Check back soon.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
