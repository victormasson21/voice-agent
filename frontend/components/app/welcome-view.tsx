'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  user_id: string;
  created_at: string;
  duration_seconds: number;
  mood: string;
  tone: string;
  topics: string[];
  decisions: string[];
}

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  userId: string;
  sessionEndedAt: number | null;
}

function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const sessionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (sessionDay.getTime() === today.getTime()) return 'Today';
  if (sessionDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '< 1 min';
  return `${minutes} min`;
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
      className="border-border hover:bg-muted/50 w-full cursor-pointer rounded-lg border p-4 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <span>{formatSessionDate(session.created_at)}</span>
            <span className="text-muted-foreground text-xs">
              {formatDuration(session.duration_seconds)}
            </span>
          </div>
          {session.mood && <p className="text-muted-foreground mt-1 text-sm">{session.mood}</p>}
          {session.topics.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">{session.topics.join(', ')}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-border mt-3 border-t pt-3">
          {session.tone && (
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-medium">Tone:</span> {session.tone}
            </p>
          )}
          {session.decisions.length > 0 && (
            <div className="mt-2">
              <span className="text-foreground text-sm font-medium">Decisions:</span>
              <ul className="text-muted-foreground mt-1 list-inside list-disc text-sm">
                {session.decisions.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WelcomeView({ startButtonText, onStartCall, sessionEndedAt }: WelcomeViewProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);

  const fetchSessions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSessions(data as Session[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessionEndedAt === null) return;

    setIsPolling(true);
    fetchSessions();

    const interval = setInterval(fetchSessions, 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setIsPolling(false);
    };
  }, [sessionEndedAt, fetchSessions]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from('sessions').delete().eq('id', id);
    fetchSessions();
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <h1 className="text-foreground text-lg font-semibold">Reflect</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 pb-8 sm:px-6">
        <div className="mt-12 mb-10 flex flex-col items-center">
          <Button
            size="lg"
            onClick={onStartCall}
            className="w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
          >
            {startButtonText}
          </Button>
        </div>

        <div className="w-full max-w-lg">
          <h2 className="text-foreground mb-4 text-sm font-medium">Past Sessions</h2>

          {isPolling && (
            <p className="text-muted-foreground mb-3 animate-pulse text-center text-xs">
              Saving your reflection...
            </p>
          )}

          {isLoading ? (
            <p className="text-muted-foreground text-center text-sm">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm">
              Your reflection history will appear here after your first session.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
