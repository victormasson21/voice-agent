'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { Button } from '@/components/ui/button';

const MAX_DURATION_SECONDS = 600;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface SessionViewProps {
  appConfig: AppConfig;
  onSessionEnd: () => void;
}

export const SessionView = ({
  appConfig: _appConfig,
  onSessionEnd,
  ...props
}: React.ComponentProps<'section'> & SessionViewProps) => {
  const session = useSessionContext();
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleEnd = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onSessionEnd();
    session.end();
  }, [onSessionEnd, session]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (elapsed >= MAX_DURATION_SECONDS) {
      handleEnd();
    }
  }, [elapsed, handleEnd]);

  return (
    <section
      className="bg-background flex h-svh w-svw flex-col items-center justify-center"
      {...props}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="bg-primary/20 size-24 animate-pulse rounded-full" />

        <p className="text-muted-foreground text-sm font-medium">Reflecting...</p>

        <p className="text-foreground font-mono text-2xl tabular-nums">
          {formatTime(elapsed)}
          <span className="text-muted-foreground"> / {formatTime(MAX_DURATION_SECONDS)}</span>
        </p>

        <Button variant="outline" size="lg" onClick={handleEnd} className="mt-4">
          End Session
        </Button>
      </div>
    </section>
  );
};
