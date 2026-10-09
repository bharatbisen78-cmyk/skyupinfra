'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addLine, readCart, writeCart, type CartLine } from '@/lib/cart';
import { getLocale, messages, type Locale } from '@/lib/i18n';

type StoreContextValue = {
  locale: Locale; setLocale: (locale: Locale) => void; t: (key: keyof typeof messages.en) => string;
  cart: CartLine[]; cartCount: number; addToCart: (line: CartLine) => void; setCart: (lines: CartLine[]) => void;
};
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [cart, setCartState] = useState<CartLine[]>([]);
  const setLocale = useCallback((next: Locale) => { setLocaleState(next); if (typeof window !== 'undefined') { localStorage.setItem('skyupinfra-locale', next); document.documentElement.lang = next; } }, []);
  const setCart = useCallback((next: CartLine[]) => { setCartState(next); writeCart(next); window.dispatchEvent(new CustomEvent('skyupinfra:cart', { detail: next })); fetch('/api/cart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines: next }) }).catch(() => {}); }, []);
  const addToCart = useCallback((line: CartLine) => { const next = addLine(line); setCartState(next); window.dispatchEvent(new CustomEvent('skyupinfra:cart', { detail: next })); fetch('/api/cart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines: next }) }).catch(() => {}); }, []);
  useEffect(() => {
    setLocaleState(getLocale()); setCartState(readCart());
    const update = (event: Event) => { const next = (event as CustomEvent<CartLine[]>).detail; if (Array.isArray(next)) setCartState(next); };
    const sync = async () => {
      try {
        const res = await fetch('/api/cart'); if (!res.ok) return;
        const data = await res.json(); const serverLines = Array.isArray(data.lines) ? data.lines as CartLine[] : [];
        if (serverLines.length) { const guest = readCart(); const merged = [...serverLines]; for (const g of guest) { const match = merged.find(x => x.productId === g.productId && (x.variantId ?? null) === (g.variantId ?? null)); if (match) match.quantity = Math.min(99, match.quantity + g.quantity); else merged.push(g); } writeCart(merged); setCartState(merged); await fetch('/api/cart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines: merged }) }); }
        else if (readCart().length) await fetch('/api/cart', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines: readCart() }) });
      } catch { /* guest carts remain usable while offline */ }
    };
    window.addEventListener('skyupinfra:cart', update); void sync();
    return () => window.removeEventListener('skyupinfra:cart', update);
  }, []);
  const value = useMemo(() => ({ locale, setLocale, t: (key: keyof typeof messages.en) => messages[locale][key] ?? messages.en[key], cart, cartCount: cart.reduce((n, line) => n + line.quantity, 0), addToCart, setCart }), [locale, setLocale, cart, addToCart, setCart]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore() { const value = useContext(StoreContext); if (!value) throw new Error('useStore must be used inside StoreProvider'); return value; }
