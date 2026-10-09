import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401, headers: { 'cache-control': 'no-store' } });
    const { data: role } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!role) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403, headers: { 'cache-control': 'no-store' } });

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const status = url.searchParams.get('status') || '';
    const allowed = ['new', 'pending_review', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'];
    if (status && !allowed.includes(status)) return NextResponse.json({ error: 'Invalid order status filter.' }, { status: 400 });

    const admin = createAdminClient();
    let query = admin.from('orders').select('id,order_number,customer_name,customer_mobile,customer_email,shipping_address,subtotal,shipping_charge,discount,total,payment_method,payment_status,status,internal_note,courier,tracking_number,created_at,order_items(product_name,quantity,variant_name)').order('created_at', { ascending: false }).limit(100);
    if (status) query = query.eq('status', status as any);
    if (q) query = query.or(`order_number.ilike.%${q.replace(/[%_,()]/g, '')}%,customer_name.ilike.%${q.replace(/[%_,()]/g, '')}%,customer_mobile.ilike.%${q.replace(/[%_,()]/g, '')}%`);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ orders: data || [] }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('admin orders list failed', error);
    return NextResponse.json({ error: 'Could not load orders.' }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}
