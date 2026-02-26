import asyncio
import json
import logging
import os
from pathlib import Path

from openai import AsyncOpenAI

logger = logging.getLogger("sales-trainer")

_CONTEXT_DIR = Path(__file__).resolve().parent / "context"


def _load_rubric() -> dict:
    with open(_CONTEXT_DIR / "evaluator_rubric.json") as f:
        return json.load(f)["evaluator"]


RUBRIC = _load_rubric()

_EVALUATION_PROMPT = """\
You are a senior sales coach at Elder, evaluating a trainee's performance \
on a simulated inbound call.

== EVALUATION RUBRIC ==

{rubric_criteria}

== SCORING ==

Scale: 1-5 per criterion. Total possible: 40.
Thresholds: Needs Improvement (8-19), Developing (20-27), Competent (28-34), \
Strong (35-40).

== TRAINEE KNOWLEDGE BASE ==

This is what a competent trainee should know. Use it to assess the Knowledge \
& Credibility criterion:

{trainee_knowledge}

== INSTRUCTIONS ==

Analyze the conversation below. For each of the 8 criteria:
1. Assign a score from 1-5 using the anchors provided
2. Provide a specific justification citing examples from the conversation

Also provide:
- overall_score: sum of all criteria scores
- overall_level: the threshold label
- top_strength: one thing the trainee did really well (1-2 sentences)
- top_improvements: the top two areas to focus on, with one concrete \
suggestion each

Return ONLY valid JSON with this exact structure:
{{
  "criteria": [
    {{
      "id": "<criterion_id>",
      "name": "<criterion_name>",
      "score": <1-5>,
      "justification": "<specific example from conversation>"
    }}
  ],
  "overall_score": <number>,
  "overall_level": "<threshold_label>",
  "top_strength": "<one thing done well>",
  "top_improvements": [
    {{"area": "<area>", "suggestion": "<concrete suggestion>"}},
    {{"area": "<area>", "suggestion": "<concrete suggestion>"}}
  ]
}}

Return ONLY valid JSON. No markdown, no backticks, no explanation."""

_FALLBACK_SCORECARD = {
    "criteria": [],
    "overall_score": 0,
    "overall_level": "Error",
    "top_strength": "Evaluation could not be completed",
    "top_improvements": [],
}


async def evaluate_session(
    conversation_history: list[dict],
    company_knowledge: dict,
) -> dict:
    """Score a training conversation against the evaluation rubric."""
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    rubric_criteria = json.dumps(RUBRIC["criteria"], indent=2)
    trainee_knowledge = json.dumps(
        company_knowledge.get("trainee_knowledge_base", {}), indent=2
    )

    conversation_text = "\n".join(
        f"{'Trainee' if msg['role'] == 'user' else 'Customer'}: {msg['content']}"
        for msg in conversation_history
        if msg.get("content")
    )

    system_prompt = _EVALUATION_PROMPT.format(
        rubric_criteria=rubric_criteria,
        trainee_knowledge=trainee_knowledge,
    )

    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": conversation_text},
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content.strip()
            return json.loads(content)
        except Exception as exc:
            logger.warning("Evaluation attempt %d failed: %s", attempt + 1, exc)
            if attempt < 1:
                await asyncio.sleep(1)

    logger.error("All evaluation attempts failed")
    return _FALLBACK_SCORECARD
