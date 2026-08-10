-- ============================================================================
-- Authentication and identity foundation
-- ============================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- Domain types
-- --------------------------------------------------------------------------

create type public.app_role as enum (
  'member',
  'verified_host',
  'admin'
);

create type public.account_status as enum (
  'onboarding',
  'active',
  'suspended',
  'deleted'
);

create type public.connection_goal as enum (
  'long_term_dating',
  'casual_dating',
  'friendship',
  'social_events'
);

create type public.consent_type as enum (
  'terms_of_service',
  'privacy_policy',
  'ai_matching',
  'ai_profile_processing',
  'marketing'
);

-- --------------------------------------------------------------------------
-- Public profile data
-- Safe fields that may eventually be visible to other eligible members.
-- --------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  display_name text not null
    check (char_length(trim(display_name)) between 2 and 80),

  bio text
    check (bio is null or char_length(bio) <= 1000),

  city text
    check (city is null or char_length(city) <= 120),

  country_code text
    check (
      country_code is null
      or country_code ~ '^[A-Z]{2}$'
    ),

  avatar_path text,

  is_discoverable boolean not null default false,

  onboarding_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Sensitive account data
-- Never expose this as part of public matchmaking profile queries.
-- --------------------------------------------------------------------------

create table public.user_private_data (
  user_id uuid primary key references auth.users(id) on delete cascade,

  birth_date date not null,

  locale text not null default 'en',
  time_zone text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- Account lifecycle
-- Separated from profiles so users cannot edit suspension/deletion state.
-- --------------------------------------------------------------------------

create table public.account_states (
  user_id uuid primary key references auth.users(id) on delete cascade,

  status public.account_status not null default 'onboarding',

  suspension_reason text,
  suspended_at timestamptz,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (status = 'suspended' and suspended_at is not null)
    or status <> 'suspended'
  ),

  check (
    (status = 'deleted' and deleted_at is not null)
    or status <> 'deleted'
  )
);

-- --------------------------------------------------------------------------
-- Roles
-- Roles are intentionally separate from profiles.
-- A user must never be able to promote themselves to admin/verified host.
-- --------------------------------------------------------------------------

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,

  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),

  primary key (user_id, role)
);

-- --------------------------------------------------------------------------
-- Matchmaking preferences
-- Exact coordinates are intentionally not stored here.
-- --------------------------------------------------------------------------

create table public.match_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,

  goals public.connection_goal[] not null default '{}',

  interested_in_genders text[] not null default '{}',

  min_age smallint not null default 18
    check (min_age between 18 and 99),

  max_age smallint not null default 99
    check (max_age between 18 and 99),

  max_distance_km integer
    check (
      max_distance_km is null
      or max_distance_km between 1 and 10000
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (min_age <= max_age)
);

-- --------------------------------------------------------------------------
-- Consent ledger
-- Append-only by normal application users so consent history is preserved.
-- --------------------------------------------------------------------------

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  consent public.consent_type not null,

  policy_version text not null
    check (char_length(trim(policy_version)) between 1 and 50),

  granted boolean not null,

  recorded_at timestamptz not null default now()
);

create index user_consents_user_consent_recorded_idx
  on public.user_consents (user_id, consent, recorded_at desc);

create index profiles_discovery_idx
  on public.profiles (is_discoverable)
  where is_discoverable = true;

create index account_states_status_idx
  on public.account_states (status);

-- ============================================================================
-- Shared trigger helpers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_private_data_set_updated_at
before update on public.user_private_data
for each row execute function public.set_updated_at();

create trigger account_states_set_updated_at
before update on public.account_states
for each row execute function public.set_updated_at();

create trigger match_preferences_set_updated_at
before update on public.match_preferences
for each row execute function public.set_updated_at();

-- ============================================================================
-- Authorization helpers
-- SECURITY DEFINER prevents recursive RLS evaluation on user_roles.
-- ============================================================================

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.is_active_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_states
    where user_id = target_user_id
      and status = 'active'
  );
$$;

-- ============================================================================
-- 18+ enforcement
-- ============================================================================

create or replace function public.enforce_adult_birth_date()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'Users must be at least 18 years old';
  end if;

  if tg_op = 'UPDATE'
     and old.birth_date is distinct from new.birth_date
     and not public.has_role('admin'::public.app_role) then
    raise exception 'Birth date cannot be changed by the user';
  end if;

  return new;
