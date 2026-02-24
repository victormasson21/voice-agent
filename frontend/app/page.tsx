import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { App } from '@/components/app/app';
import { createClient } from '@/lib/supabase/server';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return <App appConfig={appConfig} />;
}
