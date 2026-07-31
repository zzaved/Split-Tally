-- ============================================================================
-- SPLIT TALLY: demo seed (BUILD.MD §9)
--
-- Ana is demo@splittally.app. Marina, Kenji and Júlia are real accounts;
-- Paulo and Sofia are managed friends Ana created. Password for every seeded
-- account: tallystick2026
--
-- The ledger is arithmetically closed: every settlement below is derived from
-- the expenses above it, so the balances the app computes are the balances
-- this file intends. Targets (§9):
--   Barcelona Trip  → Paulo owes Ana 50 EUR, Kenji owes Marina 40 EUR
--   Tally Scores    → Paulo 48, Kenji 67, Marina 91, Sofia 50
--
-- Run after migration.sql. Safe to re-run: the reset block clears prior seeds.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Reset
-- ---------------------------------------------------------------------------
delete from public.activity where user_id in (
  select id from public.profiles where email like '%@splittally.app' or is_managed
);
delete from public.claims;
delete from public.settlements;
delete from public.listings;
delete from public.expense_splits;
delete from public.expenses;
delete from public.group_members;
delete from public.groups;
delete from public.personal_transactions;
delete from public.statement_uploads;
delete from public.budgets;
delete from public.checkins;
delete from public.invites;
delete from public.friendships;
delete from public.profiles where is_managed;
delete from auth.users where email like '%@splittally.app';
delete from public.profiles where email like '%@splittally.app';

