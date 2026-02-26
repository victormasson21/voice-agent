'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { parseDataMessage } from '@/lib/livekit';

const EXAMPLE_PROMPTS = [
  "Can you tell more about your [parent] and what they're current needs are?",
  'Have you looked into any other care options so far?',
  "Can you tell me a bit about what's prompted you to look into care?",
  'How are things day to day at the moment? What does a typical day look like?',
  'How are you coping with everything? It sounds like a lot.',
  'Do you have a sense of timeline — is this quite urgent or more planning ahead?',
  "What's your biggest worry right now?",
  'What would be the most helpful next step for you?',
];

const MAX_DURATION_SECONDS = 300;
const READY_TIMEOUT_MS = 15_000;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type Phase = 'connecting' | 'active' | 'evaluating';

interface SessionViewProps {
  onSessionEnd: () => void;
}

export const SessionView = ({
  onSessionEnd,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const room = useRoomContext();
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('connecting');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEndCall = useCallback(() => {
    if (phase !== 'active') return;

    // Stop the timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Signal the agent to end the session
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'end_call' }));
    room.localParticipant.publishData(payload, { topic: 'end_call', reliable: true });

    setPhase('evaluating');
    onSessionEnd();
  }, [phase, room, onSessionEnd]);

  // Listen for agent "ready" signal
  useEffect(() => {
    const handleData = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic !== 'agent_status') return;

      const msg = parseDataMessage(payload);
      if (msg?.type === 'status' && msg.status === 'ready') {
        setPhase((prev) => (prev === 'connecting' ? 'active' : prev));
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room]);

  // Fallback: transition to active after timeout if no ready signal
  useEffect(() => {
    if (phase !== 'connecting') return;

    const fallbackTimer = setTimeout(() => {
      setPhase((prev) => (prev === 'connecting' ? 'active' : prev));
    }, READY_TIMEOUT_MS);

    return () => clearTimeout(fallbackTimer);
  }, [phase]);

  // Start timer only when active
  useEffect(() => {
    if (phase !== 'active') return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (elapsed >= MAX_DURATION_SECONDS && phase === 'active') {
      handleEndCall();
    }
  }, [elapsed, phase, handleEndCall]);

  return (
    <section
      className="bg-background flex h-svh w-svw flex-col items-center justify-center overflow-y-auto"
      {...props}
    >
      {phase === 'connecting' ? (
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm font-medium">Preparing your customer...</p>
        </div>
      ) : phase === 'active' ? (
        <div className="flex flex-col items-center gap-8 px-4">
          <div className="bg-primary/20 size-24 animate-pulse rounded-full" />

          <p className="text-muted-foreground text-sm font-medium">In call...</p>

          <p className="text-foreground font-mono text-2xl tabular-nums">
            {formatTime(elapsed)}
            <span className="text-muted-foreground"> / {formatTime(MAX_DURATION_SECONDS)}</span>
          </p>

          <Button variant="outline" size="lg" onClick={handleEndCall} className="mt-4">
            Stop conversation
          </Button>

          <div className="mt-4 w-full max-w-md">
            <h2 className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-wider uppercase">
              Example prompts — get the conversation going
            </h2>
            <ul className="space-y-2">
              {EXAMPLE_PROMPTS.map((prompt, i) => (
                <li
                  key={i}
                  className="text-muted-foreground border-border rounded-lg border px-3 py-2 text-sm"
                >
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="border-primary size-10 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-muted-foreground text-sm font-medium">
            Evaluating your performance...
          </p>
        </div>
      )}
    </section>
  );
};
