do $$
begin
  create type public.ai_newsroom_artifact_kind as enum (
    'highlights_commentary',
    'moment_of_round',
    'cheese_detector',
    'rivalry_watch',
    'captains_briefing',
    'post_round_report'
  );
exception
  when duplicate_object then null;
end $$;

create table public.ai_newsroom_artifacts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  kind public.ai_newsroom_artifact_kind not null,
  title text not null,
  body_markdown text not null,
  source_hash text not null,
  source_hole_score_count integer not null default 0 check (source_hole_score_count >= 0),
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, kind)
);

create index ai_newsroom_artifacts_tournament_kind_idx
on public.ai_newsroom_artifacts(tournament_id, kind);

create trigger set_ai_newsroom_artifacts_updated_at
before update on public.ai_newsroom_artifacts
for each row execute function public.set_updated_at();

alter table public.ai_newsroom_artifacts enable row level security;

grant select, insert, update on public.ai_newsroom_artifacts to authenticated;

create policy "Authenticated users can read AI newsroom artifacts"
on public.ai_newsroom_artifacts for select
to authenticated
using (true);

create policy "Authenticated users can write AI newsroom artifacts"
on public.ai_newsroom_artifacts for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update AI newsroom artifacts"
on public.ai_newsroom_artifacts for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

alter publication supabase_realtime add table public.ai_newsroom_artifacts;
do $$
begin
  create type public.ai_newsroom_artifact_kind as enum (
    'highlights_commentary',
    'moment_of_round',
    'cheese_detector',
    'rivalry_watch',
    'captains_briefing',
    'post_round_report'
  );
exception
  when duplicate_object then null;
end $$;

create table public.ai_newsroom_artifacts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  kind public.ai_newsroom_artifact_kind not null,
  title text not null,
  body_markdown text not null,
  source_hash text not null,
  source_hole_score_count integer not null default 0 check (source_hole_score_count >= 0),
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, kind)
);

create index ai_newsroom_artifacts_tournament_kind_idx
on public.ai_newsroom_artifacts(tournament_id, kind);

create trigger set_ai_newsroom_artifacts_updated_at
before update on public.ai_newsroom_artifacts
for each row execute function public.set_updated_at();

alter table public.ai_newsroom_artifacts enable row level security;

grant select, insert, update on public.ai_newsroom_artifacts to authenticated;

create policy "Authenticated users can read AI newsroom artifacts"
on public.ai_newsroom_artifacts for select
to authenticated
using (true);

create policy "Authenticated users can write AI newsroom artifacts"
on public.ai_newsroom_artifacts for insert
to authenticated
with check (auth.uid() is not null);

create policy "Authenticated users can update AI newsroom artifacts"
on public.ai_newsroom_artifacts for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

alter publication supabase_realtime add table public.ai_newsroom_artifacts;
