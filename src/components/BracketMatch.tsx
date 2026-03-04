import type { KnockoutMatch } from '../types'
import TeamCrest from './TeamCrest'

interface Props {
  match: KnockoutMatch
  label?: string
}

function ScoreLine({
  match,
  teamKey,
}: {
  match: KnockoutMatch
  teamKey: 'team1' | 'team2'
}) {
  const team = match[teamKey]
  if (!team) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 opacity-40">
        <div className="w-6 h-6 rounded-full bg-white/10" />
        <span className="text-white/40 text-sm italic">TBD</span>
      </div>
    )
  }

  const isWinner = match.winner?.id === team.id
  const isLoser = match.winner !== null && match.winner.id !== team.id

  // Work out actual score from the perspective of team1/team2
  let scoreDisplay = '–'
  if (match.actualMatch) {
    const m = match.actualMatch
    const isHome = m.homeTeam.id === team.id
    const hg = m.score.fullTime.home
    const ag = m.score.fullTime.away
    if (hg !== null && ag !== null) {
      scoreDisplay = isHome ? `${hg}` : `${ag}`
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isWinner
          ? 'bg-epl-green/20 ring-1 ring-epl-green/50'
          : isLoser
            ? 'bg-white/3 opacity-50'
            : 'bg-white/8'
      }`}
    >
      <TeamCrest crest={team.crest} name={team.name} size="sm" />
      <span
        className={`text-sm font-semibold flex-1 truncate ${
          isWinner ? 'text-epl-green' : 'text-white'
        }`}
      >
        {team.shortName}
      </span>
      <span
        className={`text-sm font-mono font-bold min-w-[1.25rem] text-right ${
          isWinner ? 'text-epl-green' : 'text-white/60'
        }`}
      >
        {scoreDisplay}
      </span>
    </div>
  )
}

export default function BracketMatch({ match, label }: Props) {
  const hasDraw =
    match.actualMatch &&
    match.actualMatch.score.fullTime.home === match.actualMatch.score.fullTime.away

  return (
    <div className="w-52">
      {label && (
        <p className="text-white/30 text-xs uppercase tracking-wider mb-1 text-center">{label}</p>
      )}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="divide-y divide-white/10">
          <ScoreLine match={match} teamKey="team1" />
          <ScoreLine match={match} teamKey="team2" />
        </div>
        {hasDraw && match.winner && (
          <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-amber-400 text-xs text-center">
              Draw · {match.winner.tla} advances (away)
            </p>
          </div>
        )}
        {!match.team1 && !match.team2 && (
          <div className="px-3 py-1 text-center">
            <p className="text-white/20 text-xs italic">Awaiting teams</p>
          </div>
        )}
      </div>
    </div>
  )
}
