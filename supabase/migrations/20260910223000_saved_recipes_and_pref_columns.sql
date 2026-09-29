-- Saved recipes follow the user, and preferences pick up reminder settings.

alter table public.user_preferences
  add column if not exists expiration_reminders_enabled boolean not null default false,
  add column if not exists expiration_lead_days integer not null default 3;

alter table public.user_preferences
  drop constraint if exists user_preferences_expiration_lead_days_check;

alter table public.user_preferences
  add constraint user_preferences_expiration_lead_days_check
  check (expiration_lead_days in (1, 3, 7));

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  url text not null,
  snippet text not null default '',
  thumbnail text,
  rating numeric,
  review_count integer,
  notes text,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists saved_recipes_user_id_idx on public.saved_recipes (user_id);

alter table public.saved_recipes enable row level security;

drop policy if exists "Users can manage own saved recipes" on public.saved_recipes;
create policy "Users can manage own saved recipes"
  on public.saved_recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
