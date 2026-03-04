export interface ApiTeam {
  id: number
  name: string
  shortName: string
  tla: string
  crest: string
}

export interface StandingEntry {
  position: number
  team: ApiTeam
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export interface ApiMatch {
  id: number
  utcDate: string
  status: string
  matchday: number
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: {
      home: number | null
      away: number | null
    }
  }
}

export interface Team extends ApiTeam {
  leaguePosition: number
  leaguePoints: number
}

export type GroupName = 'A' | 'B' | 'C' | 'D'

export interface GroupStanding {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

export interface Group {
  name: GroupName
  teams: Team[]
  matches: ApiMatch[]
  standings: GroupStanding[]
  qualified: [Team, Team] | null // [winner, runner-up]
}

export interface KnockoutMatch {
  id: string
  round: 'qf' | 'sf' | 'final'
  team1: Team | null
  team2: Team | null
  actualMatch: ApiMatch | null
  winner: Team | null
  drawAwayAdvances: boolean
}

export interface Tournament {
  season: string
  groups: Group[]
  quarterFinals: KnockoutMatch[]
  semiFinals: KnockoutMatch[]
  final: KnockoutMatch | null
  champion: Team | null
  isOfficialDraw: boolean
}

export type SeasonYear =
  | 2015
  | 2016
  | 2017
  | 2018
  | 2019
  | 2020
  | 2021
  | 2022
  | 2023
  | 2024
  | 2025

export const AVAILABLE_SEASONS: { year: SeasonYear; label: string }[] = [
  { year: 2025, label: '2025/26' },
  { year: 2024, label: '2024/25' },
  { year: 2023, label: '2023/24' },
  { year: 2022, label: '2022/23' },
  { year: 2021, label: '2021/22' },
  { year: 2020, label: '2020/21' },
  { year: 2019, label: '2019/20' },
  { year: 2018, label: '2018/19' },
  { year: 2017, label: '2017/18' },
  { year: 2016, label: '2016/17' },
  { year: 2015, label: '2015/16' },
]
