import json
from pathlib import Path

_CONTEXT_DIR = Path(__file__).resolve().parent / "context"


def load_personas() -> list[dict]:
    with open(_CONTEXT_DIR / "personas.json") as f:
        return json.load(f)["personas"]


def load_care_recipients() -> list[dict]:
    with open(_CONTEXT_DIR / "fake_care_recipient_data.json") as f:
        return json.load(f)


def load_company_knowledge() -> dict:
    with open(_CONTEXT_DIR / "elder_company_knowledge.json") as f:
        return json.load(f)["elder_company_knowledge"]


def _summarize_care_recipient(recipient: dict) -> str:
    """Extract key fields from a care recipient record into a concise summary."""
    lines = []

    care_type = recipient.get("careType", "Live-in care")
    requirements = recipient.get("placementRequirements", [])
    lines.append(f"Care type: {care_type}")
    if requirements:
        lines.append(f"Placement requirements: {', '.join(requirements)}")

    for cr in recipient.get("careRecipients", []):
        name = cr.get("name", "Unknown")
        age = cr.get("age", "Unknown")
        gender = cr.get("gender", "Unknown")
        lines.append(f"Care recipient: {name}, {age}yo, {gender.lower()}")

        appraisal = cr.get("appraisal2022", {})

        conditions = appraisal.get("medicalConditions", [])
        if conditions:
            cond_names = [c.get("conditionName", "") for c in conditions if c.get("conditionName")]
            if cond_names:
                lines.append(f"Medical conditions: {', '.join(cond_names)}")

        mobility = appraisal.get("mobility", "")
        if mobility:
            lines.append(f"Mobility: {mobility}")

        routine = cr.get("dailyRoutine", {})
        personal_care = routine.get("personalCare", "")
        if personal_care:
            lines.append(f"Personal care needs: {personal_care}")

    return "\n".join(lines)


_SYSTEM_PROMPT_TEMPLATE = """\
You are role-playing as a real person calling Elder, a live-in care company. \
You are NOT an AI — stay in character at all times.

== CHARACTER ==
Name: {persona_name}
Who you are: {caller_context}
Your {relation} ({relative_age}yo): {relative_situation}

== CARE DETAILS ==
{care_recipient_summary}
Share details when asked, like a real caller would — don't volunteer everything.

== WHAT YOU KNOW ABOUT ELDER ==
From browsing the website:
{customer_awareness}

Questions you may ask naturally:
{customer_questions}

== HIDDEN NEEDS ==
Won't say outright, but may reveal if asked the right questions:
{hidden_needs}

== HOW YOU REACT ==
{behaviour_triggers}

== VOICE RULES ==
- 1-3 sentences max. This is a phone call, not a monologue.
- Sound natural: hesitations, fillers ("um", "right", "I mean..."), emotion.
- Open up if the trainee is doing well. Become guarded if they're pushy.
- NEVER make small talk or ask how their day is — stay focused on your care need.
- Wait for the trainee to finish before responding.
- When the conversation ends naturally, use the end_call tool.\
"""


def build_roleplay_prompt(
    persona: dict, care_recipient: dict, company_knowledge: dict
) -> str:
    relative = persona.get("relative", {})

    customer_awareness = company_knowledge.get("customer_awareness", {})
    awareness_points = customer_awareness.get("what_they_likely_know", [])
    customer_questions = customer_awareness.get("realistic_customer_questions", [])

    hidden_needs = persona.get("hidden_needs", [])
    triggers = persona.get("behaviour_triggers", {})

    trigger_lines = []
    for key, value in triggers.items():
        label = key.replace("_", " ").capitalize()
        trigger_lines.append(f"- {label}: {value}")

    return _SYSTEM_PROMPT_TEMPLATE.format(
        persona_name=persona.get("name", "Customer"),
        caller_context=persona.get("caller_context", ""),
        relation=relative.get("relation", "loved one"),
        relative_age=relative.get("age", ""),
        relative_situation=relative.get("situation", ""),
        care_recipient_summary=_summarize_care_recipient(care_recipient),
        customer_awareness="\n".join(f"- {point}" for point in awareness_points),
        customer_questions="\n".join(f"- {q}" for q in customer_questions),
        hidden_needs="\n".join(f"- {need}" for need in hidden_needs),
        behaviour_triggers="\n".join(trigger_lines),
    )
