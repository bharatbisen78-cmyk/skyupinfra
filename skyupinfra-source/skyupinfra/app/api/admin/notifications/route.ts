import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function authAdmin() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: role, error } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (error || !role) return { error: NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 }) };
  return { user };
}
export async function GET() {
  const auth = await authAdmin(); if ('error' in auth) return auth.error;
  try { const admin = createAdminClient(); const { data, error } = await admin.from('notifications').select('id,kind,title,body,order_id,target_path,read_at,created_at').order('created_at', { ascending: false }).limit(30); if (error) throw error; return NextResponse.json({ notifications: data || [] }, { headers: { 'cache-control': 'no-store' } }); }
  catch (error) { console.error('admin notifications list failed', error); return NextResponse.json({ error: 'Could not load notifications.' }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  const auth = await authAdmin(); if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => null); if (!body || (!body.all && (typeof body.id !== 'string' || !UUID.test(body.id)))) return NextResponse.json({ error: 'Invalid notification selection.' }, { status: 400 });
  try { const admin = createAdminClient(); const now = new Date().toISOString(); let query = admin.from('notifications').update({ read_at: now }).is('read_at', null); if (!body.all) query = query.eq('id', body.id); const { error } = await query; if (error) throw error; return NextResponse.json({ ok: true, read_at: now }, { headers: { 'cache-control': 'no-store' } }); }
  catch (error) { console.error('admin notification update failed', error); return NextResponse.json({ error: 'Could not update notification.' }, { status: 500 }); }
}
