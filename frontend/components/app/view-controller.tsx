'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { type Scorecard, ScorecardView } from '@/components/app/scorecard-view';
import { SessionView } from '@/components/app/session-view';
import { WelcomeView } from '@/components/app/welcome-view';
import { useSessionEndedIntentionally } from '@/hooks/useSessionEndedIntentionally';

const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.5, ease: 'linear' },
};

type ViewState = 'welcome' | 'session' | 'scorecard';

const EVALUATION_TIMEOUT_MS = 60_000;

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const session = useSessionContext();
  const { isConnected, start, end, room } = session;
  const [viewState, setViewState] = useState<ViewState>('welcome');
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [connecting, setConnecting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { markIntentional, reset: resetIntentional } = useSessionEndedIntentionally();

  // Listen for scorecard data messages from the agent
  useEffect(() => {
    if (!room) return;

    const handleData = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      topic?: string
    ) => {
      if (topic !== 'scorecard') return;

      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));

        if (msg.type === 'status' && msg.status === 'evaluating') {
          // Agent initiated end_call — mark as intentional so we don't
          // show an "agent left unexpectedly" error when it disconnects
          markIntentional();
          return;
        }

        if (msg.type === 'scorecard' && msg.data) {
          setScorecard(msg.data);
          setViewState('scorecard');
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, markIntentional]);

  // Handle room disconnect during evaluation (timeout/error)
  useEffect(() => {
    if (!isConnected && viewState === 'session' && !scorecard) {
      // Room disconnected without scorecard — return to welcome
      setViewState('welcome');
    }
  }, [isConnected, viewState, scorecard]);

  const handleSessionEnd = useCallback(() => {
    markIntentional();

    // Timeout: if no scorecard after 60s, return to welcome
    timeoutRef.current = setTimeout(() => {
      if (!scorecard) {
        setViewState('welcome');
        end();
      }
    }, EVALUATION_TIMEOUT_MS);
  }, [scorecard, end, markIntentional]);

  const handleScorecardDone = useCallback(() => {
    setScorecard(null);
    setViewState('welcome');
    end();
  }, [end]);

  // When start is called, transition to session view
  const handleStart = useCallback(async () => {
    setConnecting(true);
    setScorecard(null);
    resetIntentional();
    try {
      await start();
      setViewState('session');
    } finally {
      setConnecting(false);
    }
  }, [start, resetIntentional]);

  return (
    <AnimatePresence mode="wait">
      {viewState === 'welcome' && (
        <motion.div key="welcome" {...VIEW_MOTION_PROPS}>
          <WelcomeView
            startButtonText={connecting ? 'Initiating conversation...' : appConfig.startButtonText}
            onStartCall={handleStart}
            disabled={connecting}
          />
        </motion.div>
      )}
      {viewState === 'session' && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          onSessionEnd={handleSessionEnd}
        />
      )}
      {viewState === 'scorecard' && scorecard && (
        <motion.div key="scorecard" {...VIEW_MOTION_PROPS}>
          <ScorecardView scorecard={scorecard} onDone={handleScorecardDone} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
