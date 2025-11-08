import { useState, useEffect } from 'react'
import Button from '../components/Button'
import Input from '../components/Input'
import axios from 'axios'

type Gift = { _id: string; code: string; expiresAt?: string; createdAt: string }

export default function QuickRedeem() {
  const [gameId, setGameId] = useState('')
  const [selectedCode, setSelectedCode] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeCodes, setActiveCodes] = useState<Gift[]>([])
  const [loadingCodes, setLoadingCodes] = useState(true)

  useEffect(() => {
    loadActiveCodes()
    // Load saved game ID from localStorage
    const savedGameId = localStorage.getItem('quickRedeemGameId')
    if (savedGameId) setGameId(savedGameId)
  }, [])

  async function loadActiveCodes() {
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'
      const { data } = await axios.get<Gift[]>(`${apiUrl}/api/gift/active-codes`)
      setActiveCodes(data)
    } catch (e) {
      console.error('Failed to load active codes:', e)
    } finally {
      setLoadingCodes(false)
    }
  }

  async function handleRedeem() {
    const code = customCode || selectedCode
    if (!gameId || !code) {
      setStatus('⚠️ Please enter both Game ID and select/enter a gift code')
      return
    }

    setIsLoading(true)
    setStatus('⏳ Redeeming...')

    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000'
      const { data } = await axios.post(`${apiUrl}/api/gift/redeem/by-id`, {
        gameId,
        code
      })

      if (data.ok) {
        setStatus(`✅ Success! Code "${code}" redeemed for Game ID: ${gameId}`)
        // Save game ID to localStorage
        localStorage.setItem('quickRedeemGameId', gameId)
        // Clear the code inputs
        setCustomCode('')
        setSelectedCode('')
      } else {
        setStatus(`❌ ${data.message || 'Redemption failed'}`)
      }
    } catch (e: any) {
      const errorMsg = e?.response?.data?.message || e?.response?.data?.detail?.msg || e.message
      setStatus(`❌ Error: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSelect = (code: string) => {
    setSelectedCode(code)
    setCustomCode('') // Clear custom code when selecting from list
  }

  const handleCustomCodeChange = (value: string) => {
    setCustomCode(value)
    if (value) setSelectedCode('') // Clear selected code when typing custom
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-fadeUp">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            WOS Gift Code Redeemer
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            Instant redemption for Whiteout Survival gift codes
          </p>
        </div>

        {/* Main Redeem Card */}
        <section className="card animate-fadeUp" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <div>
              <div className="badge mb-3">Quick Redeem</div>
              <h2 className="section-title">Redeem by Game ID</h2>
              <p className="subtext mt-2">Enter your Game ID and select or type a gift code to redeem instantly</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Game ID Input */}
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50 mb-2 block">
                Your Game ID
              </label>
              <Input
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter your numeric Game ID"
                type="text"
                className="text-lg"
              />
              <p className="text-xs text-white/40 mt-2">
                💡 Find your Game ID in-game: Profile → Settings → Account
              </p>
            </div>

            {/* Code Input Options */}
            <div className="space-y-4">
              <label className="text-xs uppercase tracking-wider text-white/50 block">
                Gift Code
              </label>
              
              {/* Custom Code Input */}
              <div>
                <Input
                  value={customCode}
                  onChange={(e) => handleCustomCodeChange(e.target.value)}
                  placeholder="Type a gift code or select from list below"
                  className="text-lg font-mono"
                />
              </div>

              {/* Or Divider */}
              {activeCodes.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-xs text-white/40 uppercase tracking-wide">Or select from active codes</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>
              )}
            </div>

            {/* Status Display */}
            {status && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                status.includes('✅') 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : status.includes('❌') 
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-white/5 border-white/10 text-white/80'
              }`}>
                {status}
              </div>
            )}

            {/* Redeem Button */}
            <Button
              onClick={handleRedeem}
              disabled={isLoading || !gameId || (!customCode && !selectedCode)}
              className="w-full text-lg py-6"
            >
              {isLoading ? '⏳ Redeeming...' : '🎁 Redeem Gift Code'}
            </Button>
          </div>
        </section>

        {/* Active Codes List */}
        <section className="card animate-fadeUp" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <div>
              <div className="badge mb-3">Active Codes • {activeCodes.length}</div>
              <h2 className="section-title">Available Gift Codes</h2>
              <p className="subtext mt-2">Click any code to select it for redemption</p>
            </div>
            <Button variant="ghost" onClick={loadActiveCodes} disabled={loadingCodes}>
              {loadingCodes ? '⏳' : '🔄'} Refresh
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {loadingCodes ? (
              <div className="col-span-full text-center text-white/60 py-8">
                Loading active codes...
              </div>
            ) : activeCodes.length > 0 ? (
              activeCodes.map((gift) => (
                <button
                  key={gift._id}
                  onClick={() => handleCodeSelect(gift.code)}
                  className={`glass-soft rounded-xl border p-4 text-left transition-all hover:scale-105 hover:border-purple-500/50 ${
                    selectedCode === gift.code
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-mono text-lg font-bold text-white/90">
                      {gift.code}
                    </div>
                    {selectedCode === gift.code && (
                      <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50">
                    {gift.expiresAt 
                      ? `Expires: ${new Date(gift.expiresAt).toLocaleDateString()}`
                      : 'No expiration'}
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full glass-soft rounded-xl border border-dashed border-white/10 p-8 text-center">
                <div className="text-white/60 text-sm">
                  No active codes available at the moment.
                  <br />
                  Check back soon for new codes!
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="glass-soft rounded-2xl border border-white/10 p-6 animate-fadeUp" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wide">
            ℹ️ How to Use
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-purple-400">1.</span>
              <span>Open Whiteout Survival and find your Game ID (Profile → Settings → Account)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400">2.</span>
              <span>Enter your Game ID in the field above</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400">3.</span>
              <span>Select an active code from the list or type your own</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-400">4.</span>
              <span>Click "Redeem Gift Code" and enjoy your rewards!</span>
            </li>
          </ul>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-white/40 pb-4">
          <p>Powered by WOS-DAWN • Gift codes sourced from official channels</p>
        </div>
      </div>
    </div>
  )
}
