create table public.legacy_tournaments (
  id uuid primary key default gen_random_uuid(),
  legacy_firebase_id text not null unique,
  name text not null,
  year integer not null,
  is_complete boolean not null default false,
  completed_at timestamptz,
  total_raw_usa numeric(6, 2) not null default 0,
  total_raw_europe numeric(6, 2) not null default 0,
  total_legacy_adjusted_usa numeric(6, 2) not null default 0,
  total_legacy_adjusted_europe numeric(6, 2) not null default 0,
  projected_raw_usa numeric(6, 2) not null default 0,
  projected_raw_europe numeric(6, 2) not null default 0,
  projected_legacy_adjusted_usa numeric(6, 2) not null default 0,
  projected_legacy_adjusted_europe numeric(6, 2) not null default 0,
  legacy_handicap_method text not null default 'legacy_add_strokes_to_opponent',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legacy_games (
  id uuid primary key default gen_random_uuid(),
  legacy_firebase_id text not null,
  legacy_tournament_id uuid not null references public.legacy_tournaments(id) on delete cascade,
  usa_player_legacy_id text,
  europe_player_legacy_id text,
  usa_player_id uuid references public.players(id) on delete set null,
  europe_player_id uuid references public.players(id) on delete set null,
  usa_player_name text not null,
  europe_player_name text not null,
  status text not null,
  use_legacy_handicap boolean not null default false,
  legacy_handicap_strokes integer not null default 0 check (legacy_handicap_strokes >= 0),
  legacy_higher_handicap_team public.app_team,
  stroke_raw_usa integer not null default 0 check (stroke_raw_usa >= 0),
  stroke_raw_europe integer not null default 0 check (stroke_raw_europe >= 0),
  stroke_legacy_adjusted_usa integer not null default 0 check (stroke_legacy_adjusted_usa >= 0),
  stroke_legacy_adjusted_europe integer not null default 0 check (stroke_legacy_adjusted_europe >= 0),
  match_raw_usa numeric(6, 2) not null default 0,
  match_raw_europe numeric(6, 2) not null default 0,
  match_legacy_adjusted_usa numeric(6, 2) not null default 0,
  match_legacy_adjusted_europe numeric(6, 2) not null default 0,
  points_raw_usa numeric(6, 2) not null default 0,
  points_raw_europe numeric(6, 2) not null default 0,
  points_legacy_adjusted_usa numeric(6, 2) not null default 0,
  points_legacy_adjusted_europe numeric(6, 2) not null default 0,
  holes jsonb not null default '[]'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (legacy_tournament_id, legacy_firebase_id)
);

create index legacy_tournaments_year_idx on public.legacy_tournaments(year desc);
create index legacy_games_tournament_idx on public.legacy_games(legacy_tournament_id);
create index legacy_games_players_idx on public.legacy_games(usa_player_id, europe_player_id);

create trigger set_legacy_tournaments_updated_at
before update on public.legacy_tournaments
for each row execute function public.set_updated_at();

create trigger set_legacy_games_updated_at
before update on public.legacy_games
for each row execute function public.set_updated_at();

alter table public.legacy_tournaments enable row level security;
alter table public.legacy_games enable row level security;

grant select on
  public.legacy_tournaments,
  public.legacy_games
to authenticated;

grant insert, update, delete on
  public.legacy_tournaments,
  public.legacy_games
to authenticated;

create policy "Authenticated users can read legacy tournaments"
on public.legacy_tournaments for select
to authenticated
using (true);

create policy "Admins can manage legacy tournaments"
on public.legacy_tournaments for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());

create policy "Authenticated users can read legacy games"
on public.legacy_games for select
to authenticated
using (true);

create policy "Admins can manage legacy games"
on public.legacy_games for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());
