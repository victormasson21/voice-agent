'use client';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
}

export function WelcomeView({ startButtonText, onStartCall }: WelcomeViewProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <h1 className="text-foreground text-lg font-semibold">Elder Sales Trainer</h1>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 sm:px-6">
        <p className="text-muted-foreground mb-8 max-w-md text-center text-sm">
          Practice inbound sales conversations with simulated Elder customers. You&apos;ll receive a
          scorecard after each session.
        </p>
        <Button
          size="lg"
          onClick={onStartCall}
          className="w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
        >
          {startButtonText}
        </Button>
      </div>
    </div>
  );
}
