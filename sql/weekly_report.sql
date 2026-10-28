-- Weekly hours by worker and site for the Monday-to-Sunday week starting at p_week.
-- Not security definer, so Row Level Security applies to the caller.
create or replace function public.weekly_report(p_week date)
returns table (worker text, site text, total_hours numeric)
language sql stable
as $$
  select
    w.full_name,
    s.name,
    sum(a.hours)
  from public.log_attendance a
  join public.daily_logs d on d.id = a.daily_log_id
  join public.workers w    on w.id = a.worker_id
  join public.sites s      on s.id = d.site_id
  where d.log_date >= p_week
    and d.log_date <  p_week + 7
  group by w.full_name, s.name
  order by s.name, w.full_name;
$$;
