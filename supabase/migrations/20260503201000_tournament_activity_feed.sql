create or replace function public.get_tournament_activity(
  p_tournament_id uuid,
  p_limit integer default 1000
)
returns table (
  id uuid,
  action text,
  table_name text,
  record_id text,
  tournament_id uuid,
  fixture_id uuid,
  segment_id uuid,
  hole_score_id uuid,
  player_id uuid,
  occurred_at timestamptz,
  actor_display_name text,
  actor_is_admin boolean,
  changed_fields text[],
  hole_number integer,
  usa_score integer,
  europe_score integer,
  outcome text,
  fixture_name text,
  segment_name text,
  segment_kind text,
  player_name text,
  tournament_is_complete boolean,
  cpi_enabled boolean
)
language sql
security definer
set search_path = public
as $$
  with bounded_logs as (
    select
      audit_logs.*,
      coalesce(audit_logs.row_after, audit_logs.row_before) as row_data
    from public.audit_logs
    where audit_logs.tournament_id = p_tournament_id
      and audit_logs.table_name in (
        'tournaments',
        'fixtures',
        'fixture_players',
        'segments',
        'segment_players',
        'hole_scores',
        'players',
        'profiles',
        'course_holes',
        'player_tournament_stats',
        'tournament_progress'
      )
    order by audit_logs.created_at desc
    limit least(greatest(coalesce(p_limit, 1000), 1), 1000)
  )
  select
    bounded_logs.id,
    bounded_logs.action,
    bounded_logs.table_name,
    bounded_logs.record_id,
    bounded_logs.tournament_id,
    bounded_logs.fixture_id,
    bounded_logs.segment_id,
    bounded_logs.hole_score_id,
    bounded_logs.player_id,
    bounded_logs.created_at as occurred_at,
    bounded_logs.actor_display_name,
    bounded_logs.actor_is_admin,
    bounded_logs.changed_fields,
    case
      when bounded_logs.table_name = 'hole_scores' and bounded_logs.row_data ? 'hole_number'
        then (bounded_logs.row_data->>'hole_number')::integer
      when bounded_logs.table_name = 'course_holes' and bounded_logs.row_data ? 'hole_number'
        then (bounded_logs.row_data->>'hole_number')::integer
      else null
    end as hole_number,
    case
      when bounded_logs.table_name = 'hole_scores' and bounded_logs.row_data ? 'usa_score'
        then (bounded_logs.row_data->>'usa_score')::integer
      else null
    end as usa_score,
    case
      when bounded_logs.table_name = 'hole_scores' and bounded_logs.row_data ? 'europe_score'
        then (bounded_logs.row_data->>'europe_score')::integer
      else null
    end as europe_score,
    case
      when bounded_logs.table_name = 'hole_scores' then bounded_logs.row_data->>'outcome'
      else null
    end as outcome,
    coalesce(
      fixtures.name,
      case when bounded_logs.table_name = 'fixtures' then bounded_logs.row_data->>'name' end
    ) as fixture_name,
    coalesce(
      segments.name,
      case when bounded_logs.table_name = 'segments' then bounded_logs.row_data->>'name' end
    ) as segment_name,
    coalesce(
      segments.kind::text,
      case when bounded_logs.table_name = 'segments' then bounded_logs.row_data->>'kind' end
    ) as segment_kind,
    coalesce(
      players.name,
      case when bounded_logs.table_name = 'players' then bounded_logs.row_data->>'name' end
    ) as player_name,
    case
      when bounded_logs.table_name = 'tournaments' and bounded_logs.row_data ? 'is_complete'
        then (bounded_logs.row_data->>'is_complete')::boolean
      else null
    end as tournament_is_complete,
    case
      when bounded_logs.table_name = 'segments' and bounded_logs.row_data ? 'cpi_enabled'
        then (bounded_logs.row_data->>'cpi_enabled')::boolean
      else null
    end as cpi_enabled
  from bounded_logs
  left join public.fixtures on fixtures.id = bounded_logs.fixture_id
  left join public.segments on segments.id = bounded_logs.segment_id
  left join public.players on players.id = bounded_logs.player_id;
$$;

revoke all on function public.get_tournament_activity(uuid, integer) from public;
grant execute on function public.get_tournament_activity(uuid, integer) to authenticated;
