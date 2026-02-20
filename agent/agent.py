import asyncio
import logging
import time
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import openai, noise_cancellation
from livekit.plugins.openai.realtime.realtime_model import TurnDetection

from prompts import build_system_prompt
from session_store import get_recent_sessions, save_session
from extractor import extract_session_record

_env_file = Path(__file__).resolve().parent.parent / "frontend" / ".env.local"
load_dotenv(_env_file)

# Suppress noisy HTTP/2 header encoding logs
logging.getLogger("hpack").setLevel(logging.WARNING)

logger = logging.getLogger("reflect")

SESSION_MAX_DURATION = 600  # 10 minutes

server = AgentServer()


def _extract_user_id(room_name: str) -> str:
    """Extract user_id from room name format: reflect_{user_id}_{timestamp}."""
    parts = room_name.split("_")
    return "_".join(parts[1:-1])


def _build_conversation_history(session: AgentSession) -> list[dict]:
    """Extract text conversation from the session's chat context."""
    history = []
    for item in session.history.items:
        if not hasattr(item, "role") or not hasattr(item, "text_content"):
            continue
        text = item.text_content
        if text and item.role in ("user", "assistant"):
            history.append({"role": item.role, "content": text})
    return history


async def _handle_session_end(
    user_id: str,
    session_start_time: float,
    session: AgentSession,
) -> None:
    """Extract session record and save to database."""
    duration_seconds = int(time.time() - session_start_time)
    conversation_history = _build_conversation_history(session)

    if not conversation_history:
        return

    record = await extract_session_record(conversation_history)
    save_session(user_id, duration_seconds, record)
    print(f"Session saved for user {user_id}: {record['mood']}")


@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    user_id = _extract_user_id(ctx.room.name)
    recent_sessions = get_recent_sessions(user_id)

    session_start_time = time.time()
    instructions = build_system_prompt(recent_sessions, session_start_time)

    agent = Agent(instructions=instructions)

    session = AgentSession(
        llm=openai.realtime.RealtimeModel(
            voice="alloy",
            model="gpt-realtime-mini",
            temperature=0.7,
            turn_detection=TurnDetection(
                type="server_vad",
                silence_duration_ms=800,
            ),
        ),
    )

    @session.on("close")
    def on_session_close(_event):
        asyncio.create_task(
            _handle_session_end(user_id, session_start_time, session)
        )

    await session.start(
        room=ctx.room,
        agent=agent,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=noise_cancellation.BVC(),
            ),
        ),
    )

    greeting_instructions = (
        "Start the session with a single grounding question. "
        "Ask how the user is arriving right now — their energy, "
        "their mood, what they're noticing in their body. "
        "Keep it brief and warm. Don't ask about events yet."
    )

    # The SDK has a hardcoded 5s timeout on generate_reply which can be too
    # tight for the first turn (WebSocket init + large prompt + generation).
    # Retry up to 3 times to handle transient slowness.
    for attempt in range(3):
        try:
            await session.generate_reply(instructions=greeting_instructions)
            break
        except Exception as e:
            logger.warning(
                "generate_reply attempt %d failed: %s", attempt + 1, e
            )
            if attempt == 2:
                logger.error("All generate_reply attempts failed, session may lack greeting")
            else:
                await asyncio.sleep(1)

    # Auto-close after 10 minutes
    async def auto_close():
        await asyncio.sleep(SESSION_MAX_DURATION)
        await session.generate_reply(
            instructions=(
                "The session has reached 10 minutes. Wrap up now with "
                "a brief, warm goodbye. Offer a one-sentence synthesis "
                "of what you noticed during the session, then end cleanly."
            )
        )
        await asyncio.sleep(15)
        ctx.shutdown()

    asyncio.create_task(auto_close())


if __name__ == "__main__":
    agents.cli.run_app(server)
