import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
export async function POST(request: Request) {
  const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  try {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { data: role, error: roleError } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle(); if (roleError || !role) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 });
    const body = await request.json().catch(() => null); if (!body || typeof body.name_en !== 'string' || body.name_en.trim().length < 2) return NextResponse.json({ error: 'Enter a category name.' }, { status: 400 });
    const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : body.name_en.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160 || body.name_en.length > 140) return NextResponse.json({ error: 'Invalid category name or slug.' }, { status: 400 });
    const admin = createAdminClient();
    const { data: category, error } = await admin.from('categories').insert({ name_en: body.name_en.trim(), name_hi: typeof body.name_hi === 'string' ? body.name_hi.trim().slice(0, 140) || null : null, slug, parent_id: body.parent_id || null, is_published: true }).select('id,name_en,name_hi,slug,parent_id').single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: 'That category slug already exists.' }, { status: 409 }); throw error; }
    await admin.from('audit_logs').insert({ actor_id: user.id, action: 'category.created', entity_type: 'category', entity_id: category.id, details: { slug } });
    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) { console.error('admin category creation failed', error); return NextResponse.json({ error: 'Could not create category.' }, { status: 500 }); }
}