-- ---------------------------------------------------------------------------
-- 1. Accounts. The on_auth_user_created trigger writes the profile row; we
--    then fill in what the spoken onboarding would normally have written.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'demo@splittally.app',
   extensions.crypt('tallystick2026', extensions.gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Ana"}',
   '2026-03-02 09:00:00+00', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'marina@splittally.app',
   extensions.crypt('tallystick2026', extensions.gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Marina"}',
   '2026-03-04 09:00:00+00', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'kenji@splittally.app',
   extensions.crypt('tallystick2026', extensions.gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Kenji"}',
   '2026-03-06 09:00:00+00', now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'julia@splittally.app',
   extensions.crypt('tallystick2026', extensions.gen_salt('bf')), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Júlia"}',
   '2026-07-26 09:00:00+00', now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@splittally.app';

update public.profiles set
  name = 'Ana', username = 'ana', currency = 'USD', occupation = 'professional',
  dob = '2000-04-18', tally_score = 50, onboarded_at = '2026-03-02 09:12:00+00',
  context = '{"goal":"Stop losing track of what friends owe me","sharing":"An apartment with Marina and Sofia, plus trips with Paulo and Kenji"}'::jsonb,
  created_at = '2026-03-02 09:00:00+00'
where id = 'a0000000-0000-4000-8000-000000000001';

update public.profiles set
  name = 'Marina', username = 'marina', currency = 'USD', occupation = 'professional',
  tally_score = 91, onboarded_at = '2026-03-04 09:20:00+00',
  created_at = '2026-03-04 09:00:00+00'
where id = 'a0000000-0000-4000-8000-000000000002';

update public.profiles set
  name = 'Kenji', username = 'kenji', currency = 'EUR', occupation = 'professional',
  tally_score = 67, onboarded_at = '2026-03-06 09:30:00+00',
  created_at = '2026-03-06 09:00:00+00'
where id = 'a0000000-0000-4000-8000-000000000003';

update public.profiles set
  name = 'Júlia', username = 'julia', currency = 'EUR', occupation = 'student',
  tally_score = 50, onboarded_at = '2026-07-26 09:40:00+00',
  created_at = '2026-07-26 09:00:00+00'
where id = 'a0000000-0000-4000-8000-000000000004';

-- Managed friends: people Ana added by name, not on Split Tally yet.
insert into public.profiles (id, is_managed, created_by, name, email, currency, tally_score, created_at)
values
  ('b0000000-0000-4000-8000-000000000001', true, 'a0000000-0000-4000-8000-000000000001',
   'Paulo', 'paulo.ramos@example.com', 'EUR', 48, '2026-04-08 10:00:00+00'),
  ('b0000000-0000-4000-8000-000000000002', true, 'a0000000-0000-4000-8000-000000000001',
   'Sofia', null, 'USD', 50, '2026-07-01 10:00:00+00');

-- ---------------------------------------------------------------------------
-- 2. Friendships. Júlia's request is left pending so the accept / decline UI
--    has something to act on.
-- ---------------------------------------------------------------------------
insert into public.friendships (requester, addressee, status, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'accepted', '2026-03-04 10:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'accepted', '2026-03-06 10:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'accepted', '2026-04-08 10:05:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'accepted', '2026-07-01 10:05:00+00'),
  ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'accepted', '2026-04-09 10:00:00+00'),
  ('a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'accepted', '2026-07-01 11:00:00+00'),
  ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'pending', '2026-07-28 18:20:00+00');

insert into public.invites (code, inviter, created_at)
values ('ANA-TALLY', 'a0000000-0000-4000-8000-000000000001', '2026-07-05 12:00:00+00');

-- ---------------------------------------------------------------------------
-- 3. Groups
-- ---------------------------------------------------------------------------
insert into public.groups (id, name, currency, created_by, archived, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'Barcelona Trip', 'EUR', 'a0000000-0000-4000-8000-000000000001', false, '2026-06-04 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'Apartment 4B', 'USD', 'a0000000-0000-4000-8000-000000000001', false, '2026-04-28 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'Lisbon Weekend', 'EUR', 'a0000000-0000-4000-8000-000000000001', true, '2026-04-09 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'Kayak Day', 'EUR', 'a0000000-0000-4000-8000-000000000002', false, '2026-07-18 08:00:00+00');

insert into public.group_members (group_id, user_id, joined_at) values
  -- Barcelona Trip: Ana, Paulo, Marina, Kenji
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2026-06-04 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '2026-06-04 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', '2026-06-04 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', '2026-06-04 08:00:00+00'),
  -- Apartment 4B: Ana, Marina, and Sofia from July
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', '2026-04-28 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', '2026-04-28 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', '2026-07-01 08:00:00+00'),
  -- Lisbon Weekend (archived): Ana, Paulo, Marina, Kenji
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', '2026-04-09 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', '2026-04-09 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', '2026-04-09 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', '2026-04-09 08:00:00+00'),
  -- Kayak Day: Marina, Kenji, Sofia, Paulo (no Ana)
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', '2026-07-18 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', '2026-07-18 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', '2026-07-18 08:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', '2026-07-18 08:00:00+00');

-- ---------------------------------------------------------------------------
-- 4. Barcelona Trip: 10 expenses, EUR, four members, all split equally except
--    the flights, which were booked as one block and split by equal shares.
-- ---------------------------------------------------------------------------
insert into public.expenses (id, group_id, description, amount, currency, category, paid_by, created_by, created_via, expense_date, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Flights to Barcelona', 480.00, 'EUR', 'Travel',     'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-05', '2026-06-05 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Hotel Gòtic', 360.00, 'EUR', 'Travel',              'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'manual',    '2026-06-05', '2026-06-05 20:00:00+00'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Dinner at Can Pep', 124.00, 'EUR', 'Food & Drink',  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'voice',     '2026-06-06', '2026-06-06 22:10:00+00'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001', 'Museum tickets', 72.00, 'EUR', 'Entertainment',     'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'manual',    '2026-06-07', '2026-06-07 11:30:00+00'),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'Taxi from the airport', 56.00, 'EUR', 'Transport',  'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'voice',     '2026-06-05', '2026-06-05 14:20:00+00'),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'Groceries for the flat', 48.00, 'EUR', 'Groceries', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-08', '2026-06-08 10:05:00+00'),
  ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', 'Tapas night', 96.00, 'EUR', 'Food & Drink',         'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'voice',     '2026-06-09', '2026-06-09 23:40:00+00'),
  ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000001', 'Beach day rentals', 40.00, 'EUR', 'Entertainment',  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-10', '2026-06-10 12:00:00+00'),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000001', 'Sagrada Família', 68.00, 'EUR', 'Entertainment',    'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-11', '2026-06-11 10:15:00+00'),
  ('d0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000001', 'Last dinner', 152.00, 'EUR', 'Food & Drink',        'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'manual',    '2026-06-12', '2026-06-12 22:30:00+00');

-- Every Barcelona expense splits four ways.
insert into public.expense_splits (expense_id, user_id, share_amount)
select e.id, m.user_id, round(e.amount / 4.0, 2)
from public.expenses e
join public.group_members m on m.group_id = e.group_id
where e.group_id = 'c0000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- 5. Apartment 4B: Ana holds the lease and fronts everything; Marina settles
--    line by line within days, Sofia has only just moved in.
-- ---------------------------------------------------------------------------
insert into public.expenses (id, group_id, description, amount, currency, category, paid_by, created_by, created_via, expense_date, created_at) values
  ('d0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000002', 'Rent, May', 1600.00, 'USD', 'Housing',        'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-05-01', '2026-05-01 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000002', 'Utilities, May', 100.00, 'USD', 'Utilities',  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'statement', '2026-05-08', '2026-05-08 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000103', 'c0000000-0000-4000-8000-000000000002', 'Cleaning, May', 80.00, 'USD', 'Housing',      'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-05-15', '2026-05-15 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000104', 'c0000000-0000-4000-8000-000000000002', 'Rent, June', 1600.00, 'USD', 'Housing',       'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-01', '2026-06-01 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000105', 'c0000000-0000-4000-8000-000000000002', 'Utilities, June', 112.00, 'USD', 'Utilities', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'statement', '2026-06-08', '2026-06-08 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000106', 'c0000000-0000-4000-8000-000000000002', 'Internet, June', 60.00, 'USD', 'Utilities',   'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-06-12', '2026-06-12 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000107', 'c0000000-0000-4000-8000-000000000002', 'Rent, July', 2400.00, 'USD', 'Housing',       'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual',    '2026-07-05', '2026-07-05 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000108', 'c0000000-0000-4000-8000-000000000002', 'Utilities, July', 144.00, 'USD', 'Utilities', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'statement', '2026-07-09', '2026-07-09 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000109', 'c0000000-0000-4000-8000-000000000002', 'Sofa for the living room', 105.00, 'USD', 'Housing', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'manual', '2026-07-14', '2026-07-14 15:00:00+00');

-- May and June: Ana and Marina only.
insert into public.expense_splits (expense_id, user_id, share_amount)
select e.id, u.uid, round(e.amount / 2.0, 2)
from public.expenses e
cross join (values ('a0000000-0000-4000-8000-000000000001'::uuid), ('a0000000-0000-4000-8000-000000000002'::uuid)) as u(uid)
where e.id in (
  'd0000000-0000-4000-8000-000000000101','d0000000-0000-4000-8000-000000000102',
  'd0000000-0000-4000-8000-000000000103','d0000000-0000-4000-8000-000000000104',
  'd0000000-0000-4000-8000-000000000105','d0000000-0000-4000-8000-000000000106'
);

-- July onwards: Sofia is in the flat too.
insert into public.expense_splits (expense_id, user_id, share_amount)
select e.id, u.uid, round(e.amount / 3.0, 2)
from public.expenses e
cross join (values
  ('a0000000-0000-4000-8000-000000000001'::uuid),
  ('a0000000-0000-4000-8000-000000000002'::uuid),
  ('b0000000-0000-4000-8000-000000000002'::uuid)) as u(uid)
where e.id in (
  'd0000000-0000-4000-8000-000000000107','d0000000-0000-4000-8000-000000000108',
  'd0000000-0000-4000-8000-000000000109'
);

-- ---------------------------------------------------------------------------
-- 6. Lisbon Weekend (archived): Ana fronted the whole weekend. This is the
--    history that gives Marina, Kenji and Paulo their repayment averages.
-- ---------------------------------------------------------------------------
insert into public.expenses (id, group_id, description, amount, currency, category, paid_by, created_by, created_via, expense_date, created_at) values
  ('d0000000-0000-4000-8000-000000000201', 'c0000000-0000-4000-8000-000000000003', 'Guesthouse in Alfama', 320.00, 'EUR', 'Travel', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual', '2026-04-10', '2026-04-10 09:00:00+00'),
  ('d0000000-0000-4000-8000-000000000202', 'c0000000-0000-4000-8000-000000000003', 'Dinner in Bairro Alto', 160.00, 'EUR', 'Food & Drink', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual', '2026-04-11', '2026-04-11 22:00:00+00'),
  ('d0000000-0000-4000-8000-000000000203', 'c0000000-0000-4000-8000-000000000003', 'Train tickets', 96.00, 'EUR', 'Transport', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual', '2026-04-10', '2026-04-10 07:00:00+00'),
  ('d0000000-0000-4000-8000-000000000204', 'c0000000-0000-4000-8000-000000000003', 'Tram passes', 48.00, 'EUR', 'Transport', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'manual', '2026-04-12', '2026-04-12 09:00:00+00');

insert into public.expense_splits (expense_id, user_id, share_amount)
select e.id, m.user_id, round(e.amount / 4.0, 2)
from public.expenses e
join public.group_members m on m.group_id = e.group_id
where e.group_id = 'c0000000-0000-4000-8000-000000000003';

-- ---------------------------------------------------------------------------
-- 7. Kayak Day: recent and unsettled, which is what backs the open listings
--    on the Exchange.
-- ---------------------------------------------------------------------------
insert into public.expenses (id, group_id, description, amount, currency, category, paid_by, created_by, created_via, expense_date, created_at) values
  ('d0000000-0000-4000-8000-000000000301', 'c0000000-0000-4000-8000-000000000004', 'Kayak rental', 160.00, 'EUR', 'Entertainment', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'voice', '2026-07-18', '2026-07-18 11:00:00+00'),
  ('d0000000-0000-4000-8000-000000000302', 'c0000000-0000-4000-8000-000000000004', 'Lunch by the water', 96.00, 'EUR', 'Food & Drink', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'voice', '2026-07-18', '2026-07-18 14:30:00+00'),
  ('d0000000-0000-4000-8000-000000000303', 'c0000000-0000-4000-8000-000000000004', 'Sunscreen and drinks', 32.00, 'EUR', 'Shopping', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'manual', '2026-07-18', '2026-07-18 09:40:00+00');

insert into public.expense_splits (expense_id, user_id, share_amount)
select e.id, m.user_id, round(e.amount / 4.0, 2)
from public.expenses e
join public.group_members m on m.group_id = e.group_id
where e.group_id = 'c0000000-0000-4000-8000-000000000004';

-- ---------------------------------------------------------------------------
-- 8. Settlements
--
-- Barcelona nets before settling: Paulo owes Ana 132, Marina owes Ana 15,
-- Kenji owes Ana 123, Paulo owes Marina 117, Paulo owes Kenji 9,
-- Kenji owes Marina 108. The payments below leave exactly the two open
-- tallies §9 asks for, plus Paulo's 9 to Kenji, which is what drags his score.
-- ---------------------------------------------------------------------------
insert into public.settlements (group_id, from_user, to_user, amount, currency, kind, settled_at) values
  -- Barcelona Trip
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 15.00,  'EUR', 'settle', '2026-06-15 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 61.00,  'EUR', 'settle', '2026-06-18 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 62.00,  'EUR', 'settle', '2026-06-22 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 68.00,  'EUR', 'settle', '2026-06-24 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 82.00,  'EUR', 'settle', '2026-06-28 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 117.00, 'EUR', 'settle', '2026-07-02 10:00:00+00'),

  -- Apartment 4B: Marina clears every line within days of it landing.
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 800.00, 'USD', 'settle', '2026-05-03 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 50.00,  'USD', 'settle', '2026-05-11 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 40.00,  'USD', 'settle', '2026-05-18 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 800.00, 'USD', 'settle', '2026-06-04 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 56.00,  'USD', 'settle', '2026-06-11 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 30.00,  'USD', 'settle', '2026-06-15 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 800.00, 'USD', 'settle', '2026-07-08 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 48.00,  'USD', 'settle', '2026-07-12 10:00:00+00'),

  -- Lisbon Weekend: Marina within days, Kenji within a fortnight, Paulo late.
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 80.00, 'EUR', 'settle', '2026-04-12 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 24.00, 'EUR', 'settle', '2026-04-13 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 40.00, 'EUR', 'settle', '2026-04-14 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 12.00, 'EUR', 'settle', '2026-04-16 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 80.00, 'EUR', 'settle', '2026-04-22 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 24.00, 'EUR', 'settle', '2026-04-23 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 40.00, 'EUR', 'settle', '2026-04-25 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 12.00, 'EUR', 'settle', '2026-04-27 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 100.00, 'EUR', 'settle', '2026-04-28 10:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 56.00,  'EUR', 'settle', '2026-05-06 10:00:00+00');

-- ---------------------------------------------------------------------------
-- 9. The Exchange: seven open listings across three sellers, plus one sold so
--    the history and the claims ledger have something in them. Every listing
--    is backed by a real outstanding balance from the groups above.
-- ---------------------------------------------------------------------------
insert into public.listings (id, seller_id, debtor_id, group_id, currency, face_value, asking_price, ai_suggested_price, ai_rationale, status, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'EUR', 40.00, 32.00, 32.00,
   'Paulo settles in about 21 days and has two tallies open past a month: a 20% discount is fair.', 'open', '2026-07-22 09:00:00+00'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'EUR', 56.00, 53.75, 53.75,
   'Kenji has settled seven tallies in about 13 days each, so 4% is enough of a discount.', 'open', '2026-07-24 09:00:00+00'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'USD', 35.00, 30.00, 30.00,
   'Sofia has no repayment history yet, so 14% covers the unknown.', 'open', '2026-07-25 09:00:00+00'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000004', 'EUR', 32.00, 28.00, 28.00,
   'Sofia joined three weeks ago with nothing settled yet: 12.5% reflects that.', 'open', '2026-07-25 10:00:00+00'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'EUR', 24.00, 19.00, 19.00,
   'Two of Paulo''s tallies have been open more than a month, so this one prices at 21% off.', 'open', '2026-07-23 09:00:00+00'),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000004', 'EUR', 16.00, 14.00, 14.00,
   'A small tally against a new member: 12.5% is the going rate here.', 'open', '2026-07-26 09:00:00+00'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'USD', 200.00, 178.00, 178.00,
   'Sofia has not settled anything yet, but the tally is only three weeks old: 11% off.', 'open', '2026-07-27 09:00:00+00');

-- Sold: Sofia sold Paulo's 8 from the kayak day to Kenji.
insert into public.listings (id, seller_id, debtor_id, group_id, currency, face_value, asking_price, ai_suggested_price, ai_rationale, status, buyer_id, created_at, sold_at) values
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000004', 'EUR', 8.00, 7.00, 7.00,
   'Paulo is slow but the amount is small: 12.5% clears it today.', 'sold', 'a0000000-0000-4000-8000-000000000003',
   '2026-07-19 09:00:00+00', '2026-07-20 16:30:00+00');

-- The purchase: Kenji paid Sofia 7, and Paulo's 8 moved onto Kenji's book.
insert into public.settlements (group_id, from_user, to_user, amount, currency, kind, listing_id, settled_at) values
  (null, 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 7.00, 'EUR', 'exchange_purchase', 'e0000000-0000-4000-8000-000000000008', '2026-07-20 16:30:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 8.00, 'EUR', 'exchange_transfer', 'e0000000-0000-4000-8000-000000000008', '2026-07-20 16:30:00+00');

insert into public.claims (listing_id, debtor_id, holder_id, group_id, currency, amount, open, created_at) values
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
   'c0000000-0000-4000-8000-000000000004', 'EUR', 8.00, true, '2026-07-20 16:30:00+00');

-- ---------------------------------------------------------------------------
-- 10. Ana's personal finances: one parsed statement, twelve transactions,
--     two budgets with Food & Drink slightly over, and a past check-in.
-- ---------------------------------------------------------------------------
insert into public.statement_uploads (id, user_id, storage_path, parsed_at, created_at)
values ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000001/2026-07-28-statement.jpg',
        '2026-07-28 19:04:00+00', '2026-07-28 19:03:00+00');

insert into public.personal_transactions
  (user_id, date, description, amount, direction, category, source, dedup_hash, statement_upload_id, created_at)
select
  'a0000000-0000-4000-8000-000000000001'::uuid,
  t.d::date, t.descr, t.amt, t.dir, t.cat, 'statement',
  encode(extensions.digest(
    'a0000000-0000-4000-8000-000000000001|' || t.d || '|' || t.amt || '|' || lower(trim(t.descr)),
    'sha256'), 'hex'),
  'f0000000-0000-4000-8000-000000000001'::uuid,
  '2026-07-28 19:04:00+00'::timestamptz
from (values
  ('2026-07-02', 'Salary: Nadara Studio', 3200.00, 'in',  'Income'),
  ('2026-07-03', 'Mercadona',               86.40,  'out', 'Groceries'),
  ('2026-07-05', 'Bar Nou',                 96.00,  'out', 'Food & Drink'),
  ('2026-07-08', 'Metro card top-up',       20.00,  'out', 'Transport'),
  ('2026-07-10', 'Endesa electricity',      61.20,  'out', 'Utilities'),
  ('2026-07-12', 'Mercadona',               74.15,  'out', 'Groceries'),
  ('2026-07-14', 'Cafè Nòmada',             46.40,  'out', 'Food & Drink'),
  ('2026-07-16', 'Cinemes Verdi',           24.00,  'out', 'Entertainment'),
  ('2026-07-18', 'Farmàcia Clapés',         32.90,  'out', 'Health'),
  ('2026-07-20', 'Can Pep',                 174.00, 'out', 'Food & Drink'),
  ('2026-07-24', 'Mercadona',               84.30,  'out', 'Groceries'),
  ('2026-07-27', 'Bar Nou',                 118.20, 'out', 'Food & Drink')
) as t(d, descr, amt, dir, cat);

-- Food & Drink lands at 434.60 against a 400 budget: the vermilion state.
insert into public.budgets (user_id, category, monthly_amount, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'Food & Drink', 400.00, '2026-05-02 09:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'Groceries',    300.00, '2026-05-02 09:00:00+00');

insert into public.checkins (user_id, summary, created_at) values
  ('a0000000-0000-4000-8000-000000000001',
   'You spent 62 in cash on markets and coffee this week, and the flat''s July utilities are still sitting on Sofia. Paulo''s 50 from Barcelona is now over a month old, so the Exchange is worth a look.',
   '2026-07-22 20:15:00+00');

-- ---------------------------------------------------------------------------
-- 11. Activity: Ana's feed, covering every type the app can emit.
-- ---------------------------------------------------------------------------
insert into public.activity (user_id, actor_id, type, payload, created_at) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'expense_added',
   '{"description":"Last dinner","amount":152,"currency":"EUR","group":"Barcelona Trip","via":"manual"}'::jsonb,
   '2026-06-12 22:30:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'settlement',
   '{"from":"Paulo","to":"you","amount":82,"currency":"EUR","group":"Barcelona Trip"}'::jsonb,
   '2026-06-28 10:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'simplify_applied',
   '{"group":"Barcelona Trip","before":6,"after":2}'::jsonb,
   '2026-06-29 09:10:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'settlement',
   '{"from":"Marina","to":"you","amount":800,"currency":"USD","group":"Apartment 4B"}'::jsonb,
   '2026-07-08 10:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'expense_added',
   '{"description":"Utilities, July","amount":144,"currency":"USD","group":"Apartment 4B","via":"statement"}'::jsonb,
   '2026-07-09 09:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'expense_removed',
   '{"description":"Duplicate taxi","amount":18,"currency":"EUR","group":"Barcelona Trip"}'::jsonb,
   '2026-07-11 08:20:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'friend_accepted',
   '{"name":"Sofia","managed":true}'::jsonb,
   '2026-07-01 10:05:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'listing_sold',
   '{"seller":"Sofia","buyer":"Kenji","debtor":"Paulo","face_value":8,"price":7,"currency":"EUR"}'::jsonb,
   '2026-07-20 16:30:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'checkin_done',
   '{"summary":"Cash spending logged, Sofia chased, Paulo flagged for the Exchange."}'::jsonb,
   '2026-07-22 20:15:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'listing_created',
   '{"debtor":"Sofia","face_value":200,"asking_price":178,"currency":"USD"}'::jsonb,
   '2026-07-27 09:00:00+00'),
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'friend_request',
   '{"name":"Júlia","username":"julia"}'::jsonb,
   '2026-07-28 18:20:00+00');
