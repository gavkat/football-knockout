import type { ApiMatch, KnockoutMatch } from '../types'
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
  const agg = teamKey === 'team1' ? match.team1Agg : match.team2Agg
  const hasData = match.leg1 !== null || match.leg2 !== null

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
        {hasData ? agg : '–'}
      </span>
    </div>
  )
}

/** Shows one leg's score from team1's perspective: team1goals–team2goals */
function LegScore({ leg, label, team1Id }: { leg: ApiMatch; label: string; team1Id: number }) {
  const hg = leg.score.fullTime.home ?? 0
  const ag = leg.score.fullTime.away ?? 0
  const isTeam1Home = leg.homeTeam.id === team1Id
  const t1g = isTeam1Home ? hg : ag
  const t2g = isTeam1Home ? ag : hg
  return (
    <span className="text-white/40 text-xs font-mono">
      {label}: {t1g}–{t2g}
    </span>
  )
}

export default function BracketMatch({ match, label }: Props) {
  const hasAnyMatch = match.leg1 !== null || match.leg2 !== null
  const isLevelOnAgg = match.winner !== null && match.team1Agg === match.team2Agg

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

        {/* Per-leg scores */}
        {hasAnyMatch && match.team1 && (
          <div className="px-3 py-1.5 border-t border-white/10 flex gap-3 justify-center">
            {match.leg1 && (
              <LegScore leg={match.leg1} label="H" team1Id={match.team1.id} />
            )}
            {match.leg2 && (
              <LegScore leg={match.leg2} label="A" team1Id={match.team1.id} />
            )}
          </div>
        )}

        {/* Tiebreaker notice */}
        {isLevelOnAgg && match.winner && (
          <div className="px-3 py-1 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-amber-400 text-xs text-center">
              {match.awayGoalsDecided ? 'Away goals' : 'Level'} · {match.winner.tla} advances
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
