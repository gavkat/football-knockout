# Server-Side Caching Design — Football Data

## Problem Statement

The app currently requires every visitor to supply their own `football-data.org` API key,
which creates friction and exposes the key in the browser.  This design moves all football-data
API calls to the server, hides the key, and makes the site fast through layered caching.

---

## Architecture Overview

```
Browser (React SPA)
        │
        │  GET /api/season?season=2024
        ▼
Vercel Edge Network (CDN cache)
        │  cache miss / stale
        ▼
Vercel Serverless Function  /api/season.ts
        │  1. Check in-memory module cache (warm lambda)
        │  2. Cache miss → call football-data.org with server-held API key
        │  3. Attach Cache-Control header → response written to CDN
        ▼
football-data.org  (only hit when CDN is cold)
```

The single most important lever is the **CDN cache** (`Cache-Control: s-maxage`).
Vercel's Edge Network will serve subsequent requests entirely from cache without
waking a lambda at all.

---

## Implementation Steps

### 1. Add the API key to Vercel environment variables

```
FOOTBALL_DATA_API_KEY=<your-key>
```

No `VITE_` prefix → the value is never bundled into client-side JS.
Remove the existing `.env.example` entry for `VITE_FOOTBALL_DATA_API_KEY`.

---

### 2. Create `/api/season.ts` — the single server endpoint

All data for one season is fetched and shaped in one round-trip so the browser
makes exactly **one** request per season instead of two.

**File: `/api/season.ts`**

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

const FOOTBALL_API = 'https://api.football-data.org/v4'

// Module-level in-memory cache (survives across warm invocations)
const memCache = new Map<string, { data: SeasonPayload; fetchedAt: number }>()

// How long we keep data in the in-memory cache (seconds)
const MEM_TTL_HISTORICAL = 7 * 24 * 3600   // 7 days — completed seasons never change
const MEM_TTL_CURRENT    = 60 * 60          // 1 hour  — live season may update

// How long the CDN caches the response (s-maxage) + stale-while-revalidate window
const CDN_HISTORICAL = 'public, s-maxage=604800, stale-while-revalidate=86400'
const CDN_CURRENT    = 'public, s-maxage=3600,   stale-while-revalidate=86400'

async function fdFetch(path: string) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not configured')
  const res = await fetch(`${FOOTBALL_API}${path}`, {
    headers: { 'X-Auth-Token': apiKey },
  })
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`)
  return res.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const season = Number(req.query.season)
  if (!season || season < 2015 || season > 2025) {
    return res.status(400).json({ error: 'Invalid season' })
  }

  const currentYear = new Date().getFullYear()
  const isHistorical = season < currentYear - 1  // seasons clearly finished
  const cacheKey = `season-${season}`
  const memTtl  = isHistorical ? MEM_TTL_HISTORICAL : MEM_TTL_CURRENT

  // --- In-memory cache check ---
  const cached = memCache.get(cacheKey)
  if (cached && (Date.now() / 1000 - cached.fetchedAt) < memTtl) {
    res.setHeader('Cache-Control', isHistorical ? CDN_HISTORICAL : CDN_CURRENT)
    res.setHeader('X-Cache', 'HIT-MEM')
    return res.json(cached.data)
  }

  // --- Fetch from football-data.org ---
  const [standingsRaw, matchesRaw] = await Promise.all([
    fdFetch(`/competitions/PL/standings?season=${season}`),
    fdFetch(`/competitions/PL/matches?season=${season}&status=FINISHED`),
  ])

  const payload = shapePayload(standingsRaw, matchesRaw, season)

  memCache.set(cacheKey, { data: payload, fetchedAt: Date.now() / 1000 })

  res.setHeader('Cache-Control', isHistorical ? CDN_HISTORICAL : CDN_CURRENT)
  res.setHeader('X-Cache', 'MISS')
  return res.json(payload)
}
```

#### `shapePayload` — enrich the raw API data

```typescript
function shapePayload(standingsRaw: any, matchesRaw: any, season: number): SeasonPayload {
  const table: StandingEntry[] = standingsRaw.standings
    .find((s: any) => s.type === 'TOTAL').table

  const matches: ApiMatch[] = matchesRaw.matches

  return {
    season,
    standings: table,
    matches,
    computed: computeStats(table, matches),
  }
}
```

---

### 3. Computed statistics (server-side, free)

Because we already have every match result in memory, we can derive these at
zero extra API cost and attach them to the response payload.

#### a. Form guide (last 5 finished matches per team)

```typescript
function formGuide(teamId: number, matches: ApiMatch[]): ('W' | 'D' | 'L')[] {
  return matches
    .filter(m =>
      (m.homeTeam.id === teamId || m.awayTeam.id === teamId) &&
      m.score.winner !== null
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, 5)
    .map(m => {
      const isHome = m.homeTeam.id === teamId
      if (m.score.winner === 'DRAW') return 'D'
      return (isHome ? m.score.winner === 'HOME_TEAM' : m.score.winner === 'AWAY_TEAM')
        ? 'W' : 'L'
    })
    .reverse()  // chronological order for display
}
```

#### b. Head-to-head record (across all H2H matches in the season)

