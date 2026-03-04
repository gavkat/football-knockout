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

/**
 * Return the first finished match where homeId is the home side and awayId is
 * the away side, in chronological order.
 */
function findHomeMatch(
  allMatches: ApiMatch[],
  homeId: number,
  awayId: number,
): ApiMatch | null {
  return (
    allMatches
      .filter(
        (m) =>
          m.status === 'FINISHED' &&
          m.score.fullTime.home !== null &&
          m.homeTeam.id === homeId &&
          m.awayTeam.id === awayId,
      )
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0] ?? null
  )
}

/**
 * Return the first scheduled (not yet played) match where homeId is the home
 * side and awayId is the away side, in chronological order.
 */
function findScheduledMatch(
  allMatches: ApiMatch[],
  homeId: number,
  awayId: number,
): ApiMatch | null {
  return (
    allMatches
      .filter(
        (m) =>
          (m.status === 'SCHEDULED' || m.status === 'TIMED') &&
          m.homeTeam.id === homeId &&
          m.awayTeam.id === awayId,
      )
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0] ?? null
  )
}

/**
 * Determine the winner of a 2-legged knockout tie on aggregate.
 * leg1 is expected to have team1 at home; leg2 has team2 at home.
 * If aggregate is level the away-goals rule is applied; if still level team2
 * advances (as the conventionally "away" side).
 */
function twoLegWinner(
  leg1: ApiMatch | null,
  leg2: ApiMatch | null,
  team1: Team,
  team2: Team,
): { winner: Team; team1Agg: number; team2Agg: number; awayGoalsDecided: boolean } {
  let t1Goals = 0
  let t2Goals = 0
  let t1Away = 0
  let t2Away = 0

  if (leg1) {
    const h = leg1.score.fullTime.home ?? 0
    const a = leg1.score.fullTime.away ?? 0
    if (leg1.homeTeam.id === team1.id) {
      t1Goals += h; t2Goals += a; t2Away += a
    } else {
      t2Goals += h; t1Goals += a; t1Away += a
    }
  }

  if (leg2) {
    const h = leg2.score.fullTime.home ?? 0
    const a = leg2.score.fullTime.away ?? 0
    if (leg2.homeTeam.id === team2.id) {
      t2Goals += h; t1Goals += a; t1Away += a
    } else {
      t1Goals += h; t2Goals += a; t2Away += a
    }
  }

  let winner: Team
  let awayGoalsDecided = false

  if (t1Goals > t2Goals) {
    winner = team1
  } else if (t2Goals > t1Goals) {
    winner = team2
  } else {
    // Level on aggregate – apply away goals
    awayGoalsDecided = true
    if (t1Away > t2Away) {
      winner = team1
    } else if (t2Away > t1Away) {
      winner = team2
    } else {
      // Truly level – team2 advances as tiebreaker
      winner = team2
    }
  }

  return { winner, team1Agg: t1Goals, team2Agg: t2Goals, awayGoalsDecided }
}

// ─── confirmed positions ──────────────────────────────────────────────────────

/**
 * Returns the 1-indexed positions (1–4) whose outcome is mathematically certain
 * given the current standings and finished group matches.
 *
 * A team in position ≤ 2 is *confirmed qualified* when no team below can
 * mathematically reach their points.  A team in position ≥ 3 is *confirmed
 * eliminated* by the same logic.  Position 1 specifically is confirmed when no
 * other team can reach the current leader's tally.
 *
 * Formula: the best a team can do is win all their remaining group games
 * (3 pts each).  Each team plays every other group team home AND away = 6
 * matches total; 4 teams × 3 opponents × 2 legs = 12 group matches total.
 */
