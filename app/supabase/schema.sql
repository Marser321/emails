-- Email Builder v3 - idempotent schema and RLS migration.
-- Apply only after deploying code that no longer reads API keys from public.settings.

create extension if not exists pgcrypto;

create table if not exists public.brands (
  id text primary key,
  name text not null,
  category text not null,
  colors jsonb not null,
  fonts jsonb not null,
  logo jsonb not null,
  footer jsonb not null,
  voice jsonb,
  intelligence jsonb,
  is_favorite boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.brands add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.brands add column if not exists intelligence jsonb;

create table if not exists public.history (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  template_type text not null,
  engine text not null,
  model text not null,
  prompt text,
  subject text not null,
  content jsonb not null,
  html_snapshot text,
  rating text check (rating is null or rating in ('up', 'down')),
  notes text,
  schema_version integer not null default 4,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.history add column if not exists schema_version integer not null default 1;
alter table public.history alter column schema_version set default 4;
alter table public.history add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.history add column if not exists offer_id text;
alter table public.history add column if not exists brief jsonb;
alter table public.history add column if not exists is_pinned boolean not null default false;
alter table public.history add column if not exists is_archived boolean not null default false;

create table if not exists public.offers (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  name text not null,
  type text not null check (type in ('percent', 'fixed', 'price', 'freebie', 'bundle', 'event', 'custom')),
  value text not null default '',
  currency text not null default 'USD',
  original_price text,
  sale_price text,
  code text,
  starts_at timestamptz,
  ends_at timestamptz,
  terms text not null default '',
  audience text not null default '',
  urgency text not null default '',
  landing_url text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.history_versions (
  id text primary key,
  history_id text not null references public.history(id) on delete cascade,
  brand_id text not null references public.brands(id) on delete cascade,
  version integer not null check (version > 0),
  reason text not null check (reason in ('generated', 'autosave', 'manual', 'restored', 'duplicated', 'exported')),
  subject text not null default '',
  content jsonb not null,
  html_snapshot text,
  created_at timestamptz not null default now(),
  unique(history_id, version)
);

-- Sin esto, cualquier insert directo a la tabla (fuera de la API/Zod de la app)
-- puede colar un motor inválido, ej. engine='manual' — ya pasó dos veces.
alter table public.history drop constraint if exists history_engine_check;
alter table public.history add constraint history_engine_check check (engine in ('gemini', 'groq', 'claude'));

create table if not exists public.drafts (
  id text primary key,
  name text not null,
  brand_name text not null,
  template_name text not null,
  brand_id text not null,
  template text not null,
  content jsonb not null,
  schema_version integer not null default 4,
  created_by uuid references auth.users(id) on delete set null,
  date timestamptz not null default now()
);

alter table public.drafts add column if not exists schema_version integer not null default 1;
alter table public.drafts alter column schema_version set default 4;
alter table public.drafts add column if not exists created_by uuid references auth.users(id) on delete set null;

create table if not exists public.settings (
  id text primary key default 'default',
  default_engine text not null default 'gemini' check (default_engine in ('gemini', 'groq', 'claude')),
  assets_public_base_url text,
  migrated_from_local_storage boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Secrets belong in deployment environment variables, never in database rows.
alter table public.settings drop column if exists gemini_api_key;
alter table public.settings drop column if exists anthropic_api_key;
alter table public.settings drop column if exists groq_api_key;
alter table public.settings drop constraint if exists settings_default_engine_check;
alter table public.settings add constraint settings_default_engine_check check (default_engine in ('gemini', 'groq', 'claude'));
insert into public.settings (id, default_engine) values ('default', 'gemini') on conflict (id) do nothing;

create table if not exists public.assets (
  id text primary key default gen_random_uuid()::text,
  brand_id text not null,
  filename text not null,
  storage_path text not null unique,
  thumbnail_path text,
  kind text not null default 'other' check (kind in ('logo', 'hero', 'tile', 'icon', 'other')),
  alt_text text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  has_alpha boolean not null default false,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 8388608),
  variant text not null default 'email' check (variant in ('email', 'thumbnail', 'source')),
  author text not null default 'AD Media Solution',
  source_prompt text,
  intended_use text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets add column if not exists has_alpha boolean not null default false;

create index if not exists history_brand_created_idx on public.history (brand_id, created_at desc);
create index if not exists history_rating_idx on public.history (brand_id, rating) where rating is not null;
create index if not exists drafts_date_idx on public.drafts (date desc);
create index if not exists assets_brand_kind_idx on public.assets (brand_id, kind, created_at desc);
create index if not exists offers_brand_status_idx on public.offers (brand_id, status, updated_at desc);
create index if not exists history_versions_history_idx on public.history_versions (history_id, version desc);
create index if not exists history_pinned_updated_idx on public.history (is_pinned desc, updated_at desc);

alter table public.brands enable row level security;
alter table public.history enable row level security;
alter table public.drafts enable row level security;
alter table public.settings enable row level security;
alter table public.assets enable row level security;
alter table public.offers enable row level security;
alter table public.history_versions enable row level security;

revoke all on table public.brands, public.history, public.drafts, public.settings, public.assets, public.offers, public.history_versions from anon;
grant select, insert, update, delete on table public.brands, public.history, public.drafts, public.settings, public.assets, public.offers, public.history_versions to authenticated;

drop policy if exists "team access brands" on public.brands;
drop policy if exists "team access history" on public.history;
drop policy if exists "team access drafts" on public.drafts;
drop policy if exists "team access settings" on public.settings;
drop policy if exists "team access assets" on public.assets;
create policy "team access brands" on public.brands for all to authenticated using (true) with check (true);
create policy "team access history" on public.history for all to authenticated using (true) with check (true);
create policy "team access drafts" on public.drafts for all to authenticated using (true) with check (true);
create policy "team access settings" on public.settings for all to authenticated using (true) with check (true);
create policy "team access assets" on public.assets for all to authenticated using (true) with check (true);
drop policy if exists "team access offers" on public.offers;
drop policy if exists "team access history versions" on public.history_versions;
create policy "team access offers" on public.offers for all to authenticated using (true) with check (true);
create policy "team access history versions" on public.history_versions for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Allow Insert" on storage.objects;
drop policy if exists "Allow Update" on storage.objects;
drop policy if exists "Allow Delete" on storage.objects;
drop policy if exists "public email image reads" on storage.objects;
drop policy if exists "authenticated email image inserts" on storage.objects;
drop policy if exists "authenticated email image updates" on storage.objects;
drop policy if exists "authenticated email image deletes" on storage.objects;

create policy "public email image reads" on storage.objects
  for select to public using (bucket_id = 'assets');
create policy "authenticated email image inserts" on storage.objects
  for insert to authenticated with check (bucket_id = 'assets');
create policy "authenticated email image updates" on storage.objects
  for update to authenticated using (bucket_id = 'assets') with check (bucket_id = 'assets');
create policy "authenticated email image deletes" on storage.objects
  for delete to authenticated using (bucket_id = 'assets');
