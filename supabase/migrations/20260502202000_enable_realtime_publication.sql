do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table
  public.players,
  public.profiles,
  public.tournaments,
  public.fixtures,
  public.fixture_players,
  public.segments,
  public.segment_players,
  public.hole_scores,
  public.legacy_tournaments;
