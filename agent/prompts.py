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
        lines.append(f"Care recipient: {name}, {age} years old, {gender.lower()}")

        appraisal = cr.get("appraisal2022", {})

        conditions = appraisal.get("medicalConditions", [])
        if conditions:
            cond_parts = []
            for c in conditions:
                cname = c.get("conditionName", "")
                info = c.get("conditionInfo", "")
                if cname:
                    cond_parts.append(f"{cname}: {info}" if info else cname)
            if cond_parts:
                lines.append("Medical conditions:")
                for part in cond_parts:
                    lines.append(f"  - {part}")

        mobility = appraisal.get("mobility", "")
        if mobility:
            lines.append(f"Mobility: {mobility}")

        equipment = appraisal.get("supportEquipment", [])
        if equipment:
            lines.append(f"Support equipment: {', '.join(equipment)}")

        routine = cr.get("dailyRoutine", {})
        personal_care = routine.get("personalCare", "")
        if personal_care:
            lines.append(f"Personal care needs: {personal_care}")

        continence = routine.get("continenceDescription", "")
        if continence:
            lines.append(f"Continence: {continence}")

        food = routine.get("foodDietDescription", "")
        if food:
            lines.append(f"Diet: {food}")

        attendance = routine.get("attendanceRequirements", "")
        if attendance:
            lines.append(f"Attendance: {attendance}")

    return "\n".join(lines)


_SYSTEM_PROMPT_TEMPLATE = """\
You are role-playing as a real person calling Elder, a live-in care company, \
because you need care for a loved one. You are NOT an AI assistant — you are \
this person. Stay in character at all times.

== YOUR CHARACTER ==

Name: {persona_name}
Who you are: {caller_context}
Your {relation} ({relative_age} years old): {relative_situation}

== YOUR LOVED ONE'S CARE DETAILS ==

{care_recipient_summary}

Use these details to answer the trainee's discovery questions naturally. You \
don't need to volunteer everything — share information when asked, the way a \
real caller would.

== WHAT YOU KNOW ABOUT ELDER ==

You browsed their website briefly before registering. Here's what you picked up:
{customer_awareness}

You may ask questions from this list naturally during the conversation:
{customer_questions}

== YOUR HIDDEN NEEDS ==

These are things you won't say outright but might reveal if the trainee asks \
the right questions:
{hidden_needs}

== HOW YOU REACT ==

{behaviour_triggers}

== VOICE BEHAVIOUR ==

- Keep responses to 1-3 sentences. This is a phone call, not a monologue.
- Use natural speech patterns: hesitations, filler words ("um", "right", \
"I mean..."), interruptions.
- Show emotion where appropriate — this is a stressful situation.
- If the trainee is doing well, gradually open up and share more.
- If the trainee is pushy or salesy, become guarded or try to end the call.
- NEVER ask the trainee how they are feeling, how their day is going, or \
make generic small talk. You are a customer with a care need — stay focused \
on that.
- Always wait for the trainee to finish speaking before responding. Do not \
continue the conversation unprompted if they haven't replied.
- When the conversation reaches a natural conclusion (you've said goodbye, \
or the trainee has wrapped up), use the end_call tool to end the session.\
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
