import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, MapPin, Package, ShieldCheck, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/logout-button';

const money = (n: unknown) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
const statusLabel = (s: string) => s.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Faccount');

  const [profileResult, ordersResult, addressesResult, wishlistResult] = await Promise.all([
    supabase.from('profiles').select('full_name,email,phone,preferred_locale,created_at').eq('id', user.id).maybeSingle(),
    supabase.from('orders').select('id,order_number,status,payment_status,total,created_at,order_items(product_name,quantity,variant_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('addresses').select('id,label,full_name,mobile,line1,locality,city,district,state,pin_code,is_default').eq('user_id', user.id).order('is_default', { ascending: false }).limit(10),
    supabase.from('wishlists').select('product_id,products(id,slug,name_en,price,product_images(image_url,sort_order))').eq('user_id', user.id).limit(30)
  ]);
  const params = await searchParams;
  const confirmationNumber = (params.order || '').trim().slice(0, 80);
  const confirmedOrder = confirmationNumber ? (ordersResult.data || []).find((o: any) => o.order_number === confirmationNumber) : null;
  const profile = profileResult.data;
  const orders = ordersResult.data || [];
  const addresses = addressesResult.data || [];
  const wishlist = wishlistResult.data || [];

  return <main className="page-shell wrap account-shell">
    <div className="page-heading-row"><div><span className="eyebrow">YOUR SPACE / 001</span><h1 className="page-title">Your account</h1><p className="page-subtitle">Orders, delivery details and saved discoveries, all in one place.</p></div><LogoutButton /></div>
    {confirmedOrder && <section className="order-confirmation panel"><span className="order-confirmation-mark"><ShieldCheck size={22}/></span><div><span className="eyebrow">ORDER PLACED SUCCESSFULLY</span><h2>Thanks, {confirmedOrder.customer_name || profile?.full_name || 'explorer'}.</h2><p>Your order <strong>{confirmedOrder.order_number}</strong> is in the review queue. Pay {money(confirmedOrder.total)} by Cash on Delivery when it arrives.</p></div></section>}
    <section className="account-profile panel"><div className="account-avatar"><UserRound size={24}/></div><div className="account-profile-copy"><h2>{profile?.full_name || user.user_metadata?.full_name || 'Skyupinfra customer'}</h2><p>{user.email || user.phone || 'Verified account'}</p><div className="verification-row"><ShieldCheck size={14}/>{user.email_confirmed_at ? 'Email verified' : user.phone_confirmed_at ? 'Mobile verified' : 'Contact verification required'}</div></div></section>

    <section id="orders" className="account-section"><div className="section-heading"><div><span className="eyebrow">THE PAPER TRAIL</span><h2>Recent orders</h2></div><span className="count-label">{orders.length} shown</span></div>
      {orders.length ? <div className="account-order-list">{orders.map((order: any) => <article className="account-order panel" key={order.id}><div className="account-order-top"><div><span className="eyebrow">{order.order_number}</span><strong>{statusLabel(order.status)}</strong></div><strong>{money(order.total)}</strong></div><p className="muted-copy">{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })} · COD · Payment {statusLabel(order.payment_status)}</p><div className="order-lines">{(order.order_items || []).map((item: any, i: number) => <div key={`${order.id}-${i}`}><span>{item.product_name}{item.variant_name ? ` · ${item.variant_name}` : ''}</span><span>× {item.quantity}</span></div>)}</div></article>)}</div> : <div className="empty-panel panel"><Package size={22}/><h3>Your first order is waiting</h3><p>When you place an order, its progress will appear here.</p><Link className="button button-dark" href="/#discover">Explore the store <ArrowRight size={15}/></Link></div>}
    </section>

    <section className="account-section"><div className="section-heading"><div><span className="eyebrow">READY FOR DELIVERY</span><h2>Saved addresses</h2></div><MapPin size={20}/></div>
      {addresses.length ? <div className="account-card-grid">{addresses.map((a: any) => <article className="panel address-card" key={a.id}><div className="section-heading"><strong>{a.label}</strong>{a.is_default ? <span className="pill">Default</span> : null}</div><p>{a.full_name}<br/>{a.mobile}<br/>{a.line1}, {a.locality}<br/>{a.city}, {a.district}, {a.state} — {a.pin_code}</p></article>)}</div> : <div className="empty-panel panel"><p>No saved delivery addresses yet. You can save one during checkout.</p><Link href="/cart" className="text-button">Go to cart <ArrowRight size={13}/></Link></div>}
    </section>

    <section id="wishlist" className="account-section"><div className="section-heading"><div><span className="eyebrow">KEEP AN EYE ON IT</span><h2>Your wishlist</h2></div><span className="count-label">{wishlist.length} saved</span></div>
      {wishlist.length ? <div className="account-card-grid">{wishlist.map((row: any) => { const p = row.products; if (!p) return null; return <article className="panel wishlist-row" key={row.product_id}><div><strong>{p.name_en}</strong><p className="muted-copy">{money(p.price)}</p></div><Link className="text-button" href={`/product/${p.slug}`}>View product <ArrowRight size={13}/></Link></article>; })}</div> : <div className="empty-panel panel"><p>Products you save will show up here.</p><Link href="/#discover" className="text-button">Browse products <ArrowRight size={13}/></Link></div>}
    </section>
  </main>;
}
