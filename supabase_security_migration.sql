-- =============================================================================
-- CPMNHS VOTING SYSTEM (CPMNHS iVote) — COMPLETE SUPABASE DATABASE SETUP & MIGRATION
-- Compatible with: Fresh Supabase installations & Existing live databases
-- DepEd / CPMNHS SSG General Elections & Multi-Session Architecture
-- =============================================================================

begin;

-- =============================================================================
-- PART 1: EXTENSIONS
-- =============================================================================
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =============================================================================
-- PART 2: TABLE CREATION (IF NOT EXISTS)
-- =============================================================================

-- 1. System Settings (Global school year configuration)
create table if not exists public.system_settings (
  id integer primary key check (id = 1),
  current_school_year text not null default '2026-2027',
  updated_at timestamptz not null default now()
);

-- 2. Administrators Table
create table if not exists public.admins (
  id bigserial primary key,
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. Legacy Election Settings (backward compatibility fallback)
create table if not exists public.election_settings (
  id integer primary key default 1,
  name text not null default 'SSG General Election',
  school_year text not null default '2026-2027',
  start_date timestamptz default now(),
  end_date timestamptz default (now() + interval '7 days'),
  is_active boolean not null default false,
  results_finalized boolean not null default false,
  finalized_by text,
  finalized_at timestamptz
);

-- 4. Multi-Session Elections (SSG, Clubs, Grade Level Sessions)
create table if not exists public.voting_sessions (
  id bigserial primary key,
  name text not null default 'SSG General Election',
  school_year text not null default '2026-2027',
  start_date timestamptz default now(),
  end_date timestamptz default (now() + interval '7 days'),
  is_active boolean not null default false,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed', 'finalized')),
  schedule_status text not null default 'draft' check (schedule_status in ('draft', 'pending_authorization', 'authorized', 'scheduled', 'ongoing', 'completed', 'cancelled')),
  grade_mappings jsonb not null default '{}'::jsonb,
  eligible_grade_levels jsonb not null default '[]'::jsonb,
  eligible_sections jsonb not null default '[]'::jsonb,
  results_finalized boolean not null default false,
  finalized_by text,
  finalized_at timestamptz,
  authorization_doc_generated boolean not null default false,
  authorization_confirmed_at timestamptz,
  signatories jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. Academic Sections Table
create table if not exists public.sections (
  id bigserial primary key,
  name text not null,
  grade_level text not null,
  created_at timestamptz not null default now()
);

-- 6. Positions Table (Session-Scoped)
create table if not exists public.positions (
  id bigserial primary key,
  session_id bigint not null default 1 references public.voting_sessions(id) on delete cascade,
  name text not null,
  display_order integer not null default 1,
  max_votes integer not null default 1,
  strict_grade_mapping boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7. Candidates Table (Session-Scoped)
create table if not exists public.candidates (
  id bigserial primary key,
  session_id bigint not null default 1 references public.voting_sessions(id) on delete cascade,
  position_id bigint not null references public.positions(id) on delete cascade,
  name text not null,
  party text not null default 'Independent',
  motto text default '',
  photo_url text default '',
  grade_level text not null default '',
  section text not null default '',
  votes integer not null default 0,
  created_at timestamptz not null default now()
);

-- 8. Voters Table (Global Student Registry)
create table if not exists public.voters (
  id uuid primary key default gen_random_uuid(),
  lrn text unique not null,
  name text not null,
  grade_level text not null,
  section text not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'graduated', 'inactive')),
  has_voted boolean not null default false,
  voted_at timestamptz,
  academic_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 9. Voter Sessions (Per-election voting attendance status)
create table if not exists public.voter_sessions (
  id bigserial primary key,
  voter_id uuid not null references public.voters(id) on delete cascade,
  session_id bigint not null references public.voting_sessions(id) on delete cascade,
  has_voted boolean not null default false,
  voted_at timestamptz,
  unique (voter_id, session_id)
);

-- 10. Ballot Ledger (Individual Position Ballots)
create table if not exists public.votes (
  id bigserial primary key,
  session_id bigint not null default 1 references public.voting_sessions(id) on delete cascade,
  voter_id uuid not null references public.voters(id) on delete cascade,
  position_id bigint not null references public.positions(id) on delete cascade,
  candidate_id bigint not null references public.candidates(id) on delete cascade,
  timestamp timestamptz not null default now()
);

-- 11. Vote Verifications (Audit & Tie Detection)
create table if not exists public.vote_verifications (
  id bigserial primary key,
  session_id bigint references public.voting_sessions(id) on delete cascade,
  position_id bigint not null references public.positions(id) on delete cascade,
  tied_candidate_ids jsonb not null default '[]'::jsonb,
  selected_voter_ids jsonb not null default '[]'::jsonb,
  verification_status text not null default 'in_progress' check (verification_status in ('pending', 'in_progress', 'completed', 'tie_remains')),
  verified_by text,
  verified_at timestamptz,
  notes text,
  original_vote_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 12. Tie Resolutions (Formal Winner Determinations)
create table if not exists public.tie_resolutions (
  id bigserial primary key,
  verification_id bigint not null references public.vote_verifications(id) on delete cascade,
  position_id bigint not null references public.positions(id) on delete cascade,
  selected_winner_id bigint not null references public.candidates(id) on delete cascade,
  resolution_method text not null default 'admin_selection',
  resolved_by text,
  resolved_at timestamptz not null default now(),
  reason text
);

-- 13. Application Security Sessions (Secure Token Authentication)
create table if not exists public.app_sessions (
  token_hash bytea primary key,
  user_id text not null,
  role text not null check (role in ('admin', 'voter')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- PART 3: SCHEMA UPGRADES & DATA NORMALIZATION FOR EXISTING DATABASES
-- =============================================================================

-- Add missing columns safely if upgrading from an older version
alter table public.admins add column if not exists must_change_password boolean not null default false;
alter table public.voters add column if not exists academic_history jsonb not null default '[]'::jsonb;

alter table public.voters drop constraint if exists voters_status_check;
alter table public.voters add constraint voters_status_check
  check (status in ('pending', 'approved', 'rejected', 'graduated', 'inactive'));

-- Fix election_settings constraints and column definitions
alter table public.election_settings add column if not exists results_finalized boolean not null default false;
alter table public.election_settings add column if not exists finalized_by text;
alter table public.election_settings add column if not exists finalized_at timestamptz;
alter table public.election_settings alter column start_date drop not null;
alter table public.election_settings alter column end_date drop not null;
alter table public.election_settings alter column start_date set default now();
alter table public.election_settings alter column end_date set default (now() + interval '7 days');

-- Fix voting_sessions columns and constraints
alter table public.voting_sessions add column if not exists start_date timestamptz default now();
alter table public.voting_sessions add column if not exists end_date timestamptz default (now() + interval '7 days');
alter table public.voting_sessions add column if not exists is_active boolean not null default false;
alter table public.voting_sessions add column if not exists status text not null default 'upcoming';
alter table public.voting_sessions add column if not exists schedule_status text not null default 'draft';
alter table public.voting_sessions add column if not exists grade_mappings jsonb not null default '{}'::jsonb;
alter table public.voting_sessions add column if not exists eligible_grade_levels jsonb not null default '[]'::jsonb;
alter table public.voting_sessions add column if not exists eligible_sections jsonb not null default '[]'::jsonb;
alter table public.voting_sessions add column if not exists results_finalized boolean not null default false;
alter table public.voting_sessions add column if not exists finalized_by text;
alter table public.voting_sessions add column if not exists finalized_at timestamptz;
alter table public.voting_sessions add column if not exists authorization_doc_generated boolean not null default false;
alter table public.voting_sessions add column if not exists authorization_confirmed_at timestamptz;
alter table public.voting_sessions add column if not exists signatories jsonb not null default '{}'::jsonb;
alter table public.voting_sessions alter column start_date drop not null;
alter table public.voting_sessions alter column end_date drop not null;

alter table public.positions add column if not exists session_id bigint references public.voting_sessions(id) on delete cascade;
alter table public.positions add column if not exists strict_grade_mapping boolean not null default false;
alter table public.candidates add column if not exists session_id bigint references public.voting_sessions(id) on delete cascade;
alter table public.votes add column if not exists session_id bigint references public.voting_sessions(id) on delete cascade;
alter table public.vote_verifications add column if not exists session_id bigint references public.voting_sessions(id) on delete cascade;

-- Safely convert existing text dates to timestamptz
alter table public.voting_sessions alter column start_date type timestamptz using nullif(start_date::text, '')::timestamptz;
alter table public.voting_sessions alter column end_date type timestamptz using nullif(end_date::text, '')::timestamptz;
alter table public.voting_sessions alter column authorization_confirmed_at type timestamptz using nullif(authorization_confirmed_at::text, '')::timestamptz;
alter table public.voting_sessions alter column finalized_at type timestamptz using nullif(finalized_at::text, '')::timestamptz;

-- Safely convert JSON columns to JSONB
alter table public.voting_sessions alter column grade_mappings drop default;
alter table public.voting_sessions alter column grade_mappings type jsonb using grade_mappings::jsonb;
alter table public.voting_sessions alter column grade_mappings set default '{}'::jsonb;

alter table public.voting_sessions alter column eligible_grade_levels drop default;
alter table public.voting_sessions alter column eligible_grade_levels type jsonb using eligible_grade_levels::jsonb;
alter table public.voting_sessions alter column eligible_grade_levels set default '[]'::jsonb;

alter table public.voting_sessions alter column eligible_sections drop default;
alter table public.voting_sessions alter column eligible_sections type jsonb using eligible_sections::jsonb;
alter table public.voting_sessions alter column eligible_sections set default '[]'::jsonb;

alter table public.voting_sessions alter column signatories drop default;
alter table public.voting_sessions alter column signatories type jsonb using signatories::jsonb;
alter table public.voting_sessions alter column signatories set default '{}'::jsonb;

alter table public.vote_verifications alter column tied_candidate_ids drop default;
alter table public.vote_verifications alter column tied_candidate_ids type jsonb using tied_candidate_ids::jsonb;
alter table public.vote_verifications alter column tied_candidate_ids set default '[]'::jsonb;

alter table public.vote_verifications alter column selected_voter_ids drop default;
alter table public.vote_verifications alter column selected_voter_ids type jsonb using selected_voter_ids::jsonb;
alter table public.vote_verifications alter column selected_voter_ids set default '[]'::jsonb;

alter table public.vote_verifications alter column original_vote_counts drop default;
alter table public.vote_verifications alter column original_vote_counts type jsonb using original_vote_counts::jsonb;
alter table public.vote_verifications alter column original_vote_counts set default '{}'::jsonb;

-- Sanitize any stringified JSON values stored in JSONB columns
update public.voting_sessions set
  grade_mappings = case when jsonb_typeof(grade_mappings) = 'string' then (grade_mappings #>> '{}')::jsonb else coalesce(grade_mappings, '{}'::jsonb) end,
  eligible_grade_levels = case when jsonb_typeof(eligible_grade_levels) = 'string' then (eligible_grade_levels #>> '{}')::jsonb else coalesce(eligible_grade_levels, '[]'::jsonb) end,
  eligible_sections = case when jsonb_typeof(eligible_sections) = 'string' then (eligible_sections #>> '{}')::jsonb else coalesce(eligible_sections, '[]'::jsonb) end,
  signatories = case when jsonb_typeof(signatories) = 'string' then (signatories #>> '{}')::jsonb else coalesce(signatories, '{}'::jsonb) end;

update public.vote_verifications set
  tied_candidate_ids = case when jsonb_typeof(tied_candidate_ids) = 'string' then (tied_candidate_ids #>> '{}')::jsonb else coalesce(tied_candidate_ids, '[]'::jsonb) end,
  selected_voter_ids = case when jsonb_typeof(selected_voter_ids) = 'string' then (selected_voter_ids #>> '{}')::jsonb else coalesce(selected_voter_ids, '[]'::jsonb) end,
  original_vote_counts = case when jsonb_typeof(original_vote_counts) = 'string' then (original_vote_counts #>> '{}')::jsonb else coalesce(original_vote_counts, '{}'::jsonb) end;

-- Backfill Session 1 foreign keys for any legacy records
update public.positions set session_id = 1 where session_id is null;
update public.candidates set session_id = 1 where session_id is null;
update public.votes set session_id = 1 where session_id is null;
update public.vote_verifications set session_id = 1 where session_id is null;

-- =============================================================================
-- PART 4: DEFAULT DATA & INITIAL SEEDS
-- =============================================================================

-- 1. Default System Settings
insert into public.system_settings (id, current_school_year)
values (1, '2026-2027')
on conflict (id) do nothing;

-- 2. Default Election Session 1 (SSG General Election)
insert into public.voting_sessions (id, name, school_year, start_date, end_date, is_active, status, schedule_status)
values (1, 'SSG General Election', '2026-2027', now(), now() + interval '7 days', false, 'upcoming', 'draft')
on conflict (id) do nothing;

-- 3. Default Legacy Election Settings
insert into public.election_settings (id, name, school_year, start_date, end_date, is_active)
values (1, 'SSG General Election', '2026-2027', now(), now() + interval '7 days', false)
on conflict (id) do nothing;

-- 4. Default Admin Account (Username: admin, Password: admin123)
-- Encrypted using bcrypt (Blowfish cost 12). Forced to change password upon first login.
do $$
begin
  if not exists (select 1 from public.admins where username = 'admin') then
    insert into public.admins (username, email, password_hash, must_change_password)
    values ('admin', 'admin@cpmnhs.edu.ph', crypt('admin123', gen_salt('bf', 12)), true);
  end if;
end $$;

-- 5. Default Sections (Grade 7 to 12)
insert into public.sections (name, grade_level)
select s.name, s.grade_level
from (values
  ('Pearl', '7'),
  ('Topaz', '8'),
  ('Aquamarine', '9'),
  ('Gold', '10'),
  ('ICT', '11'),
  ('Humss', '11'),
  ('ICT', '12'),
  ('Humss', '12')
) as s(name, grade_level)
where not exists (select 1 from public.sections limit 1);

-- 6. Default SSG Positions (13 Official DepEd / CPMNHS SSG Positions)
insert into public.positions (session_id, name, display_order, max_votes, strict_grade_mapping)
select 1, p.name, p.display_order, p.max_votes, p.strict_grade_mapping
from (values
  ('President', 1, 1, false),
  ('Vice President', 2, 1, false),
  ('Secretary', 3, 1, false),
  ('Treasurer', 4, 1, false),
  ('Auditor', 5, 1, false),
  ('Public Information Officer', 6, 1, false),
  ('Protocol Officer', 7, 1, false),
  ('Grade 7 Representative', 8, 1, true),
  ('Grade 8 Representative', 9, 1, true),
  ('Grade 9 Representative', 10, 1, true),
  ('Grade 10 Representative', 11, 1, true),
  ('Grade 11 Representative', 12, 1, true),
  ('Grade 12 Representative', 13, 1, true)
) as p(name, display_order, max_votes, strict_grade_mapping)
where not exists (select 1 from public.positions where session_id = 1 limit 1);

-- Sequence Synchronization
do $$
begin
  if exists (select 1 from pg_class where relname = 'voting_sessions_id_seq') then
    perform setval('voting_sessions_id_seq', greatest((select coalesce(max(id), 1) from public.voting_sessions), 1));
  end if;
  if exists (select 1 from pg_class where relname = 'positions_id_seq') then
    perform setval('positions_id_seq', greatest((select coalesce(max(id), 1) from public.positions), 1));
  end if;
  if exists (select 1 from pg_class where relname = 'candidates_id_seq') then
    perform setval('candidates_id_seq', greatest((select coalesce(max(id), 1) from public.candidates), 1));
  end if;
  if exists (select 1 from pg_class where relname = 'sections_id_seq') then
    perform setval('sections_id_seq', greatest((select coalesce(max(id), 1) from public.sections), 1));
  end if;
end $$;

-- =============================================================================
-- PART 5: BALLOT INTEGRITY DEDUPLICATION & RECONCILIATION
-- =============================================================================

-- Enforce strictly one ballot per voter per position in each session
delete from public.votes newer
using public.votes older
where newer.id > older.id
  and newer.voter_id = older.voter_id
  and newer.position_id = older.position_id
  and newer.session_id = older.session_id;

-- Deduplicate voter_sessions table
delete from public.voter_sessions newer
using public.voter_sessions older
where newer.id > older.id
  and newer.voter_id = older.voter_id
  and newer.session_id = older.session_id;

-- Synchronize voter_sessions with votes cast
insert into public.voter_sessions (voter_id, session_id, has_voted, voted_at)
select v.voter_id, v.session_id, true, max(v.timestamp)
from public.votes v
where exists (select 1 from public.voters vr where vr.id = v.voter_id)
  and exists (select 1 from public.voting_sessions vs where vs.id = v.session_id)
group by v.voter_id, v.session_id
on conflict (voter_id, session_id) do update
set has_voted = true,
    voted_at = coalesce(public.voter_sessions.voted_at, excluded.voted_at);

-- Reconcile cached candidate vote counts from live votes
update public.candidates c
set votes = (select count(*) from public.votes v where v.candidate_id = c.id);

-- =============================================================================
-- PART 6: INDEXES & CONSTRAINTS
-- =============================================================================
create unique index if not exists votes_one_choice_per_position
  on public.votes (voter_id, position_id, session_id);

create unique index if not exists voter_sessions_one_row
  on public.voter_sessions (voter_id, session_id);

create index if not exists app_sessions_expiry_idx
  on public.app_sessions (expires_at);

create index if not exists candidates_session_position_idx
  on public.candidates (session_id, position_id);

create index if not exists positions_session_order_idx
  on public.positions (session_id, display_order);

create index if not exists voters_lrn_idx
  on public.voters (lrn);

create index if not exists voters_status_idx
  on public.voters (status);

create index if not exists voters_grade_section_idx
  on public.voters (grade_level, section);

create index if not exists votes_session_candidate_idx
  on public.votes (session_id, candidate_id);

create index if not exists votes_session_position_idx
  on public.votes (session_id, position_id);

create index if not exists voter_sessions_session_voted_idx
  on public.voter_sessions (session_id, has_voted);

-- =============================================================================
-- PART 7: SECURITY DEFINER BACKEND RPC FUNCTIONS
-- =============================================================================

-- Internal helper: Validates active app session token
create or replace function public.require_app_session(p_token text, p_role text default null)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id text;
  v_role text;
begin
  select user_id, role into v_user_id, v_role
  from public.app_sessions
  where token_hash = digest(p_token, 'sha256')
    and expires_at > now();

  if v_user_id is null or (p_role is not null and v_role <> p_role) then
    raise exception 'Invalid or expired session';
  end if;

  return v_user_id;
end;
$$;

-- Student / Voter Login
create or replace function public.secure_login_voter(p_lrn text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v public.voters%rowtype;
  v_token text;
begin
  select * into v from public.voters where lrn = trim(p_lrn) limit 1;

  if v.id is null or v.password_hash is null or
     (case when v.password_hash like '$2%' then crypt(p_password, v.password_hash) <> v.password_hash
           else p_password <> v.password_hash end) then
    raise exception 'Invalid LRN or password';
  end if;

  -- Upgrade legacy plaintext passwords automatically to bcrypt
  if v.password_hash not like '$2%' then
    update public.voters set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = v.id;
  end if;

  if v.status <> 'approved' then
    raise exception 'Account is not approved';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  delete from public.app_sessions where expires_at <= now();

  insert into public.app_sessions (token_hash, user_id, role, expires_at)
  values (digest(v_token, 'sha256'), v.id::text, 'voter', now() + interval '12 hours');

  return jsonb_build_object(
    'token', v_token,
    'user', jsonb_build_object(
      'id', v.id::text,
      'role', 'voter',
      'name', v.name,
      'lrn', v.lrn,
      'gradeLevel', v.grade_level,
      'section', v.section
    ),
    'hasVoted', false
  );
end;
$$;

-- Administrator Login
create or replace function public.secure_login_admin(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v public.admins%rowtype;
  v_token text;
begin
  select * into v from public.admins where username = trim(p_username) limit 1;

  if v.id is null or v.password_hash is null or
     (case when v.password_hash like '$2%' then crypt(p_password, v.password_hash) <> v.password_hash
           else p_password <> v.password_hash end) then
    raise exception 'Invalid username or password';
  end if;

  -- Upgrade legacy plaintext admin password to bcrypt
  if v.password_hash not like '$2%' then
    update public.admins set password_hash = crypt(p_password, gen_salt('bf', 12)), must_change_password = true where id = v.id;
    v.must_change_password := true;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  delete from public.app_sessions where expires_at <= now();

  insert into public.app_sessions (token_hash, user_id, role, expires_at)
  values (digest(v_token, 'sha256'), v.id::text, 'admin', now() + interval '8 hours');

  return jsonb_build_object(
    'token', v_token,
    'user', jsonb_build_object('id', v.id::text, 'role', 'admin', 'name', v.username, 'email', v.email),
    'mustChangePassword', coalesce(v.must_change_password, false)
  );
end;
$$;

-- Session Logout
create or replace function public.secure_logout(p_token text)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  delete from public.app_sessions where token_hash = digest(p_token, 'sha256');
$$;

-- Admin Password Update
create or replace function public.secure_change_admin_password(
  p_token text, p_current_password text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_hash text;
begin
  if length(p_new_password) < 6 then
    raise exception 'New password must contain at least 6 characters';
  end if;

  select password_hash into v_hash from public.admins where id::text = v_admin_id for update;

  if v_hash like '$2%' then
    if crypt(p_current_password, v_hash) <> v_hash then
      raise exception 'Current password is incorrect';
    end if;
  else
    if p_current_password <> v_hash then
      raise exception 'Current password is incorrect';
    end if;
  end if;

  update public.admins
  set password_hash = crypt(p_new_password, gen_salt('bf', 12)),
      must_change_password = false
  where id::text = v_admin_id;
end;
$$;

-- Student Online Registration
create or replace function public.secure_register_voter(
  p_lrn text, p_name text, p_grade_level text, p_section text, p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if trim(p_lrn) !~ '^[0-9]{12}$' then
    raise exception 'LRN must contain exactly 12 digits';
  end if;

  if length(p_password) < 8 then
    raise exception 'Password must contain at least 8 characters';
  end if;

  insert into public.voters (lrn, name, grade_level, section, password_hash, status)
  values (
    trim(p_lrn),
    trim(p_name),
    trim(p_grade_level),
    trim(p_section),
    crypt(p_password, gen_salt('bf', 10)),
    'pending'
  );
exception when unique_violation then
  raise exception 'This LRN is already registered';
end;
$$;

-- Bulk Student Registration (Admin CSV Import)
create or replace function public.secure_bulk_register_voters(p_token text, p_students jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_student jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_students) <> 'array' then
    raise exception 'Student list is invalid';
  end if;

  for v_student in select value from jsonb_array_elements(p_students)
  loop
    if (v_student->>'lrn') !~ '^[0-9]{12}$' or length(coalesce(v_student->>'password', '')) < 8 then
      raise exception 'Every student requires a 12-digit LRN and an 8-character password';
    end if;

    insert into public.voters (lrn, name, grade_level, section, password_hash, status)
    values (
      trim(v_student->>'lrn'),
      trim(v_student->>'name'),
      trim(v_student->>'gradeLevel'),
      trim(v_student->>'section'),
      crypt(v_student->>'password', gen_salt('bf', 10)),
      'approved'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Fetch Voters (Admins get all; students get their own record)
create or replace function public.secure_get_voters(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id text;
  v_role text;
begin
  select user_id, role into v_user_id, v_role from public.app_sessions
  where token_hash = digest(p_token, 'sha256') and expires_at > now();

  if v_user_id is null then
    raise exception 'Invalid or expired session';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id::text,
      'lrn', v.lrn,
      'name', v.name,
      'grade_level', v.grade_level,
      'section', v.section,
      'status', v.status,
      'has_voted', v.has_voted,
      'voted_at', v.voted_at,
      'created_at', v.created_at,
      'academic_history', coalesce(v.academic_history, '[]'::jsonb)
    ) order by v.created_at desc)
    from public.voters v
    where v_role = 'admin' or v.id::text = v_user_id
  ), '[]'::jsonb);
end;
$$;

-- Fetch Candidates (Vote counts masked for non-admins until results are finalized)
create or replace function public.secure_get_candidates(p_token text default null, p_session_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text;
begin
  if nullif(p_token, '') is not null then
    select role into v_role from public.app_sessions
    where token_hash = digest(p_token, 'sha256') and expires_at > now();
  end if;

  return coalesce((
    select jsonb_agg(
      to_jsonb(c) || jsonb_build_object('votes',
        case when v_role = 'admin' or coalesce(s.results_finalized, false)
          then coalesce(c.votes, 0) else 0 end)
      order by c.id
    )
    from public.candidates c
    left join public.voting_sessions s on s.id = c.session_id
    where p_session_id is null or c.session_id = p_session_id
  ), '[]'::jsonb);
end;
$$;

-- Fetch Voter Sessions (Per-session voting records)
create or replace function public.secure_get_voter_sessions(p_token text, p_session_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id text;
  v_role text;
begin
  select user_id, role into v_user_id, v_role from public.app_sessions
  where token_hash = digest(p_token, 'sha256') and expires_at > now();

  if v_user_id is null then
    raise exception 'Invalid or expired session';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(vs)) from public.voter_sessions vs
    where vs.session_id = p_session_id and (v_role = 'admin' or vs.voter_id::text = v_user_id)
  ), '[]'::jsonb);
end;
$$;

-- Check Current Voter Status in a Specific Session
create or replace function public.secure_voter_session_status(p_token text, p_session_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_voter_id text := public.require_app_session(p_token, 'voter');
  v_row public.voter_sessions%rowtype;
begin
  select * into v_row from public.voter_sessions
  where voter_id::text = v_voter_id and session_id = p_session_id;

  return jsonb_build_object('hasVoted', coalesce(v_row.has_voted, false), 'votedAt', v_row.voted_at);
end;
$$;

-- Student Section Update (Upon Login if Section was TBD / Empty)
create or replace function public.secure_update_my_section(p_token text, p_section text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  update public.voters set section = trim(p_section)
  where id::text = public.require_app_session(p_token, 'voter');
end;
$$;

-- Admin Voter Actions (Approve, Reject, Approve All, Delete)
drop function if exists public.secure_admin_voter_action(text, text, bigint);
drop function if exists public.secure_admin_voter_action(text, text, text);
create or replace function public.secure_admin_voter_action(
  p_token text, p_action text, p_voter_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
begin
  case p_action
    when 'approve' then
      update public.voters set status = 'approved' where id::text = p_voter_id;
    when 'reject' then
      update public.voters set status = 'rejected' where id::text = p_voter_id;
    when 'approve_all' then
      update public.voters set status = 'approved' where status = 'pending';
    when 'delete' then
      -- Reconcile candidate vote counts before removing votes
      update public.candidates c
      set votes = greatest(c.votes - sub.cnt, 0)
      from (
        select candidate_id, count(*) as cnt
        from public.votes
        where voter_id::text = p_voter_id
        group by candidate_id
      ) sub
      where c.id = sub.candidate_id;

      delete from public.votes where voter_id::text = p_voter_id;
      delete from public.voter_sessions where voter_id::text = p_voter_id;
      delete from public.app_sessions where user_id = p_voter_id;
      delete from public.voters where id::text = p_voter_id;
    else
      raise exception 'Unsupported voter action';
  end case;
end;
$$;

-- Unified Admin Management Function (Sessions, Candidates, Positions, Sections)
create or replace function public.secure_admin_manage(
  p_token text, p_action text, p_id bigint default null, p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_new_id bigint;
  v_original public.voting_sessions%rowtype;
  v_position public.positions%rowtype;
  v_candidate public.candidates%rowtype;
  v_map jsonb := '{}'::jsonb;
  v_keep_id bigint;
  v_count integer := 0;
begin
  case p_action

    -- ===== VOTING SESSIONS =====
    when 'create_session', 'add_session' then
      insert into public.voting_sessions (
        name, school_year, status, schedule_status, start_date, end_date,
        grade_mappings, eligible_grade_levels, eligible_sections
      )
      values (
        coalesce(nullif(trim(coalesce(p_payload->>'name', '')), ''), 'New Election'),
        coalesce(nullif(trim(coalesce(p_payload->>'school_year', p_payload->>'schoolYear', '')), ''), '2026-2027'),
        coalesce(p_payload->>'status', 'upcoming'),
        coalesce(p_payload->>'schedule_status', p_payload->>'scheduleStatus', 'draft'),
        nullif(coalesce(p_payload->>'start_date', p_payload->>'startDate', ''), '')::timestamptz,
        nullif(coalesce(p_payload->>'end_date', p_payload->>'endDate', ''), '')::timestamptz,
        coalesce(p_payload->'grade_mappings', p_payload->'gradeMappings', '{}'::jsonb),
        coalesce(p_payload->'eligible_grade_levels', p_payload->'eligibleGradeLevels', '[]'::jsonb),
        coalesce(p_payload->'eligible_sections', p_payload->'eligibleSections', '[]'::jsonb)
      )
      returning id into v_new_id;
      return (select to_jsonb(s) from public.voting_sessions s where s.id = v_new_id);

    when 'update_session' then
      update public.voting_sessions set
        name = case when p_payload ? 'name' then p_payload->>'name' else name end,
        school_year = case when p_payload ? 'school_year' then p_payload->>'school_year'
                           when p_payload ? 'schoolYear' then p_payload->>'schoolYear' else school_year end,
        start_date = case when p_payload ? 'start_date' then nullif(p_payload->>'start_date', '')::timestamptz
                          when p_payload ? 'startDate' then nullif(p_payload->>'startDate', '')::timestamptz else start_date end,
        end_date = case when p_payload ? 'end_date' then nullif(p_payload->>'end_date', '')::timestamptz
                        when p_payload ? 'endDate' then nullif(p_payload->>'endDate', '')::timestamptz else end_date end,
        is_active = case when p_payload ? 'is_active' then (p_payload->>'is_active')::boolean
                         when p_payload ? 'isActive' then (p_payload->>'isActive')::boolean else is_active end,
        status = case when p_payload ? 'status' then p_payload->>'status' else status end,
        schedule_status = case when p_payload ? 'schedule_status' then p_payload->>'schedule_status'
                               when p_payload ? 'scheduleStatus' then p_payload->>'scheduleStatus' else schedule_status end,
        grade_mappings = case when p_payload ? 'grade_mappings' then p_payload->'grade_mappings'
                              when p_payload ? 'gradeMappings' then p_payload->'gradeMappings' else grade_mappings end,
        eligible_grade_levels = case when p_payload ? 'eligible_grade_levels' then p_payload->'eligible_grade_levels'
                                     when p_payload ? 'eligibleGradeLevels' then p_payload->'eligibleGradeLevels' else eligible_grade_levels end,
        eligible_sections = case when p_payload ? 'eligible_sections' then p_payload->'eligible_sections'
                                 when p_payload ? 'eligibleSections' then p_payload->'eligibleSections' else eligible_sections end,
        authorization_doc_generated = case when p_payload ? 'authorization_doc_generated' then (p_payload->>'authorization_doc_generated')::boolean
                                           when p_payload ? 'authorizationDocGenerated' then (p_payload->>'authorizationDocGenerated')::boolean else authorization_doc_generated end,
        authorization_confirmed_at = case when p_payload ? 'authorization_confirmed_at' then nullif(p_payload->>'authorization_confirmed_at', '')::timestamptz
                                          when p_payload ? 'authorizationConfirmedAt' then nullif(p_payload->>'authorizationConfirmedAt', '')::timestamptz else authorization_confirmed_at end,
        signatories = case when p_payload ? 'signatories' then p_payload->'signatories' else signatories end,
        results_finalized = case when p_payload ? 'results_finalized' then (p_payload->>'results_finalized')::boolean
                                 when p_payload ? 'resultsFinalized' then (p_payload->>'resultsFinalized')::boolean else results_finalized end,
        finalized_by = case when p_payload ? 'finalized_by' then p_payload->>'finalized_by'
                            when p_payload ? 'finalizedBy' then p_payload->>'finalizedBy' else finalized_by end,
        finalized_at = case when p_payload ? 'finalized_at' then nullif(p_payload->>'finalized_at', '')::timestamptz
                            when p_payload ? 'finalizedAt' then nullif(p_payload->>'finalizedAt', '')::timestamptz else finalized_at end
      where id = p_id;
      if not found then raise exception 'Election session not found'; end if;
      return jsonb_build_object('success', true);

    when 'delete_session' then
      delete from public.tie_resolutions where verification_id in (select id from public.vote_verifications where session_id = p_id);
      delete from public.vote_verifications where session_id = p_id;
      delete from public.votes where session_id = p_id;
      delete from public.voter_sessions where session_id = p_id;
      delete from public.candidates where session_id = p_id;
      delete from public.positions where session_id = p_id;
      delete from public.voting_sessions where id = p_id;
      return jsonb_build_object('success', true);

    when 'duplicate_session' then
      select * into v_original from public.voting_sessions where id = p_id;
      if v_original.id is null then raise exception 'Election session not found'; end if;

      insert into public.voting_sessions (
        name, school_year, grade_mappings, eligible_grade_levels, eligible_sections, status, schedule_status
      )
      values (
        v_original.name || ' (Copy)', v_original.school_year, v_original.grade_mappings,
        v_original.eligible_grade_levels, v_original.eligible_sections, 'upcoming', 'draft'
      )
      returning id into v_new_id;

      for v_position in select * from public.positions where session_id = p_id loop
        insert into public.positions (name, display_order, max_votes, strict_grade_mapping, session_id)
        values (v_position.name, v_position.display_order, v_position.max_votes,
          coalesce(v_position.strict_grade_mapping, false), v_new_id)
        returning id into v_keep_id;

        v_map := v_map || jsonb_build_object(v_position.id::text, v_keep_id);
      end loop;

      for v_candidate in select * from public.candidates where session_id = p_id loop
        insert into public.candidates (name, party, motto, photo_url, grade_level, section, position_id, session_id, votes)
        values (
          v_candidate.name, v_candidate.party, v_candidate.motto, v_candidate.photo_url,
          v_candidate.grade_level, v_candidate.section, (v_map->>v_candidate.position_id::text)::bigint, v_new_id, 0
        );
      end loop;

      return (select to_jsonb(s) from public.voting_sessions s where s.id = v_new_id);

    -- ===== CANDIDATES =====
    when 'add_candidate', 'create_candidate' then
      if coalesce(p_payload->>'position_id', p_payload->>'positionId') is not null and coalesce(p_payload->>'position_id', p_payload->>'positionId') <> '' then
        if not exists (
          select 1 from public.positions
          where id = coalesce(p_payload->>'position_id', p_payload->>'positionId')::bigint
            and (coalesce(p_payload->>'session_id', p_payload->>'sessionId') is null or coalesce(p_payload->>'session_id', p_payload->>'sessionId') = '' or session_id = coalesce(p_payload->>'session_id', p_payload->>'sessionId')::bigint)
        ) then
          raise exception 'Position does not belong to this election';
        end if;
      end if;

      insert into public.candidates (name, party, motto, photo_url, grade_level, section, position_id, session_id, votes)
      values (
        trim(p_payload->>'name'),
        coalesce(nullif(trim(p_payload->>'party'), ''), 'Independent'),
        coalesce(p_payload->>'motto', ''),
        coalesce(p_payload->>'photo_url', p_payload->>'photoUrl', ''),
        coalesce(p_payload->>'grade_level', p_payload->>'gradeLevel', ''),
        coalesce(p_payload->>'section', ''),
        coalesce(nullif(p_payload->>'position_id', ''), nullif(p_payload->>'positionId', ''))::bigint,
        coalesce(nullif(p_payload->>'session_id', ''), nullif(p_payload->>'sessionId', ''), '1')::bigint,
        0
      )
      returning id into v_new_id;
      return jsonb_build_object('success', true, 'id', v_new_id);

    when 'update_candidate' then
      if (p_payload ? 'position_id' or p_payload ? 'positionId') and coalesce(p_payload->>'position_id', p_payload->>'positionId') is not null and coalesce(p_payload->>'position_id', p_payload->>'positionId') <> '' then
        if not exists (
          select 1 from public.positions p join public.candidates c on c.id = p_id
          where p.id = coalesce(p_payload->>'position_id', p_payload->>'positionId')::bigint and p.session_id = c.session_id
        ) then
          raise exception 'Position does not belong to this election';
        end if;
      end if;

      update public.candidates set
        name = case when p_payload ? 'name' then trim(p_payload->>'name') else name end,
        party = case when p_payload ? 'party' then coalesce(nullif(trim(p_payload->>'party'), ''), 'Independent') else party end,
        motto = case when p_payload ? 'motto' then p_payload->>'motto' else motto end,
        photo_url = case when p_payload ? 'photo_url' then p_payload->>'photo_url'
                         when p_payload ? 'photoUrl' then p_payload->>'photoUrl' else photo_url end,
        grade_level = case when p_payload ? 'grade_level' then p_payload->>'grade_level'
                           when p_payload ? 'gradeLevel' then p_payload->>'gradeLevel' else grade_level end,
        section = case when p_payload ? 'section' then p_payload->>'section' else section end,
        position_id = case when (p_payload ? 'position_id' or p_payload ? 'positionId') and coalesce(p_payload->>'position_id', p_payload->>'positionId') <> ''
                           then coalesce(p_payload->>'position_id', p_payload->>'positionId')::bigint else position_id end
      where id = p_id;

      if not found then raise exception 'Candidate not found'; end if;
      return jsonb_build_object('success', true);

    when 'delete_candidate' then
      delete from public.votes where candidate_id = p_id;
      delete from public.tie_resolutions where selected_winner_id = p_id;
      delete from public.candidates where id = p_id;
      return jsonb_build_object('success', true);

    -- ===== POSITIONS =====
    when 'add_position', 'create_position' then
      if exists (
        select 1 from public.positions
        where session_id = coalesce(nullif(coalesce(p_payload->>'session_id', p_payload->>'sessionId'), ''), '1')::bigint
          and lower(trim(name)) = lower(trim(p_payload->>'name'))
      ) then
        raise exception 'A position with this name already exists';
      end if;

      insert into public.positions (name, display_order, max_votes, strict_grade_mapping, session_id)
      values (
        trim(p_payload->>'name'),
        coalesce((coalesce(p_payload->>'display_order', p_payload->>'order'))::integer, 0),
        coalesce((coalesce(p_payload->>'max_votes', p_payload->>'maxVotes'))::integer, 1),
        coalesce((coalesce(p_payload->>'strict_grade_mapping', p_payload->>'strictGradeMapping'))::boolean, false),
        coalesce(nullif(coalesce(p_payload->>'session_id', p_payload->>'sessionId'), ''), '1')::bigint
      )
      returning id into v_new_id;
      return jsonb_build_object('success', true, 'id', v_new_id);

    when 'delete_position' then
      delete from public.tie_resolutions where position_id = p_id;
      delete from public.vote_verifications where position_id = p_id;
      delete from public.votes where position_id = p_id;
      delete from public.candidates where position_id = p_id;
      delete from public.positions where id = p_id;
      return jsonb_build_object('success', true);

    when 'cleanup_positions' then
      for v_position in select * from public.positions p where p.session_id = coalesce(p_id, 1) order by p.id loop
        select min(id) into v_keep_id from public.positions
        where session_id = coalesce(p_id, 1) and lower(trim(name)) = lower(trim(v_position.name));
        if v_keep_id <> v_position.id then
          update public.candidates set position_id = v_keep_id where position_id = v_position.id;
          update public.votes set position_id = v_keep_id where position_id = v_position.id;
          delete from public.positions where id = v_position.id;
          v_count := v_count + 1;
        end if;
      end loop;
      return jsonb_build_object('success', true, 'count', v_count);

    -- ===== SECTIONS =====
    when 'add_section', 'create_section' then
      insert into public.sections (name, grade_level)
      values (trim(p_payload->>'name'), coalesce(p_payload->>'grade_level', ''))
      returning id into v_new_id;
      return jsonb_build_object('success', true, 'id', v_new_id);

    when 'delete_section' then
      delete from public.sections where id = p_id;
      return jsonb_build_object('success', true);

    else
      raise exception 'Unsupported admin management action: %', p_action;
  end case;
end;
$$;

-- Submit Complete Ballot (High Integrity, Atomic Transaction)
create or replace function public.secure_submit_ballot(p_token text, p_session_id bigint, p_votes jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_voter_id text := public.require_app_session(p_token, 'voter');
  v_session public.voting_sessions%rowtype;
  v_voter public.voters%rowtype;
  v_vote jsonb;
  v_position_id bigint;
  v_candidate_id bigint;
  v_seen bigint[] := '{}';
  v_position_name text;
  v_candidate_grade text;
  v_target_grade text;
  v_rep_grade text;
  v_match text[];
begin
  if jsonb_typeof(p_votes) <> 'array' or jsonb_array_length(p_votes) = 0 then
    raise exception 'Ballot is empty';
  end if;

  select * into v_session from public.voting_sessions where id = p_session_id for update;

  if v_session.id is null or not v_session.is_active or v_session.status <> 'active'
     or coalesce(v_session.results_finalized, false)
     or (v_session.start_date is not null and now() < v_session.start_date)
     or (v_session.end_date is not null and now() >= v_session.end_date) then
    raise exception 'Election is not open for voting';
  end if;

  select * into v_voter from public.voters where id::text = v_voter_id for update;

  if v_voter.status <> 'approved' then
    raise exception 'Voter is not eligible';
  end if;

  -- Normalized Grade Level Eligibility Check
  if jsonb_typeof(v_session.eligible_grade_levels) = 'array'
     and jsonb_array_length(v_session.eligible_grade_levels) > 0 then
    if not exists (
      select 1 from jsonb_array_elements_text(v_session.eligible_grade_levels) g
      where regexp_replace(lower(trim(g)), '[^0-9]', '', 'g') = regexp_replace(lower(trim(coalesce(v_voter.grade_level, ''))), '[^0-9]', '', 'g')
         or lower(trim(g)) = lower(trim(coalesce(v_voter.grade_level, '')))
    ) then
      raise exception 'Your grade level is not eligible for this election';
    end if;
  end if;

  -- Normalized Section Eligibility Check
  if jsonb_typeof(v_session.eligible_sections) = 'array'
     and jsonb_array_length(v_session.eligible_sections) > 0 then
    if not exists (
      select 1 from jsonb_array_elements_text(v_session.eligible_sections) s
      where lower(trim(regexp_replace(regexp_replace(s, '^(section|sec\.?)\s*', '', 'i'), '^(grade|gr\.?|g)\s*[0-9]+\s*[-–—]?\s*', '', 'i'))) =
            lower(trim(regexp_replace(regexp_replace(coalesce(v_voter.section, ''), '^(section|sec\.?)\s*', '', 'i'), '^(grade|gr\.?|g)\s*[0-9]+\s*[-–—]?\s*', '', 'i')))
         or lower(trim(s)) = lower(trim(coalesce(v_voter.section, '')))
    ) then
      raise exception 'Your section is not eligible for this election';
    end if;
  end if;

  if exists (select 1 from public.voter_sessions where voter_id::text = v_voter_id and session_id = p_session_id and has_voted) then
    raise exception 'You have already voted in this election';
  end if;

  for v_vote in select value from jsonb_array_elements(p_votes)
  loop
    v_position_id := (v_vote->>'position_id')::bigint;
    v_candidate_id := (v_vote->>'candidate_id')::bigint;

    if v_position_id = any(v_seen) then
      raise exception 'A position appears more than once in this ballot';
    end if;
    v_seen := array_append(v_seen, v_position_id);

    select p.name, c.grade_level into v_position_name, v_candidate_grade
    from public.candidates c
    join public.positions p on p.id = c.position_id
    where c.id = v_candidate_id and c.position_id = v_position_id
      and c.session_id = p_session_id and p.session_id = p_session_id;

    if v_position_name is null then
      raise exception 'Invalid candidate selection';
    end if;

    -- Strict Grade Representative Verification
    if v_position_name ~* '(representative|(^|[^a-z])rep([^a-z]|$))'
       and jsonb_typeof(v_session.grade_mappings) = 'object' then
      v_target_grade := v_session.grade_mappings->>v_voter.grade_level;

      if v_target_grade = 'none' then
        raise exception 'You are not eligible for a representative position in this election';
      end if;

      if nullif(v_target_grade, '') is not null then
        v_match := regexp_match(v_position_name, '(?:grade|gr\.?|g)\s*([0-9]+)', 'i');
        if v_match is null then
          v_match := regexp_match(v_position_name, '([0-9]+)(?:st|nd|rd|th)?\s*(?:grade|gr\.?|representative|rep)', 'i');
        end if;

        v_rep_grade := case when v_match is null then null else v_match[1] end;
        if (v_rep_grade is not null and v_rep_grade <> v_target_grade)
           or (v_rep_grade is null and regexp_replace(coalesce(v_candidate_grade, ''), '[^0-9]', '', 'g') <> v_target_grade) then
          raise exception 'Candidate is outside your representative grade assignment';
        end if;
      end if;
    end if;

    insert into public.votes (voter_id, candidate_id, position_id, session_id)
    values (v_voter.id, v_candidate_id, v_position_id, p_session_id);

    update public.candidates set votes = coalesce(votes, 0) + 1 where id = v_candidate_id;
  end loop;

  insert into public.voter_sessions (voter_id, session_id, has_voted, voted_at)
  values (v_voter.id, p_session_id, true, now())
  on conflict (voter_id, session_id)
  do update set has_voted = true, voted_at = excluded.voted_at;

  update public.voters set has_voted = true, voted_at = now() where id = v_voter.id;
end;
$$;

-- Reset Session (Wipes votes for target election while preserving voter accounts)
create or replace function public.secure_reset_session(p_token text, p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
begin
  delete from public.tie_resolutions
  where verification_id in (select id from public.vote_verifications where session_id = p_session_id);

  delete from public.vote_verifications where session_id = p_session_id;
  delete from public.votes where session_id = p_session_id;

  delete from public.voter_sessions where session_id = p_session_id;

  -- Accurately recalculate voters.has_voted from any remaining active session records
  update public.voters v
  set has_voted = exists (
    select 1 from public.voter_sessions vs
    where vs.voter_id = v.id and vs.has_voted = true
  ),
  voted_at = (
    select max(vs.voted_at) from public.voter_sessions vs
    where vs.voter_id = v.id and vs.has_voted = true
  );

  update public.candidates set votes = 0 where session_id = p_session_id;

  update public.voting_sessions
  set is_active = false, status = 'upcoming', results_finalized = false,
      finalized_by = null, finalized_at = null
  where id = p_session_id;
end;
$$;

-- Retrieve Audit Data (Verifications and Tie Resolutions)
create or replace function public.secure_get_audit_data(p_token text, p_session_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
begin
  return jsonb_build_object(
    'verifications', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.created_at desc)
      from public.vote_verifications v
      where p_session_id is null or v.session_id = p_session_id
    ), '[]'::jsonb),
    'tieResolutions', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.resolved_at desc)
      from public.tie_resolutions t
      join public.vote_verifications v on v.id = t.verification_id
      where p_session_id is null or v.session_id = p_session_id
    ), '[]'::jsonb)
  );
end;
$$;

-- Initiate Tie Verification Session
create or replace function public.secure_initiate_verification(
  p_token text, p_position_id bigint, p_tied_candidate_ids jsonb,
  p_original_vote_counts jsonb, p_session_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_admin_name text;
  v_selected jsonb;
  v_session_id bigint;
  v_row public.vote_verifications%rowtype;
begin
  if jsonb_typeof(p_tied_candidate_ids) <> 'array' or jsonb_array_length(p_tied_candidate_ids) < 2 then
    raise exception 'At least two tied candidates are required';
  end if;

  select session_id into v_session_id from public.positions
  where id = p_position_id and (p_session_id is null or session_id = p_session_id);

  if v_session_id is null then
    raise exception 'Position does not belong to this election';
  end if;

  select username into v_admin_name from public.admins where id::text = v_admin_id;

  select coalesce(jsonb_agg(x.voter_id::text), '[]'::jsonb) into v_selected
  from (
    select voter_id from (
      select distinct voter_id from public.votes
      where position_id = p_position_id and session_id = v_session_id
    ) d
    order by random() limit 10
  ) x;

  insert into public.vote_verifications (
    position_id, tied_candidate_ids, selected_voter_ids,
    verification_status, verified_by, original_vote_counts, session_id
  )
  values (
    p_position_id, p_tied_candidate_ids, v_selected,
    'in_progress', coalesce(v_admin_name, 'Admin'),
    coalesce(p_original_vote_counts, '{}'::jsonb), v_session_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Audit Individual Verification Ballots
drop function if exists public.secure_get_verification_votes(text, bigint[], bigint);
drop function if exists public.secure_get_verification_votes(text, text[], bigint);
create or replace function public.secure_get_verification_votes(
  p_token text, p_voter_ids text[], p_position_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'voterId', v.voter_id::text,
      'voterName', vr.name,
      'voterLrn', vr.lrn,
      'candidateId', v.candidate_id::text,
      'candidateName', c.name
    ))
    from public.votes v
    join public.voters vr on vr.id::text = v.voter_id::text
    join public.candidates c on c.id = v.candidate_id
    where v.position_id = p_position_id and v.voter_id::text = any(p_voter_ids)
  ), '[]'::jsonb);
end;
$$;

-- Complete Audit Verification Session
create or replace function public.secure_complete_verification(
  p_token text, p_verification_id bigint, p_notes text, p_tie_remains boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
begin
  update public.vote_verifications set
    verification_status = case when p_tie_remains then 'tie_remains' else 'completed' end,
    notes = p_notes,
    verified_at = now()
  where id = p_verification_id;

  if not found then
    raise exception 'Verification record was not found';
  end if;
end;
$$;

-- Formally Break and Resolve Tie
create or replace function public.secure_resolve_tie(
  p_token text, p_verification_id bigint, p_position_id bigint,
  p_winner_id bigint, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_admin_name text;
begin
  if not exists (
    select 1 from public.vote_verifications v
    join public.candidates c on c.id = p_winner_id and c.position_id = p_position_id
    where v.id = p_verification_id and v.position_id = p_position_id
      and v.verification_status = 'tie_remains'
      and v.tied_candidate_ids ? p_winner_id::text
  ) then
    raise exception 'The selected winner is not eligible for this tie';
  end if;

  select username into v_admin_name from public.admins where id::text = v_admin_id;

  insert into public.tie_resolutions (
    verification_id, position_id, selected_winner_id,
    resolution_method, resolved_by, reason
  )
  values (
    p_verification_id, p_position_id, p_winner_id,
    'admin_selection', coalesce(v_admin_name, 'Admin'), nullif(trim(p_reason), '')
  );

  update public.vote_verifications
  set verification_status = 'completed', verified_at = now()
  where id = p_verification_id;
end;
$$;

-- Automatic School Year Rollover and Grade Advancement
create or replace function public.secure_process_rollover(p_token text, p_school_year text, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id text := public.require_app_session(p_token, 'admin');
  v_update jsonb;
begin
  if jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Rollover data is invalid';
  end if;

  insert into public.system_settings (id, current_school_year, updated_at)
  values (1, p_school_year, now())
  on conflict (id) do update
  set current_school_year = excluded.current_school_year,
      updated_at = excluded.updated_at;

  for v_update in select value from jsonb_array_elements(p_updates)
  loop
    update public.voters set
      grade_level = v_update->>'grade_level',
      section = coalesce(v_update->>'section', ''),
      status = v_update->>'status',
      academic_history = coalesce(v_update->'academic_history', '[]'::jsonb)
    where id::text = v_update->>'id';
  end loop;
end;
$$;

-- =============================================================================
-- PART 8: ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- =============================================================================

alter table public.admins enable row level security;
alter table public.system_settings enable row level security;
alter table public.election_settings enable row level security;
alter table public.voting_sessions enable row level security;
alter table public.sections enable row level security;
alter table public.positions enable row level security;
alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.voter_sessions enable row level security;
alter table public.votes enable row level security;
alter table public.vote_verifications enable row level security;
alter table public.tie_resolutions enable row level security;
alter table public.app_sessions enable row level security;

-- Public Read Policies for Frontend Browsing
drop policy if exists public_read_voting_sessions on public.voting_sessions;
create policy public_read_voting_sessions on public.voting_sessions
  for select to anon, authenticated using (true);

drop policy if exists public_read_positions on public.positions;
create policy public_read_positions on public.positions
  for select to anon, authenticated using (true);

drop policy if exists public_read_sections on public.sections;
create policy public_read_sections on public.sections
  for select to anon, authenticated using (true);

drop policy if exists public_read_system_settings on public.system_settings;
create policy public_read_system_settings on public.system_settings
  for select to anon, authenticated using (true);

drop policy if exists public_read_election_settings on public.election_settings;
create policy public_read_election_settings on public.election_settings
  for select to anon, authenticated using (true);

-- Drop any legacy insecure direct table write policies
drop policy if exists "Enable all access for voting_sessions" on public.voting_sessions;
drop policy if exists "Enable all access for voter_sessions" on public.voter_sessions;
drop policy if exists "Enable all access for system_settings" on public.system_settings;
drop policy if exists "Allow all operations on vote_verifications" on public.vote_verifications;
drop policy if exists "Allow all operations on tie_resolutions" on public.tie_resolutions;
drop policy if exists public_read_candidates on public.candidates;

-- =============================================================================
-- PART 9: GRANTS & ACCESS PERMISSIONS
-- =============================================================================

-- Direct table access: allow SELECT only on public configuration tables
grant select on public.voting_sessions to anon, authenticated;
grant select on public.positions to anon, authenticated;
grant select on public.sections to anon, authenticated;
grant select on public.system_settings to anon, authenticated;
grant select on public.election_settings to anon, authenticated;

-- Revoke direct access on sensitive tables (access must strictly flow through Security Definer RPCs)
revoke all on public.admins from public, anon, authenticated;
revoke all on public.voters from public, anon, authenticated;
revoke all on public.votes from public, anon, authenticated;
revoke all on public.voter_sessions from public, anon, authenticated;
revoke all on public.candidates from public, anon, authenticated;
revoke all on public.vote_verifications from public, anon, authenticated;
revoke all on public.tie_resolutions from public, anon, authenticated;
revoke all on public.app_sessions from public, anon, authenticated;

revoke insert, update, delete on public.voting_sessions from public, anon, authenticated;
revoke insert, update, delete on public.positions from public, anon, authenticated;
revoke insert, update, delete on public.sections from public, anon, authenticated;
revoke insert, update, delete on public.system_settings from public, anon, authenticated;
revoke insert, update, delete on public.election_settings from public, anon, authenticated;

-- Grant execution permissions for RPC functions
revoke all on function public.require_app_session(text, text) from public, anon, authenticated;

grant execute on function public.secure_login_voter(text, text) to anon, authenticated;
grant execute on function public.secure_login_admin(text, text) to anon, authenticated;
grant execute on function public.secure_logout(text) to anon, authenticated;
grant execute on function public.secure_register_voter(text, text, text, text, text) to anon, authenticated;
grant execute on function public.secure_change_admin_password(text, text, text) to anon, authenticated;
grant execute on function public.secure_bulk_register_voters(text, jsonb) to anon, authenticated;
grant execute on function public.secure_get_voters(text) to anon, authenticated;
grant execute on function public.secure_get_candidates(text, bigint) to anon, authenticated;
grant execute on function public.secure_get_voter_sessions(text, bigint) to anon, authenticated;
grant execute on function public.secure_voter_session_status(text, bigint) to anon, authenticated;
grant execute on function public.secure_update_my_section(text, text) to anon, authenticated;
grant execute on function public.secure_admin_voter_action(text, text, text) to anon, authenticated;
grant execute on function public.secure_admin_manage(text, text, bigint, jsonb) to anon, authenticated;
grant execute on function public.secure_submit_ballot(text, bigint, jsonb) to anon, authenticated;
grant execute on function public.secure_reset_session(text, bigint) to anon, authenticated;
grant execute on function public.secure_get_audit_data(text, bigint) to anon, authenticated;
grant execute on function public.secure_initiate_verification(text, bigint, jsonb, jsonb, bigint) to anon, authenticated;
grant execute on function public.secure_get_verification_votes(text, text[], bigint) to anon, authenticated;
grant execute on function public.secure_complete_verification(text, bigint, text, boolean) to anon, authenticated;
grant execute on function public.secure_resolve_tie(text, bigint, bigint, bigint, text) to anon, authenticated;
grant execute on function public.secure_process_rollover(text, text, jsonb) to anon, authenticated;

-- =============================================================================
-- PART 10: REALTIME REPLICATION PUBLICATION
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voting_sessions'
    ) then
      alter publication supabase_realtime add table public.voting_sessions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'positions'
    ) then
      alter publication supabase_realtime add table public.positions;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sections'
    ) then
      alter publication supabase_realtime add table public.sections;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'system_settings'
    ) then
      alter publication supabase_realtime add table public.system_settings;
    end if;
  end if;
end $$;

commit;

-- =============================================================================
-- VERIFICATION CONFIRMATION
-- =============================================================================
select 'CPMNHS Voting System database schema successfully initialized and verified.' as status;
