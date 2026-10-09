'use client';
import Link from 'next/link';
import { ArrowUpRight, Heart, Plus, ShoppingBag } from 'lucide-react';
import { useStore } from './store-context';
import { formatINR, type CartLine } from '@/lib/cart';
import { useState } from 'react';

type Product = any;
export function ProductCard({ product }: { product: Product }) {
  const { locale, addToCart, t } = useStore(); const [saved,setSaved] = useState(false); const [busy,setBusy]=useState(false);
  const name = locale==='hi' && product.name_hi ? product.name_hi : product.name_en;
  const description = locale==='hi' && product.short_description_hi ? product.short_description_hi : product.short_description_en;
  const img = product.product_images?.slice().sort((a:any,b:any)=>a.sort_order-b.sort_order)?.[0];
  const category = locale==='hi' ? product.categories?.name_hi || product.categories?.name_en : product.categories?.name_en;
  const discounted=Number(product.compare_at_price)>Number(product.price);
  const line:CartLine={productId:product.id,slug:product.slug,name,imageUrl:img?.image_url??product.social_image_url??null,quantity:1,displayedPrice:Number(product.price)};
  async function wishlist(){setBusy(true);try{const r=await fetch('/api/wishlist',{method:saved?'DELETE':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({productId:product.id})});if(r.status===401){window.location.href='/login?next='+encodeURIComponent(window.location.pathname);return;}if(r.ok)setSaved(!saved);else {const data=await r.json().catch(()=>({}));window.dispatchEvent(new CustomEvent('skyupinfra:toast',{detail:data.error||'Could not update wishlist.'}));}}catch{window.dispatchEvent(new CustomEvent('skyupinfra:toast',{detail:'Please check your connection and try again.'}));}finally{setBusy(false)}}
  return <article className="product-card"><Link href={`/product/${product.slug}`} className="product-media" aria-label={`View ${name}`}>{img?.image_url||product.social_image_url?<img src={img?.image_url||product.social_image_url} alt={img?.alt_text_en||name} loading="lazy"/>:<div className="product-placeholder"><ShoppingBag size={47} strokeWidth={1.1}/></div>}{discounted&&<span className="product-badge">{Math.round((1-Number(product.price)/Number(product.compare_at_price))*100)}% OFF</span>}</Link><button className="product-heart" onClick={wishlist} disabled={busy} aria-label={saved?'Remove from wishlist':'Save to wishlist'} title={saved?'Remove from wishlist':'Save to wishlist'}><Heart size={15} fill={saved?'#5c72d7':'none'} color={saved?'#5c72d7':'currentColor'}/></button><div className="product-body"><span className="product-cat">{category||'DISCOVER'}</span><Link href={`/product/${product.slug}`} className="product-name">{name}</Link>{description&&<p className="product-desc">{description}</p>}<div className="product-buy-row"><div><span className="product-price">{formatINR(Number(product.price))}</span>{discounted&&<span className="product-old-price">{formatINR(Number(product.compare_at_price))}</span>}</div><button className="add-button" disabled={Number(product.stock_qty)<=0||!!product.product_variants?.length} title={product.product_variants?.length?'Choose a variant on the product page':'Add to cart'} onClick={()=>{addToCart(line);window.dispatchEvent(new CustomEvent('skyupinfra:toast',{detail:`${name} added to your cart.`}));}} aria-label={`Add ${name} to cart`}>{product.product_variants?.length?<ArrowUpRight size={16}/>:<Plus size={18}/>}</button></div></div></article>
}
