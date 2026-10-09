import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
const allowed = ['new', 'pending_review', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'];
function cell(value: unknown) { let s = value === null || value === undefined ? '' : String(value); if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }
export async function GET(request: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { data: role, error: roleError } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (roleError || !role) return NextResponse.json({ error: 'Administrator permission required.' }, { status: 403 });
  const url = new URL(request.url); const status = url.searchParams.get('status') || ''; const q = (url.searchParams.get('q') || '').trim().slice(0, 80).replace(/[^a-zA-Z0-9 +#-]/g, '');
  if (status && !allowed.includes(status)) return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
  try {
    const admin = createAdminClient(); let query = admin.from('orders').select('order_number,created_at,customer_name,customer_mobile,customer_email,shipping_address,subtotal,shipping_charge,discount,total,payment_method,payment_status,status,courier,tracking_number,order_items(product_name,quantity,variant_name)').order('created_at', { ascending: false }).limit(5000);
    if (status) query = query.eq('status', status as any); if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%`);
    const { data, error } = await query; if (error) throw error;
    const header = ['Order number', 'Created at (Asia/Kolkata)', 'Customer', 'Mobile', 'Email', 'House/address', 'Locality', 'City', 'District', 'State', 'PIN code', 'Items', 'Subtotal INR', 'Shipping INR', 'Discount INR', 'Total INR', 'Payment method', 'Payment status', 'Order status', 'Courier', 'Tracking number'];
    const rows = (data || []).map((o: any) => { const a = o.shipping_address || {}; const items = (o.order_items || []).map((i: any) => `${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''} × ${i.quantity}`).join('; '); return [o.order_number, new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }), o.customer_name, o.customer_mobile, o.customer_email, a.line1, a.locality, a.city, a.district, a.state, a.pin_code, items, o.subtotal, o.shipping_charge, o.discount, o.total, o.payment_method, o.payment_status, o.status, o.courier, o.tracking_number]; });
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="skyupinfra-orders-${new Date().toISOString().slice(0,10)}.csv"`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
  } catch (error) { console.error('admin order CSV export failed', error); return NextResponse.json({ error: 'Could not export orders.' }, { status: 500 }); }
}
