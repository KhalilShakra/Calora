-- ForgeFuel — Supabase / PostgreSQL foundation
-- Enable cloud save: create a free Supabase project, run this file in the SQL editor,
-- enable Email auth, then paste NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
-- into .env.local (see .env.example). Auth users live in auth.users; public.profiles
-- is the app identity. New users get a profile + streak rows via handle_new_user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.sex as enum ('male', 'female', 'other');
create type public.unit_system as enum ('metric', 'imperial');
create type public.activity_level as enum (
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active'
);
create type public.goal_type as enum ('lose', 'gain', 'maintain', 'recomp');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.log_source as enum (
  'manual',
  'quick_add',
  'barcode',
  'ai_vision',
  'recipe',
  'custom_food'
);
create type public.food_origin as enum (
  'open_food_facts',
  'usda',
  'ai',
  'custom',
  'recipe'
);
create type public.streak_kind as enum (
  'daily_log',
  'calorie_target',
  'macro_target',
  'water',
  'weigh_in'
);
create type public.reward_event as enum (
  'hit_calories',
  'hit_macros',
  'hit_water',
  'logged_meal',
  'streak_bonus',
  'weekly_weigh_in',
  'achievement',
  'level_up',
  'redemption',
  'adjustment'
);
create type public.perk_type as enum (
  'theme',
  'premium_days',
  'discount_code',
  'feature_unlock'
);
create type public.redemption_status as enum (
  'pending',
  'fulfilled',
  'cancelled'
);
create type public.tier as enum ('bronze', 'silver', 'gold', 'platinum');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  date_of_birth date,
  sex public.sex,
  height_cm numeric(5, 1),
  current_weight_kg numeric(5, 2),
  activity_level public.activity_level default 'moderate',
  units public.unit_system default 'metric',
  locale text default 'en',
  timezone text default 'UTC',
  theme_id text default 'ember-emerald',
  xp_total integer not null default 0,
  level integer not null default 1,
  tier public.tier not null default 'bronze',
  points_balance integer not null default 0,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_xp_nonneg check (xp_total >= 0),
  constraint profiles_points_nonneg check (points_balance >= 0),
  constraint profiles_level_pos check (level >= 1)
);

-- ---------------------------------------------------------------------------
-- Goals (active goal + history)
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  goal_type public.goal_type not null,
  target_weight_kg numeric(5, 2),
  weekly_rate_kg numeric(4, 2),
  bmr_kcal integer not null,
  tdee_kcal integer not null,
  calorie_target integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  fiber_g integer,
  water_ml_target integer not null default 2500,
  calculation_method text not null default 'mifflin_st_jeor',
  is_active boolean not null default true,
  started_on date not null default (timezone('utc', now()))::date,
  ended_on date,
  created_at timestamptz not null default now(),
  constraint goals_calories_pos check (calorie_target > 0),
  constraint goals_macros_nonneg check (
    protein_g >= 0 and carbs_g >= 0 and fat_g >= 0
  )
);

create unique index goals_one_active_per_user
  on public.goals (user_id)
  where is_active;

create index goals_user_idx on public.goals (user_id, started_on desc);

-- ---------------------------------------------------------------------------
-- Body metrics (weigh-ins)
-- ---------------------------------------------------------------------------
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recorded_at timestamptz not null default now(),
  local_date date not null,
  weight_kg numeric(5, 2) not null,
  body_fat_pct numeric(4, 1),
  waist_cm numeric(5, 1),
  source text default 'manual',
  created_at timestamptz not null default now()
);

create index body_metrics_user_date_idx
  on public.body_metrics (user_id, local_date desc);

-- ---------------------------------------------------------------------------
-- Custom foods (user-owned catalog)
-- ---------------------------------------------------------------------------
create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  brand text,
  serving_label text default '1 serving',
  serving_size_g numeric(8, 2) not null default 100,
  calories numeric(8, 2) not null,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  fiber_g numeric(8, 2),
  sugar_g numeric(8, 2),
  sodium_mg numeric(8, 2),
  micros jsonb not null default '{}'::jsonb,
  photo_url text,
  barcode text,
  origin public.food_origin not null default 'custom',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_foods_user_name_idx
  on public.custom_foods (user_id, lower(name));
