begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Schema ---------------------------------------------------------------------

select has_table(
  'public',
  'profile_match_attributes',
  'profile_match_attributes table should exist'
);

select has_table(
  'public',
  'interests',
  'interests table should exist'
);

select has_table(
  'public',
  'user_interests',
  'user_interests table should exist'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.profile_match_attributes'::regclass
  ),
  'RLS should be enabled on profile_match_attributes'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.interests'::regclass
  ),
  'RLS should be enabled on interests'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_interests'::regclass
  ),
  'RLS should be enabled on user_interests'
);

select ok(
  (select count(*) from public.interests) >= 20,
  'initial interest taxonomy should be seeded'
);

-- Provisioning ---------------------------------------------------------------

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'onboarding-test@example.com',
  '',
  '{}'::jsonb,
  jsonb_build_object(
    'display_name', 'Onboarding Test',
    'birth_date', '1995-01-01'
  ),
  now(),
  now()
);

select ok(
  exists (
    select 1
    from public.profile_match_attributes
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  'signup should provision match attributes'
);

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  true
);

select throws_ok(
  $$ select public.complete_onboarding(); $$,
  'City and country are required',
  'incomplete onboarding should not activate an account'
);

-- Complete required onboarding data ------------------------------------------

update public.profiles
set
  city = 'Helsinki',
  country_code = 'FI'
where id = '11111111-1111-1111-1111-111111111111';

update public.profile_match_attributes
set
  gender_identity = 'man',
  social_style = 'small_groups',
  activity_level = 'moderate'
where user_id = '11111111-1111-1111-1111-111111111111';

update public.match_preferences
set goals = array[
  'social_events'::public.connection_goal
]
where user_id = '11111111-1111-1111-1111-111111111111';

insert into public.user_interests (
  user_id,
  interest_id
)
select
  '11111111-1111-1111-1111-111111111111',
  id
from public.interests
order by slug
limit 3;

insert into public.user_consents (
  user_id,
  consent,
  policy_version,
  granted
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'terms_of_service',
    '1.0',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'privacy_policy',
    '1.0',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'ai_matching',
    '1.0',
    true
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'ai_profile_processing',
    '1.0',
    true
  );

select public.complete_onboarding();

select is(
  (
    select status::text
    from public.account_states
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  'active',
  'valid onboarding should activate the account'
);

select ok(
  (
    select onboarding_completed_at is not null
    from public.profiles
    where id = '11111111-1111-1111-1111-111111111111'
  ),
  'valid onboarding should record completion time'
);

select ok(
  public.has_active_consent(
    'ai_matching'::public.consent_type
  ),
  'latest granted AI matching consent should be active'
);

select is(
  (
    select count(*)::integer
    from public.user_interests
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  3,
  'onboarding test user should have three interests'
);

select * from finish();

rollback;
