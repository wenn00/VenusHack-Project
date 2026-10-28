# Kairos

A maternal cardiovascular health companion. Built for the
**Heart Health at Warp Speed** track — turning pregnancy and postpartum
care into a long-term heart-health intervention.

> Internal planning notes live in `docs/` and are gitignored. See those
> files for the full design, schema, prompts, and timeline.

## Tech stack

- **Mobile**: React Native + Expo (managed workflow), TypeScript, Expo Router
- **Backend**: Supabase (auth + Postgres + RLS) and a small FastAPI service
  for rPPG video analysis
- **AI**: ZotGPT (UCI's Portkey gateway, GPT-4o), called through the
  `ai-chat` Supabase Edge Function so the key never ships in the app

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in keys
cp .env.example .env.local
# then edit .env.local with your Supabase + Gemini values

# 3. Start the dev server
npx expo start

# 4. Open on a device
#   - iOS:     scan the QR code with the Expo Go app
#   - Android: scan with Expo Go or press 'a' for the emulator
```

Required environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key |
| `EXPO_PUBLIC_RPPG_API_URL` | URL of the deployed FastAPI rPPG service |

## AI proxy (`ai-chat` Edge Function)

Chat, voice journal summaries and the doctor PDF call
`supabase/functions/ai-chat`, which forwards to ZotGPT with a key stored
as a Supabase secret. Only signed-in, non-anonymous users may call it, so
the dev "Skip for now" login can't use AI features — sign in with email.

```bash
# One-time: store the ZotGPT gateway key (and optionally a model override)
npx supabase secrets set --project-ref <project-ref> ZOTGPT_API_KEY=<key>
#   optional: ZOTGPT_MODEL=@zotgpt-api-azure/gpt-4o-mini

# Deploy after changing the function (no Docker needed with --use-api)
npx supabase functions deploy ai-chat --project-ref <project-ref> --use-api
```

Type-check the function with `npx deno@2 check --config supabase/functions/ai-chat/deno.json supabase/functions/ai-chat/index.ts`.

## Project layout

```
app/             Expo Router screens
  (auth)/        Login + intake flow
  (app)/         Authenticated app
    alert/       KPIN red-flag + emergency screens
src/
  components/    Reusable UI primitives
  contexts/      Auth + UserData providers
  hooks/         useKpin, useMockHealthKit, useMoodStreak
  lib/           Pure logic (KPIN, mock data, prompts, formatters)
  services/      Supabase, Gemini, rPPG, PDF clients
  theme/         Design tokens
  types/         Shared TypeScript types
supabase/        Supabase CLI config + the ai-chat Edge Function
backend-rppg/    Python FastAPI service for rPPG video analysis
docs/            Planning docs (gitignored)
```

## rPPG backend

The Python service lives in `backend-rppg/` and is deployed independently
to Render (free tier). Locally:

```bash
cd backend-rppg
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Team workflow

- All code, comments, and commit messages are in **English**.
- One small feature per commit. Format: `type: short summary`.
- Do not add `Co-Authored-By` lines to commits.
- Planning notes belong in `docs/` (local only, gitignored).
