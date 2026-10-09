import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'cache-control': 'no-store' } });
  const { data: role, error } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (error || !role) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403, headers: { 'cache-control': 'no-store' } });
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  if (!publicKey) return NextResponse.json({ error: 'Push is not configured yet. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in server secrets.' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  return NextResponse.json({ publicKey }, { headers: { 'cache-control': 'no-store' } });
}
