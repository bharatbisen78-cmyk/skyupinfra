'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, CircleUserRound, Languages, Menu, Search, ShoppingBag, X, Sparkles } from 'lucide-react';
import { useStore } from './store-context';

export function SiteHeader() {
  const { locale, setLocale, t, cartCount } = useStore();
  const [query, setQuery] = useState(''); const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><div className="header-main wrap">
    <Link href="/" className="brand" aria-label="Skyupinfra home"><span className="brand-mark"><Sparkles size={19} strokeWidth={2.4}/></span><span>skyup<span className="brand-accent">infra</span><small>FIND YOUR NEXT</small></span></Link>
    <form className="header-search" action="/" role="search"><Search size={17}/><input name="q" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('search')} aria-label={t('search')}/><kbd>↵</kbd></form>
    <div className="header-actions"><button className="language-toggle" onClick={()=>setLocale(locale==='en'?'hi':'en')} aria-label="Switch language"><Languages size={16}/><span>{locale==='en'?'EN':'हि'}</span><span className="language-separator">/</span><span>{locale==='en'?'हि':'EN'}</span></button><Link className="icon-action account-action" href="/account" aria-label={t('account')}><CircleUserRound size={20}/><span>{t('account')}</span></Link><Link className="cart-action" href="/cart" aria-label={`${t('cart')} (${cartCount})`}><ShoppingBag size={19}/><span>{t('cart')}</span><b>{cartCount}</b></Link><button className="mobile-menu-button" onClick={()=>setMenuOpen(!menuOpen)} aria-label={menuOpen?'Close menu':'Open menu'}>{menuOpen?<X/>:<Menu/>}</button></div>
  </div><nav className={`subnav ${menuOpen?'subnav-open':''}`} aria-label="Main navigation"><div className="wrap subnav-inner"><div className="nav-links"><Link href="/">{t('home')}</Link><Link href="/#discover">{t('shop')}</Link><Link href="/account#orders">{t('orders')}</Link><Link href="/account#wishlist">{t('wishlist')}</Link><Link href="/admin" className="admin-nav-link">{t('admin')} <ArrowUpRight size={13}/></Link></div><div className="nav-trust"><span className="status-dot"/> Curiosity looks good on you <span className="nav-slash">/</span> Built for tomorrow</div></div></nav></header>;
}
