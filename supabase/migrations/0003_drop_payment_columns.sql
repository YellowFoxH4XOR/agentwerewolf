-- 0003 — drop vestigial payment columns from users
--
-- Commit 20a794a removed all payment/billing code (Stripe, plan tiers,
-- credits, pricing page, set_plan/PLAN_LIMITS). These three columns on
-- public.users were left in place at the time but are now inert — no code
-- reads or writes them. Dropping them aligns the schema with reality.
--
-- Idempotent via `drop column if exists`. Any existing values are lost
-- (acceptable — they were not load-bearing).

alter table public.users
  drop column if exists plan,
  drop column if exists stripe_customer_id,
  drop column if exists credits_balance;
