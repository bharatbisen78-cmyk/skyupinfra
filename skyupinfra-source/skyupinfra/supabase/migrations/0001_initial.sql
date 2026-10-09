-- Skyupinfra commerce schema. Apply through Supabase SQL editor or migrations.
create extension if not exists pgcrypto;

create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum ('new', 'pending_review', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled', 'returned');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en','hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.admin_roles ar where ar.user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_hi text,
  description_en text,
  description_hi text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku text unique,
  name_en text not null,
  name_hi text,
  short_description_en text,
  short_description_hi text,
  description_en text,
  description_hi text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  attributes jsonb not null default '{}'::jsonb,
  specifications jsonb not null default '{}'::jsonb,
  shipping_weight_grams integer check (shipping_weight_grams is null or shipping_weight_grams >= 0),
  dimensions_mm jsonb not null default '{}'::jsonb,
  video_url text,
  seo_title text,
  seo_description text,
  social_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_category_idx on public.products(status, category_id);
create index products_featured_created_idx on public.products(is_featured desc, created_at desc) where status = 'published';
create index products_name_search_idx on public.products using gin (to_tsvector('simple', coalesce(name_en,'') || ' ' || coalesce(name_hi,'') || ' ' || coalesce(sku,'')));

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text_en text,
  alt_text_hi text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_order_idx on public.product_images(product_id, sort_order);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  sku text unique,
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  attributes jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name, value)
);
create index product_variants_product_idx on public.product_variants(product_id, sort_order);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  mobile text not null,
  email text,
  line1 text not null,
  locality text not null,
  city text not null,
  district text not null,
  state text not null,
  pin_code text not null check (pin_code ~ '^[1-9][0-9]{5}$'),
  landmark text,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id, is_default desc);

