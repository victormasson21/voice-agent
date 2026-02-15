'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  // Check if already authenticated
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) router.replace('/');
  });

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">Reflect</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            A voice companion for self-reflection
          </p>
        </div>

        {status === 'sent' ? (
          <div className="space-y-2">
            <p className="text-foreground text-sm font-medium">Check your email</p>
            <p className="text-muted-foreground text-sm">
              We sent a sign-in link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
            />
            <Button
              type="submit"
              size="lg"
              disabled={status === 'loading'}
              className="w-full rounded-full font-mono text-xs font-bold tracking-wider uppercase"
            >
              {status === 'loading' ? 'Sending...' : 'Send me a link'}
            </Button>
            {status === 'error' && (
              <p className="text-destructive text-sm">Something went wrong. Please try again.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
