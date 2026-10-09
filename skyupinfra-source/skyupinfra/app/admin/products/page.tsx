import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Boxes } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminCategoryForm, AdminProductForm, AdminProductRow } from '@/components/admin-catalogue-tools';

export default async function AdminProductsPage() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=%2Fadmin%2Fproducts');
  const { data: role, error: roleError } = await supabase.from('admin_roles').select('role').eq('user_id', user.id).maybeSingle();
  if (roleError || !role) return <main className="page-shell wrap"><div className="panel access-denied"><h1 className="page-title">Administrator access only</h1><p>This account does not have administrator permissions.</p><Link href="/" className="button button-dark">Return to store</Link></div></main>;
  const admin = createAdminClient();
  const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
    admin.from('products').select('id,slug,sku,category_id,name_en,name_hi,price,compare_at_price,stock_qty,status,is_featured,created_at').order('created_at', { ascending: false }).limit(200),
    admin.from('categories').select('id,slug,name_en,name_hi').order('sort_order')
  ]);
  return <main className="page-shell wrap admin-shell"><div className="page-heading-row"><div><span className="eyebrow">CATALOGUE CONTROL / 002</span><h1 className="page-title">Products & categories</h1><p className="page-subtitle">Create products, publish them and keep stock current.</p></div><Link href="/admin" className="button button-light"><ArrowLeft size={14}/> Back to overview</Link></div>
    {categoriesError ? <div className="message error">Categories could not be loaded. Check database setup.</div> : <div className="admin-catalogue-top"><section className="panel"><div className="section-heading"><div><span className="eyebrow">ORGANIZE FIRST</span><h2>Categories</h2></div><Boxes size={19}/></div><AdminCategoryForm/></section><section className="panel"><div className="section-heading"><div><span className="eyebrow">CATALOGUE BUILDER</span><h2>New product</h2></div></div><AdminProductForm categories={categories || []}/></section></div>}
    <section className="admin-section"><div className="section-heading"><div><span className="eyebrow">EDITABLE INVENTORY</span><h2>Current products</h2></div><span className="count-label">{products?.length || 0} shown</span></div>{productsError ? <div className="message error">Products could not be loaded. Check database setup.</div> : products?.length ? <div className="admin-product-edit-list">{products.map((p: any) => <AdminProductRow key={p.id} product={p}/>)}</div> : <div className="empty-panel panel"><h3>Your catalogue starts here</h3><p>Add your first product above. Drafts stay hidden from shoppers until published.</p></div>}</section>
    <p className="admin-footnote">Product image input currently accepts a secure HTTPS image URL. Direct image uploads, multi-image drag ordering, variants editor and bulk editing still need to be added before production rollout.</p>
  </main>;
}
