'use client';
import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => {
      // Storefront and checkout remain functional if service-worker support is unavailable.
      console.info('PWA service worker is unavailable in this browser.', error);
    });
  }, []);
  return null;
}
