# Elder Sales Trainer

## Project Overview

Voice-based sales training tool for Elder (live-in elderly care company). Trainees practice inbound sales calls with AI-simulated customer personas, then receive a visual scorecard evaluating their performance across 8 criteria.

## Architecture

```
livekit-voice-agent/
├── agent/          # Python roleplay agent (LiveKit Agents SDK)
│   └── context/    # JSON data: personas, rubric, company knowledge, care recipients
└── frontend/       # Next.js 15 React UI with Supabase auth
```

### Agent (`agent/`)

- **Entry point**: `agent/agent.py` — `entrypoint` function, persona selection, end_call tool, evaluation + data publish
- **Prompt builder**: `agent/prompts.py` — loads context JSON, builds roleplay system prompt
- **Evaluator**: `agent/evaluator.py` — post-session GPT-4o-mini scoring against rubric
- **Context data**: `agent/context/` — personas, evaluator rubric, Elder company knowledge, care recipient data
- **Model**: OpenAI Realtime (`gpt-realtime-mini`, voice: `alloy`) — speech-to-speech
- **Tools**: `end_call` function tool (agent calls when conversation ends naturally)
- **Noise cancellation**: BVC via `livekit-plugins-noise-cancellation`
- **Turn detection**: 800ms silence duration
- **Framework**: `livekit-agents ~1.3` with openai, silero, and turn-detector plugins
- **Python**: >= 3.13
- **Package manager**: `uv` (lock file: `uv.lock`)

### Frontend (`frontend/`)

- **Framework**: Next.js 15.5.9 with Turbopack, React 19, TypeScript 5
- **Auth**: Supabase magic link / email OTP (`@supabase/ssr`)
- **Styling**: Tailwind CSS 4, shadcn/ui components, Motion (Framer Motion)
- **LiveKit SDK**: `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`
- **Package manager**: pnpm 9.15.9
- **App config**: `frontend/app-config.ts` — branding (Elder Sales Trainer)

## Key Files

| File | Purpose |
|------|---------|
| `agent/agent.py` | Roleplay agent: persona selection, end_call tool, evaluation trigger |
| `agent/prompts.py` | Context loaders + roleplay system prompt builder |
| `agent/evaluator.py` | Post-session rubric-based scoring via GPT-4o-mini |
| `agent/context/personas.json` | 8 customer personas with backstories and behavior triggers |
| `agent/context/evaluator_rubric.json` | 8 scoring criteria with 1-5 anchors |
| `agent/context/elder_company_knowledge.json` | Customer awareness + trainee knowledge base |
| `agent/context/fake_care_recipient_data.json` | Realistic care recipient medical/daily data |
| `agent/pyproject.toml` | Python dependencies |
| `frontend/app-config.ts` | UI configuration (Elder branding) |
| `frontend/middleware.ts` | Auth session refresh, redirect to /login |
| `frontend/lib/supabase/client.ts` | Browser Supabase client |
| `frontend/lib/supabase/server.ts` | Server Supabase client |
| `frontend/app/login/page.tsx` | Magic link login page |
| `frontend/app/auth/callback/route.ts` | Magic link callback handler |
| `frontend/app/api/connection-details/route.ts` | Token generation (auth-gated, user_id in room) |
| `frontend/app/page.tsx` | Main page (auth gate) |
| `frontend/components/app/welcome-view.tsx` | Home screen: start training button |
| `frontend/components/app/session-view.tsx` | Voice UI: timer + end call + evaluating state |
| `frontend/components/app/scorecard-view.tsx` | Visual scorecard display |
| `frontend/components/app/view-controller.tsx` | 3-state view routing (welcome/session/scorecard) |
| `frontend/components/app/app.tsx` | Root app component (LiveKit session init) |

## Environment Variables

Both the frontend and agent read from `frontend/.env.local` in development. The agent loads it via `load_dotenv()` from the frontend directory.

### `frontend/.env.local`

```
# LiveKit
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud

# OpenAI (used by agent for realtime voice + post-session evaluation)
OPENAI_API_KEY=<key>

# Supabase — server-side (middleware, API routes)
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>

# Supabase — client-side (same values, NEXT_PUBLIC_ prefix required by Next.js)
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
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
2. User clicks "Start training" → LiveKit room created with `train_{user_id}_{timestamp}` name
3. Agent `entrypoint()` called → picks random persona + care recipient
4. System prompt built with persona backstory, care recipient data, Elder customer awareness
5. Agent speaks opening line in character (e.g., "Oh hi, I filled something in online...")
6. Trainee leads the sales conversation (up to 5 minutes)
7. Session ends: user clicks End Call → frontend publishes `end_call` data message, or agent calls `end_call` tool, or 5min auto-close
8. Agent publishes "evaluating" status to room via data channel
9. Agent runs GPT-4o-mini evaluation against rubric (8 criteria, 1-5 each)
10. Agent publishes scorecard JSON to room via data channel
11. Frontend receives scorecard, displays visual scorecard view
12. No database persistence — sessions are ephemeral

## Data Flow (Scorecard)

Agent → Frontend communication uses LiveKit data messages (topic: `scorecard`):
- Status: `{"type": "status", "status": "evaluating"}`
- Scorecard: `{"type": "scorecard", "data": {criteria, overall_score, overall_level, top_strength, top_improvements}}`

## CI/CD

GitHub Actions workflow (`frontend/.github/workflows/build-and-test.yaml`):
- Triggers on push/PR to main
- Node.js 22 + pnpm
- Steps: install → lint → format check → build

## History

- Started with STT-LLM-TTS pipeline (AssemblyAI + GPT-4.1-mini + Cartesia)
- Switched to speech-to-speech using OpenAI Realtime API for lower latency
- Transformed into Reflect journaling companion with Supabase auth + session persistence
- Transformed into Elder Sales Trainer with roleplay personas and post-session evaluation
