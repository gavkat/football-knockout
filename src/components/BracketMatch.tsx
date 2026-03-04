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
  // Only dim the loser when the result is confirmed (both legs played)
  const isLoser = !match.isPending && match.winner !== null && match.winner.id !== team.id
  const agg = teamKey === 'team1' ? match.team1Agg : match.team2Agg
  const hasData = match.leg1 !== null || match.leg2 !== null

  let rowClass: string
  let scoreClass: string
  let nameClass: string

  if (isWinner && !match.isPending) {
    // Confirmed winner
    rowClass = 'bg-epl-green/20 ring-1 ring-epl-green/50'
    nameClass = 'text-epl-green'
    scoreClass = 'text-epl-green'
  } else if (isWinner && match.isPending) {
    // Tentative leader – result not yet decided
    rowClass = 'bg-amber-500/15 ring-1 ring-amber-500/40'
    nameClass = 'text-amber-300'
    scoreClass = 'text-amber-300'
  } else if (isLoser) {
    // Confirmed loser
    rowClass = 'bg-white/3 opacity-50'
    nameClass = 'text-white'
    scoreClass = 'text-white/60'
  } else {
    // Neutral (pending – no result yet, or this team is not the leader)
    rowClass = 'bg-white/8'
    nameClass = 'text-white'
    scoreClass = 'text-white/60'
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${rowClass}`}>
      <TeamCrest crest={team.crest} name={team.name} size="sm" />
      <span className={`text-sm font-semibold flex-1 truncate ${nameClass}`}>
        {team.shortName}
      </span>
      <span className={`text-sm font-mono font-bold min-w-[1.25rem] text-right ${scoreClass}`}>
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

/** Placeholder for a leg that hasn't been played yet */
function PendingLeg({ label }: { label: string }) {
  return (
    <span className="text-amber-400/50 text-xs font-mono italic">
      {label}: –
    </span>
  )
}

export default function BracketMatch({ match, label }: Props) {
  const hasAnyMatch = match.leg1 !== null || match.leg2 !== null
  const isLevelOnAgg = match.winner !== null && match.team1Agg === match.team2Agg
  const bothTeamsKnown = match.team1 !== null && match.team2 !== null

  // Describe what's still pending for this tie
  const pendingLegCount = (match.leg1 === null ? 1 : 0) + (match.leg2 === null ? 1 : 0)
  const pendingLabel =
    pendingLegCount === 2
      ? 'Pending · fixtures to be played'
      : 'Pending · awaiting second leg'

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

        {/* Per-leg scores (played legs) + placeholder for pending leg */}
        {bothTeamsKnown && (hasAnyMatch || match.isPending) && (
          <div className="px-3 py-1.5 border-t border-white/10 flex gap-3 justify-center">
            {match.leg1 ? (
              <LegScore leg={match.leg1} label="H" team1Id={match.team1!.id} />
            ) : match.isPending ? (
              <PendingLeg label="H" />
            ) : null}
            {match.leg2 ? (
              <LegScore leg={match.leg2} label="A" team1Id={match.team1!.id} />
            ) : match.isPending ? (
              <PendingLeg label="A" />
            ) : null}
          </div>
        )}

        {/* Pending notice */}
        {match.isPending && bothTeamsKnown && (
          <div className="px-3 py-1 bg-amber-500/8 border-t border-amber-500/20">
            <p className="text-amber-400/70 text-xs text-center">{pendingLabel}</p>
          </div>
        )}

        {/* Tiebreaker notice (confirmed result only) */}
        {!match.isPending && isLevelOnAgg && match.winner && (
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
