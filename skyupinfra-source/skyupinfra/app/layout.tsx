import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/components/store-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: { default: 'Skyupinfra — Discover beyond the ordinary', template: '%s | Skyupinfra' },
  description: 'Discover everyday essentials, extraordinary finds, and everything in between at Skyupinfra.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  applicationName: 'Skyupinfra',
  manifest: '/manifest.webmanifest',
  openGraph: { type: 'website', siteName: 'Skyupinfra', title: 'Skyupinfra — Discover beyond the ordinary', description: 'A universe of useful things, all in one place.' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: '#07111f', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><StoreProvider><PwaRegister /><SiteHeader />{children}<SiteFooter /></StoreProvider></body></html>;
}
