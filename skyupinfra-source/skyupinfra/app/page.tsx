import { createClient } from '@/lib/supabase/server';
import { Storefront } from '@/components/storefront';

export const revalidate = 0;
export default async function Home({searchParams}:{searchParams:Promise<{q?:string}>}) {
  let products:any[]=[];let categories:any[]=[];
  try {const supabase=await createClient();const [{data:p},{data:c}]=await Promise.all([
    supabase.from('products').select('id,slug,name_en,name_hi,short_description_en,short_description_hi,price,compare_at_price,stock_qty,status,is_featured,attributes,created_at,category_id,social_image_url,product_images(id,image_url,alt_text_en,sort_order),product_variants(id)').eq('status','published').order('is_featured',{ascending:false}).order('created_at',{ascending:false}).limit(48),
    supabase.from('categories').select('id,slug,name_en,name_hi,sort_order,is_published').eq('is_published',true).order('sort_order')]);products=p||[];categories=c||[];
  }catch{/* The catalogue remains in its correct empty state until backend configuration is supplied. */}
  const params=await searchParams;
  return <><Storefront products={products} categories={categories} initialQuery={params.q||''}/></>;
}
