-- Run this in Supabase SQL Editor.
-- Assumes Email auth is enabled in your Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.car_models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  storage_path text not null unique,
  original_file_name text not null,
  uploaded_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.car_models
add column if not exists uploaded_by_email text;

create or replace function public.set_car_models_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_car_models_updated_at on public.car_models;
create trigger trg_car_models_updated_at
before update on public.car_models
for each row
execute function public.set_car_models_updated_at();

alter table public.car_models enable row level security;

drop policy if exists "car_models_select_own" on public.car_models;
create policy "car_models_select_own"
on public.car_models
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "car_models_insert_own" on public.car_models;
create policy "car_models_insert_own"
on public.car_models
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "car_models_update_own" on public.car_models;
create policy "car_models_update_own"
on public.car_models
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "car_models_delete_own" on public.car_models;
create policy "car_models_delete_own"
on public.car_models
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('car-models', 'car-models', false)
on conflict (id) do nothing;

drop policy if exists "car_models_objects_select_own" on storage.objects;
create policy "car_models_objects_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'car-models'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "car_models_objects_insert_own" on storage.objects;
create policy "car_models_objects_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'car-models'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "car_models_objects_update_own" on storage.objects;
create policy "car_models_objects_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'car-models'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'car-models'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "car_models_objects_delete_own" on storage.objects;
create policy "car_models_objects_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'car-models'
  and (storage.foldername(name))[1] = auth.uid()::text
);
