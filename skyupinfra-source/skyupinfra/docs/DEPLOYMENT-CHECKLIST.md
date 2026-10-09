# Skyupinfra launch checklist

## Owner / hosting setup
- [ ] Connect the project to a Next.js-capable hosting workspace.
- [ ] Add all server secrets through the host's environment/secret settings, never in source control.
- [ ] Add the deployment origin to `NEXT_PUBLIC_SITE_URL`.
- [ ] Enable HTTPS on the assigned deployment URL.

## Database and auth
- [ ] Apply `supabase/migrations/0001_initial.sql` to a new Supabase project.
- [ ] Review the RLS policies and execute negative authorization tests.
- [ ] Set Auth OTP expiry, rate limit, resend policy, and an appropriate email template.
- [ ] Configure a real SMS gateway only if phone OTP is needed.
- [ ] Verify owner email, run one-time admin bootstrap, then rotate/remove the bootstrap token.
- [ ] Configure admin MFA before exposing the admin dashboard to the internet.

## Store operations
- [ ] Configure COD availability and shipping fee in `store_settings`.
- [ ] Create categories and products; check title, prices, stock and image URLs.
- [ ] Confirm published product URLs and metadata on a direct open and social preview.
- [ ] Test order totals, stock concurrency and idempotent submissions.
- [ ] Configure push VAPID keys and implement/verify subscription management before relying on push alerts.
- [ ] Add support/legal policy content and contact details.

## Verification and release
- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] Test email OTP send, verify, invalid/expired/reused OTP and logout.
- [ ] Test COD checkout, server totals and order status changes.
- [ ] Test customer A cannot read customer B's account/address/cart/order.
- [ ] Test a regular customer cannot read admin data or call admin mutations.
- [ ] Test mobile layout, keyboard/focus access, reduced motion, and 3D failure fallback.
- [ ] Confirm service-role/private keys do not appear in browser bundles.
- [ ] Set up database/media backups and run a test restore.
- [ ] Connect the custom domain only after HTTPS deployment smoke tests pass.
