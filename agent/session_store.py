import os

from supabase import create_client


def _get_client():
    # Use service role key to bypass RLS (agent writes server-side without user JWT)
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_ANON_KEY"]
    return create_client(
        os.environ["SUPABASE_URL"],
        key,
    )


def get_recent_sessions(user_id: str, limit: int = 5) -> list[dict]:
    """Fetch the N most recent session records for a user."""
    client = _get_client()
    result = (
        client.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


def save_session(
    user_id: str, duration_seconds: int, record: dict
) -> None:
    """Write a session record to the database."""
    client = _get_client()
    client.table("sessions").insert(
        {
            "user_id": user_id,
            "duration_seconds": duration_seconds,
            "mood": record["mood"],
            "tone": record["tone"],
            "topics": record["topics"],
            "decisions": record["decisions"],
        }
    ).execute()
