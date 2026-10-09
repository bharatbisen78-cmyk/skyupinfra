export type CartLine = { productId: string; slug: string; name: string; imageUrl?: string | null; variantId?: string | null; variantLabel?: string | null; quantity: number; displayedPrice: number };
const KEY = 'skyupinfra-cart-v1';

export function readCart(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((x) => x && typeof x.productId === 'string' && Number.isInteger(x.quantity) && x.quantity > 0) : [];
  } catch { return []; }
}

export function writeCart(lines: CartLine[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(lines));
}

export function addLine(line: CartLine): CartLine[] {
  const current = readCart();
  const found = current.findIndex((x) => x.productId === line.productId && (x.variantId ?? null) === (line.variantId ?? null));
  if (found >= 0) current[found] = { ...current[found], quantity: Math.min(99, current[found].quantity + line.quantity) };
  else current.push({ ...line, quantity: Math.min(99, Math.max(1, line.quantity)) });
  writeCart(current);
  return current;
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}
