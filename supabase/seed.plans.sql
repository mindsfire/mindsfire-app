-- Seed plans (idempotent): Inserts or updates 7 plans from marketing site
-- Safe to commit; contains no secrets. Run in Supabase SQL Editor (DEV/PROD).

insert into public.plans (name, monthly_price, quota_hours, features)
values
  (
    'Lite', 65, 5,
    jsonb_build_object(
      'description', 'First‑time users, solo founders, or families testing VA support.',
      'hourly_rate', 13,
      'additional_hourly_rate', 14,
      'rollover_percent', 0,
      'billing', 'monthly'
    )
  ),
  (
    'Starter', 120, 10,
    jsonb_build_object(
      'description', 'Busy professionals or small households needing steady help each week.',
      'hourly_rate', 12,
      'additional_hourly_rate', 13,
      'rollover_percent', 0,
      'billing', 'monthly'
    )
  ),
  (
    'Essential', 200, 20,
    jsonb_build_object(
      'description', 'Founders and families with regular coordination across home/work.',
      'hourly_rate', 10,
      'additional_hourly_rate', 11,
      'rollover_percent', 20,
      'billing', 'monthly',
      'most_popular', true
    )
  ),
  (
    'Pro', 360, 40,
    jsonb_build_object(
      'description', 'Operators, executives, or multi‑calendar families with frequent travel/events.',
      'hourly_rate', 9,
      'additional_hourly_rate', 10,
      'rollover_percent', 20,
      'billing', 'monthly'
    )
  ),
  (
    'Pro Max', 640, 80,
    jsonb_build_object(
      'description', 'Teams or households with high coordination needs and frequent parallel tasks.',
      'hourly_rate', 8,
      'additional_hourly_rate', 9,
      'rollover_percent', 25,
      'billing', 'monthly'
    )
  ),
  (
    'Scale', 900, 120,
    jsonb_build_object(
      'description', 'High‑growth founders or large households needing near‑daily support and coverage.',
      'hourly_rate', 7.5,
      'additional_hourly_rate', 8,
      'rollover_percent', 25,
      'billing', 'monthly'
    )
  ),
  (
    'Task Based Plan', 0, 0,
    jsonb_build_object(
      'description', 'One‑off or sporadic needs without a monthly commitment.',
      'hourly_rate', 17,
      'billing', 'hourly',
      'dedicated_or_fractional', true,
      'custom_tasks', true,
      'technical_support', true,
      'planning_and_scheduling', true,
      'most_popular', true
    )
  )
on conflict (name) do update
set
  monthly_price = excluded.monthly_price,
  quota_hours   = excluded.quota_hours,
  features      = excluded.features;
