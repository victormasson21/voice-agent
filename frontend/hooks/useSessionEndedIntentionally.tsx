'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface SessionEndedIntentionallyContext {
  /** Whether the current session was ended intentionally (user or agent end_call) */
  intentional: boolean;
  /** Mark the session end as intentional */
  markIntentional: () => void;
  /** Reset for the next session */
  reset: () => void;
}

const Context = createContext<SessionEndedIntentionallyContext | null>(null);

export function SessionEndedIntentionallyProvider({ children }: { children: ReactNode }) {
  const [intentional, setIntentional] = useState(false);

  const markIntentional = useCallback(() => setIntentional(true), []);
  const reset = useCallback(() => setIntentional(false), []);

  return (
    <Context.Provider value={{ intentional, markIntentional, reset }}>{children}</Context.Provider>
  );
}

export function useSessionEndedIntentionally() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      'useSessionEndedIntentionally must be used within SessionEndedIntentionallyProvider'
    );
  }
  return ctx;
}