```typescript
interface H2HRecord { wins: number; draws: number; losses: number; gf: number; ga: number }

function h2hRecord(teamAId: number, teamBId: number, matches: ApiMatch[]): H2HRecord {
  const relevant = matches.filter(m =>
    (m.homeTeam.id === teamAId && m.awayTeam.id === teamBId) ||
    (m.homeTeam.id === teamBId && m.awayTeam.id === teamAId)
  )
  return relevant.reduce((acc, m) => {
    const isHome = m.homeTeam.id === teamAId
    const gs = isHome ? m.score.fullTime.home ?? 0 : m.score.fullTime.away ?? 0
    const gc = isHome ? m.score.fullTime.away ?? 0 : m.score.fullTime.home ?? 0
    acc.gf += gs; acc.ga += gc
    if (m.score.winner === 'DRAW') acc.draws++
    else if ((isHome && m.score.winner === 'HOME_TEAM') || (!isHome && m.score.winner === 'AWAY_TEAM')) acc.wins++
    else acc.losses++
    return acc
  }, { wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 })
}
```

#### c. Season-level statistics

```typescript
interface SeasonStats {
  totalGoals: number
  avgGoalsPerGame: number
  cleanSheets: Record<number, number>   // teamId → count
  biggestWin: { match: ApiMatch; margin: number } | null
  topScoringMatchday: { matchday: number; goals: number }
}
```

These are cheap to compute once and served in the same JSON payload, so the
browser never needs a second request to show richer UI.

#### Full `SeasonPayload` type

```typescript
interface SeasonPayload {
  season: number
  standings: StandingEntry[]
  matches: ApiMatch[]
  computed: {
    form: Record<number, ('W' | 'D' | 'L')[]>     // teamId → last-5 form
    seasonStats: SeasonStats
    // H2H is O(n²) so computed on-demand in the browser from the matches array
    // (all matches are included, so the browser can derive any H2H pair itself)
  }
}
```

H2H records are intentionally *not* pre-computed for every pair (380 matches,
190 possible matchups) — the browser can derive them instantly from the
`matches` array already in the payload.

---

### 4. Update `vercel.json`

Replace the existing proxy rewrite with a route entry that points at our new function:

```json
{
  "rewrites": [
    { "source": "/api/season", "destination": "/api/season" },
    { "source": "/(.*)",       "destination": "/index.html"  }
  ]
}
```

The second rule keeps the SPA routing working.

---

### 5. Update frontend — remove API key requirement

**`src/api/footballData.ts`** becomes much simpler:

```typescript
import type { ApiMatch, StandingEntry } from '../types'

export interface SeasonPayload {
  season: number
  standings: StandingEntry[]
  matches: ApiMatch[]
  computed: {
    form: Record<number, ('W' | 'D' | 'L')[]>
    seasonStats: {
      totalGoals: number
      avgGoalsPerGame: number
      cleanSheets: Record<number, number>
      biggestWin: { match: ApiMatch; margin: number } | null
      topScoringMatchday: { matchday: number; goals: number }
    }
  }
}

// Simple in-browser cache to avoid re-fetching during the same session
const browserCache = new Map<number, SeasonPayload>()

export async function fetchSeasonData(season: number): Promise<SeasonPayload> {
  if (browserCache.has(season)) return browserCache.get(season)!

  const res = await fetch(`/api/season?season=${season}`)
  if (!res.ok) throw new Error(`Failed to load season data (${res.status})`)

  const data: SeasonPayload = await res.json()
  browserCache.set(season, data)
  return data
}
```

**`src/App.tsx`** — remove `hasKey` / `ApiKeySetup` / `loadApiKey` entirely.
The app loads immediately on mount.

**`src/components/ApiKeySetup.tsx`** — delete the file (no longer needed).

---

### 6. Dependencies to add

```bash
npm install --save-dev @vercel/node
```

`@vercel/node` provides the `VercelRequest` / `VercelResponse` types used in the
serverless function.  It is a dev dependency because the types are only used
during compilation; the Vercel runtime provides the actual request objects.

---

## Caching TTL Summary

| Scenario | CDN `s-maxage` | stale-while-revalidate | In-memory lambda TTL |
|---|---|---|---|
| Historical season (e.g. 2023/24) | 7 days | 1 day | 7 days |
| Current season (e.g. 2025/26) | 1 hour | 24 hours | 1 hour |

`stale-while-revalidate` means a request that hits a stale CDN entry still gets
a fast response — the CDN revalidates in the background.  Users never see a slow
cold-start while waiting for fresh data.

---

## Data Flow After Change

```
User opens site
      │
      ▼
React mounts → fetchSeasonData(2024)
      │
      ▼
GET /api/season?season=2024
      │
      ├─ CDN HIT  → ~10 ms response (most requests)
      │
      └─ CDN MISS → lambda wakes
                      ├─ Memory HIT  → ~5 ms
                      └─ Memory MISS → fetch football-data.org (~400 ms)
                                        └─ cache in memory + CDN
```

After the first real user hits a given season, every subsequent visitor in the
CDN TTL window gets a response in under 50 ms globally — no API key, no rate
limit, no friction.

---

## Files Changed / Created

| Action | Path |
|---|---|
| **Create** | `/api/season.ts` |
| **Modify** | `/vercel.json` |
| **Modify** | `/src/api/footballData.ts` |
| **Modify** | `/src/App.tsx` |
| **Modify** | `/src/types/index.ts` (add `SeasonPayload`, computed stat types) |
| **Delete** | `/src/components/ApiKeySetup.tsx` |
| **Modify** | `/src/components/GroupCard.tsx` (optional: show form badges) |
| **Delete** | `.env.example` `VITE_FOOTBALL_DATA_API_KEY` entry |
| **Add** | `FOOTBALL_DATA_API_KEY` to Vercel project environment variables |

---

## What This Does Not Change

- Tournament simulation logic (`src/utils/tournament.ts`) — unchanged
- All visual components — unchanged (except optional form badge in GroupCard)
- Season selector, reshuffle, official draw modes — unchanged
- The `StandingEntry` and `ApiMatch` types — unchanged (payload is a superset)
