# BOUTIQ — guide for Claude Code

## Who you're working with

Selin is the developer here. She does **not** write code — she works entirely through Claude Code. Treat her like a smart product owner who knows what she wants the app to do but doesn't know JavaScript, React Native, SQL, or the terminal.

- Reply in plain language. Summarize changes in human terms ("I made the home screen header pink"), not in file lists.
- Avoid jargon, or define it inline the first time you use it.
- When she's vague, propose the simplest reasonable interpretation and confirm before doing big work.

## Guardrails

- **Confirm before destructive actions.** Deleting files, resetting the database (`db:reset`), force-pushing, dropping tables, removing dependencies. Always ask first and explain what data she'll lose.
- **Narrate before, summarize after.** One sentence before changes ("I'll add a new color to the design tokens and use it on the login screen"). One sentence after ("Done — login screen background is now soft pink").
- **Smallest reasonable change.** Don't refactor unrelated code while doing a task. No speculative abstractions.
- **Read logs yourself.** Don't ask her to paste output — read it, summarize the cause, propose a fix.
- **No new packages without explanation.** Name the package and what it does in one line before installing.
- **Schema changes are append-only.** Any DB change goes in a NEW file under `supabase/migrations/`. Never edit a migration that has already run.

## The stack

Expo (React Native) for the app, Expo Router for navigation, local Supabase (Postgres + Auth) running in Docker for the backend, TanStack Query for data fetching, TypeScript throughout. Everything runs locally — no cloud services required.

## Project shape

High-level only — what's inside each folder will drift over time, but the folder roles are stable.

- `app/` — every screen. The folder structure mirrors the URLs.
- `components/` — reusable UI pieces (cards, buttons, etc.)
- `hooks/` — one hook per type of data. Screens call these instead of touching the database directly.
- `services/` — Supabase client, query functions, and the camelCase ↔ snake_case mapper.
- `context/` — global app state (auth, etc.)
- `supabase/migrations/` — database schema, in chronological order.
- `supabase/seed.mjs` — demo data and the demo user.
- `constants/`, `types/` — design tokens and shared TypeScript types.

## How to learn the current state

Don't trust this file for specifics. Read the code. The directory layout is stable; what's inside each folder is not. When asked "where does X live?", grep first, then explain.

## Daily commands

The only commands Selin should ever need to run:

- Start backend: `npm run db:start` (requires Docker Desktop running)
- Stop backend: `npm run db:stop`
- Reset demo data: `npm run db:reset` *(destructive — confirm first)*
- Run app: `npm start`

## Testing as the demo user

A demo user is pre-seeded so the app looks alive on first login.

- Email: `demo@boutiq.app`
- Password: `demo1234`
- The login screen pre-fills these — just press *Giriş Yap*.

What the demo account starts with (right after `npm run db:seed`):

- 3 saved brands (Noire Studio, Arce Leather, Velo Boutique)
- 4 saved products
- 3 shipments (one delivered, one in transit, one out for delivery)
- 1 unread campaign

If saved/tracking screens look empty or off, the data has drifted — `npm run db:reset` puts everything back. Browse the raw DB at `http://127.0.0.1:54323` (Supabase Studio, started automatically).

## One-time setup

Assumes Node, Homebrew, and Docker Desktop are already installed.

```
npm install
open Docker Desktop  → wait for the whale icon to stop animating
npx supabase start   → copy the printed `anon key`
paste the anon key into .env (template at .env.example)
npm run db:seed
npm start
```

## Maintaining this file

If something durable changes — the stack, the top-level folders, the daily commands, the guardrails, or how Selin should be supported — update this file in the same task. Don't update it for feature-level changes (new screens, new fields, new packages used inside a feature). Rule of thumb: if the change would make a section above wrong or misleading for a future Claude session, fix the section. Otherwise, leave it alone.
