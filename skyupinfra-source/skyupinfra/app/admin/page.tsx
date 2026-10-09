import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Activity, ArrowRight, Boxes, ClipboardList, IndianRupee, Package, ShieldCheck, ShoppingBag, TriangleAlert, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminOrderActions } from '@/components/admin-order-actions';
import { AdminPushSetup } from '@/components/admin-push-setup';
import { AdminNotifications } from '@/components/admin-notifications';

const statusLabel = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const money = (n: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Fadmin');
  const { data: role, error: roleError } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (roleError || !role) return <main className="page-shell wrap"><div className="panel access-denied"><ShieldCheck size={28}/><h1 className="page-title">Administrator access only</h1><p>This account does not have administrator permissions. Sign in using the verified owner email configured for the initial setup.</p><Link href="/" className="button button-dark">Return to store <ArrowRight size={15}/></Link></div></main>;

  const params = await searchParams;
  const q = (params.q || '').trim().slice(0, 80).replace(/[^a-zA-Z0-9 +#-]/g, '');
  const status = (params.status || '').trim();
  const allowed = ['new', 'pending_review', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned'];
  const safeStatus = allowed.includes(status) ? status : '';
  const admin = createAdminClient();
  const todayLabel = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const todayStart = new Date(`${todayLabel}T00:00:00+05:30`).toISOString();
  const [allOrders, todayOrders, pendingOrders, confirmedOrders, dispatchedOrders, deliveredOrders, cancelledOrders, productsCount, lowStockCount, outOfStockCount, recentProducts, categoriesCount] = await Promise.all([
    admin.from('orders').select('id', { count: 'exact', head: true }),
    admin.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    admin.from('orders').select('id', { count: 'exact', head: true }).in('status', ['new', 'pending_review']),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'dispatched'),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
    admin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    admin.from('products').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published').gt('stock_qty', 0).lte('stock_qty', 5),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('stock_qty', 0),
    admin.from('products').select('id,slug,name_en,price,stock_qty,status,created_at').order('created_at', { ascending: false }).limit(8),
    admin.from('categories').select('id', { count: 'exact', head: true })
  ]);

  let orderQuery = admin.from('orders').select('id,order_number,customer_name,customer_mobile,customer_email,shipping_address,subtotal,shipping_charge,discount,total,payment_method,payment_status,status,internal_note,courier,tracking_number,created_at,order_items(product_name,quantity,variant_name)').order('created_at', { ascending: false }).limit(100);
  if (safeStatus) orderQuery = orderQuery.eq('status', safeStatus as any);
  if (q) orderQuery = orderQuery.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%`);
  const { data: orders, error: ordersError } = await orderQuery;

  const stats = [
    { label: "Today's orders · IST", value: todayOrders.count ?? 0, icon: ShoppingBag, note: 'From midnight India time' },
    { label: 'All orders', value: allOrders.count ?? 0, icon: ClipboardList, note: 'All order statuses' },
    { label: 'Pending review', value: pendingOrders.count ?? 0, icon: Activity, note: 'Needs attention' },
    { label: 'Products', value: productsCount.count ?? 0, icon: Boxes, note: `${categoriesCount.count ?? 0} categories` },
    { label: 'Low stock', value: lowStockCount.count ?? 0, icon: TriangleAlert, note: '5 units or fewer' },
    { label: 'Out of stock', value: outOfStockCount.count ?? 0, icon: Package, note: 'Published products' }
  ];

  return <main className="page-shell wrap admin-shell">
    <div className="page-heading-row"><div><span className="eyebrow">CONTROL ROOM / 001</span><h1 className="page-title">Store operations</h1><p className="page-subtitle">Order desk, catalogue health and daily activity. Today is measured in Asia/Kolkata.</p></div><div className="admin-status-indicator"><span/> Admin session verified</div></div>
    <nav className="admin-tabs" aria-label="Admin navigation"><Link className="active" href="/admin">Overview & orders</Link><Link href="/admin/products">Manage products & categories</Link><a href="#recent-products">Recent products</a><Link href="/">View storefront ↗</Link></nav>
    <section className="admin-stat-grid">{stats.map(s => <article className="admin-stat panel" key={s.label}><div className="admin-stat-top"><span>{s.label}</span><s.icon size={18}/></div><strong>{s.value}</strong><small>{s.note}</small></article>)}</section>
    <AdminPushSetup/>
    <AdminNotifications/>
    <section className="admin-section" id="orders"><div className="section-heading"><div><span className="eyebrow">LIVE WORK QUEUE</span><h2>Orders</h2></div><span className="count-label">Up to 100 newest</span></div>
      <form className="admin-filter-form" action="/admin" method="get"><label>Search order or customer<input name="q" defaultValue={q} placeholder="Order no., name, mobile" maxLength={80}/></label><label>Status<select name="status" defaultValue={safeStatus}><option value="">All statuses</option>{allowed.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><button className="button button-dark" type="submit">Filter</button><Link className="button button-light" href="/admin">Clear</Link><a className="button button-light admin-export-button" href={`/api/admin/orders/export?q=${encodeURIComponent(q)}&status=${encodeURIComponent(safeStatus)}`}><Download size={14}/> Export CSV</a></form>
      {ordersError ? <div className="message error">Orders could not be loaded. Check the database configuration.</div> : orders?.length ? <div className="admin-orders-list">{orders.map((o: any) => { const addr = o.shipping_address || {}; return <article className="panel admin-order-card" key={o.id}>
        <div className="admin-order-header"><div><span className="eyebrow">{o.order_number}</span><h3>{o.customer_name}</h3><p>{new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} · {o.customer_mobile}{o.customer_email ? ` · ${o.customer_email}` : ''}</p></div><div className="admin-order-total"><strong>{money(o.total)}</strong><span className={`status-pill status-${o.status}`}>{statusLabel(o.status)}</span></div></div>
        <div className="admin-order-detail-grid"><div><span className="detail-label">Delivery address</span><p>{[addr.line1, addr.locality, addr.city, addr.district, addr.state, addr.pin_code].filter(Boolean).join(', ') || 'Address not recorded'}</p></div><div><span className="detail-label">Payment</span><p>Cash on Delivery · {statusLabel(o.payment_status)}</p><span className="detail-label">Items</span><div className="order-lines">{(o.order_items || []).map((item: any, i: number) => <div key={`${o.id}-${i}`}><span>{item.product_name}{item.variant_name ? ` · ${item.variant_name}` : ''}</span><span>× {item.quantity}</span></div>)}</div><p className="muted-copy">Subtotal {money(o.subtotal)} · Shipping {money(o.shipping_charge)}</p></div></div>
        <AdminOrderActions orderId={o.id} currentStatus={o.status} shippingCharge={Number(o.shipping_charge)} internalNote={o.internal_note} courier={o.courier} trackingNumber={o.tracking_number}/>
      </article>; })}</div> : <div className="empty-panel panel"><Package size={22}/><h3>No matching orders</h3><p>Orders created by customers will appear here after database setup.</p></div>}
    </section>
    <section className="admin-section" id="catalogue"><div className="section-heading"><div><span className="eyebrow">CATALOGUE HEALTH</span><h2>Inventory summary</h2></div><Boxes size={20}/></div><div className="admin-inventory-grid"><div className="panel inventory-tile"><span>Confirmed orders</span><strong>{confirmedOrders.count ?? 0}</strong></div><div className="panel inventory-tile"><span>Dispatched orders</span><strong>{dispatchedOrders.count ?? 0}</strong></div><div className="panel inventory-tile"><span>Delivered orders</span><strong>{deliveredOrders.count ?? 0}</strong></div><div className="panel inventory-tile"><span>Cancelled orders</span><strong>{cancelledOrders.count ?? 0}</strong></div></div></section>
    <section className="admin-section" id="recent-products"><div className="section-heading"><div><span className="eyebrow">RECENT CATALOGUE ACTIVITY</span><h2>Latest products</h2></div><span className="count-label">{recentProducts.data?.length || 0} shown</span></div>
      {recentProducts.data?.length ? <div className="panel admin-products-table"><div className="admin-product-row admin-product-heading"><span>Product</span><span>Price</span><span>Stock</span><span>Status</span></div>{recentProducts.data.map((p: any) => <div key={p.id} className="admin-product-row"><div><strong>{p.name_en}</strong><small>/{p.slug}</small></div><span>{money(p.price)}</span><span>{p.stock_qty}</span><span className={`status-pill status-${p.status}`}>{statusLabel(p.status)}</span></div>)}</div> : <div className="empty-panel panel"><p>No products yet. Add products through the database until the full catalogue editor is configured.</p></div>}
    </section>
    <p className="admin-footnote"><IndianRupee size={14}/> COD orders are created as unpaid and stock validation occurs on the server. <Link href="/account">Open a customer account <ArrowRight size={13}/></Link></p>
  </main>;
}
