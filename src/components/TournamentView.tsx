import type { Tournament } from '../types'
import GroupCard from './GroupCard'
import KnockoutBracket from './KnockoutBracket'

interface Props {
  tournament: Tournament
}

export default function TournamentView({ tournament }: Props) {
  const { groups, quarterFinals, semiFinals, final, champion, isOfficialDraw } = tournament

  return (
    <div className="space-y-12">
      {/* Group Stage */}
      <section>
        <SectionHeader
          title="Group Stage"
          subtitle={
            isOfficialDraw
              ? 'Fixed seeding: champion paired with lowest qualifier · same draw for all visitors · top 2 advance'
              : 'Custom random draw · top 2 from each group advance'
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {groups.map((g) => (
            <GroupCard key={g.name} group={g} />
          ))}
        </div>
      </section>

      {/* Knockout bracket */}
      <section>
        <SectionHeader
          title="Knockout Stage"
          subtitle="2-legged ties · aggregate score decides · away goals used if level · both Premier League fixtures used"
        />
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <KnockoutBracket
            quarterFinals={quarterFinals}
            semiFinals={semiFinals}
            final={final}
            champion={champion}
          />
        </div>
      </section>

      {/* Champion banner */}
      {champion && (
        <section className="text-center py-8">
          <div className="inline-block bg-gradient-to-br from-epl-green/20 to-epl-blue/10 border border-epl-green/30 rounded-3xl px-10 py-8">
            <p className="text-white/50 text-sm uppercase tracking-widest mb-3">
              {tournament.season} Knockout Champion
            </p>
            <div className="flex items-center justify-center gap-4">
              <img
                src={champion.crest}
                alt={champion.name}
                className="w-16 h-16 object-contain"
              />
              <div className="text-left">
                <p className="text-white font-bold text-3xl">{champion.shortName}</p>
                <p className="text-white/40 text-sm">
                  Finished {ordinal(champion.leaguePosition)} in the actual league ·{' '}
                  {champion.leaguePoints} pts
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-white font-bold text-xl">{title}</h2>
      <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
