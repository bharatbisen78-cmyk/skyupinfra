'use client';
import { useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';

function decodeKey(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/'); const raw = window.atob(base64); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }

export function AdminPushSetup() {
  const [busy, setBusy] = useState(false); const [active, setActive] = useState(false); const [message, setMessage] = useState('Enable alerts on this device to receive a notification when a COD order arrives.');
  async function enable() {
    setBusy(true); setMessage('');
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push notifications are not supported by this browser.');
      const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const keyResponse = await fetch('/api/push/key', { cache: 'no-store' }); const keyData = await keyResponse.json(); if (!keyResponse.ok) throw new Error(keyData.error || 'Push is not configured.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(keyData.publicKey) });
      const save = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON() }) }); const data = await save.json(); if (!save.ok) throw new Error(data.error || 'Could not save this device.');
      setActive(true); setMessage('This device is subscribed. Allow notifications in your browser settings to receive order alerts.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not enable push notifications.'); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setMessage('');
    try { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); if (subscription) { await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }); await subscription.unsubscribe(); } setActive(false); setMessage('This device has been unsubscribed.'); }
    catch { setMessage('Could not disable alerts on this device.'); } finally { setBusy(false); }
  }
  return <section className="panel admin-push-panel"><div className="admin-push-copy"><span className="eyebrow">OPTIONAL DEVICE ALERTS</span><h2>New-order push notifications</h2><p>{message}</p></div>{active ? <button className="button button-light" disabled={busy} onClick={disable}><BellOff size={15}/> {busy ? 'Saving…' : 'Disable on this device'}</button> : <button className="button button-dark" disabled={busy} onClick={enable}><BellRing size={15}/> {busy ? 'Setting up…' : 'Enable alerts on this device'}</button>}</section>;
}
