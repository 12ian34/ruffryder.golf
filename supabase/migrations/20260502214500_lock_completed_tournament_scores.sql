create or replace function public.can_update_fixture_scores(target_fixture_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    public.current_profile_is_admin()
    or exists (
      select 1
      from public.fixture_players
      where fixture_players.fixture_id = target_fixture_id
        and fixture_players.player_id = public.current_linked_player_id()
    )
  )
  and exists (
    select 1
    from public.fixtures
    join public.tournaments on tournaments.id = fixtures.tournament_id
    where fixtures.id = target_fixture_id
      and tournaments.is_complete is false
  );
$$;

drop policy if exists "Admins can delete hole scores" on public.hole_scores;
drop policy if exists "Admins can delete unlocked hole scores" on public.hole_scores;

create policy "Admins can delete unlocked hole scores"
on public.hole_scores for delete
to authenticated
using (
  public.current_profile_is_admin()
  and exists (
    select 1
    from public.segments
    join public.fixtures on fixtures.id = segments.fixture_id
    join public.tournaments on tournaments.id = fixtures.tournament_id
    where segments.id = hole_scores.segment_id
      and tournaments.is_complete is false
  )
);
