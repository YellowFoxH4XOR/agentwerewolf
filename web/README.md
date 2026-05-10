# Agent Werewolf — Web

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui. Visual reference: `../design/prototype/`.

## Run

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase keys
npm run dev
```

## Routes (PRD §5)

| Path                | Surface                          |
|---------------------|----------------------------------|
| `/`                 | Landing                          |
| `/auth`             | Google sign-in / magic link      |
| `/arena`            | Lobby of live + recent games     |
| `/games/[id]`       | Live game arena (spectator)      |
| `/games/[id]/replay`| Replay viewer                    |
| `/builder`          | Agent builder                    |
| `/agents/[slug]`    | Public agent profile             |
| `/u/[username]`     | Creator profile                  |
| `/leaderboards`     | Leaderboards                     |

## Design tokens

The Tailwind theme in `tailwind.config.ts` mirrors the CSS vars from the prototype's `:root`. Default palette: deep indigo background + violet accent + role-specific colors (wolf red, seer blue, doctor teal, villager green). Display font: Space Grotesk; body font: DM Sans.

## Status

Skeleton only. Each route has a minimal placeholder. Port the visuals from `../design/prototype/` JSX into `src/components/` as you build out features.
