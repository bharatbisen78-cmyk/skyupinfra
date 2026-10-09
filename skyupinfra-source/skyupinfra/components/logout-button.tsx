'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function logout() {
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/');
      router.refresh();
    } finally { setBusy(false); }
  }
  return <button type="button" className="button button-light" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>;
}
