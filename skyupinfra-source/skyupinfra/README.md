# Skyupinfra Commerce

Skyupinfra is a Next.js App Router storefront project designed for deployment with Supabase as the persistent database/auth provider. It includes a responsive storefront, optional real-time Three.js shop entrance, English/Hindi language toggle, customer email/SMS OTP UI, cart, COD checkout API, server-side order creation RPC, a customer account page, an initial admin order dashboard, and an admin catalogue form for products and categories.

> **Deployment status:** this is a source project, not a published live store. Dependency installation timed out in the build environment, so `next build` and end-to-end flows have not yet been verified. Do not accept production orders until the setup checklist is complete and critical tests pass.

## Stack

- Next.js App Router + React + TypeScript
- Supabase Auth + PostgreSQL + Row Level Security
- Three.js procedural WebGL storefront scene
- PWA manifest and service worker; Web Push keys are optional
- INR currency, Cash on Delivery only

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The storefront intentionally shows a proper empty state before products are published. It does not seed fake products or orders.

## Supabase setup

1. Create a new Supabase project.
2. Run `supabase/migrations/0001_initial.sql` in the SQL editor or apply it through Supabase CLI.
3. In Auth settings, configure the email OTP template/expiry/rate limits. To use mobile OTP, configure an SMS provider in Supabase Auth and test delivery with a real phone number.
4. Add the project's URL and publishable/anon key in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Add `SUPABASE_SERVICE_ROLE_KEY` as a **server-only secret** in the host settings. Never expose it with a `NEXT_PUBLIC_` prefix or commit it.
6. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin, `INITIAL_ADMIN_EMAIL` to the owner's verified email, and `ADMIN_BOOTSTRAP_TOKEN` to a one-time random secret of at least 32 characters.
7. Start the app, request email OTP at `/login`, verify the owner account, then call `POST /api/admin/bootstrap` once while signed in, with JSON body `{"token":"<one-time token>"}`. The configured verified owner email and token must both match. Once the first role exists, bootstrap returns conflict and does not create a second initial administrator. Rotate/remove `ADMIN_BOOTSTRAP_TOKEN` after setup.
8. Sign in again and open `/admin` or `/admin/products`.

Generate a strong one-time token outside the source repository; for example, run `openssl rand -base64 36` locally. Do not paste it into a chat, commit it, or put it in browser code.

## Environment variables

See `.env.example`. `NEXT_PUBLIC_*` values are public client configuration, not secrets. `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_BOOTSTRAP_TOKEN`, and `VAPID_PRIVATE_KEY` must live only in the deployment platform's encrypted secret manager.

## Deployment

Deploy the repository to a host that supports Next.js App Router and server route handlers (for example, a supported Vercel project or another Node.js host). Configure the environment variables, apply the database migration, and deploy. Connect the custom domain only after the assigned HTTPS URL passes the smoke tests. Update `NEXT_PUBLIC_SITE_URL` after the domain is connected.

## Core checks before launch

- Apply the migration on a disposable Supabase project first; inspect RLS policies and run the authorization tests.
- Verify real email OTP send/verify, expired/reused code rejection and resend limits in Supabase Auth.
- Verify real SMS OTP only after a paid/verified SMS gateway is configured.
- Create a category and product in `/admin/products`; publish it and open `/product/<slug>` in a clean browser session.
- Place COD orders with two accounts and competing stock quantities; verify idempotent retries, server totals and stock updates.
- Confirm one customer cannot query another customer's profile, addresses, cart or order.
- Confirm a non-admin cannot use `/api/admin/*` and cannot bootstrap an admin.
- Test PWA installation and push notifications on HTTPS devices only after setting VAPID keys and adding a subscription UI/configured subscription.
- Run `npm run typecheck` and `npm run build` after installing dependencies, then browser-test on desktop/mobile.

## Known incomplete items

This codebase is not yet production-certified. Dependency installation could not be completed in this environment, so build/typecheck and browser flows remain unverified. The current catalogue form accepts one HTTPS image URL rather than uploading/reordering multiple image files. Full variant/specification editing, duplicate product, bulk actions, saved-address edit/delete, complete admin settings/audit-log UI, and admin authenticator-app MFA need completion before launch. Push delivery still depends on VAPID configuration and a real-browser check. Automated end-to-end authorization/security tests have not been run. No online payment integration is enabled; COD orders are created unpaid.

## Backup and restore

Use Supabase's managed backups or scheduled `pg_dump` into encrypted storage. Restrict backups to trusted operators, verify restores on a separate project, and never put dumps or credentials in the public repository. Export media storage separately if Supabase Storage is configured.