create index custom_foods_barcode_idx
  on public.custom_foods (barcode)
  where barcode is not null;

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  servings numeric(6, 2) not null default 1,
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_servings_pos check (servings > 0)
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  custom_food_id uuid references public.custom_foods (id) on delete set null,
  name text not null,
  grams numeric(8, 2) not null,
  calories numeric(8, 2) not null default 0,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  sort_order integer not null default 0
);

create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id, sort_order);

-- ---------------------------------------------------------------------------
-- Food logs (meal header + line items)
-- ---------------------------------------------------------------------------
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  logged_at timestamptz not null default now(),
  meal_type public.meal_type not null default 'snack',
  source public.log_source not null default 'manual',
  notes text,
  photo_url text,
  client_id uuid,
  created_at timestamptz not null default now()
);

create unique index food_logs_client_id_uidx
  on public.food_logs (user_id, client_id)
  where client_id is not null;

create index food_logs_user_date_idx
  on public.food_logs (user_id, local_date desc, logged_at desc);

create table public.food_log_items (
  id uuid primary key default gen_random_uuid(),
  food_log_id uuid not null references public.food_logs (id) on delete cascade,
  custom_food_id uuid references public.custom_foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  name text not null,
  grams numeric(8, 2) not null,
  calories numeric(8, 2) not null,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  fiber_g numeric(8, 2),
  micros jsonb not null default '{}'::jsonb,
  barcode text,
  confidence numeric(4, 3),
  ai_raw jsonb,
  sort_order integer not null default 0
);

create index food_log_items_log_idx
  on public.food_log_items (food_log_id, sort_order);

-- ---------------------------------------------------------------------------
-- Water
-- ---------------------------------------------------------------------------
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  amount_ml integer not null,
  logged_at timestamptz not null default now(),
  client_id uuid,
  constraint water_logs_amount_pos check (amount_ml > 0)
);

create index water_logs_user_date_idx
  on public.water_logs (user_id, local_date);

-- ---------------------------------------------------------------------------
-- Daily rollup (targets snapshot + hits — reward engine input)
-- ---------------------------------------------------------------------------
create table public.daily_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_date date not null,
  calorie_target integer not null,
  protein_target integer not null,
  carbs_target integer not null,
  fat_target integer not null,
  water_target_ml integer not null,
  calories numeric(8, 2) not null default 0,
  protein_g numeric(8, 2) not null default 0,
  carbs_g numeric(8, 2) not null default 0,
  fat_g numeric(8, 2) not null default 0,
  water_ml integer not null default 0,
  hit_calories boolean not null default false,
  hit_macros boolean not null default false,
  hit_water boolean not null default false,
  xp_earned integer not null default 0,
  points_earned integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

-- ---------------------------------------------------------------------------
-- Streaks
-- ---------------------------------------------------------------------------
create table public.streaks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.streak_kind not null,
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_qualified_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind),
  constraint streaks_counts_nonneg check (
    current_count >= 0 and longest_count >= 0
  )
);

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  xp_reward integer not null default 0,
  points_reward integer not null default 0,
  tier public.tier not null default 'bronze',
  icon text,
  criteria jsonb not null default '{}'::jsonb
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- Rewards ledger + future monetization catalog
-- ---------------------------------------------------------------------------
create table public.rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.reward_event not null,
  points_delta integer not null,
  xp_delta integer not null default 0,
  source_table text,
  source_id uuid,
  idempotency_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index rewards_ledger_idem_uidx
  on public.rewards_ledger (user_id, idempotency_key)
  where idempotency_key is not null;

create index rewards_ledger_user_idx
  on public.rewards_ledger (user_id, created_at desc);

create table public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  title text not null,
  description text,
  cost_points integer not null,
  perk_type public.perk_type not null,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reward_catalog_cost_pos check (cost_points > 0)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  catalog_id uuid not null references public.reward_catalog (id),
  ledger_id uuid references public.rewards_ledger (id),
  status public.redemption_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index redemptions_user_idx on public.redemptions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger custom_foods_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  insert into public.streaks (user_id, kind)
  values
    (new.id, 'daily_log'),
    (new.id, 'calorie_target'),
    (new.id, 'macro_target'),
    (new.id, 'water'),
    (new.id, 'weigh_in');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- TDEE helper (Mifflin-St Jeor). Client can also compute; stored on goals.
