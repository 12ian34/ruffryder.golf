alter table public.fixture_players
  drop constraint if exists fixture_players_slot_check;

alter table public.fixture_players
  add constraint fixture_players_slot_check check (slot between 1 and 6);

create table public.segment_players (
  segment_id uuid not null references public.segments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team public.app_team not null,
  slot integer not null check (slot between 1 and 6),
  created_at timestamptz not null default now(),
  primary key (segment_id, player_id),
  unique (segment_id, team, slot)
);

create index segment_players_player_id_idx on public.segment_players(player_id);

alter table public.segment_players enable row level security;

grant select on public.segment_players to authenticated;
grant insert, update, delete on public.segment_players to authenticated;

create policy "Authenticated users can read segment players"
on public.segment_players for select
to authenticated
using (true);

create policy "Admins can manage segment players"
on public.segment_players for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());
