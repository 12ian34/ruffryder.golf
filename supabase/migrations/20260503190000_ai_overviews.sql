create table public.ai_player_overviews (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  overview_markdown text not null,
  custom_prompt text,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id)
);

create table public.ai_tournament_overviews (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  overview_markdown text not null,
  source_hole_score_count integer not null default 0 check (source_hole_score_count >= 0),
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id)
);

create index ai_player_overviews_generated_at_idx on public.ai_player_overviews(generated_at desc);
create index ai_tournament_overviews_generated_at_idx on public.ai_tournament_overviews(generated_at desc);

create trigger set_ai_player_overviews_updated_at
before update on public.ai_player_overviews
for each row execute function public.set_updated_at();

create trigger set_ai_tournament_overviews_updated_at
before update on public.ai_tournament_overviews
for each row execute function public.set_updated_at();

alter table public.ai_player_overviews enable row level security;
alter table public.ai_tournament_overviews enable row level security;

grant select, insert, update on
  public.ai_player_overviews,
  public.ai_tournament_overviews
to authenticated;

create policy "Authenticated users can read player AI overviews"
on public.ai_player_overviews for select
to authenticated
using (true);

create policy "Admins and linked players can write player AI overviews"
on public.ai_player_overviews for insert
to authenticated
with check (
  public.current_profile_is_admin()
  or player_id = public.current_linked_player_id()
);

create policy "Admins and linked players can update player AI overviews"
on public.ai_player_overviews for update
to authenticated
using (
  public.current_profile_is_admin()
  or player_id = public.current_linked_player_id()
)
with check (
  public.current_profile_is_admin()
  or player_id = public.current_linked_player_id()
);

create policy "Authenticated users can read tournament AI overviews"
on public.ai_tournament_overviews for select
to authenticated
using (true);

create policy "Authenticated users can write tournament AI overviews"
on public.ai_tournament_overviews for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update tournament AI overviews"
on public.ai_tournament_overviews for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

alter publication supabase_realtime add table
  public.ai_player_overviews,
  public.ai_tournament_overviews;
