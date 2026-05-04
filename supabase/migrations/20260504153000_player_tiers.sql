alter table public.players
add column if not exists tier smallint not null default 2,
add constraint players_tier_check check (tier between 1 and 3);

with player_metrics as (
  select
    players.id,
    coalesce(
      avg(player_tournament_stats.singles_average) filter (where player_tournament_stats.singles_average is not null),
      avg(player_tournament_stats.cpi_after) filter (where player_tournament_stats.cpi_after is not null),
      players.current_cpi
    ) as performance_metric
  from public.players
  left join public.player_tournament_stats
    on player_tournament_stats.player_id = players.id
  group by players.id, players.current_cpi
),
ranked_players as (
  select
    id,
    ntile(3) over (order by performance_metric asc) as tier
  from player_metrics
  where performance_metric is not null
)
update public.players
set tier = ranked_players.tier
from ranked_players
where players.id = ranked_players.id;
