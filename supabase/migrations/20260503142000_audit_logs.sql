create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text not null,
  tournament_id uuid,
  fixture_id uuid,
  segment_id uuid,
  hole_score_id uuid,
  player_id uuid,
  actor_profile_id uuid,
  actor_player_id uuid,
  actor_display_name text,
  actor_is_admin boolean,
  changed_fields text[],
  row_before jsonb,
  row_after jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_actor_profile_idx on public.audit_logs(actor_profile_id, created_at desc);
create index audit_logs_actor_player_idx on public.audit_logs(actor_player_id, created_at desc);
create index audit_logs_tournament_idx on public.audit_logs(tournament_id, created_at desc);
create index audit_logs_table_record_idx on public.audit_logs(table_name, record_id);

alter table public.audit_logs enable row level security;

grant select on public.audit_logs to authenticated;

create policy "Admins and actors can read audit logs"
on public.audit_logs for select
to authenticated
using (
  public.current_profile_is_admin()
  or actor_profile_id = auth.uid()
  or (
    actor_player_id is not null
    and actor_player_id = public.current_linked_player_id()
  )
);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  row_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  row_data jsonb := coalesce(row_after, row_before);
  target_record_id text;
  target_tournament_id uuid;
  target_fixture_id uuid;
  target_segment_id uuid;
  target_hole_score_id uuid;
  target_player_id uuid;
  actor_player_id uuid;
  actor_display_name text;
  actor_is_admin boolean;
  changed_fields text[];
begin
  select profiles.linked_player_id, profiles.display_name, profiles.is_admin
  into actor_player_id, actor_display_name, actor_is_admin
  from public.profiles
  where profiles.id = auth.uid();

  target_record_id := row_data->>'id';

  if target_record_id is null then
    if tg_table_name = 'course_holes' then
      target_record_id := row_data->>'hole_number';
    elsif tg_table_name = 'fixture_players' then
      target_record_id := concat_ws(':', row_data->>'fixture_id', row_data->>'player_id');
    elsif tg_table_name = 'segment_players' then
      target_record_id := concat_ws(':', row_data->>'segment_id', row_data->>'player_id');
    end if;
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(key order by key)
    into changed_fields
    from (
      select key
      from jsonb_object_keys(coalesce(row_before, '{}'::jsonb) || coalesce(row_after, '{}'::jsonb)) as keys(key)
      where key <> 'updated_at'
        and row_before->key is distinct from row_after->key
    ) changed;
  end if;

  if tg_table_name = 'tournaments' then
    target_tournament_id := (row_data->>'id')::uuid;
  elsif tg_table_name = 'fixtures' then
    target_fixture_id := (row_data->>'id')::uuid;
    target_tournament_id := (row_data->>'tournament_id')::uuid;
  elsif tg_table_name = 'fixture_players' then
    target_fixture_id := (row_data->>'fixture_id')::uuid;
    target_player_id := (row_data->>'player_id')::uuid;

    select fixtures.tournament_id
    into target_tournament_id
    from public.fixtures
    where fixtures.id = target_fixture_id;
  elsif tg_table_name = 'segments' then
    target_segment_id := (row_data->>'id')::uuid;
    target_fixture_id := (row_data->>'fixture_id')::uuid;

    select fixtures.tournament_id
    into target_tournament_id
    from public.fixtures
    where fixtures.id = target_fixture_id;
  elsif tg_table_name = 'segment_players' then
    target_segment_id := (row_data->>'segment_id')::uuid;
    target_player_id := (row_data->>'player_id')::uuid;

    select segments.fixture_id, fixtures.tournament_id
    into target_fixture_id, target_tournament_id
    from public.segments
    join public.fixtures on fixtures.id = segments.fixture_id
    where segments.id = target_segment_id;
  elsif tg_table_name = 'hole_scores' then
    target_hole_score_id := (row_data->>'id')::uuid;
    target_segment_id := (row_data->>'segment_id')::uuid;

    select segments.fixture_id, fixtures.tournament_id
    into target_fixture_id, target_tournament_id
    from public.segments
    join public.fixtures on fixtures.id = segments.fixture_id
    where segments.id = target_segment_id;
  elsif tg_table_name = 'player_tournament_stats' then
    target_player_id := (row_data->>'player_id')::uuid;

    if row_data ? 'tournament_id' and row_data->>'tournament_id' is not null then
      target_tournament_id := (row_data->>'tournament_id')::uuid;
    end if;
  elsif tg_table_name = 'players' then
    target_player_id := (row_data->>'id')::uuid;
  elsif tg_table_name = 'profiles' then
    if row_data ? 'linked_player_id' and row_data->>'linked_player_id' is not null then
      target_player_id := (row_data->>'linked_player_id')::uuid;
    end if;
  elsif tg_table_name = 'tournament_progress' then
    target_tournament_id := (row_data->>'tournament_id')::uuid;
  end if;

  insert into public.audit_logs (
    action,
    table_name,
    record_id,
    tournament_id,
    fixture_id,
    segment_id,
    hole_score_id,
    player_id,
    actor_profile_id,
    actor_player_id,
    actor_display_name,
    actor_is_admin,
    changed_fields,
    row_before,
    row_after
  )
  values (
    lower(tg_op),
    tg_table_name,
    coalesce(target_record_id, 'unknown'),
    target_tournament_id,
    target_fixture_id,
    target_segment_id,
    target_hole_score_id,
    target_player_id,
    auth.uid(),
    actor_player_id,
    actor_display_name,
    actor_is_admin,
    changed_fields,
    row_before,
    row_after
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger audit_players_changes
after insert or update or delete on public.players
for each row execute function public.audit_row_change();

create trigger audit_profiles_changes
after insert or update or delete on public.profiles
for each row execute function public.audit_row_change();

create trigger audit_course_holes_changes
after insert or update or delete on public.course_holes
for each row execute function public.audit_row_change();

create trigger audit_tournaments_changes
after insert or update or delete on public.tournaments
for each row execute function public.audit_row_change();

create trigger audit_fixtures_changes
after insert or update or delete on public.fixtures
for each row execute function public.audit_row_change();

create trigger audit_fixture_players_changes
after insert or update or delete on public.fixture_players
for each row execute function public.audit_row_change();

create trigger audit_segments_changes
after insert or update or delete on public.segments
for each row execute function public.audit_row_change();

create trigger audit_segment_players_changes
after insert or update or delete on public.segment_players
for each row execute function public.audit_row_change();

create trigger audit_hole_scores_changes
after insert or update or delete on public.hole_scores
for each row execute function public.audit_row_change();

create trigger audit_player_tournament_stats_changes
after insert or update or delete on public.player_tournament_stats
for each row execute function public.audit_row_change();

create trigger audit_tournament_progress_changes
after insert or update or delete on public.tournament_progress
for each row execute function public.audit_row_change();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
exception
  when duplicate_object then null;
end $$;
