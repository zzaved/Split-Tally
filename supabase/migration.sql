-- ============================================================================
-- SPLIT TALLY — schema, indexes, row level security, helper functions.
-- Reference: BUILD.MD §6.
--
-- Apply to a fresh Supabase project. Idempotent enough to re-run on a clean
-- database; it is not a down-migration.
-- ============================================================================

-- Supabase ships pgcrypto in the `extensions` schema; crypt/digest are
-- referenced schema-qualified in seed.sql for that reason.
create extension if not exists "pgcrypto" with schema extensions;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- profiles: real users AND managed friends (people not on Split Tally yet).
-- For a real user, id equals auth.uid(). There is deliberately no foreign key
-- to auth.users, because managed profiles have no auth row.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  is_managed boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  name text not null,
  username text unique,
  email text,
  dob date,
  occupation text,
  currency text not null default 'USD',
  voice_id text,
  context jsonb not null default '{}'::jsonb,
  tally_score int not null default 50 check (tally_score between 0 and 100),
  onboarded_at timestamptz,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);

create table if not exists public.invites (
  code text primary key,
  inviter uuid not null references public.profiles (id) on delete cascade,
  used_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'USD',
  created_by uuid not null references public.profiles (id) on delete restrict,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  category text,
  paid_by uuid not null references public.profiles (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_via text not null check (created_via in ('voice', 'manual', 'statement')),
  expense_date date not null default current_date,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_splits (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  share_amount numeric(12, 2) not null,
  primary key (expense_id, user_id)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  debtor_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  currency text not null default 'USD',
  face_value numeric(12, 2) not null check (face_value > 0),
  asking_price numeric(12, 2) not null check (asking_price > 0),
  ai_suggested_price numeric(12, 2),
  ai_rationale text,
  status text not null default 'open' check (status in ('open', 'sold', 'withdrawn')),
  buyer_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  sold_at timestamptz,
  check (seller_id <> debtor_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups (id) on delete set null,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  kind text not null default 'settle'
    check (kind in ('settle', 'exchange_purchase', 'exchange_transfer')),
  listing_id uuid references public.listings (id) on delete set null,
  settled_at timestamptz not null default now(),
  check (from_user <> to_user)
);

-- claims: who currently holds a debtor's obligation after a sale.
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  debtor_id uuid not null references public.profiles (id) on delete cascade,
  holder_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  currency text not null default 'USD',
  amount numeric(12, 2) not null check (amount > 0),
  open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.statement_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  parsed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  direction text not null check (direction in ('in', 'out')),
  category text,
  source text not null check (source in ('statement', 'manual', 'voice')),
  dedup_hash text not null,
  statement_upload_id uuid references public.statement_uploads (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, dedup_hash)
);

create table if not exists public.budgets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  monthly_amount numeric(12, 2) not null check (monthly_amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade, -- whose feed
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null check (
    type in (
      'expense_added',
      'expense_removed',
      'settlement',
      'friend_request',
      'friend_accepted',
      'listing_created',
      'listing_sold',
      'checkin_done',
      'simplify_applied'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES — every foreign key, plus (user_id, created_at) for the feeds.
-- ============================================================================

create index if not exists profiles_created_by_idx on public.profiles (created_by);
create index if not exists profiles_email_idx on public.profiles (lower(email));

create index if not exists friendships_requester_idx on public.friendships (requester);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

create index if not exists invites_inviter_idx on public.invites (inviter);
create index if not exists invites_used_by_idx on public.invites (used_by);

create index if not exists groups_created_by_idx on public.groups (created_by);

create index if not exists group_members_user_idx on public.group_members (user_id);

create index if not exists expenses_group_idx on public.expenses (group_id, expense_date desc);
create index if not exists expenses_paid_by_idx on public.expenses (paid_by);
create index if not exists expenses_created_by_idx on public.expenses (created_by);

create index if not exists expense_splits_user_idx on public.expense_splits (user_id);

create index if not exists settlements_group_idx on public.settlements (group_id);
create index if not exists settlements_from_idx on public.settlements (from_user);
create index if not exists settlements_to_idx on public.settlements (to_user);
create index if not exists settlements_listing_idx on public.settlements (listing_id);

create index if not exists listings_seller_idx on public.listings (seller_id);
create index if not exists listings_debtor_idx on public.listings (debtor_id);
create index if not exists listings_buyer_idx on public.listings (buyer_id);
create index if not exists listings_group_idx on public.listings (group_id);
create index if not exists listings_status_idx on public.listings (status, created_at desc);

create index if not exists claims_listing_idx on public.claims (listing_id);
create index if not exists claims_debtor_idx on public.claims (debtor_id);
create index if not exists claims_holder_idx on public.claims (holder_id);
create index if not exists claims_group_idx on public.claims (group_id);

create index if not exists statement_uploads_user_idx on public.statement_uploads (user_id, created_at desc);

create index if not exists personal_transactions_user_date_idx
  on public.personal_transactions (user_id, date desc);
create index if not exists personal_transactions_upload_idx
  on public.personal_transactions (statement_upload_id);

create index if not exists checkins_user_idx on public.checkins (user_id, created_at desc);

create index if not exists activity_user_created_idx on public.activity (user_id, created_at desc);
create index if not exists activity_actor_idx on public.activity (actor_id);

-- ============================================================================
-- 3. HELPER FUNCTIONS
--
-- All of these are SECURITY DEFINER so that a policy can ask "is this row in
-- one of my groups?" without re-entering the policy it is being evaluated for.
-- Without that, group_members reading group_members recurses forever.
-- ============================================================================

-- Every profile id that is "me": my own, plus the managed friends I created.
create or replace function public.my_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid()
  where auth.uid() is not null
  union
  select p.id from public.profiles p
  where p.is_managed and p.created_by = auth.uid();
$$;

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

-- True when the expense sits in a group I belong to.
create or replace function public.can_see_expense(eid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    join public.group_members gm on gm.group_id = e.group_id
    where e.id = eid and gm.user_id = uid
  );
$$;

-- True when the two profiles are connected, in either direction.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a))
  );
$$;

-- ============================================================================
-- 4. AUTH TRIGGER — a profile row for every new account.
--
-- Signup collects only email and password; the spoken onboarding fills in the
-- rest (BUILD.MD §5.1), so the profile starts almost empty on purpose.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. CLAIM PATH — when someone signs up with an email we already hold as a
-- managed friend, move their history onto the real account and drop the stub
-- (BUILD.MD §5.4). Runs best-effort right after signup.
-- ============================================================================

create or replace function public.claim_managed_profile(new_user uuid, signup_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  stub_id uuid;
begin
  if signup_email is null or signup_email = '' then
    return null;
  end if;

  select p.id into stub_id
  from public.profiles p
  where p.is_managed
    and lower(p.email) = lower(signup_email)
    and p.id <> new_user
  order by p.created_at
  limit 1;

  if stub_id is null then
    return null;
  end if;

  -- Group memberships. A conflict means the real account is already in that
  -- group, in which case the stub's row simply disappears.
  update public.group_members gm
  set user_id = new_user
  where gm.user_id = stub_id
    and not exists (
      select 1 from public.group_members other
      where other.group_id = gm.group_id and other.user_id = new_user
    );
  delete from public.group_members where user_id = stub_id;

  -- Ledger rows.
  update public.expenses set paid_by = new_user where paid_by = stub_id;
  update public.expenses set created_by = new_user where created_by = stub_id;

  update public.expense_splits es
  set user_id = new_user
  where es.user_id = stub_id
    and not exists (
      select 1 from public.expense_splits other
      where other.expense_id = es.expense_id and other.user_id = new_user
    );
  delete from public.expense_splits where user_id = stub_id;

  update public.settlements set from_user = new_user where from_user = stub_id;
  update public.settlements set to_user = new_user where to_user = stub_id;

  update public.listings set seller_id = new_user where seller_id = stub_id;
  update public.listings set debtor_id = new_user where debtor_id = stub_id;
  update public.listings set buyer_id = new_user where buyer_id = stub_id;

  update public.claims set debtor_id = new_user where debtor_id = stub_id;
  update public.claims set holder_id = new_user where holder_id = stub_id;

  update public.groups set created_by = new_user where created_by = stub_id;
  update public.activity set user_id = new_user where user_id = stub_id;
  update public.activity set actor_id = new_user where actor_id = stub_id;
  update public.profiles set created_by = new_user where created_by = stub_id;

  -- Friendships: rewrite, then drop anything that became a self-link or a
  -- duplicate of a connection the real account already has.
  update public.friendships f
  set requester = new_user
  where f.requester = stub_id
    and f.addressee <> new_user
    and not exists (
      select 1 from public.friendships o
      where o.requester = new_user and o.addressee = f.addressee
    );
  update public.friendships f
  set addressee = new_user
  where f.addressee = stub_id
    and f.requester <> new_user
    and not exists (
      select 1 from public.friendships o
      where o.addressee = new_user and o.requester = f.requester
    );
  delete from public.friendships where requester = stub_id or addressee = stub_id;

  -- Carry over the score the stub earned, then remove it.
  update public.profiles
  set tally_score = (select tally_score from public.profiles where id = stub_id)
  where id = new_user;

  delete from public.profiles where id = stub_id;

  return stub_id;
end;
$$;

-- ============================================================================
-- 5b. FUNCTION GRANTS
--
-- Policies evaluate these helpers as the querying role, so `authenticated`
-- must keep EXECUTE. Nothing else should reach them through /rest/v1/rpc.
-- ============================================================================

revoke execute on function public.my_profile_ids() from public, anon;
grant execute on function public.my_profile_ids() to authenticated;

revoke execute on function public.is_group_member(uuid, uuid) from public, anon;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

revoke execute on function public.can_see_expense(uuid, uuid) from public, anon;
grant execute on function public.can_see_expense(uuid, uuid) to authenticated;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- Never called from the client: one runs from the auth trigger, the other from
-- a server action on the service-role client.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.claim_managed_profile(uuid, text) from public, anon, authenticated;

-- ============================================================================
-- 6. ROW LEVEL SECURITY
--
-- Pattern: you read and write rows you own; group data is readable by group
-- members; managed profiles are writable by whoever created them; listings are
-- readable by every signed-in user because the Exchange is a public market.
--
-- Four flows deliberately run through server actions on the service-role
-- client instead of a policy, each with an explicit ownership check in code.
-- They are listed in README.md: invite lookup by code, the Exchange purchase
-- transaction, cross-feed activity fan-out, and the managed-profile claim.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.invites enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;
alter table public.listings enable row level security;
alter table public.claims enable row level security;
alter table public.statement_uploads enable row level security;
alter table public.personal_transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.checkins enable row level security;
alter table public.activity enable row level security;

-- --- profiles ---------------------------------------------------------------
-- Readable by any signed-in user: friend search works by email or username,
-- and the Exchange has to name the debtor behind every listing.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    or (is_managed and created_by = auth.uid())
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or (is_managed and created_by = auth.uid()))
  with check (id = auth.uid() or (is_managed and created_by = auth.uid()));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (is_managed and created_by = auth.uid());

-- --- friendships ------------------------------------------------------------
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using (
    requester in (select public.my_profile_ids())
    or addressee in (select public.my_profile_ids())
  );

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (requester in (select public.my_profile_ids()));

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update to authenticated
  using (
    requester in (select public.my_profile_ids())
    or addressee in (select public.my_profile_ids())
  );

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete to authenticated
  using (
    requester in (select public.my_profile_ids())
    or addressee in (select public.my_profile_ids())
  );

-- --- invites ----------------------------------------------------------------
-- Redeeming a code happens before the visitor has a session, so /join/[code]
-- resolves it through a server action on the service-role client.
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (inviter = auth.uid());

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated
  with check (inviter = auth.uid());

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete to authenticated
  using (inviter = auth.uid());

-- --- groups -----------------------------------------------------------------
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated
  using (created_by = auth.uid() or public.is_group_member(id, auth.uid()));

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- --- group_members ----------------------------------------------------------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members
  for insert to authenticated
  with check (
    public.is_group_member(group_id, auth.uid())
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated
  using (
    public.is_group_member(group_id, auth.uid())
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- --- expenses ---------------------------------------------------------------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    public.is_group_member(group_id, auth.uid())
    and created_by = auth.uid()
  );

-- Deleting an expense is a soft delete, so it comes through as an update.
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses
  for update to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id, auth.uid()))
  with check (created_by = auth.uid());

-- --- expense_splits ---------------------------------------------------------
drop policy if exists expense_splits_select on public.expense_splits;
create policy expense_splits_select on public.expense_splits
  for select to authenticated
  using (public.can_see_expense(expense_id, auth.uid()));

drop policy if exists expense_splits_insert on public.expense_splits;
create policy expense_splits_insert on public.expense_splits
  for insert to authenticated
  with check (public.can_see_expense(expense_id, auth.uid()));

drop policy if exists expense_splits_update on public.expense_splits;
create policy expense_splits_update on public.expense_splits
  for update to authenticated
  using (public.can_see_expense(expense_id, auth.uid()))
  with check (public.can_see_expense(expense_id, auth.uid()));

drop policy if exists expense_splits_delete on public.expense_splits;
create policy expense_splits_delete on public.expense_splits
  for delete to authenticated
  using (public.can_see_expense(expense_id, auth.uid()));

-- --- settlements ------------------------------------------------------------
drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements
  for select to authenticated
  using (
    from_user in (select public.my_profile_ids())
    or to_user in (select public.my_profile_ids())
    or (group_id is not null and public.is_group_member(group_id, auth.uid()))
  );

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements
  for insert to authenticated
  with check (
    from_user in (select public.my_profile_ids())
    or to_user in (select public.my_profile_ids())
    or (group_id is not null and public.is_group_member(group_id, auth.uid()))
  );

-- --- listings ---------------------------------------------------------------
-- The Exchange is a market: every signed-in user browses every listing.
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings
  for select to authenticated
  using (true);

drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings
  for insert to authenticated
  with check (seller_id = auth.uid());

-- Only the seller edits a listing from the client. A purchase touches three
-- tables at once and runs as a server action on the service-role client.
drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- --- claims -----------------------------------------------------------------
drop policy if exists claims_select on public.claims;
create policy claims_select on public.claims
  for select to authenticated
  using (
    debtor_id in (select public.my_profile_ids())
    or holder_id in (select public.my_profile_ids())
  );

-- --- statement_uploads ------------------------------------------------------
drop policy if exists statement_uploads_all on public.statement_uploads;
create policy statement_uploads_all on public.statement_uploads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- personal_transactions --------------------------------------------------
drop policy if exists personal_transactions_all on public.personal_transactions;
create policy personal_transactions_all on public.personal_transactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- budgets ----------------------------------------------------------------
drop policy if exists budgets_all on public.budgets;
create policy budgets_all on public.budgets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- checkins ---------------------------------------------------------------
drop policy if exists checkins_all on public.checkins;
create policy checkins_all on public.checkins
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --- activity ---------------------------------------------------------------
-- You read your own feed. You may write into someone else's feed only as
-- yourself, which is what makes "Ana added an expense" appear for Paulo.
drop policy if exists activity_select on public.activity;
create policy activity_select on public.activity
  for select to authenticated
  using (user_id in (select public.my_profile_ids()));

drop policy if exists activity_insert on public.activity;
create policy activity_insert on public.activity
  for insert to authenticated
  with check (actor_id = auth.uid());

-- ============================================================================
-- 7. STORAGE — private bucket for statement screenshots, read through signed
-- URLs only. Each user owns the folder named after their id.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;

drop policy if exists statements_insert on storage.objects;
create policy statements_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists statements_select on storage.objects;
create policy statements_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists statements_delete on storage.objects;
create policy statements_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'statements'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
