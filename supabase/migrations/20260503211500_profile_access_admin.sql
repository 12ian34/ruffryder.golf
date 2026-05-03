alter table public.profiles
  add column if not exists access_disabled_at timestamptz,
  add column if not exists access_disabled_by uuid references public.profiles(id) on delete set null,
  add column if not exists access_disabled_reason text;

create index if not exists profiles_access_disabled_at_idx
on public.profiles(access_disabled_at)
where access_disabled_at is not null;
