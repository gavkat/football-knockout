import type { ApiMatch, StandingEntry } from '../types'

const BASE_URL = 'https://api.football-data.org/v4'

interface StandingsResponse {
  standings: {
    stage: string
    type: string
    table: StandingEntry[]
  }[]
}

interface MatchesResponse {
  matches: ApiMatch[]
}

function getApiKey(): string {
  return (
    (import.meta.env.VITE_FOOTBALL_DATA_API_KEY as string) ||
    localStorage.getItem('fbd_api_key') ||
    ''
  )
}

async function fetchWithCache<T>(url: string, apiKey: string): Promise<T> {
  const cacheKey = `fbd_cache_${url}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached) as T

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
  })

  if (res.status === 429) {
    throw new Error('Rate limit hit. Please wait a minute and try again.')
  }
  if (res.status === 403) {
    throw new Error('Invalid API key. Please check your football-data.org API key.')
  }
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`API error ${res.status}: ${msg}`)
  }

  const data = (await res.json()) as T
  sessionStorage.setItem(cacheKey, JSON.stringify(data))
  return data
}

export async function fetchStandings(season: number): Promise<StandingEntry[]> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const data = await fetchWithCache<StandingsResponse>(
    `${BASE_URL}/competitions/PL/standings?season=${season}`,
    apiKey,
  )

  const total = data.standings.find((s) => s.type === 'TOTAL')
  if (!total) throw new Error('Could not find total standings')
  return total.table
}

export async function fetchMatches(season: number): Promise<ApiMatch[]> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const data = await fetchWithCache<MatchesResponse>(
    `${BASE_URL}/competitions/PL/matches?season=${season}&status=FINISHED`,
    apiKey,
  )

  return data.matches
}

export function saveApiKey(key: string): void {
  localStorage.setItem('fbd_api_key', key)
}

export function loadApiKey(): string {
  return localStorage.getItem('fbd_api_key') || ''
}
