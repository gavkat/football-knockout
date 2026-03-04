import type { Group } from '../types'
import TeamCrest from './TeamCrest'

interface Props {
  group: Group
}

function formatScore(home: number | null, away: number | null): string {
  return `${home} – ${away}`
}

function formatDate(utcDate: string): string {
  const d = new Date(utcDate)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

export default function GroupCard({ group }: Props) {
  const confirmed = new Set(group.confirmedPositions)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-epl-purple px-4 py-3 flex items-center gap-2">
        <span className="text-epl-green font-bold text-lg">Group {group.name}</span>
      </div>

      {/* Standings table */}
      <div className="px-4 pt-3 pb-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs uppercase tracking-wider">
              <th className="text-left pb-2 font-medium w-full">Team</th>
              <th className="pb-2 font-medium px-1">P</th>
              <th className="pb-2 font-medium px-1">W</th>
              <th className="pb-2 font-medium px-1">D</th>
              <th className="pb-2 font-medium px-1">L</th>
              <th className="pb-2 font-medium px-1">GD</th>
              <th className="pb-2 font-medium px-1">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((row, idx) => {
              const pos = idx + 1
              const qualifies = pos <= 2
              const isConfirmed = confirmed.has(pos)

              // Position badge colour
              // Confirmed qualified: green (1st) / white (2nd)
              // Pending qualified: amber for both
              // Confirmed eliminated: dim gray
              // Pending eliminated: slightly brighter (might still move up)
              let badgeClass: string
              if (qualifies && isConfirmed) {
                badgeClass =
                  idx === 0
                    ? 'bg-epl-green text-epl-purple'
                    : 'bg-white/20 text-white'
              } else if (qualifies && !isConfirmed) {
                badgeClass = 'bg-white/20 text-white/60'
              } else if (!qualifies && isConfirmed) {
                badgeClass = 'bg-white/5 text-white/40'
              } else {
                // Pending eliminated – slightly less dim, still in contention
                badgeClass = 'bg-white/10 text-white/50'
              }

              // Row text: full brightness for qualifying (confirmed or pending),
              // dimmed for confirmed-out, slightly less dim for pending-out
              let rowClass: string
              if (qualifies) {
                rowClass = 'text-white'
              } else if (isConfirmed) {
                rowClass = 'text-white/50'
              } else {
                rowClass = 'text-white/60'
              }

              return (
                <tr
                  key={row.team.id}
                  className={`${rowClass} border-t border-white/5`}
                >
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${badgeClass}`}
                      >
                        {pos}
                      </span>
                      <TeamCrest crest={row.team.crest} name={row.team.name} size="sm" />
                      <span className="font-medium truncate">{row.team.shortName}</span>
                      <div className="ml-auto flex items-center gap-1">
                        {qualifies && !isConfirmed && (
                          <span className="text-white/40 text-xs" title="Qualification pending">
                            ~
                          </span>
                        )}
                        <span className="text-white/30 text-xs">#{row.team.leaguePosition}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 text-center px-1">{row.played}</td>
                  <td className="py-2 text-center px-1">{row.won}</td>
                  <td className="py-2 text-center px-1">{row.drawn}</td>
                  <td className="py-2 text-center px-1">{row.lost}</td>
                  <td className="py-2 text-center px-1">
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </td>
                  <td className="py-2 text-center px-1 font-bold">{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pending legend */}
        {group.confirmedPositions.length < 4 && (
          <p className="text-white/30 text-xs mt-2 pb-1">
            ~ Qualification pending · fixtures still to be played
          </p>
        )}
      </div>

      {/* Group matches */}
      <div className="border-t border-white/10 px-4 py-3 space-y-2">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Fixtures (home &amp; away)</p>
        {group.matches.length === 0 ? (
          <p className="text-white/30 text-xs italic">No match data found</p>
        ) : (
          group.matches.map((m) => {
            const hg = m.score.fullTime.home
            const ag = m.score.fullTime.away
            const homeWin = hg !== null && ag !== null && hg > ag
            const awayWin = hg !== null && ag !== null && ag > hg

            return (
              <div key={m.id} className="flex items-center gap-1 text-xs">
                <span className={`flex-1 text-right truncate ${homeWin ? 'text-white font-semibold' : 'text-white/50'}`}>
                  {m.homeTeam.tla}
                </span>
                <span className="bg-white/10 rounded px-2 py-0.5 font-mono font-bold text-white min-w-[4rem] text-center">
                  {hg === null || ag === null ? formatDate(m.utcDate) : formatScore(hg, ag)}
                </span>
                <span className={`flex-1 text-left truncate ${awayWin ? 'text-white font-semibold' : 'text-white/50'}`}>
                  {m.awayTeam.tla}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