end;
$$;

create trigger user_private_data_enforce_adult
before insert or update on public.user_private_data
for each row execute function public.enforce_adult_birth_date();

-- ============================================================================
-- New-auth-user provisioning
-- Birth date is required in signup metadata and validated at database level.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  declared_birth_date date;
  requested_display_name text;
begin
  if new.raw_user_meta_data ->> 'birth_date' is null then
    raise exception 'birth_date is required for registration';
  end if;

  begin
    declared_birth_date :=
      (new.raw_user_meta_data ->> 'birth_date')::date;
  exception
    when others then
      raise exception 'birth_date must be a valid ISO date';
  end;

  if declared_birth_date >
     (current_date - interval '18 years')::date then
    raise exception 'Users must be at least 18 years old';
  end if;

  requested_display_name :=
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  if requested_display_name is null then
    requested_display_name :=
      coalesce(
        nullif(split_part(new.email, '@', 1), ''),
        'Member'
      );
  end if;

  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    requested_display_name
  );

  insert into public.user_private_data (
    user_id,
    birth_date
  )
  values (
    new.id,
    declared_birth_date
  );

  insert into public.account_states (
    user_id
  )
  values (
    new.id
  );

  insert into public.match_preferences (
    user_id
  )
  values (
    new.id
  );

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    new.id,
    'member'::public.app_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_private_data enable row level security;
alter table public.account_states enable row level security;
alter table public.user_roles enable row level security;
alter table public.match_preferences enable row level security;
alter table public.user_consents enable row level security;

-- Profiles ---------------------------------------------------------------

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can view discoverable active profiles"
on public.profiles
for select
to authenticated
using (
  id <> auth.uid()
  and is_discoverable = true
  and public.is_active_user(id)
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.has_role('admin'::public.app_role))
with check (public.has_role('admin'::public.app_role));

-- Private data -----------------------------------------------------------

create policy "Users can view their own private data"
on public.user_private_data
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own private data"
on public.user_private_data
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can view private user data"
on public.user_private_data
for select
to authenticated
using (public.has_role('admin'::public.app_role));

-- Account state ----------------------------------------------------------

create policy "Users can view their own account state"
on public.account_states
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can view account states"
on public.account_states
for select
to authenticated
using (public.has_role('admin'::public.app_role));

create policy "Admins can update account states"
on public.account_states
for update
to authenticated
using (public.has_role('admin'::public.app_role))
with check (public.has_role('admin'::public.app_role));

-- Roles -----------------------------------------------------------------

create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role('admin'::public.app_role));

create policy "Admins can grant roles"
on public.user_roles
for insert
to authenticated
with check (public.has_role('admin'::public.app_role));

create policy "Admins can revoke roles"
on public.user_roles
for delete
to authenticated
using (public.has_role('admin'::public.app_role));

-- Match preferences ------------------------------------------------------

create policy "Users can view their own match preferences"
on public.match_preferences
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own match preferences"
on public.match_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Admins can view match preferences"
on public.match_preferences
for select
to authenticated
using (public.has_role('admin'::public.app_role));

-- Consent ledger ---------------------------------------------------------

create policy "Users can view their own consent history"
on public.user_consents
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can record their own consent decisions"
on public.user_consents
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Admins can view consent history"
on public.user_consents
for select
to authenticated
using (public.has_role('admin'::public.app_role));

-- ============================================================================
-- API privileges
-- RLS remains the final authorization layer.
-- ============================================================================

grant select, update
on public.profiles
to authenticated;

grant select, update
on public.user_private_data
to authenticated;

grant select, update
on public.account_states
to authenticated;

grant select, insert, delete
on public.user_roles
to authenticated;

grant select, update
on public.match_preferences
to authenticated;

grant select, insert
on public.user_consents
to authenticated;

grant execute
on function public.has_role(public.app_role)
to authenticated;

grant execute
on function public.is_active_user(uuid)
to authenticated;

revoke execute
on function public.handle_new_user()
from public, anon, authenticated;

revoke execute
on function public.set_updated_at()
from public, anon, authenticated;

revoke execute
on function public.enforce_adult_birth_date()
from public, anon, authenticated;
