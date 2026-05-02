create extension if not exists pgcrypto;

do $$
begin
  create type public.app_team as enum ('USA', 'EUROPE');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.segment_kind as enum ('foursomes', 'singles');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.fixture_status as enum ('not_started', 'in_progress', 'complete');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hole_outcome as enum ('USA', 'EUROPE', 'halved', 'unplayed');
exception
  when duplicate_object then null;
end $$;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  legacy_firebase_id text unique,
  name text not null,
  team public.app_team not null,
  current_cpi numeric(5, 2),
  custom_emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firebase_uid text unique,
  email text not null,
  display_name text not null,
  is_admin boolean not null default false,
  linked_player_id uuid references public.players(id) on delete set null,
  team public.app_team,
  custom_emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  legacy_firebase_id text unique,
  name text not null,
  year integer not null,
  is_active boolean not null default false,
  is_complete boolean not null default false,
  cpi_threshold integer not null default 7 check (cpi_threshold >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text,
  sort_order integer not null default 0,
  status public.fixture_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, sort_order)
);

create table public.fixture_players (
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team public.app_team not null,
  slot integer not null check (slot in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (fixture_id, player_id),
  unique (fixture_id, team, slot)
);

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  kind public.segment_kind not null,
  name text,
  hole_start integer not null check (hole_start between 1 and 18),
  hole_end integer not null check (hole_end between 1 and 18),
  sort_order integer not null default 0,
  usa_player_id uuid references public.players(id) on delete restrict,
  europe_player_id uuid references public.players(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint segment_hole_range_valid check (hole_start <= hole_end),
  constraint segment_players_match_kind check (
    (
      kind = 'foursomes'
      and usa_player_id is null
      and europe_player_id is null
    )
    or (
      kind = 'singles'
      and usa_player_id is not null
      and europe_player_id is not null
    )
  ),
  unique (fixture_id, sort_order)
);

create table public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.segments(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  stroke_index integer not null check (stroke_index between 1 and 18),
  usa_score integer check (usa_score is null or usa_score > 0),
  europe_score integer check (europe_score is null or europe_score > 0),
  usa_net_score integer check (usa_net_score is null or usa_net_score > 0),
  europe_net_score integer check (europe_net_score is null or europe_net_score > 0),
  outcome public.hole_outcome not null default 'unplayed',
  cpi_applied boolean not null default false,
  cpi_difference numeric(5, 2) not null default 0,
  cpi_strokes_usa integer not null default 0 check (cpi_strokes_usa >= 0),
  cpi_strokes_europe integer not null default 0 check (cpi_strokes_europe >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, hole_number)
);

create table public.player_tournament_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  source text not null default 'app',
  completion_year integer not null,
  singles_holes_played integer not null default 0 check (singles_holes_played >= 0),
  singles_strokes integer not null default 0 check (singles_strokes >= 0),
  singles_average numeric(5, 2),
  holes_won integer not null default 0 check (holes_won >= 0),
  holes_halved integer not null default 0 check (holes_halved >= 0),
  cpi_after numeric(5, 2),
  legacy_payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.tournament_progress (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  score jsonb not null,
  completed_holes integer not null default 0 check (completed_holes >= 0),
  created_at timestamptz not null default now()
);

create index players_team_idx on public.players(team);
create index profiles_linked_player_id_idx on public.profiles(linked_player_id);
create index tournaments_active_year_idx on public.tournaments(is_active, year desc);
create index fixtures_tournament_id_idx on public.fixtures(tournament_id);
create index fixture_players_player_id_idx on public.fixture_players(player_id);
create index segments_fixture_id_idx on public.segments(fixture_id);
create index hole_scores_segment_id_idx on public.hole_scores(segment_id);
create index player_tournament_stats_player_year_idx on public.player_tournament_stats(player_id, completion_year desc);
create index tournament_progress_tournament_created_idx on public.tournament_progress(tournament_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

create trigger set_fixtures_updated_at
before update on public.fixtures
for each row execute function public.set_updated_at();

create trigger set_segments_updated_at
before update on public.segments
for each row execute function public.set_updated_at();

create trigger set_hole_scores_updated_at
before update on public.hole_scores
for each row execute function public.set_updated_at();

create or replace function public.current_profile_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profiles.is_admin from public.profiles where profiles.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_linked_player_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profiles.linked_player_id
  from public.profiles
  where profiles.id = auth.uid();
$$;

create or replace function public.can_update_fixture_scores(target_fixture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_is_admin()
    or exists (
      select 1
      from public.fixture_players
      where fixture_players.fixture_id = target_fixture_id
        and fixture_players.player_id = public.current_linked_player_id()
    );
$$;

alter table public.players enable row level security;
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.fixtures enable row level security;
alter table public.fixture_players enable row level security;
alter table public.segments enable row level security;
alter table public.hole_scores enable row level security;
alter table public.player_tournament_stats enable row level security;
alter table public.tournament_progress enable row level security;

grant usage on schema public to authenticated;
grant select on
  public.players,
  public.profiles,
  public.tournaments,
  public.fixtures,
  public.fixture_players,
  public.segments,
  public.hole_scores,
  public.player_tournament_stats,
  public.tournament_progress
to authenticated;
grant insert, update, delete on
  public.players,
  public.profiles,
  public.tournaments,
  public.fixtures,
  public.fixture_players,
  public.segments,
  public.hole_scores,
  public.player_tournament_stats,
  public.tournament_progress
to authenticated;

create policy "Authenticated users can read players"
on public.players for select
to authenticated
using (true);

create policy "Admins can manage players"
on public.players for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read profiles"
on public.profiles for select
to authenticated
using (true);

create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read tournaments"
on public.tournaments for select
to authenticated
using (true);

create policy "Admins can manage tournaments"
on public.tournaments for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read fixtures"
on public.fixtures for select
to authenticated
using (true);

create policy "Admins can manage fixtures"
on public.fixtures for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read fixture players"
on public.fixture_players for select
to authenticated
using (true);

create policy "Admins can manage fixture players"
on public.fixture_players for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read segments"
on public.segments for select
to authenticated
using (true);

create policy "Admins can manage segments"
on public.segments for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read hole scores"
on public.hole_scores for select
to authenticated
using (true);

create policy "Fixture players can insert hole scores"
on public.hole_scores for insert
to authenticated
with check (
  exists (
    select 1
    from public.segments
    where segments.id = hole_scores.segment_id
      and public.can_update_fixture_scores(segments.fixture_id)
  )
);

create policy "Fixture players can update hole scores"
on public.hole_scores for update
to authenticated
using (
  exists (
    select 1
    from public.segments
    where segments.id = hole_scores.segment_id
      and public.can_update_fixture_scores(segments.fixture_id)
  )
)
with check (
  exists (
    select 1
    from public.segments
    where segments.id = hole_scores.segment_id
      and public.can_update_fixture_scores(segments.fixture_id)
  )
);

create policy "Admins can delete hole scores"
on public.hole_scores for delete
to authenticated
using (public.current_profile_is_admin());

create policy "Authenticated users can read player tournament stats"
on public.player_tournament_stats for select
to authenticated
using (true);

create policy "Admins can manage player tournament stats"
on public.player_tournament_stats for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read tournament progress"
on public.tournament_progress for select
to authenticated
using (true);

create policy "Admins can manage tournament progress"
on public.tournament_progress for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());