create table public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, product_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique(cart_id, product_id, variant_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key text not null,
  customer_name text not null,
  customer_mobile text not null,
  customer_email text,
  shipping_address jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_charge numeric(12,2) not null default 0 check (shipping_charge >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  payment_status public.payment_status not null default 'unpaid',
  status public.order_status not null default 'new',
  cancel_reason text,
  internal_note text,
  courier text,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index orders_created_idx on public.orders(created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  variant_name text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history(order_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  order_id uuid references public.orders(id) on delete cascade,
  target_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications(created_at desc) where read_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.store_settings(key,value) values
 ('store', '{"name":"Skyupinfra","currency":"INR","timezone":"Asia/Kolkata","default_locale":"en","support_email":"","support_phone":""}'::jsonb),
 ('shipping', '{"flat_charge":0,"free_shipping_threshold":null,"low_stock_threshold":5}'::jsonb),
 ('checkout', '{"cod_enabled":true,"online_payment_enabled":false}'::jsonb),
 ('homepage', '{"headline":"A universe of useful things","subheadline":"Discover everyday essentials, extraordinary finds, and everything in between."}'::jsonb)
on conflict do nothing;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);

-- Trusted server-side order creation. Called only by the API after validating the user's session.
create or replace function public.create_cod_order(
  p_user_id uuid,
  p_idempotency_key text,
  p_customer jsonb,
  p_address jsonb,
  p_items jsonb,
  p_shipping_charge numeric default 0
) returns table(order_id uuid, order_number text, total numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_existing public.orders%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_line jsonb;
  v_qty integer;
  v_variant_id uuid;
  v_unit numeric(12,2);
  v_line_total numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_stock integer;
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'SKU-' || to_char(now() at time zone 'Asia/Kolkata','YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  v_shipping numeric(12,2) := greatest(coalesce(p_shipping_charge,0),0);
  v_snapshots jsonb := '[]'::jsonb;
  v_snapshot jsonb;
  v_mobile text := coalesce(p_customer->>'mobile','');
  v_name text := btrim(coalesce(p_customer->>'full_name',''));
  v_pin text := coalesce(p_address->>'pin_code','');
begin
  if p_user_id is null or p_idempotency_key is null or length(p_idempotency_key) < 12 or length(p_idempotency_key) > 120 then
    raise exception 'Invalid checkout request' using errcode = '22023';
  end if;
  select * into v_existing from public.orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return query select v_existing.id, v_existing.order_number, v_existing.total; return; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'Cart is empty or too large' using errcode = '22023';
  end if;
  if v_name = '' or v_mobile !~ '^[0-9+() -]{10,18}$' then raise exception 'Invalid customer details' using errcode = '22023'; end if;
  if coalesce(p_address->>'line1','') = '' or coalesce(p_address->>'locality','') = '' or coalesce(p_address->>'city','') = '' or coalesce(p_address->>'district','') = '' or coalesce(p_address->>'state','') = '' or v_pin !~ '^[1-9][0-9]{5}$' then
    raise exception 'Invalid delivery address' using errcode = '22023';
  end if;
  if v_shipping > 100000 then raise exception 'Invalid shipping charge' using errcode = '22023'; end if;

  for v_line in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_line->>'product_id','') !~* '^[0-9a-f-]{36}$' then raise exception 'Invalid product' using errcode = '22023'; end if;
    v_qty := (v_line->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity' using errcode = '22023'; end if;
    select * into v_product from public.products where id = (v_line->>'product_id')::uuid and status = 'published' for update;
    if not found then raise exception 'A product is unavailable' using errcode = 'P0001'; end if;
    v_variant_id := null;
    v_variant := null;
    if nullif(v_line->>'variant_id','') is not null then
      if (v_line->>'variant_id') !~* '^[0-9a-f-]{36}$' then raise exception 'Invalid variant' using errcode = '22023'; end if;
      v_variant_id := (v_line->>'variant_id')::uuid;
      select * into v_variant from public.product_variants where id = v_variant_id and product_id = v_product.id for update;
      if not found then raise exception 'A product variant is unavailable' using errcode = 'P0001'; end if;
      if v_variant.stock_qty < v_qty then raise exception 'Insufficient stock for a product variant' using errcode = 'P0001'; end if;
      v_unit := coalesce(v_variant.price_override, v_product.price);
      update public.product_variants set stock_qty = stock_qty - v_qty, updated_at = now() where id = v_variant.id;
      v_stock := v_variant.stock_qty;
    else
      if exists(select 1 from public.product_variants pv where pv.product_id = v_product.id) then
        raise exception 'Select a product variant before checkout' using errcode = '22023';
      end if;
      if v_product.stock_qty < v_qty then raise exception 'Insufficient stock' using errcode = 'P0001'; end if;
      v_unit := v_product.price;
      update public.products set stock_qty = stock_qty - v_qty, updated_at = now() where id = v_product.id;
      v_stock := v_product.stock_qty;
    end if;
    v_line_total := round(v_unit * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_snapshots := v_snapshots || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'variant_id',v_variant_id,'product_name',v_product.name_en,
      'sku',coalesce(v_variant.sku,v_product.sku),
      'variant_name',case when v_variant_id is not null then v_variant.name || ': ' || v_variant.value else null end,
      'unit_price',v_unit,'quantity',v_qty,'line_total',v_line_total));
  end loop;

  insert into public.orders(id,order_number,user_id,idempotency_key,customer_name,customer_mobile,customer_email,shipping_address,subtotal,shipping_charge,discount,total,payment_method,payment_status,status)
  values(v_order_id,v_order_number,p_user_id,p_idempotency_key,v_name,v_mobile,nullif(p_customer->>'email',''),p_address,v_subtotal,v_shipping,0,v_subtotal+v_shipping,'cod','unpaid','new');
  for v_snapshot in select value from jsonb_array_elements(v_snapshots) loop
    insert into public.order_items(order_id,product_id,variant_id,product_name,sku,variant_name,unit_price,quantity,line_total)
    values(v_order_id,(v_snapshot->>'product_id')::uuid,nullif(v_snapshot->>'variant_id','null')::uuid,v_snapshot->>'product_name',v_snapshot->>'sku',v_snapshot->>'variant_name',(v_snapshot->>'unit_price')::numeric,(v_snapshot->>'quantity')::integer,(v_snapshot->>'line_total')::numeric);
  end loop;
  insert into public.order_status_history(order_id,from_status,to_status,actor_id) values(v_order_id,null,'new',p_user_id);
  insert into public.notifications(kind,title,body,order_id,target_path)
  values('new_order','New COD order ' || v_order_number,'A new Cash on Delivery order needs review.',v_order_id,'/admin?order=' || v_order_id);
  return query select v_order_id, v_order_number, v_subtotal + v_shipping;
exception when unique_violation then
  select * into v_existing from public.orders where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then return query select v_existing.id,v_existing.order_number,v_existing.total; else raise; end if;
end;
$$;
revoke all on function public.create_cod_order(uuid,text,jsonb,jsonb,jsonb,numeric) from public, anon, authenticated;
grant execute on function public.create_cod_order(uuid,text,jsonb,jsonb,jsonb,numeric) to service_role;

-- User profile is automatically initialized. Auth provider verifies OTP before a session is issued.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles(id,email,phone,full_name) values(new.id,new.email,new.phone,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Enable RLS on all user-facing tables.
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.addresses enable row level security;
alter table public.wishlists enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.store_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "admins read roles" on public.admin_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "published categories readable" on public.categories for select to anon, authenticated using (is_published or public.is_admin());
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "published products readable" on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "product images readable" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy "admins manage product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "variants readable" on public.product_variants for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_admin())));
create policy "admins manage variants" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "addresses own" on public.addresses for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "wishlist own" on public.wishlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart own" on public.carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart item own" on public.cart_items for all to authenticated using (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "orders own or admin" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "items own or admin" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "status history own or admin" on public.order_status_history for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "admin notifications" on public.notifications for select to authenticated using (public.is_admin());
create policy "admin notification updates" on public.notifications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "push own or admin" on public.push_subscriptions for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "store settings readable" on public.store_settings for select to anon, authenticated using (true);
create policy "admins update settings" on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "admins write audit" on public.audit_logs for insert to authenticated with check (public.is_admin() and (actor_id is null or actor_id = auth.uid()));

-- No anon/authenticated INSERT/UPDATE policy exists for orders or order_items: order creation is server-only RPC.
