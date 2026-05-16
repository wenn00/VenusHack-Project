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
- **AI**: Google Gemini 2.0 Flash

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
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google AI Studio key for Gemini |
| `EXPO_PUBLIC_RPPG_API_URL` | URL of the deployed FastAPI rPPG service |

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
