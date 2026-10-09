import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin'); if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  try {
    const { id } = await params; if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    const { data: role, error: roleError } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (roleError || !role) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 });
    const body = await request.json().catch(() => null); if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid product update.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ['name_en', 'name_hi', 'sku', 'short_description_en', 'short_description_hi', 'description_en', 'description_hi', 'seo_title', 'seo_description']) if (body[key] !== undefined) {
      if (body[key] !== null && typeof body[key] !== 'string') return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
      const value = typeof body[key] === 'string' ? body[key].trim() : null; const max = key.includes('description') ? 10000 : 500;
      if (value && value.length > max) return NextResponse.json({ error: `${key} is too long.` }, { status: 400 }); patch[key] = value || null;
    }
    if (body.slug !== undefined) { if (typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) || body.slug.length > 180) return NextResponse.json({ error: 'Invalid product slug.' }, { status: 400 }); patch.slug = body.slug; }
    if (body.price !== undefined) { const n = Number(body.price); if (!Number.isFinite(n) || n < 0 || n > 9999999999) return NextResponse.json({ error: 'Invalid selling price.' }, { status: 400 }); patch.price = n; }
    if (body.compare_at_price !== undefined) { const n = body.compare_at_price === null || body.compare_at_price === '' ? null : Number(body.compare_at_price); if (n !== null && (!Number.isFinite(n) || n < 0 || n > 9999999999)) return NextResponse.json({ error: 'Invalid original price.' }, { status: 400 }); patch.compare_at_price = n; }
    if (body.stock_qty !== undefined) { const n = Number(body.stock_qty); if (!Number.isInteger(n) || n < 0 || n > 1000000000) return NextResponse.json({ error: 'Invalid stock quantity.' }, { status: 400 }); patch.stock_qty = n; }
    if (body.status !== undefined) { if (!['draft', 'published', 'archived'].includes(body.status)) return NextResponse.json({ error: 'Invalid product status.' }, { status: 400 }); patch.status = body.status; }
    if (body.is_featured !== undefined) { if (typeof body.is_featured !== 'boolean') return NextResponse.json({ error: 'Invalid featured flag.' }, { status: 400 }); patch.is_featured = body.is_featured; }
    if (body.category_id !== undefined) { if (body.category_id !== null && !UUID.test(body.category_id)) return NextResponse.json({ error: 'Invalid category ID.' }, { status: 400 }); patch.category_id = body.category_id; }
    const admin = createAdminClient(); const { data: before, error: beforeError } = await admin.from('products').select('id,price,compare_at_price,status,slug').eq('id', id).maybeSingle();
    if (beforeError) throw beforeError; if (!before) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    const finalPrice = Number(patch.price ?? before.price); const finalCompare = patch.compare_at_price !== undefined ? patch.compare_at_price : before.compare_at_price;
    if (finalCompare !== null && Number(finalCompare) < finalPrice) return NextResponse.json({ error: 'Original price must be greater than or equal to selling price.' }, { status: 400 });
    const { data: product, error } = await admin.from('products').update(patch).eq('id', id).select('id,slug,name_en,price,compare_at_price,stock_qty,status,is_featured,updated_at').single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: 'This slug or SKU already exists.' }, { status: 409 }); throw error; }
    await admin.from('audit_logs').insert({ actor_id: user.id, action: 'product.updated', entity_type: 'product', entity_id: id, details: { slug_from: before.slug, slug_to: product.slug, fields: Object.keys(patch) } });
    return NextResponse.json({ ok: true, product }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) { console.error('admin product update failed', error); return NextResponse.json({ error: 'Could not update product.' }, { status: 500 }); }
}
