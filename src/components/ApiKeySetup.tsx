import { useState } from 'react'
import { saveApiKey } from '../api/footballData'

interface Props {
  onSave: () => void
}

export default function ApiKeySetup({ onSave }: Props) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Please enter your API key.')
      return
    }
    saveApiKey(trimmed)
    onSave()
  }

  return (
    <div className="min-h-screen bg-epl-purple flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">EPL Knockout Visualizer</h1>
          <p className="text-white/60">
            Replay any Premier League season as a knockout tournament using real match results.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold text-lg mb-1">
            Set up your API key
          </h2>
          <p className="text-white/50 text-sm mb-4">
            This app uses the free{' '}
            <a
              href="https://www.football-data.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-epl-green hover:underline"
            >
              football-data.org
            </a>{' '}
            API. Register for free to get a key — no credit card required.
          </p>

          <ol className="text-white/60 text-sm space-y-1 mb-5 list-decimal list-inside">
            <li>
              Go to{' '}
              <a
                href="https://www.football-data.org/client/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-epl-blue hover:underline"
              >
                football-data.org/client/register
              </a>
            </li>
            <li>Sign up for the free tier</li>
            <li>Copy your API token from your account dashboard</li>
            <li>Paste it below</li>
          </ol>

          <input
            type="text"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Paste your API token here…"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-epl-green/60 text-sm font-mono mb-3"
          />

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSave}
            className="w-full bg-epl-green text-epl-purple font-bold py-3 rounded-lg hover:bg-epl-green/90 transition-colors"
          >
            Save & Continue
          </button>
        </div>

        <p className="text-white/30 text-xs text-center mt-4">
          Your key is stored only in your browser's local storage.
        </p>
      </div>
    </div>
  )
}