-- ---------------------------------------------------------------------------
create or replace function public.compute_tdee(
  p_sex public.sex,
  p_weight_kg numeric,
  p_height_cm numeric,
  p_age integer,
  p_activity public.activity_level,
  p_goal public.goal_type
)
returns table (bmr integer, tdee integer, calorie_target integer)
language plpgsql
immutable
as $$
declare
  v_bmr numeric;
  v_mult numeric;
  v_tdee numeric;
  v_adj numeric;
begin
  v_bmr := (10 * p_weight_kg) + (6.25 * p_height_cm) - (5 * p_age);
  if p_sex = 'female' then
    v_bmr := v_bmr - 161;
  else
    v_bmr := v_bmr + 5;
  end if;

  v_mult := case p_activity
    when 'sedentary' then 1.2
    when 'light' then 1.375
    when 'moderate' then 1.55
    when 'active' then 1.725
    when 'very_active' then 1.9
  end;

  v_tdee := v_bmr * v_mult;
  v_adj := case p_goal
    when 'lose' then -500
    when 'gain' then 350
    when 'recomp' then -150
    else 0
  end;

  bmr := round(v_bmr);
  tdee := round(v_tdee);
  calorie_target := greatest(1200, round(v_tdee + v_adj));
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Append-only ledger: keep profile XP / points in sync
-- ---------------------------------------------------------------------------
create or replace function public.apply_ledger_balances()
returns trigger
language plpgsql
as $$
begin
  update public.profiles
  set
    xp_total = xp_total + new.xp_delta,
    points_balance = points_balance + new.points_delta,
    level = greatest(1, 1 + ((xp_total + new.xp_delta) / 500)),
    tier = case
      when 1 + ((xp_total + new.xp_delta) / 500) >= 40 then 'platinum'::public.tier
      when 1 + ((xp_total + new.xp_delta) / 500) >= 25 then 'gold'::public.tier
      when 1 + ((xp_total + new.xp_delta) / 500) >= 10 then 'silver'::public.tier
      else 'bronze'::public.tier
    end
  where id = new.user_id;
  return new;
end;
$$;

create trigger rewards_ledger_apply
  after insert on public.rewards_ledger
  for each row execute function public.apply_ledger_balances();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.body_metrics enable row level security;
alter table public.custom_foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.water_logs enable row level security;
alter table public.daily_progress enable row level security;
alter table public.streaks enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.rewards_ledger enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.redemptions enable row level security;

create policy profiles_own on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy goals_own on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy body_metrics_own on public.body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy custom_foods_own on public.custom_foods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy recipes_own on public.recipes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy recipe_ingredients_own on public.recipe_ingredients
  for all using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy food_logs_own on public.food_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy food_log_items_own on public.food_log_items
  for all using (
    exists (
      select 1 from public.food_logs l
      where l.id = food_log_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.food_logs l
      where l.id = food_log_id and l.user_id = auth.uid()
    )
  );

create policy water_logs_own on public.water_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy daily_progress_own on public.daily_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy streaks_own on public.streaks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy achievements_read on public.achievements
  for select using (true);

create policy user_achievements_own on public.user_achievements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy rewards_ledger_own_read on public.rewards_ledger
  for select using (user_id = auth.uid());

create policy rewards_ledger_own_insert on public.rewards_ledger
  for insert with check (user_id = auth.uid());

create policy reward_catalog_read_active on public.reward_catalog
  for select using (is_active = true);

create policy redemptions_own on public.redemptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed achievements (catalog is global; RLS allows public read)
-- ---------------------------------------------------------------------------
insert into public.achievements (code, title, description, xp_reward, points_reward, tier) values
  ('first_log', 'First Forge', 'Log your first meal.', 50, 25, 'bronze'),
  ('streak_3', 'Kindling', 'Hit a 3-day logging streak.', 75, 40, 'bronze'),
  ('streak_7', 'Week on Fire', 'Maintain a 7-day logging streak.', 150, 80, 'silver'),
  ('streak_30', 'Unbreakable', 'Maintain a 30-day logging streak.', 400, 200, 'gold'),
  ('water_7', 'Hydrated', 'Hit your water target 7 days in a row.', 120, 60, 'silver'),
  ('weigh_in_4', 'Honest Scale', 'Complete 4 weekly weigh-ins.', 100, 50, 'silver'),
  ('macro_perfect', 'Split Shot', 'Hit all three macros in one day.', 80, 40, 'bronze'),
  ('level_10', 'Silver Smith', 'Reach level 10.', 0, 100, 'silver');
