'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Button } from '@/components/ui/button';

const MAX_DURATION_SECONDS = 600;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type Phase = 'active' | 'evaluating';

interface SessionViewProps {
  onSessionEnd: () => void;
}

export const SessionView = ({
  onSessionEnd,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const room = useRoomContext();
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('active');
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

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (elapsed >= MAX_DURATION_SECONDS && phase === 'active') {
      handleEndCall();
    }
  }, [elapsed, phase, handleEndCall]);

  return (
    <section
      className="bg-background flex h-svh w-svw flex-col items-center justify-center"
      {...props}
    >
      {phase === 'active' ? (
        <div className="flex flex-col items-center gap-8">
          <div className="bg-primary/20 size-24 animate-pulse rounded-full" />

          <p className="text-muted-foreground text-sm font-medium">In call...</p>

          <p className="text-foreground font-mono text-2xl tabular-nums">
            {formatTime(elapsed)}
            <span className="text-muted-foreground"> / {formatTime(MAX_DURATION_SECONDS)}</span>
          </p>

          <Button variant="outline" size="lg" onClick={handleEndCall} className="mt-4">
            End Call
          </Button>
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
