-- Replace with actual emails
-- :va_email, :lead_email, :manager_email
with
  va as (select id from public.profiles where email = 'vjsandu@hotmail.com'),
  lead as (select id from public.profiles where email = 'sandeshparjanya@mindsfire.com'),
  mgr as (select id from public.profiles where email = 'vjsandu@gmail.com')
insert into public.va_reporting (va_profile_id, team_lead_profile_id, manager_profile_id)
select
  (select id from va),
  (select id from lead),      -- may be null if not found
  (select id from mgr)        -- may be null if not found
where exists (select 1 from va)  -- only insert when VA exists
on conflict (va_profile_id) do update
set team_lead_profile_id = excluded.team_lead_profile_id,
    manager_profile_id   = excluded.manager_profile_id,
    updated_at           = now();

-- Verify
select r.*, pva.email as va_email, ptl.email as team_lead_email, pm.email as manager_email
from public.va_reporting r
left join public.profiles pva on pva.id = r.va_profile_id
left join public.profiles ptl on ptl.id = r.team_lead_profile_id
left join public.profiles pm  on pm.id  = r.manager_profile_id
where pva.email = 'vjsandu@hotmail.com';