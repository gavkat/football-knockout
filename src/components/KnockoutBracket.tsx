import type { KnockoutMatch, Team } from '../types'
import BracketMatch from './BracketMatch'
import TeamCrest from './TeamCrest'

interface Props {
  quarterFinals: KnockoutMatch[]
  semiFinals: KnockoutMatch[]
  final: KnockoutMatch | null
  champion: Team | null
}

/**
 * Layout (left → right):
 *
 *  QF1 ─┐
 *        ├─ SF1 ─┐
 *  QF2 ─┘        │
 *                 ├─ FINAL → Champion
 *  QF3 ─┐        │
 *        ├─ SF2 ─┘
 *  QF4 ─┘
 */
export default function KnockoutBracket({ quarterFinals, semiFinals, final, champion }: Props) {
  const [qf1, qf2, qf3, qf4] = quarterFinals
  const [sf1, sf2] = semiFinals

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px] py-6">
        {/* Column headers */}
        <div className="flex items-start justify-center gap-0 mb-4">
          <div className="w-52 text-center text-white/40 text-xs uppercase tracking-wider">
            Quarter-finals
          </div>
          <div className="w-16" />
          <div className="w-52 text-center text-white/40 text-xs uppercase tracking-wider">
            Semi-finals
          </div>
          <div className="w-16" />
          <div className="w-52 text-center text-white/40 text-xs uppercase tracking-wider">
            Final
          </div>
          <div className="w-16" />
          <div className="w-36 text-center text-white/40 text-xs uppercase tracking-wider">
            Champion
          </div>
        </div>

        {/* Bracket rows */}
        <div className="flex items-center justify-center gap-0">
          {/* QF column */}
          <div className="flex flex-col gap-4 justify-between" style={{ height: 500 }}>
            <BracketMatch match={qf1} label="A1 v B2" />
            <BracketMatch match={qf2} label="C1 v D2" />
            <BracketMatch match={qf3} label="B1 v A2" />
            <BracketMatch match={qf4} label="D1 v C2" />
          </div>

          {/* QF→SF connectors */}
          <div className="flex flex-col justify-between" style={{ height: 500, width: 64 }}>
            <Connector top />
            <Connector />
            <Connector top />
            <Connector />
          </div>

          {/* SF column */}
          <div className="flex flex-col justify-around" style={{ height: 500 }}>
            <BracketMatch match={sf1} />
            <BracketMatch match={sf2} />
          </div>

          {/* SF→Final connectors */}
          <div className="flex flex-col justify-around" style={{ height: 500, width: 64 }}>
            <Connector top />
            <Connector />
          </div>

          {/* Final */}
          <div className="flex items-center justify-center" style={{ height: 500 }}>
            {final && <BracketMatch match={final} />}
          </div>

          {/* Final→Champion connector */}
          <div className="flex items-center" style={{ height: 500, width: 64 }}>
            <div className="w-full h-0.5 bg-white/20" />
          </div>

          {/* Champion */}
          <div className="flex items-center justify-center" style={{ height: 500, width: 144 }}>
            {champion ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-epl-green/20 ring-2 ring-epl-green flex items-center justify-center p-1">
                  <TeamCrest crest={champion.crest} name={champion.name} size="lg" />
                </div>
                <div>
                  <p className="text-epl-green font-bold text-sm leading-tight">
                    {champion.shortName}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">Champion</p>
                </div>
              </div>
            ) : final?.winner ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 ring-2 ring-amber-500/40 flex items-center justify-center p-1">
                  <TeamCrest crest={final.winner.crest} name={final.winner.name} size="lg" />
                </div>
                <div>
                  <p className="text-amber-300 font-bold text-sm leading-tight">
                    {final.winner.shortName}
                  </p>
                  <p className="text-amber-400/60 text-xs mt-0.5">Pending</p>
                </div>
              </div>
            ) : (
              <div className="text-white/20 text-sm italic text-center">TBD</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Simple L-shaped SVG connector between two bracket rows */
function Connector({ top = false }: { top?: boolean }) {
  return (
    <svg
      width={64}
      height={60}
      className="text-white/20"
      viewBox="0 0 64 60"
      fill="none"
    >
      {top ? (
        // Top half: line from right-middle going left and up
        <polyline
          points="0,30 32,30 32,60 64,60"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="none"
        />
      ) : (
        // Bottom half: line from right-middle going left and down
        <polyline
          points="0,30 32,30 32,0 64,0"
          stroke="currentColor"
          strokeWidth={1.5}
          fill="none"
        />
      )}
    </svg>
  )
}
