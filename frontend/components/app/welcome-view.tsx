'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface WelcomeViewProps {
  startButtonText: string;
  onStartCall: () => void;
  disabled?: boolean;
}

export function WelcomeView({ startButtonText, onStartCall, disabled }: WelcomeViewProps) {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10">
        <Image src="/elder-logo.png" alt="Elder" width={100} height={27} priority />
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <div className="flex flex-1 flex-col justify-center px-6 pb-8 sm:px-10 lg:px-20">
        <div className="max-w-lg">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Sales Trainer
          </h1>
          <p className="text-muted-foreground mt-4 text-base">
            Practice inbound sales conversations with simulated Elder customers. You&apos;ll receive
            a scorecard after each session.
          </p>
          <Button
            size="lg"
            onClick={onStartCall}
            disabled={disabled}
            className="mt-8 w-64 rounded-full font-mono text-xs font-bold tracking-wider uppercase"
          >
            {startButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
}
