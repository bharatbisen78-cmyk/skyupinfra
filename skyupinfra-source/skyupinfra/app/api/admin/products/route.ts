import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isSameOrigin = (request: Request) => { const origin = request.headers.get('origin'); return !origin || origin === new URL(request.url).origin; };
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const { data: role, error } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (error || !role) return { error: NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 }) };
  return { user };
}
export async function GET() {
  const auth = await verifyAdmin(); if ('error' in auth) return auth.error;
  try { const admin = createAdminClient(); const [{ data: products, error }, { data: categories, error: categoryError }] = await Promise.all([
    admin.from('products').select('id,slug,sku,category_id,name_en,name_hi,short_description_en,short_description_hi,price,compare_at_price,stock_qty,status,is_featured,created_at,product_images(id,image_url,sort_order)').order('created_at', { ascending: false }).limit(200),
    admin.from('categories').select('id,slug,name_en,name_hi,parent_id,is_published').order('sort_order')
  ]); if (error || categoryError) throw error || categoryError; return NextResponse.json({ products: products || [], categories: categories || [] }, { headers: { 'cache-control': 'no-store' } }); }
  catch (error) { console.error('admin products query failed', error); return NextResponse.json({ error: 'Could not load catalogue.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request denied.' }, { status: 403 });
  const auth = await verifyAdmin(); if ('error' in auth) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name_en !== 'string' || body.name_en.trim().length < 2 || body.name_en.length > 180) return NextResponse.json({ error: 'Enter a product name between 2 and 180 characters.' }, { status: 400 });
  const slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim().toLowerCase() : body.name_en.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slugPattern.test(slug) || slug.length > 180) return NextResponse.json({ error: 'Use a unique URL slug with lowercase letters, numbers and hyphens.' }, { status: 400 });
  const price = Number(body.price); const compare = body.compare_at_price === '' || body.compare_at_price === null || body.compare_at_price === undefined ? null : Number(body.compare_at_price);
  const stock = Number(body.stock_qty); const status = body.status === 'published' ? 'published' : 'draft';
  if (!Number.isFinite(price) || price < 0 || price > 9999999999 || !Number.isInteger(stock) || stock < 0 || stock > 1000000000) return NextResponse.json({ error: 'Price or stock quantity is invalid.' }, { status: 400 });
  if (compare !== null && (!Number.isFinite(compare) || compare < price || compare > 9999999999)) return NextResponse.json({ error: 'Original price must be greater than or equal to selling price.' }, { status: 400 });
  if (body.category_id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.category_id)) return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  const imageUrl = typeof body.image_url === 'string' ? body.image_url.trim() : '';
  if (imageUrl) { try { const parsed = new URL(imageUrl); if (parsed.protocol !== 'https:' || imageUrl.length > 2048) throw new Error(); } catch { return NextResponse.json({ error: 'Product image must be a valid HTTPS URL.' }, { status: 400 }); } }
  try {
    const admin = createAdminClient();
    const payload = { name_en: body.name_en.trim(), name_hi: typeof body.name_hi === 'string' ? body.name_hi.trim().slice(0, 180) || null : null, slug, sku: typeof body.sku === 'string' ? body.sku.trim().slice(0, 80) || null : null, category_id: body.category_id || null, short_description_en: typeof body.short_description_en === 'string' ? body.short_description_en.trim().slice(0, 500) || null : null, short_description_hi: typeof body.short_description_hi === 'string' ? body.short_description_hi.trim().slice(0, 500) || null : null, description_en: typeof body.description_en === 'string' ? body.description_en.trim().slice(0, 10000) || null : null, description_hi: typeof body.description_hi === 'string' ? body.description_hi.trim().slice(0, 10000) || null : null, price, compare_at_price: compare, stock_qty: stock, status, is_featured: body.is_featured === true };
    const { data: product, error } = await admin.from('products').insert(payload).select('id,slug,name_en,price,stock_qty,status').single();
    if (error) { if (error.code === '23505') return NextResponse.json({ error: 'This slug or SKU already exists.' }, { status: 409 }); throw error; }
    if (imageUrl) { const { error: imageError } = await admin.from('product_images').insert({ product_id: product.id, image_url: imageUrl, alt_text_en: product.name_en, sort_order: 0 }); if (imageError) console.error('Product created but image URL could not be saved', imageError.code); }
    await admin.from('audit_logs').insert({ actor_id: auth.user.id, action: 'product.created', entity_type: 'product', entity_id: product.id, details: { slug: product.slug, status: product.status } });
    return NextResponse.json({ ok: true, product }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) { console.error('admin product creation failed', error); return NextResponse.json({ error: 'Could not create product.' }, { status: 500 }); }
}
