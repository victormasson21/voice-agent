# LiveKit Voice Agent

## Project Overview

Real-time voice AI assistant combining a Python backend agent with a Next.js React frontend. Users interact with an AI agent via voice through LiveKit's communication infrastructure.

## Architecture

```
livekit-voice-agent/
├── agent/          # Python voice agent (LiveKit Agents SDK)
└── frontend/       # Next.js 15 React UI
```

### Agent (`agent/`)

- **Entry point**: `agent/agent.py` — defines `VoiceAgent` class and `entrypoint` function
- **Model**: OpenAI Realtime (`gpt-realtime-mini`, voice: `alloy`) — speech-to-speech, no separate STT/TTS
- **Tools**: `save_note(note)` and `get_notes()` — in-memory note storage per session
- **Noise cancellation**: BVC via `livekit-plugins-noise-cancellation`
- **Framework**: `livekit-agents ~1.3` with openai, silero, and turn-detector plugins
- **Python**: >= 3.13
- **Package manager**: `uv` (lock file: `uv.lock`)
- **Config**: `agent/.env.local` (loaded via python-dotenv)

### Frontend (`frontend/`)

- **Framework**: Next.js 15.5.9 with Turbopack, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui components, Motion (Framer Motion)
- **LiveKit SDK**: `livekit-client`, `@livekit/components-react`, `livekit-server-sdk`
- **Package manager**: pnpm 9.15.9
- **App config**: `frontend/app-config.ts` — branding, feature flags, accent colors

## Key Files

| File | Purpose |
|------|---------|
| `agent/agent.py` | Voice agent: model config, tools, session setup |
| `agent/pyproject.toml` | Python dependencies |
| `agent/.env.local` | Agent environment variables |
| `frontend/app-config.ts` | UI configuration (branding, features) |
| `frontend/app/api/connection-details/route.ts` | Token generation API endpoint |
| `frontend/app/page.tsx` | Main page |
| `frontend/app/layout.tsx` | Root layout with theme provider |
| `frontend/components/app/app.tsx` | Root app component (LiveKit session init) |
| `frontend/components/app/session-view.tsx` | Main session UI (controls, tiles, chat) |
| `frontend/components/app/welcome-view.tsx` | Welcome/landing screen |
| `frontend/components/agents-ui/` | LiveKit agent UI components (visualizers, controls, chat) |
| `frontend/components/ui/` | shadcn/ui primitives |
| `frontend/hooks/` | Custom hooks (debug, errors, audio visualizers) |
| `frontend/styles/globals.css` | Global styles with CSS variables |

## Environment Variables

### Agent (`agent/.env.local`)

```
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
OPENAI_API_KEY=<key>
```

### Frontend (`frontend/.env.local`)

```
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>
LIVEKIT_URL=wss://<project>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud
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

## Agent Conversation Flow

1. RTC session established → `entrypoint()` called
2. Agent connects to LiveKit room (`ctx.connect()`)
3. `AgentSession` created with OpenAI Realtime model + noise cancellation
4. Session starts with `VoiceAgent` instance
5. Initial greeting generated ("Greet the user...")
6. User speaks → audio processed through BVC noise cancellation → speech-to-speech model responds
7. Agent can call `save_note`/`get_notes` tools when user requests

## CI/CD

GitHub Actions workflow (`frontend/.github/workflows/build-and-test.yaml`):
- Triggers on push/PR to main
- Node.js 22 + pnpm
- Steps: install → lint → format check → build

## History

- Started with STT-LLM-TTS pipeline (AssemblyAI + GPT-4.1-mini + Cartesia)
- Switched to speech-to-speech using OpenAI Realtime API for lower latency
