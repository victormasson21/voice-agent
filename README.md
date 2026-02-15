# Reflect

A voice-based journaling companion for self-reflection. Have short voice conversations with an AI companion that helps you think out loud, then get structured session records — mood, tone, topics, and decisions — without storing raw transcripts.

Built with [LiveKit Agents](https://docs.livekit.io/agents), OpenAI Realtime API, Next.js, and Supabase.

## How it works

1. Sign in with a magic link
2. Click **Start a Session** to begin a voice conversation (up to 10 minutes)
3. The AI companion asks grounding questions, reflects back what you say, and follows the emotional weight of the conversation
4. When the session ends, the agent extracts a structured record (mood, tone, topics, decisions) and saves it
5. Past sessions appear on the home screen and inform future conversations

## Prerequisites

- [Node.js](https://nodejs.org) 22+
- [pnpm](https://pnpm.io) 9+
- [Python](https://python.org) 3.13+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- A [LiveKit Cloud](https://cloud.livekit.io) project (or self-hosted LiveKit server)
- An [OpenAI](https://platform.openai.com) API key
- A [Supabase](https://supabase.com) project

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then:

**Run the schema migration** in the SQL Editor:

```sql
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  duration_seconds int not null,
  mood text not null,
  tone text not null,
  topics text[] not null default '{}',
  decisions text[] not null default '{}'
);

alter table sessions enable row level security;

create policy "Users can read own sessions"
  on sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on sessions for delete using (auth.uid() = user_id);

create index idx_sessions_user_id_created on sessions (user_id, created_at desc);
```

**Configure auth:**

- Go to Authentication > Providers and ensure **Email** is enabled
- Enable **Magic Link** sign-in
- Set the site URL to `http://localhost:3000`
- Add `http://localhost:3000/auth/callback` to the redirect URLs

### 2. Environment variables

**Agent** — create `agent/.env.local`:

```
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://<your-project>.livekit.cloud
OPENAI_API_KEY=<your-openai-api-key>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-service-role-key>
```

**Frontend** — create `frontend/.env.local`:

```
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://<your-project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://<your-project>.livekit.cloud
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
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

Open [http://localhost:3000](http://localhost:3000), sign in with your email, and start a session.

## Project structure

```
livekit-voice-agent/
├── agent/
│   ├── agent.py             # Session lifecycle, auto-close timer
│   ├── prompts.py           # System prompt with session context
│   ├── session_store.py     # Supabase read/write for session records
│   ├── extractor.py         # Post-session structured record extraction
│   └── pyproject.toml       # Python dependencies
└── frontend/
    ├── app/
    │   ├── page.tsx              # Home (auth-gated)
    │   ├── login/page.tsx        # Magic link login
    │   ├── auth/callback/        # Auth redirect handler
    │   └── api/connection-details/  # LiveKit token generation
    ├── components/app/
    │   ├── welcome-view.tsx      # Home screen: start button + session list
    │   ├── session-view.tsx      # Active session: timer + pulsing indicator
    │   ├── view-controller.tsx   # View routing
    │   └── app.tsx               # Root app with LiveKit session
    ├── lib/supabase/             # Supabase client helpers
    ├── middleware.ts              # Auth middleware
    └── app-config.ts             # Branding and feature flags
```

## Session lifecycle

```
User clicks "Start a Session"
  → LiveKit room created (name: reflect_{user_id}_{timestamp})
  → Agent joins, fetches recent sessions from Supabase
  → System prompt built with session history + timing phases
  → Agent opens with a grounding question

0-2 min:  Grounding — energy, mood, body
2-7 min:  Exploration — follow the emotional weight
7-9 min:  Wrap-up — synthesis and takeaway
9-10 min: Close — final goodbye

Session ends (user clicks End / disconnects / 10min auto-close)
  → Agent extracts structured record via GPT-4o-mini
  → Record saved to Supabase
  → Frontend polls and displays the new session
```

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
