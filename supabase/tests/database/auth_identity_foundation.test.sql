begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Tables ---------------------------------------------------------------------

select has_table(
  'public',
  'profiles',
  'profiles table should exist'
);

select has_table(
  'public',
  'user_private_data',
  'user_private_data table should exist'
);

select has_table(
  'public',
  'account_states',
  'account_states table should exist'
);

select has_table(
  'public',
  'user_roles',
  'user_roles table should exist'
);

select has_table(
  'public',
  'match_preferences',
  'match_preferences table should exist'
);

select has_table(
  'public',
  'user_consents',
  'user_consents table should exist'
);

-- RLS ------------------------------------------------------------------------

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.profiles'::regclass
  ),
  'RLS should be enabled on profiles'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_private_data'::regclass
  ),
  'RLS should be enabled on user_private_data'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_roles'::regclass
  ),
  'RLS should be enabled on user_roles'
);

select ok(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.user_consents'::regclass
  ),
  'RLS should be enabled on user_consents'
);

-- Authorization helpers ------------------------------------------------------

select function_returns(
  'public',
  'has_role',
  array['public.app_role'],
  'boolean',
  'has_role should return boolean'
);

select is_definer(
  'public',
  'has_role',
  array['public.app_role'],
  'has_role should be SECURITY DEFINER'
);

-- Policy presence ------------------------------------------------------------

select policies_are(
  'public',
  'user_roles',
  array[
    'Users can view their own roles',
    'Admins can view all roles',
    'Admins can grant roles',
    'Admins can revoke roles'
  ],
  'user_roles should have only the intended RLS policies'
);

select policies_are(
  'public',
  'user_consents',
  array[
    'Users can view their own consent history',
    'Users can record their own consent decisions',
    'Admins can view consent history'
  ],
  'user_consents should have only the intended RLS policies'
);

-- Adult-age enforcement ------------------------------------------------------

select throws_ok(
  $$
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
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'underage-test@example.com',
      '',
      '{}'::jsonb,
      jsonb_build_object(
        'display_name', 'Underage Test',
        'birth_date', (current_date - interval '17 years')::date
      ),
      now(),
      now()
    );
  $$,
  'Users must be at least 18 years old',
  'underage signup should be rejected'
);

select * from finish();

rollback;
