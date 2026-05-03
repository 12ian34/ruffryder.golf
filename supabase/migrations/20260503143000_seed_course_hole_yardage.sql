insert into public.course_holes (hole_number, stroke_index, par, yardage)
values
  (1, 3, 4, 157),
  (2, 7, 4, 124),
  (3, 13, 4, 65),
  (4, 15, 4, 106),
  (5, 11, 4, 93),
  (6, 5, 4, 96),
  (7, 17, 4, 80),
  (8, 1, 4, 130),
  (9, 9, 4, 98),
  (10, 6, 4, 137),
  (11, 2, 4, 127),
  (12, 14, 4, 103),
  (13, 18, 4, 80),
  (14, 8, 4, 116),
  (15, 10, 4, 103),
  (16, 16, 4, 113),
  (17, 4, 4, 77),
  (18, 12, 4, 90)
on conflict (hole_number) do update
set
  stroke_index = excluded.stroke_index,
  par = excluded.par,
  yardage = excluded.yardage;