function computeConfirmedPositions(standings: GroupStanding[], groupMatches: ApiMatch[]): number[] {
  if (standings.length < 4) return []

  // All group matches played → every position is certain
  if (groupMatches.length >= 12) return [1, 2, 3, 4]

  const remainingFor = (teamId: number): number =>
    6 - groupMatches.filter(m => m.homeTeam.id === teamId || m.awayTeam.id === teamId).length

  const [s1, s2, s3, s4] = standings
  const maxPts = (s: GroupStanding) => s.points + 3 * remainingFor(s.team.id)

  const confirmed = new Set<number>()

  // Position 1 confirmed: no other team can reach s1's current points
  if (maxPts(s2) < s1.points && maxPts(s3) < s1.points && maxPts(s4) < s1.points) {
    confirmed.add(1)
  }

  // Top-2 confirmed: s3 can no longer reach s2's current points
  if (maxPts(s3) < s2.points) {
    confirmed.add(2) // s2 confirmed qualified
    confirmed.add(3) // s3 confirmed eliminated
  }

  // s4 confirmed eliminated: cannot reach s2's current points
  if (maxPts(s4) < s2.points) {
    confirmed.add(4)
  }

  return [...confirmed].sort((a, b) => a - b)
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
  isOfficialDraw: boolean = true,
): Tournament {
  // Top 16 teams
  const top16: Team[] = standingEntries.slice(0, 16).map((e) => ({
    ...e.team,
    leaguePosition: e.position,
    leaguePoints: e.points,
  }))

  // Seeded draw: pot1=1-4, pot2=5-8, pot3=9-12, pot4=13-16
  // Official draw uses snake seeding so rank 1 (champion) is paired with rank 16
  // (lowest qualifier) in Group A, rank 2 with rank 15 in Group B, etc.
  // Every visitor sees the same groups for a given season.
  // Reshuffle uses a random draw within pots for personal exploration.
  let pot1: Team[], pot2: Team[], pot3: Team[], pot4: Team[]
  if (isOfficialDraw) {
    pot1 = top16.slice(0, 4)                      // ranks  1-4  → A,B,C,D
    pot2 = top16.slice(4, 8)                      // ranks  5-8  → A,B,C,D
    pot3 = [...top16.slice(8, 12)].reverse()      // ranks  9-12 → D,C,B,A (snake)
    pot4 = [...top16.slice(12, 16)].reverse()     // ranks 13-16 → D,C,B,A (rank 16 → Group A)
  } else {
    pot1 = shuffle(top16.slice(0, 4))
    pot2 = shuffle(top16.slice(4, 8))
    pot3 = shuffle(top16.slice(8, 12))
    pot4 = shuffle(top16.slice(12, 16))
  }

  const groupNames: GroupName[] = ['A', 'B', 'C', 'D']

  // Build groups – collect both home and away fixtures for every pair
  const groups: Group[] = groupNames.map((name, i) => {
    const teams: Team[] = [pot1[i], pot2[i], pot3[i], pot4[i]]

    const finishedMatches: ApiMatch[] = []
    const scheduledMatches: ApiMatch[] = []
    for (let x = 0; x < teams.length; x++) {
      for (let y = x + 1; y < teams.length; y++) {
        const leg1 = findHomeMatch(allMatches, teams[x].id, teams[y].id)
        const leg2 = findHomeMatch(allMatches, teams[y].id, teams[x].id)
        if (leg1) finishedMatches.push(leg1)
        else {
          const sched = findScheduledMatch(allMatches, teams[x].id, teams[y].id)
          if (sched) scheduledMatches.push(sched)
        }
        if (leg2) finishedMatches.push(leg2)
        else {
          const sched = findScheduledMatch(allMatches, teams[y].id, teams[x].id)
          if (sched) scheduledMatches.push(sched)
        }
      }
    }

    // Combine and sort chronologically for display; standings use finished only
    const matches: ApiMatch[] = [...finishedMatches, ...scheduledMatches]
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

    const standings = buildGroupStandings(teams, finishedMatches)
    const qualified: [Team, Team] | null =
      standings.length >= 2 ? [standings[0].team, standings[1].team] : null
    const confirmedPositions = computeConfirmedPositions(standings, finishedMatches)

    return { name, teams, matches, standings, qualified, confirmedPositions }
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
    let leg1: ApiMatch | null = null
    let leg2: ApiMatch | null = null
    let scheduledLeg1: ApiMatch | null = null
    let scheduledLeg2: ApiMatch | null = null
    let winner: Team | null = null
    let team1Agg = 0
    let team2Agg = 0
    let awayGoalsDecided = false

    if (t1 && t2) {
      leg1 = findHomeMatch(allMatches, t1.id, t2.id)
      leg2 = findHomeMatch(allMatches, t2.id, t1.id)
      if (!leg1) scheduledLeg1 = findScheduledMatch(allMatches, t1.id, t2.id)
      if (!leg2) scheduledLeg2 = findScheduledMatch(allMatches, t2.id, t1.id)
      if (leg1 || leg2) {
        ;({ winner, team1Agg, team2Agg, awayGoalsDecided } = twoLegWinner(leg1, leg2, t1, t2))
      }
    }

    const isPending = t1 !== null && t2 !== null && (leg1 === null || leg2 === null)
    return { id: `qf${i + 1}`, round: 'qf', team1: t1, team2: t2, leg1, leg2, scheduledLeg1, scheduledLeg2, team1Agg, team2Agg, winner, awayGoalsDecided, isPending }
  })

  // Semifinals: SF1 = QF1 winner vs QF2 winner, SF2 = QF3 winner vs QF4 winner
  const sfPairings: [Team | null, Team | null][] = [
    [quarterFinals[0].winner, quarterFinals[1].winner],
    [quarterFinals[2].winner, quarterFinals[3].winner],
  ]

  const semiFinals: KnockoutMatch[] = sfPairings.map(([t1, t2], i) => {
    let leg1: ApiMatch | null = null
    let leg2: ApiMatch | null = null
    let scheduledLeg1: ApiMatch | null = null
    let scheduledLeg2: ApiMatch | null = null
    let winner: Team | null = null
    let team1Agg = 0
    let team2Agg = 0
    let awayGoalsDecided = false

    if (t1 && t2) {
      leg1 = findHomeMatch(allMatches, t1.id, t2.id)
      leg2 = findHomeMatch(allMatches, t2.id, t1.id)
      if (!leg1) scheduledLeg1 = findScheduledMatch(allMatches, t1.id, t2.id)
      if (!leg2) scheduledLeg2 = findScheduledMatch(allMatches, t2.id, t1.id)
      if (leg1 || leg2) {
        ;({ winner, team1Agg, team2Agg, awayGoalsDecided } = twoLegWinner(leg1, leg2, t1, t2))
      }
    }

    const isPending = t1 !== null && t2 !== null && (leg1 === null || leg2 === null)
    return { id: `sf${i + 1}`, round: 'sf', team1: t1, team2: t2, leg1, leg2, scheduledLeg1, scheduledLeg2, team1Agg, team2Agg, winner, awayGoalsDecided, isPending }
  })

  // Final (2-legged)
  const [ft1, ft2] = [semiFinals[0].winner, semiFinals[1].winner]
  let finalLeg1: ApiMatch | null = null
  let finalLeg2: ApiMatch | null = null
  let finalScheduledLeg1: ApiMatch | null = null
  let finalScheduledLeg2: ApiMatch | null = null
  let finalWinner: Team | null = null
  let finalT1Agg = 0
  let finalT2Agg = 0
  let finalAwayGoals = false

  if (ft1 && ft2) {
    finalLeg1 = findHomeMatch(allMatches, ft1.id, ft2.id)
    finalLeg2 = findHomeMatch(allMatches, ft2.id, ft1.id)
    if (!finalLeg1) finalScheduledLeg1 = findScheduledMatch(allMatches, ft1.id, ft2.id)
    if (!finalLeg2) finalScheduledLeg2 = findScheduledMatch(allMatches, ft2.id, ft1.id)
    if (finalLeg1 || finalLeg2) {
      ;({ winner: finalWinner, team1Agg: finalT1Agg, team2Agg: finalT2Agg, awayGoalsDecided: finalAwayGoals } =
        twoLegWinner(finalLeg1, finalLeg2, ft1, ft2))
    }
  }

  const final: KnockoutMatch = {
    id: 'final',
    round: 'final',
    team1: ft1,
    team2: ft2,
    leg1: finalLeg1,
    leg2: finalLeg2,
    scheduledLeg1: finalScheduledLeg1,
    scheduledLeg2: finalScheduledLeg2,
    team1Agg: finalT1Agg,
    team2Agg: finalT2Agg,
    winner: finalWinner,
    awayGoalsDecided: finalAwayGoals,
    isPending: ft1 !== null && ft2 !== null && (finalLeg1 === null || finalLeg2 === null),
  }

  return { season, groups, quarterFinals, semiFinals, final, champion: finalWinner, isOfficialDraw }
}
