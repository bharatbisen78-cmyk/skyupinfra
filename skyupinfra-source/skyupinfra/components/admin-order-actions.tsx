'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const statusOptions = [
  ['new', 'New'], ['pending_review', 'Pending review'], ['confirmed', 'Confirmed'], ['packed', 'Packed'],
  ['dispatched', 'Dispatched'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['returned', 'Returned']
];
type Props = { orderId: string; currentStatus: string; shippingCharge: number; internalNote?: string | null; courier?: string | null; trackingNumber?: string | null };
export function AdminOrderActions({ orderId, currentStatus, shippingCharge, internalNote, courier, trackingNumber }: Props) {
  const [status, setStatus] = useState(currentStatus); const [reason, setReason] = useState('');
  const [shipping, setShipping] = useState(String(shippingCharge)); const [note, setNote] = useState(internalNote || '');
  const [courierName, setCourierName] = useState(courier || ''); const [tracking, setTracking] = useState(trackingNumber || '');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const router = useRouter();
  const dirty = status !== currentStatus || shipping !== String(shippingCharge) || note !== (internalNote || '') || courierName !== (courier || '') || tracking !== (trackingNumber || '');
  async function save() {
    if (status === 'cancelled' && !reason.trim() && currentStatus !== 'cancelled') { setMessage('Add a cancellation reason first.'); return; }
    const numericShipping = Number(shipping); if (!Number.isFinite(numericShipping) || numericShipping < 0 || numericShipping > 100000) { setMessage('Shipping charge must be between ₹0 and ₹100,000.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status, reason: reason.trim() || undefined, shipping_charge: numericShipping, internal_note: note, courier: courierName, tracking_number: tracking }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Could not update order.');
      setMessage('Order updated.'); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update order.'); }
    finally { setBusy(false); }
  }
  return <div className="admin-order-actions"><div className="admin-action-row"><label className="admin-status-field">Order status<select value={status} onChange={e => setStatus(e.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="admin-status-field">Shipping charge (INR)<input type="number" min="0" max="100000" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)}/></label><button className="button button-dark" type="button" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    {status === 'cancelled' && currentStatus !== 'cancelled' && <label className="admin-reason">Cancellation reason<input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} placeholder="Required for cancellation"/></label>}
    <div className="admin-fulfilment-grid"><label>Courier / carrier<input value={courierName} onChange={e => setCourierName(e.target.value)} maxLength={200} placeholder="Courier name (optional)"/></label><label>Tracking number<input value={tracking} onChange={e => setTracking(e.target.value)} maxLength={200} placeholder="Tracking code (optional)"/></label><label className="admin-note-field">Internal note (admin only)<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1200} placeholder="Optional internal operations note"/></label></div>
    {message && <p className="admin-inline-message" role="status">{message}</p>}</div>;
}
