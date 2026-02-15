# Reflect — Guided Journaling Companion

## Project Overview

Voice-based self-reflection tool. Users authenticate, have short (<10 minute) voice conversations with an AI journaling companion, and receive structured session records (mood, tone, topics, decisions — no raw transcript). Previous sessions provide longitudinal context for future conversations.

## Architecture

```
livekit-voice-agent/
├── agent/          # Python journaling agent (LiveKit Agents SDK)
└── frontend/       # Next.js 15 React UI with Supabase auth
```

### Agent (`agent/`)

- **Entry point**: `agent/agent.py` — `entrypoint` function, session lifecycle, auto-close timer
- **Prompt builder**: `agent/prompts.py` — builds system prompt with session context
- **Session store**: `agent/session_store.py` — Supabase read/write for session records
- **Extractor**: `agent/extractor.py` — post-session LLM extraction of structured record
- **Model**: OpenAI Realtime (`gpt-realtime-mini`, voice: `alloy`) — speech-to-speech
- **No tools**: agent is purely conversational (no function tools)
- **Noise cancellation**: BVC via `livekit-plugins-noise-cancellation`
- **Turn detection**: 800ms silence duration (longer for reflective pauses)
- **Framework**: `livekit-agents ~1.3` with openai, silero, and turn-detector plugins
- **Python**: >= 3.13
- **Package manager**: `uv` (lock file: `uv.lock`)
- **Config**: `agent/.env.local` (loaded via python-dotenv)

### Frontend (`frontend/`)

- **Framework**: Next.js 15.5.9 with Turbopack, React 19, TypeScript 5
- **Auth**: Supabase magic link / email OTP (`@supabase/ssr`)
- **Styling**: Tailwind CSS 4, shadcn/ui components, Motion (Framer Motion)
- **LiveKit SDK**: `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`
- **Package manager**: pnpm 9.15.9
- **App config**: `frontend/app-config.ts` — branding (Reflect), feature flags

## Key Files

| File | Purpose |
|------|---------|
| `agent/agent.py` | Journaling agent: session lifecycle, auto-close, extraction |
| `agent/prompts.py` | System prompt builder with session context |
| `agent/session_store.py` | Supabase CRUD for session records |
| `agent/extractor.py` | Post-session structured record extraction |
| `agent/pyproject.toml` | Python dependencies |
| `agent/.env.local` | Agent environment variables |
| `frontend/app-config.ts` | UI configuration (Reflect branding) |
| `frontend/middleware.ts` | Auth session refresh, redirect to /login |
| `frontend/lib/supabase/client.ts` | Browser Supabase client |
| `frontend/lib/supabase/server.ts` | Server Supabase client |
| `frontend/app/login/page.tsx` | Magic link login page |
| `frontend/app/auth/callback/route.ts` | Magic link callback handler |
| `frontend/app/api/connection-details/route.ts` | Token generation (auth-gated, user_id in room) |
| `frontend/app/page.tsx` | Main page (auth gate) |
| `frontend/components/app/welcome-view.tsx` | Home screen: session list + start button |
| `frontend/components/app/session-view.tsx` | Minimal voice UI: timer + pulsing indicator |
| `frontend/components/app/view-controller.tsx` | View routing (home vs active session) |
| `frontend/components/app/app.tsx` | Root app component (LiveKit session init) |

## Database Schema

Supabase Postgres table `sessions`:
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `created_at` (timestamptz)
- `duration_seconds` (int)
- `mood` (text)
- `tone` (text)
- `topics` (text[])
- `decisions` (text[])

RLS: users can read/delete own sessions. Agent writes via service role key.

## Environment Variables

### Agent (`agent/.env.local`)

```
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud
OPENAI_API_KEY=<key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-service-role-key>
```

### Frontend (`frontend/.env.local`)

```
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
AGENT_NAME=<optional>
```

## Development Commands

### Agent

```bash
cd agent
uv run python agent.py dev        # Run agent in dev mode
```

### Frontend

```bash
cd frontend
pnpm install                      # Install dependencies
pnpm dev                          # Dev server (Turbopack)
pnpm build                        # Production build
pnpm lint                         # ESLint
pnpm format                       # Prettier format
pnpm format:check                 # Check formatting
```

## Session Lifecycle

1. User authenticates via magic link → lands on home screen
2. User clicks "Start a Session" → LiveKit room created with `reflect_{user_id}_{timestamp}` name
3. Agent `entrypoint()` called → extracts user_id from room name
4. Agent fetches recent sessions from Supabase for context
5. System prompt built with session history + timing instructions
6. Agent opens with a grounding question (energy, mood, body)
7. 10-minute session with phases: grounding (0-2min), exploration (2-7min), wrap-up (7-9min), close (9-10min)
8. Session ends (user clicks End, disconnects, or 10min auto-close)
9. Agent extracts structured record via GPT-4o-mini chat completion
10. Record saved to Supabase `sessions` table
11. Frontend polls for new session, displays in session list

## CI/CD

GitHub Actions workflow (`frontend/.github/workflows/build-and-test.yaml`):
- Triggers on push/PR to main
- Node.js 22 + pnpm
- Steps: install → lint → format check → build

## History

- Started with STT-LLM-TTS pipeline (AssemblyAI + GPT-4.1-mini + Cartesia)
- Switched to speech-to-speech using OpenAI Realtime API for lower latency
- Transformed into Reflect journaling companion with Supabase auth + session persistence
