insert into public.course_holes (hole_number, stroke_index, par, yardage)
values
  (1, 3, 3, 157),
  (2, 7, 3, 124),
  (3, 13, 3, 65),
  (4, 15, 3, 106),
  (5, 11, 3, 93),
  (6, 5, 3, 96),
  (7, 17, 3, 80),
  (8, 1, 3, 130),
  (9, 9, 3, 98),
  (10, 6, 3, 137),
  (11, 2, 3, 127),
  (12, 14, 3, 103),
  (13, 18, 3, 80),
  (14, 8, 3, 116),
  (15, 10, 3, 103),
  (16, 16, 3, 113),
  (17, 4, 3, 77),
  (18, 12, 3, 90)
on conflict (hole_number) do update
set
  stroke_index = excluded.stroke_index,
  par = excluded.par,
  yardage = excluded.yardage;
