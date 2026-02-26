# Elder Sales Trainer

A voice-based sales training tool for [Elder](https://www.elder.org). Trainees practice inbound sales calls with AI-simulated customer personas, then receive a scorecard evaluating their performance across 8 criteria.

Built with [LiveKit Agents](https://docs.livekit.io/agents), OpenAI Realtime API, Next.js, and Supabase.

## How it works

1. Sign in with a magic link
2. Click **Start training** to begin a voice call with a simulated customer
3. The agent randomly picks a customer persona (stressed daughter, researching son, etc.) and plays the role
4. Lead the conversation as you would a real Elder inbound inquiry
5. When the call ends, the agent evaluates your performance and displays a scorecard

## Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 9+
- [Python](https://python.org) 3.13+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- A [LiveKit Cloud](https://cloud.livekit.io) project (or self-hosted LiveKit server)
- An [OpenAI](https://platform.openai.com) API key
- A [Supabase](https://supabase.com) project (for auth only — no database tables needed)

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com). No database migration needed — auth only.

**Configure auth:**

- Go to Authentication > Providers and ensure **Email** is enabled
- Enable **Magic Link** sign-in
- Set the site URL to `http://localhost:3000`
- Add `http://localhost:3000/auth/callback` to the redirect URLs

### 2. Environment variables

Create `frontend/.env.local` (the agent reads from the same file):

```
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://<your-project>.livekit.cloud
OPENAI_API_KEY=<your-openai-api-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 3. Install and run

**Agent:**

```bash
cd agent
uv sync
uv run python agent.py dev
```

**Frontend** (in a separate terminal):

```bash
cd frontend
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and start training.

## Project structure

```
livekit-voice-agent/
├── agent/
│   ├── agent.py              # Entry point: persona selection, end_call tool, evaluation
│   ├── prompts.py            # Context loaders + roleplay system prompt builder
│   ├── evaluator.py          # Post-session rubric-based scoring (GPT-4o-mini)
│   ├── context/
│   │   ├── personas.json             # 8 customer personas with backstories
│   │   ├── evaluator_rubric.json     # 8 scoring criteria (1-5 scale each)
│   │   ├── elder_company_knowledge.json  # Customer awareness + trainee knowledge
│   │   └── fake_care_recipient_data.json # Realistic care recipient medical data
│   └── pyproject.toml        # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Home (auth-gated)
│   │   ├── login/page.tsx              # Magic link login
│   │   ├── auth/callback/              # Auth redirect handler
│   │   └── api/connection-details/     # LiveKit token generation
│   ├── components/app/
│   │   ├── welcome-view.tsx            # Home: start training button
│   │   ├── session-view.tsx            # In-call UI: timer + evaluating state
│   │   ├── scorecard-view.tsx          # Visual scorecard display
│   │   ├── view-controller.tsx         # 3-state view routing
│   │   └── app.tsx                     # Root app with LiveKit session
│   ├── components/agents-ui/          # LiveKit agent UI components
│   ├── lib/supabase/                  # Supabase client helpers
│   ├── middleware.ts                   # Auth middleware
│   └── app-config.ts                  # Branding config
├── k8s/                               # Kubernetes deployment manifests
└── CLAUDE.md                          # Full project documentation
```

## Session lifecycle

```
User clicks "Start training"
  → LiveKit room created (name: train_{user_id}_{timestamp})
  → Agent joins, picks random persona + care recipient
  → Agent speaks opening line in character

Trainee leads the sales conversation (up to 5 min)

Session ends (user clicks End Call / agent calls end_call tool / 5min auto-close)
  → Agent publishes "evaluating" status via data channel
  → GPT-4o-mini scores the conversation against 8 criteria
  → Scorecard JSON published to room via data channel
  → Frontend displays visual scorecard
```

## Gotchas

- **Single .env.local**: Both frontend and agent read from `frontend/.env.local`. The agent loads it via `dotenv` with a relative path to `../frontend/.env.local`. If you move files around, the agent won't find its env vars.
- **Room must stay alive during evaluation**: When the user clicks "End Call", the frontend does NOT disconnect from the room. It publishes an `end_call` data message and waits for the scorecard. The agent runs evaluation (~5-10s), publishes the scorecard, then shuts down the room. If you call `session.end()` prematurely, the scorecard will never arrive.
- **Care recipient data is large**: `fake_care_recipient_data.json` is ~700KB. The `_summarize_care_recipient()` function in `prompts.py` extracts only key fields to keep the system prompt manageable. Don't inject the full record.
- **OpenAI Realtime + function tools**: The `end_call` function tool works with the Realtime model because the LiveKit Agents SDK handles tool invocation at the session level. The tool is defined as a closure inside `entrypoint()` so it can access the `session` variable.
- **Data channel topic convention**: Agent-to-frontend messages use topic `scorecard`. Frontend-to-agent messages use topic `end_call`. The payload is always JSON-encoded as a string.
- **No database persistence**: Scorecards are ephemeral — they only exist in the LiveKit data channel. If you want to persist them later, add a database write in `_handle_evaluation()`.
- **Evaluation timeout**: The frontend has a 60s timeout waiting for the scorecard. If the OpenAI API is slow or fails, the user gets returned to the welcome screen.
- **Auto-close**: The 5-minute auto-close still exists. The agent will try to wrap up the call naturally before closing.

## Development

```bash
# Frontend
cd frontend
pnpm dev            # Dev server
pnpm build          # Production build
pnpm lint           # ESLint
pnpm format         # Prettier

# Agent
cd agent
uv run python agent.py dev
```
