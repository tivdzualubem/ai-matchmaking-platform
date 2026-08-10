-- ============================================================================
-- Profile onboarding and matchmaking-input foundation
-- ============================================================================

create type public.social_style as enum (
  'one_on_one',
  'small_groups',
  'large_groups',
  'mixed'
);

create type public.activity_level as enum (
  'low',
  'moderate',
  'high'
);

-- --------------------------------------------------------------------------
-- Structured matchmaking attributes
--
-- These fields are intentionally separate from public.profiles.
-- The matchmaking system may use them, but clients should not automatically
-- receive another user's full matching-input record.
-- --------------------------------------------------------------------------

create table public.profile_match_attributes (
  user_id uuid primary key references auth.users(id) on delete cascade,

  gender_identity text
    check (
      gender_identity is null
      or char_length(trim(gender_identity)) between 1 and 80
    ),

  pronouns text
    check (
      pronouns is null
      or char_length(trim(pronouns)) <= 80
    ),

  languages text[] not null default array['en']::text[]
    check (
      cardinality(languages) between 1 and 10
    ),

  social_style public.social_style,

  activity_level public.activity_level,

  values_tags text[] not null default '{}'::text[]
    check (
      cardinality(values_tags) <= 10
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profile_match_attributes_set_updated_at
before update on public.profile_match_attributes
for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- Interest taxonomy
--
-- A normalized catalog avoids storing uncontrolled duplicated strings such as
-- "AI", "Artificial Intelligence", and "artificial-intelligence" as separate
-- interests.
-- --------------------------------------------------------------------------

create table public.interests (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  name text not null unique
    check (char_length(trim(name)) between 2 and 80),

  category text not null
    check (char_length(trim(category)) between 2 and 80),

  is_active boolean not null default true,

  created_at timestamptz not null default now()
);

create table public.user_interests (
  user_id uuid not null references auth.users(id) on delete cascade,

  interest_id uuid not null references public.interests(id) on delete restrict,

  importance smallint not null default 3
    check (importance between 1 and 5),

  created_at timestamptz not null default now(),

  primary key (user_id, interest_id)
);

create index user_interests_interest_idx
  on public.user_interests (interest_id, user_id);

-- --------------------------------------------------------------------------
-- Initial global English-first taxonomy.
-- This is reference data, not user-generated content.
-- --------------------------------------------------------------------------

insert into public.interests (slug, name, category)
values
  ('art', 'Art', 'creative'),
  ('books', 'Books', 'creative'),
  ('cinema', 'Cinema', 'creative'),
  ('photography', 'Photography', 'creative'),
  ('music', 'Music', 'creative'),
  ('writing', 'Writing', 'creative'),

  ('ai', 'Artificial Intelligence', 'technology'),
  ('programming', 'Programming', 'technology'),
  ('gaming', 'Gaming', 'technology'),
  ('startups', 'Startups', 'technology'),

  ('fitness', 'Fitness', 'wellness'),
  ('running', 'Running', 'wellness'),
  ('yoga', 'Yoga', 'wellness'),
  ('meditation', 'Meditation', 'wellness'),

  ('hiking', 'Hiking', 'outdoors'),
  ('cycling', 'Cycling', 'outdoors'),
  ('travel', 'Travel', 'outdoors'),
  ('nature', 'Nature', 'outdoors'),

  ('cooking', 'Cooking', 'food'),
  ('restaurants', 'Restaurants', 'food'),
  ('coffee', 'Coffee', 'food'),

  ('live-music', 'Live Music', 'social'),
  ('festivals', 'Festivals', 'social'),
  ('board-games', 'Board Games', 'social'),
  ('volunteering', 'Volunteering', 'social'),
  ('networking', 'Networking', 'social'),

  ('science', 'Science', 'learning'),
  ('history', 'History', 'learning'),
  ('languages', 'Languages', 'learning'),
  ('personal-growth', 'Personal Growth', 'learning');

-- --------------------------------------------------------------------------
-- Existing users receive the new onboarding record.
-- --------------------------------------------------------------------------

insert into public.profile_match_attributes (user_id)
select id
from public.profiles
on conflict (user_id) do nothing;

-- --------------------------------------------------------------------------
-- Future users receive it automatically during signup provisioning.
-- --------------------------------------------------------------------------

create or replace function public.handle_new_user_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_match_attributes (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_onboarding
after insert on auth.users
for each row execute function public.handle_new_user_onboarding();

-- ============================================================================
-- Consent helper
--
-- Uses the latest recorded decision for a consent category.
-- ============================================================================
create or replace function public.has_active_consent(
  required_consent public.consent_type
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select uc.granted
      from public.user_consents as uc
      where uc.user_id = auth.uid()
        and uc.consent = required_consent
      order by uc.recorded_at desc, uc.id desc
      limit 1
    ),
    false
  );
$$;

-- ============================================================================
-- Atomic onboarding completion
--
-- The client cannot directly promote account_states.status to active.
-- This function validates the required domain data first, then performs the
-- privileged state transition.
-- ============================================================================

create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_goals public.connection_goal[];
  current_gender_preferences text[];
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = current_user_id
      and p.city is not null
      and trim(p.city) <> ''
      and p.country_code is not null
  ) then
    raise exception 'City and country are required';
  end if;

  if not exists (
    select 1
    from public.profile_match_attributes as pma
    where pma.user_id = current_user_id
      and pma.gender_identity is not null
      and trim(pma.gender_identity) <> ''
  ) then
    raise exception 'Gender identity is required';
  end if;

  select mp.goals, mp.interested_in_genders
  into current_goals, current_gender_preferences
  from public.match_preferences as mp
  where mp.user_id = current_user_id;

  if current_goals is null
     or cardinality(current_goals) = 0 then
    raise exception 'At least one connection goal is required';
  end if;

  if current_goals && array[
       'long_term_dating'::public.connection_goal,
       'casual_dating'::public.connection_goal
     ]
     and (
       current_gender_preferences is null
       or cardinality(current_gender_preferences) = 0
     ) then
    raise exception 'Dating preferences require at least one gender preference';
  end if;

  if (
    select count(*)
    from public.user_interests as ui
    where ui.user_id = current_user_id
  ) < 3 then
    raise exception 'Select at least three interests';
  end if;

  if not public.has_active_consent(
    'terms_of_service'::public.consent_type
  ) then
    raise exception 'Terms of service acceptance is required';
  end if;

  if not public.has_active_consent(
    'privacy_policy'::public.consent_type
  ) then
    raise exception 'Privacy policy acknowledgement is required';
  end if;

  if not public.has_active_consent(
    'ai_matching'::public.consent_type
  ) then
    raise exception 'AI matching consent is required';
  end if;

  if not public.has_active_consent(
    'ai_profile_processing'::public.consent_type
  ) then
    raise exception 'AI profile processing consent is required';
  end if;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = current_user_id;

  update public.account_states
  set
    status = 'active'::public.account_status,
    suspension_reason = null,
    suspended_at = null
  where user_id = current_user_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profile_match_attributes enable row level security;
alter table public.interests enable row level security;
alter table public.user_interests enable row level security;

create policy "Users can view their own match attributes"
on public.profile_match_attributes
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own match attributes"
on public.profile_match_attributes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can view match attributes"
on public.profile_match_attributes
for select
to authenticated
using (public.has_role('admin'::public.app_role));

create policy "Authenticated users can view active interests"
on public.interests
for select
to authenticated
using (is_active = true);

create policy "Users can view their own interests"
on public.user_interests
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can add their own interests"
on public.user_interests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update their own interests"
on public.user_interests
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can remove their own interests"
on public.user_interests
for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins can view user interests"
on public.user_interests
for select
to authenticated
using (public.has_role('admin'::public.app_role));

-- ============================================================================
-- API privileges
-- ============================================================================

grant select, update
on public.profile_match_attributes
to authenticated;

grant select
on public.interests
to authenticated;

grant select, insert, update, delete
on public.user_interests
to authenticated;

grant execute
on function public.has_active_consent(public.consent_type)
to authenticated;

grant execute
on function public.complete_onboarding()
to authenticated;

revoke execute
on function public.handle_new_user_onboarding()
from public, anon, authenticated;
