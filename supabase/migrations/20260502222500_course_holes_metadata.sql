create table public.course_holes (
  hole_number integer primary key check (hole_number between 1 and 18),
  stroke_index integer not null check (stroke_index between 1 and 18),
  par integer check (par is null or par between 3 and 6),
  yardage integer check (yardage is null or yardage > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.course_holes (hole_number, stroke_index)
values
  (1, 3),
  (2, 7),
  (3, 13),
  (4, 15),
  (5, 11),
  (6, 5),
  (7, 17),
  (8, 1),
  (9, 9),
  (10, 6),
  (11, 2),
  (12, 14),
  (13, 18),
  (14, 8),
  (15, 10),
  (16, 16),
  (17, 4),
  (18, 12)
on conflict (hole_number) do update
set stroke_index = excluded.stroke_index;

create trigger set_course_holes_updated_at
before update on public.course_holes
for each row execute function public.set_updated_at();

alter table public.course_holes enable row level security;

grant select on public.course_holes to authenticated;
grant insert, update, delete on public.course_holes to authenticated;

create policy "Authenticated users can read course holes"
on public.course_holes for select
to authenticated
using (true);

create policy "Admins can manage course holes"
on public.course_holes for all
to authenticated
using (public.current_profile_is_admin())
with check (public.current_profile_is_admin());
