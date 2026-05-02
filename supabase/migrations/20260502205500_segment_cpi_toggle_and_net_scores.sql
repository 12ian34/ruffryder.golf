alter table public.segments
  add column if not exists cpi_enabled boolean not null default false;

update public.segments
set cpi_enabled = (kind = 'singles')
where cpi_enabled is false;

alter table public.hole_scores
  drop constraint if exists hole_scores_usa_net_score_check,
  drop constraint if exists hole_scores_europe_net_score_check;
