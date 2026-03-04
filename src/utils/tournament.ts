import type {
  ApiMatch,
  Group,
  GroupName,
  GroupStanding,
  KnockoutMatch,
  StandingEntry,
  Team,
  Tournament,
} from '../types'

// ─── helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Return the first finished match played between two teams, chronologically. */
function findMatch(
  allMatches: ApiMatch[],
  teamAId: number,
  teamBId: number,
): ApiMatch | null {
  const candidates = allMatches
    .filter(
      (m) =>
        m.status === 'FINISHED' &&
        m.score.fullTime.home !== null &&
        ((m.homeTeam.id === teamAId && m.awayTeam.id === teamBId) ||
          (m.homeTeam.id === teamBId && m.awayTeam.id === teamAId)),
    )
    .sort(
      (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
    )
  return candidates[0] ?? null
}

/**
 * Determine the winner of a knockout match.
 * In case of a draw the *actual* away team in the match advances.
 */
function knockoutWinner(match: ApiMatch, team1: Team, team2: Team): { winner: Team; drawAwayAdvances: boolean } {
  const h = match.score.fullTime.home ?? 0
  const a = match.score.fullTime.away ?? 0
  const draw = h === a

  let winnerId: number
  if (h > a) {
    winnerId = match.homeTeam.id
  } else if (a > h) {
    winnerId = match.awayTeam.id
  } else {
    winnerId = match.awayTeam.id // away team advances on draw
  }

  const winner = winnerId === team1.id ? team1 : team2
  return { winner, drawAwayAdvances: draw }
}

// ─── group standings ─────────────────────────────────────────────────────────

function buildGroupStandings(teams: Team[], matches: ApiMatch[]): GroupStanding[] {
  const map = new Map<number, GroupStanding>()
  for (const t of teams) {
    map.set(t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 })
  }

  for (const m of matches) {
    const h = map.get(m.homeTeam.id)
    const a = map.get(m.awayTeam.id)
    if (!h || !a) continue

    const hg = m.score.fullTime.home ?? 0
    const ag = m.score.fullTime.away ?? 0

    h.played++; a.played++
    h.gf += hg; h.ga += ag; h.gd = h.gf - h.ga
    a.gf += ag; a.ga += hg; a.gd = a.gf - a.ga

    if (hg > ag) {
      h.won++; h.points += 3; a.lost++
    } else if (ag > hg) {
      a.won++; a.points += 3; h.lost++
    } else {
      h.drawn++; h.points++; a.drawn++; a.points++
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.team.leaguePosition - b.team.leaguePosition
  })
}

// ─── main export ─────────────────────────────────────────────────────────────

export function simulateTournament(
  standingEntries: StandingEntry[],
  allMatches: ApiMatch[],
  season: string,
): Tournament {
  // Top 16 teams
  const top16: Team[] = standingEntries.slice(0, 16).map((e) => ({
    ...e.team,
    leaguePosition: e.position,
    leaguePoints: e.points,
  }))

  // Seeded draw: pot1=1-4, pot2=5-8, pot3=9-12, pot4=13-16
  const pot1 = shuffle(top16.slice(0, 4))
  const pot2 = shuffle(top16.slice(4, 8))
  const pot3 = shuffle(top16.slice(8, 12))
  const pot4 = shuffle(top16.slice(12, 16))

  const groupNames: GroupName[] = ['A', 'B', 'C', 'D']

  // Build groups
  const groups: Group[] = groupNames.map((name, i) => {
    const teams: Team[] = [pot1[i], pot2[i], pot3[i], pot4[i]]

    // Collect all intra-group matches (first meeting of each pair)
    const matches: ApiMatch[] = []
    for (let x = 0; x < teams.length; x++) {
      for (let y = x + 1; y < teams.length; y++) {
        const m = findMatch(allMatches, teams[x].id, teams[y].id)
        if (m) matches.push(m)
      }
    }

    const standings = buildGroupStandings(teams, matches)
    const qualified: [Team, Team] | null =
      standings.length >= 2 ? [standings[0].team, standings[1].team] : null

    return { name, teams, matches, standings, qualified }
  })

  // Quarterfinals
  // QF1: A1 vs B2 | QF2: C1 vs D2 | QF3: B1 vs A2 | QF4: D1 vs C2
  const [groupA, groupB, groupC, groupD] = groups
  const qfPairings: [Team | null, Team | null][] = [
    [groupA.qualified?.[0] ?? null, groupB.qualified?.[1] ?? null],
    [groupC.qualified?.[0] ?? null, groupD.qualified?.[1] ?? null],
    [groupB.qualified?.[0] ?? null, groupA.qualified?.[1] ?? null],
    [groupD.qualified?.[0] ?? null, groupC.qualified?.[1] ?? null],
  ]

  const quarterFinals: KnockoutMatch[] = qfPairings.map(([t1, t2], i) => {
    const actualMatch = t1 && t2 ? findMatch(allMatches, t1.id, t2.id) : null
    let winner: Team | null = null
    let drawAwayAdvances = false
    if (t1 && t2 && actualMatch) {
      ;({ winner, drawAwayAdvances } = knockoutWinner(actualMatch, t1, t2))
    }
    return { id: `qf${i + 1}`, round: 'qf', team1: t1, team2: t2, actualMatch, winner, drawAwayAdvances }
  })

  // Semifinals: SF1 = QF1 winner vs QF2 winner, SF2 = QF3 winner vs QF4 winner
  const sfPairings: [Team | null, Team | null][] = [
    [quarterFinals[0].winner, quarterFinals[1].winner],
    [quarterFinals[2].winner, quarterFinals[3].winner],
  ]

  const semiFinals: KnockoutMatch[] = sfPairings.map(([t1, t2], i) => {
    const actualMatch = t1 && t2 ? findMatch(allMatches, t1.id, t2.id) : null
    let winner: Team | null = null
    let drawAwayAdvances = false
    if (t1 && t2 && actualMatch) {
      ;({ winner, drawAwayAdvances } = knockoutWinner(actualMatch, t1, t2))
    }
    return { id: `sf${i + 1}`, round: 'sf', team1: t1, team2: t2, actualMatch, winner, drawAwayAdvances }
  })

  // Final
  const [ft1, ft2] = [semiFinals[0].winner, semiFinals[1].winner]
  const finalMatch = ft1 && ft2 ? findMatch(allMatches, ft1.id, ft2.id) : null
  let finalWinner: Team | null = null
  let finalDrawAway = false
  if (ft1 && ft2 && finalMatch) {
    ;({ winner: finalWinner, drawAwayAdvances: finalDrawAway } = knockoutWinner(finalMatch, ft1, ft2))
  }

  const final: KnockoutMatch = {
    id: 'final',
    round: 'final',
    team1: ft1,
    team2: ft2,
    actualMatch: finalMatch,
    winner: finalWinner,
    drawAwayAdvances: finalDrawAway,
  }

  return { season, groups, quarterFinals, semiFinals, final, champion: finalWinner }
}
