import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const rows: MetadataRoute.Sitemap = [{ url: site, changeFrequency: 'daily', priority: 1 }];
  try {
    const supabase = await createClient();
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from('products').select('slug,updated_at,created_at').eq('status', 'published').order('updated_at', { ascending: false }).limit(5000),
      supabase.from('categories').select('slug,updated_at,created_at').eq('is_published', true).order('sort_order').limit(500)
    ]);
    for (const p of products || []) rows.push({ url: `${site}/product/${p.slug}`, lastModified: p.updated_at || p.created_at || undefined, changeFrequency: 'weekly', priority: 0.8 });
    for (const c of categories || []) rows.push({ url: `${site}/?category=${encodeURIComponent(c.slug)}`, lastModified: c.updated_at || c.created_at || undefined, changeFrequency: 'weekly', priority: 0.6 });
  } catch { /* A missing database yields only the canonical homepage until configured. */ }
  return rows;
}
