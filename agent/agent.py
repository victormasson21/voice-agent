import asyncio
import json
import logging
import random
from pathlib import Path

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.agents.llm import function_tool
from livekit.plugins import openai, noise_cancellation
from livekit.plugins.openai.realtime.realtime_model import TurnDetection

from prompts import build_roleplay_prompt, load_personas, load_care_recipients, load_company_knowledge
from evaluator import evaluate_session

_env_file = Path(__file__).resolve().parent.parent / "frontend" / ".env.local"
load_dotenv(_env_file)

logging.getLogger("hpack").setLevel(logging.WARNING)

logger = logging.getLogger("sales-trainer")

SESSION_MAX_DURATION = 600  # 10 minutes

server = AgentServer()

# Load context data once at startup
PERSONAS = load_personas()
CARE_RECIPIENTS = load_care_recipients()
COMPANY_KNOWLEDGE = load_company_knowledge()


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


@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    await ctx.connect()

    # Pick random persona and care recipient
    persona = random.choice(PERSONAS)
    care_recipient = random.choice(CARE_RECIPIENTS)
    opening_line = random.choice(persona["opening_lines"])

    instructions = build_roleplay_prompt(persona, care_recipient, COMPANY_KNOWLEDGE)

    # Define end_call tool — the agent calls this when the conversation ends naturally
    @function_tool(name="end_call")
    async def end_call() -> None:
        """End the call. Use this when the conversation reaches a natural conclusion,
        the customer says goodbye, or you sense the trainee is wrapping up."""
        await session.aclose()

    agent = Agent(instructions=instructions, tools=[end_call])

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

    # Listen for end_call data message from frontend
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        if data_packet.topic == "end_call":
            asyncio.create_task(session.aclose())

    @session.on("close")
    def on_session_close(_event):
        asyncio.create_task(
            _handle_evaluation(ctx, session)
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

    # Agent speaks opening line in character
    for attempt in range(3):
        try:
            await session.generate_reply(
                instructions=f'Start the call with this exact opening line: "{opening_line}"'
            )
            break
        except Exception as e:
            logger.warning("generate_reply attempt %d failed: %s", attempt + 1, e)
            if attempt == 2:
                logger.error("All generate_reply attempts failed")
            else:
                await asyncio.sleep(1)

    # Auto-close after 10 minutes
    async def auto_close():
        await asyncio.sleep(SESSION_MAX_DURATION)
        try:
            await session.generate_reply(
                instructions=(
                    "The call has been going on for a while. Wrap up naturally — "
                    "thank the trainee and say goodbye, then use the end_call tool."
                )
            )
        except Exception:
            pass
        await asyncio.sleep(15)
        await session.aclose()

    asyncio.create_task(auto_close())


async def _handle_evaluation(ctx: agents.JobContext, session: AgentSession) -> None:
    """Run post-session evaluation and publish scorecard to room."""
    conversation_history = _build_conversation_history(session)

    if not conversation_history:
        ctx.shutdown()
        return

    # Signal frontend that evaluation is in progress
    try:
        await ctx.room.local_participant.publish_data(
            json.dumps({"type": "status", "status": "evaluating"}),
            topic="scorecard",
        )
    except Exception as e:
        logger.warning("Failed to publish evaluating status: %s", e)

    scorecard = await evaluate_session(conversation_history, COMPANY_KNOWLEDGE)

    # Publish scorecard to frontend
    try:
        await ctx.room.local_participant.publish_data(
            json.dumps({"type": "scorecard", "data": scorecard}),
            topic="scorecard",
        )
    except Exception as e:
        logger.error("Failed to publish scorecard: %s", e)

    logger.info("Scorecard published: %s (%d/40)", scorecard.get("overall_level"), scorecard.get("overall_score", 0))

    await asyncio.sleep(2)
    ctx.shutdown()


if __name__ == "__main__":
    agents.cli.run_app(server)
