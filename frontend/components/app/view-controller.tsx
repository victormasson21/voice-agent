'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { SessionView } from '@/components/app/session-view';
import { WelcomeView } from '@/components/app/welcome-view';

const MotionSessionView = motion.create(SessionView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
  userId: string;
}

export function ViewController({ appConfig, userId }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const [sessionEndedAt, setSessionEndedAt] = useState<number | null>(null);

  function handleSessionEnd() {
    setSessionEndedAt(Date.now());
  }

  return (
    <AnimatePresence mode="wait">
      {!isConnected && (
        <motion.div key="welcome" {...VIEW_MOTION_PROPS}>
          <WelcomeView
            startButtonText={appConfig.startButtonText}
            onStartCall={start}
            userId={userId}
            sessionEndedAt={sessionEndedAt}
          />
        </motion.div>
      )}
      {isConnected && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          appConfig={appConfig}
          onSessionEnd={handleSessionEnd}
        />
      )}
    </AnimatePresence>
  );
}
