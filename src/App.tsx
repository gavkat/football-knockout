import { useCallback, useEffect, useState } from 'react'
import { fetchMatches, fetchStandings, loadApiKey } from './api/footballData'
import ApiKeySetup from './components/ApiKeySetup'
import TournamentView from './components/TournamentView'
import type { Tournament } from './types'
import { AVAILABLE_SEASONS } from './types'
import { simulateTournament } from './utils/tournament'

type LoadState = 'idle' | 'loading' | 'success' | 'error'

export default function App() {
  const [hasKey, setHasKey] = useState(() => !!loadApiKey())
  const [season, setSeason] = useState(AVAILABLE_SEASONS[0].year)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error, setError] = useState('')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [drawSeed, setDrawSeed] = useState(0) // increment to re-draw

  const load = useCallback(async () => {
    setLoadState('loading')
    setError('')
    try {
      const [standings, matches] = await Promise.all([
        fetchStandings(season),
        fetchMatches(season),
      ])
      if (standings.length < 16) {
        throw new Error(
          `Only ${standings.length} teams found in standings. Season data may be incomplete.`,
        )
      }
      const label = AVAILABLE_SEASONS.find((s) => s.year === season)?.label ?? `${season}`
      const result = simulateTournament(standings, matches, label)
      setTournament(result)
      setLoadState('success')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setLoadState('error')
    }
  }, [season, drawSeed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasKey) load()
  }, [hasKey, load])

  if (!hasKey) {
    return <ApiKeySetup onSave={() => setHasKey(true)} />
  }

  return (
    <div className="min-h-screen bg-epl-purple text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-epl-purple/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-2xl">⚽</span>
            <div>
              <h1 className="font-bold text-white leading-tight text-lg">
                EPL Knockout Visualizer
              </h1>
              <p className="text-white/40 text-xs hidden sm:block">
                What if the Premier League were a knockout tournament?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Season selector */}
            <select
              value={season}
              onChange={(e) => {
                setSeason(Number(e.target.value) as typeof season)
                setTournament(null)
              }}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-epl-green/60 cursor-pointer"
            >
              {AVAILABLE_SEASONS.map((s) => (
                <option key={s.year} value={s.year} className="bg-epl-purple">
                  {s.label}
                </option>
              ))}
            </select>

            {/* Re-draw button */}
            <button
              onClick={() => {
                setTournament(null)
                setDrawSeed((n) => n + 1)
              }}
              disabled={loadState === 'loading'}
              title="Re-draw groups randomly"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-medium transition-colors"
            >
              🎲 Re-draw
            </button>

            {/* Reset API key */}
            <button
              onClick={() => {
                localStorage.removeItem('fbd_api_key')
                sessionStorage.clear()
                setHasKey(false)
              }}
              title="Change API key"
              className="text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              API key
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loadState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-epl-green rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Loading season data…</p>
          </div>
        )}

        {loadState === 'error' && (
          <div className="max-w-lg mx-auto py-20 text-center">
            <p className="text-red-400 font-semibold text-lg mb-2">Failed to load season</p>
            <p className="text-white/50 text-sm mb-6 whitespace-pre-wrap">{error}</p>
            <button
              onClick={load}
              className="bg-epl-green text-epl-purple font-bold px-6 py-2 rounded-lg hover:bg-epl-green/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loadState === 'success' && tournament && (
          <TournamentView tournament={tournament} />
        )}

        {loadState === 'idle' && (
          <div className="flex items-center justify-center py-32">
            <p className="text-white/30 text-sm">Select a season above to begin.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 text-center py-6 text-white/20 text-xs">
        Data via{' '}
        <a
          href="https://www.football-data.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/40 underline"
        >
          football-data.org
        </a>{' '}
        · Inspired by Michael Cox / ESPN · Results are first-meeting of each pair in the season
      </footer>
    </div>
  )
}
