import json
import os

from openai import AsyncOpenAI

_EXTRACTION_PROMPT = """\
Analyze this journaling conversation and return a JSON object with exactly
these fields:

- "mood": A brief natural description of the user's overall emotional state
  during the session (1 short sentence, e.g., "tired but reflective" or
  "anxious and restless")
- "tone": How the user's tone came across — shifts in energy, openness,
  guardedness, etc. (1-2 sentences)
- "topics": An array of the key topics discussed (2-5 items, each a short
  phrase or single sentence)
- "decisions": An array of any decisions, commitments, or intentions the user
  expressed during the session. If none were made, return an empty array.

Return ONLY valid JSON. No markdown, no backticks, no explanation."""

_FALLBACK_RECORD = {
    "mood": "Session completed",
    "tone": "Unable to process",
    "topics": ["Session recorded"],
    "decisions": [],
}


async def extract_session_record(
    conversation_history: list[dict],
) -> dict:
    """Extract structured session record from conversation history."""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    conversation_text = "\n".join(
        f"{'User' if msg['role'] == 'user' else 'Agent'}: {msg['content']}"
        for msg in conversation_history
        if msg.get("content")
    )

    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": _EXTRACTION_PROMPT},
                    {"role": "user", "content": conversation_text},
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content.strip()
            return json.loads(content)
        except (json.JSONDecodeError, Exception) as exc:
            if attempt == 1:
                print(f"Extraction failed after 2 attempts: {exc}")
                return _FALLBACK_RECORD

    return _FALLBACK_RECORD
