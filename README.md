# EPL Knockout Visualizer

> *What would the Premier League look like if it were a knockout competition?*
> Inspired by [Michael Cox's ESPN article (Jan 2016)](https://www.espn.com/soccer/story/_/id/14508003).

Select any Premier League season (2015/16 → present) and browse it as if it were a knockout tournament — real results, real drama.

## How it works

1. **Top 16** teams are taken from the final league table, seeded 1–16.
2. **Group draw** — four seeded pots (1–4, 5–8, 9–12, 13–16) are shuffled and one team from each pot is placed into Groups A–D.
3. **Group stage** — each team plays the others in their group using the *first actual match played between those clubs* in that season. Standard 3-1-0 points.
4. **Top 2** from each group advance.
5. **Knockout bracket** (QF → SF → Final) — same rule: first H2H match used. If the score is level, the *away team advances*.

Hit **Re-draw** to randomise the group draw and explore alternate histories.

## Setup

### 1 — Get a free API key

Register at **[football-data.org](https://www.football-data.org/client/register)** (free, no credit card). You'll receive a token in your account dashboard.

### 2 — Run the app

```bash
npm install
npm run dev
```

Open http://localhost:5173, paste your API key when prompted, and pick a season.

**Optional:** create `.env` from `.env.example` and set `VITE_FOOTBALL_DATA_API_KEY` to skip the setup screen.

## Tech stack

- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [football-data.org](https://www.football-data.org/) API (free tier)
