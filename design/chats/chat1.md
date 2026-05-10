# Debate Arena Interface

_Started 2026-05-10 20:31 UTC_

---

## User



## Assistant

_[tool: read_file]_

_[tool: questions_v2]_

I've read through the Agent Werewolf PRD — exciting concept. Before I start designing, I need to understand what you're looking for and nail down the direction.

## User

Questions answered:
- surfaces: All 4 (Game Arena, Agent Builder, Creator Profile + Leaderboard, Replay Viewer)
- design_context: No — start from scratch, you decide the visual direction
- vibe: Playful and colorful (think: indie game studio)
- fidelity: Fully working — clickable flows, state transitions, animated game playback
- hero_moment: The live game arena — watching agents debate and vote in real-time
- variations: 1 strong direction — go deep
- tweak_interest: All of the above
- tone: Decide for me
- game_display: Decide for me

## Assistant

_[tool: update_todos]_

Great answers! I have a clear vision now. Let me plan this out and start building.

**Design direction:** Dark, atmospheric indie-game aesthetic. Deep indigo/navy base, vibrant role-based colors (wolf red, seer blue, doctor teal, villager green), violet primary accent, warm amber for day phases. Fonts: Space Grotesk (headers) + DM Sans (body). The game arena will be a dramatic circle layout with agents positioned around a central phase indicator — day/night transitions shift the entire atmosphere. Tone will be witty-competitive ("ShadowFox just deceived the entire village").

_[tool: copy_starter_component]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Built the full Agent Werewolf prototype — here's what you've got:

**All 4 surfaces, fully interactive:**
1. **Landing Page** — hero section, live game cards, leaderboard preview, how-it-works section
2. **Game Arena** — the hero: 7 agents in a circle layout with day/night atmospheric transitions, speech bubbles, voting indicators, eliminations, and a full pre-scripted game that auto-plays (villagers catch both werewolves through deductive reasoning)
3. **Agent Builder** — 4-step flow: Identity → Mode & Model → Personality prompt → Review & Deploy
4. **Leaderboard + Profile + Replay** — 20-agent rankings with podium, creator profiles with stats/badges/roster, and replay viewer with share buttons

**Design direction:** Dark indigo base, vibrant role-based colors (🐺 red, 🔮 blue, 💊 teal, 🏘️ green), violet primary accent, warm amber day phases. Space Grotesk + DM Sans. Playful-competitive tone.

**Tweaks available** (toggle from toolbar):
- Accent color (6 options)
- Display font
- Playback speed (0.25× – 3×)
- Layout density

**Caveats:**
- Game data is simulated — the pre-scripted game plays ~105 seconds at 1× speed
- Replay page reuses the arena component (in production these would diverge)
- No real auth/API — builder shows an alert on deploy

## User

create agent will have only user agents we will send a specific api key per user and they will have to pol thant and no personaolyt and stuff as inpu cming from agents direclty. also add a autg page with ggoogle signin

## Assistant

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

Got it — simplifying the builder to connected-only (API key per user, no personality/model config), and adding a Google auth page. Let me update all three files.Now let me add the AuthPage to social.jsx:

_[tool: read_file]_

_[tool: str_replace_edit]_

Now update the main app to add auth state and the Sora font:

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done! Here's what changed:

**Auth page** — Google sign-in with a real Google logo, plus email magic link option. Simulated login flow with loading spinner (signs in as `nyx_dev` after 1.2s). Sign-out button added to the nav.

**Simplified Agent Builder** — Just 2 steps now:
1. **Register** — name + optional description only. No personality prompt, no model/mode selection.
2. **Connect** — shows your API key with a copy button, plus inline docs for the 3-step polling protocol (`GET /next-action` → receive payload → `POST /submit-action`).

All the Sora/amber tweaks you set are preserved.

