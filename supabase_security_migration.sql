-- CPMNHS security and ballot-integrity migration.
-- Run this entire file once in the Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

alter table public.admins add column if not exists must_change_password boolean not null default false;
alter table public.voters add column if not exists academic_history jsonb not null default '[]'::jsonb;

-- Normalize columns used by the current application. Existing columns and data are preserved.
alter table public.voting_sessions add column if not exists start_date timestamptz;
alter table public.voting_sessions add column if not exists end_date timestamptz;
alter table public.voting_sessions add column if not exists is_active boolean not null default false;
alter table public.voting_sessions add column if not exists schedule_status text not null default 'draft';
alter table public.voting_sessions add column if not exists grade_mappings jsonb not null default '{}'::jsonb;
alter table public.voting_sessions add column if not exists eligible_grade_levels jsonb not null default '[]'::jsonb;
alter table public.voting_sessions add column if not exists eligible_sections jsonb not null default '[]'::jsonb;
alter table public.voting_sessions add column if not exists authorization_doc_generated boolean not null default false;
alter table public.voting_sessions add column if not exists authorization_confirmed_at timestamptz;
alter table public.voting_sessions add column if not exists signatories jsonb not null default '[]'::jsonb;
alter table public.voting_sessions add column if not exists results_finalized boolean not null default false;
alter table public.voting_sessions add column if not exists finalized_by text;
alter table public.voting_sessions add column if not exists finalized_at timestamptz;

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
alter table public.voting_sessions alter column signatories set default '[]'::jsonb;

update public.voting_sessions set
  grade_mappings = case when jsonb_typeof(grade_mappings) = 'string' then (grade_mappings #>> '{}')::jsonb else coalesce(grade_mappings, '{}'::jsonb) end,
  eligible_grade_levels = case when jsonb_typeof(eligible_grade_levels) = 'string' then (eligible_grade_levels #>> '{}')::jsonb else coalesce(eligible_grade_levels, '[]'::jsonb) end,
  eligible_sections = case when jsonb_typeof(eligible_sections) = 'string' then (eligible_sections #>> '{}')::jsonb else coalesce(eligible_sections, '[]'::jsonb) end,
  signatories = case when jsonb_typeof(signatories) = 'string' then (signatories #>> '{}')::jsonb else coalesce(signatories, '[]'::jsonb) end;

create table if not exists public.vote_verifications (
  id bigserial primary key,
  position_id bigint not null references public.positions(id) on delete cascade,
  tied_candidate_ids jsonb not null default '[]'::jsonb,
  selected_voter_ids jsonb not null default '[]'::jsonb,
  verification_status text not null default 'in_progress',
  verified_by text,
  verified_at timestamptz,
  notes text,
  original_vote_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  session_id bigint references public.voting_sessions(id) on delete cascade
);

alter table public.vote_verifications add column if not exists position_id bigint references public.positions(id) on delete cascade;
alter table public.vote_verifications add column if not exists tied_candidate_ids jsonb not null default '[]'::jsonb;
alter table public.vote_verifications add column if not exists selected_voter_ids jsonb not null default '[]'::jsonb;
alter table public.vote_verifications add column if not exists verification_status text not null default 'in_progress';
alter table public.vote_verifications add column if not exists verified_by text;
alter table public.vote_verifications add column if not exists verified_at timestamptz;
alter table public.vote_verifications add column if not exists notes text;
alter table public.vote_verifications add column if not exists original_vote_counts jsonb not null default '{}'::jsonb;
alter table public.vote_verifications add column if not exists created_at timestamptz not null default now();
alter table public.vote_verifications add column if not exists session_id bigint references public.voting_sessions(id) on delete cascade;

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

alter table public.tie_resolutions add column if not exists verification_id bigint references public.vote_verifications(id) on delete cascade;
alter table public.tie_resolutions add column if not exists position_id bigint references public.positions(id) on delete cascade;
alter table public.tie_resolutions add column if not exists selected_winner_id bigint references public.candidates(id) on delete cascade;
alter table public.tie_resolutions add column if not exists resolution_method text not null default 'admin_selection';
alter table public.tie_resolutions add column if not exists resolved_by text;
alter table public.tie_resolutions add column if not exists resolved_at timestamptz not null default now();
alter table public.tie_resolutions add column if not exists reason text;

create table if not exists public.system_settings (
  id integer primary key,
  current_school_year text not null,
  updated_at timestamptz not null default now()
);

alter table public.vote_verifications alter column tied_candidate_ids drop default;
alter table public.vote_verifications alter column tied_candidate_ids type jsonb using tied_candidate_ids::jsonb;
alter table public.vote_verifications alter column tied_candidate_ids set default '[]'::jsonb;
alter table public.vote_verifications alter column selected_voter_ids drop default;
alter table public.vote_verifications alter column selected_voter_ids type jsonb using selected_voter_ids::jsonb;
alter table public.vote_verifications alter column selected_voter_ids set default '[]'::jsonb;
alter table public.vote_verifications alter column original_vote_counts drop default;
alter table public.vote_verifications alter column original_vote_counts type jsonb using original_vote_counts::jsonb;
alter table public.vote_verifications alter column original_vote_counts set default '{}'::jsonb;

update public.vote_verifications set
  tied_candidate_ids = case when jsonb_typeof(tied_candidate_ids) = 'string' then (tied_candidate_ids #>> '{}')::jsonb else coalesce(tied_candidate_ids, '[]'::jsonb) end,
  selected_voter_ids = case when jsonb_typeof(selected_voter_ids) = 'string' then (selected_voter_ids #>> '{}')::jsonb else coalesce(selected_voter_ids, '[]'::jsonb) end,
  original_vote_counts = case when jsonb_typeof(original_vote_counts) = 'string' then (original_vote_counts #>> '{}')::jsonb else coalesce(original_vote_counts, '{}'::jsonb) end;

create table if not exists public.app_sessions (
  token_hash bytea primary key,
  user_id bigint not null,
  role text not null check (role in ('admin', 'voter')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_expiry_idx on public.app_sessions (expires_at);

-- Enforce one ballot choice per voter, position, and election session.
delete from public.votes newer
using public.votes older
where newer.id > older.id
  and newer.voter_id = older.voter_id
  and newer.position_id = older.position_id
  and newer.session_id = older.session_id;

delete from public.voter_sessions newer
using public.voter_sessions older
where newer.id > older.id
  and newer.voter_id = older.voter_id
  and newer.session_id = older.session_id;

-- Keep the cached candidate totals consistent if duplicate ballots were removed.
update public.candidates c
set votes = (select count(*) from public.votes v where v.candidate_id = c.id);

create unique index if not exists votes_one_choice_per_position
  on public.votes (voter_id, position_id, session_id);
create unique index if not exists voter_sessions_one_row
  on public.voter_sessions (voter_id, session_id);

create or replace function public.require_app_session(p_token text, p_role text default null)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id bigint;
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
  if v.password_hash not like '$2%' then
    update public.voters set password_hash = crypt(p_password, gen_salt('bf', 10)) where id = v.id;
  end if;
  if v.status <> 'approved' then raise exception 'Account is not approved'; end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  delete from public.app_sessions where expires_at <= now();
  insert into public.app_sessions(token_hash, user_id, role, expires_at)
  values (digest(v_token, 'sha256'), v.id, 'voter', now() + interval '12 hours');
  return jsonb_build_object(
    'token', v_token,
    'user', jsonb_build_object('id', v.id::text, 'role', 'voter', 'name', v.name,
      'lrn', v.lrn, 'gradeLevel', v.grade_level, 'section', v.section),
    'hasVoted', false
  );
end;
$$;

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
  if v.password_hash not like '$2%' then
    update public.admins set password_hash = crypt(p_password, gen_salt('bf', 12)), must_change_password = true where id = v.id;
    v.must_change_password := true;
  end if;
  v_token := encode(gen_random_bytes(32), 'hex');
  delete from public.app_sessions where expires_at <= now();
  insert into public.app_sessions(token_hash, user_id, role, expires_at)
  values (digest(v_token, 'sha256'), v.id, 'admin', now() + interval '8 hours');
  return jsonb_build_object(
    'token', v_token,
    'user', jsonb_build_object('id', v.id::text, 'role', 'admin', 'name', v.username, 'email', v.email),
    'mustChangePassword', coalesce(v.must_change_password, false)
  );
end;
$$;

create or replace function public.secure_logout(p_token text)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$ delete from public.app_sessions where token_hash = digest(p_token, 'sha256') $$;

create or replace function public.secure_register_voter(
  p_lrn text, p_name text, p_grade_level text, p_section text, p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if trim(p_lrn) !~ '^[0-9]{12}$' then raise exception 'LRN must contain exactly 12 digits'; end if;
  if length(p_password) < 8 then raise exception 'Password must contain at least 8 characters'; end if;
  insert into public.voters(lrn, name, grade_level, section, password_hash, status)
  values (trim(p_lrn), trim(p_name), trim(p_grade_level), trim(p_section), crypt(p_password, gen_salt('bf', 10)), 'pending');
exception when unique_violation then
  raise exception 'This LRN is already registered';
end;
$$;

create or replace function public.secure_change_admin_password(
  p_token text, p_current_password text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_hash text;
begin
  if length(p_new_password) < 12 then raise exception 'New password must contain at least 12 characters'; end if;
  select password_hash into v_hash from public.admins where id = v_admin_id for update;
  if crypt(p_current_password, v_hash) <> v_hash then raise exception 'Current password is incorrect'; end if;
  update public.admins set password_hash = crypt(p_new_password, gen_salt('bf', 12)), must_change_password = false
  where id = v_admin_id;
end;
$$;

create or replace function public.secure_bulk_register_voters(p_token text, p_students jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_student jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_students) <> 'array' then raise exception 'Student list is invalid'; end if;
  for v_student in select value from jsonb_array_elements(p_students)
  loop
    if (v_student->>'lrn') !~ '^[0-9]{12}$' or length(coalesce(v_student->>'password', '')) < 8 then
      raise exception 'Every student requires a 12-digit LRN and an 8-character password';
    end if;
    insert into public.voters(lrn, name, grade_level, section, password_hash, status)
    values (v_student->>'lrn', trim(v_student->>'name'), v_student->>'gradeLevel', v_student->>'section',
      crypt(v_student->>'password', gen_salt('bf', 10)), 'approved');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.secure_get_voters(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id bigint;
  v_role text;
begin
  select user_id, role into v_user_id, v_role from public.app_sessions
  where token_hash = digest(p_token, 'sha256') and expires_at > now();
  if v_user_id is null then raise exception 'Invalid or expired session'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id, 'lrn', v.lrn, 'name', v.name, 'grade_level', v.grade_level,
      'section', v.section, 'status', v.status, 'has_voted', v.has_voted,
      'voted_at', v.voted_at, 'created_at', v.created_at, 'academic_history', v.academic_history
    ) order by v.created_at desc)
    from public.voters v where v_role = 'admin' or v.id = v_user_id
  ), '[]'::jsonb);
end;
$$;

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
    join public.voting_sessions s on s.id = c.session_id
    where p_session_id is null or c.session_id = p_session_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.secure_get_voter_sessions(p_token text, p_session_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id bigint;
  v_role text;
begin
  select user_id, role into v_user_id, v_role from public.app_sessions
  where token_hash = digest(p_token, 'sha256') and expires_at > now();
  if v_user_id is null then raise exception 'Invalid or expired session'; end if;
  return coalesce((select jsonb_agg(to_jsonb(vs)) from public.voter_sessions vs
    where vs.session_id = p_session_id and (v_role = 'admin' or vs.voter_id = v_user_id)), '[]'::jsonb);
end;
$$;

create or replace function public.secure_admin_voter_action(
  p_token text, p_action text, p_voter_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
begin
  case p_action
    when 'approve' then update public.voters set status = 'approved' where id = p_voter_id;
    when 'reject' then update public.voters set status = 'rejected' where id = p_voter_id;
    when 'approve_all' then update public.voters set status = 'approved' where status = 'pending';
    when 'delete' then
      delete from public.votes where voter_id = p_voter_id;
      delete from public.voter_sessions where voter_id = p_voter_id;
      delete from public.voters where id = p_voter_id;
    else raise exception 'Unsupported voter action';
  end case;
end;
$$;

create or replace function public.secure_admin_manage(
  p_token text, p_action text, p_id bigint default null, p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_new_id bigint;
  v_original public.voting_sessions%rowtype;
  v_position public.positions%rowtype;
  v_candidate public.candidates%rowtype;
  v_map jsonb := '{}'::jsonb;
  v_keep_id bigint;
  v_count integer := 0;
begin
  case p_action
    when 'create_session' then
      insert into public.voting_sessions(name, school_year, status, schedule_status, start_date, end_date,
        grade_mappings, eligible_grade_levels, eligible_sections)
      values (coalesce(nullif(trim(p_payload->>'name'), ''), 'New Election'),
        coalesce(nullif(trim(p_payload->>'school_year'), ''), '2026-2027'), 'upcoming', 'draft',
        (p_payload->>'start_date')::timestamptz, (p_payload->>'end_date')::timestamptz,
        coalesce(p_payload->'grade_mappings', '{}'::jsonb),
        coalesce(p_payload->'eligible_grade_levels', '[]'::jsonb),
        coalesce(p_payload->'eligible_sections', '[]'::jsonb))
      returning id into v_new_id;
      return (select to_jsonb(s) from public.voting_sessions s where s.id = v_new_id);

    when 'update_session' then
      update public.voting_sessions set
        name = case when p_payload ? 'name' then p_payload->>'name' else name end,
        school_year = case when p_payload ? 'school_year' then p_payload->>'school_year' else school_year end,
        start_date = case when p_payload ? 'start_date' then (p_payload->>'start_date')::timestamptz else start_date end,
        end_date = case when p_payload ? 'end_date' then (p_payload->>'end_date')::timestamptz else end_date end,
        is_active = case when p_payload ? 'is_active' then (p_payload->>'is_active')::boolean else is_active end,
        status = case when p_payload ? 'status' then p_payload->>'status' else status end,
        schedule_status = case when p_payload ? 'schedule_status' then p_payload->>'schedule_status' else schedule_status end,
        grade_mappings = case when p_payload ? 'grade_mappings' then p_payload->'grade_mappings' else grade_mappings end,
        eligible_grade_levels = case when p_payload ? 'eligible_grade_levels' then p_payload->'eligible_grade_levels' else eligible_grade_levels end,
        eligible_sections = case when p_payload ? 'eligible_sections' then p_payload->'eligible_sections' else eligible_sections end,
        authorization_doc_generated = case when p_payload ? 'authorization_doc_generated' then (p_payload->>'authorization_doc_generated')::boolean else authorization_doc_generated end,
        authorization_confirmed_at = case when p_payload ? 'authorization_confirmed_at' then (p_payload->>'authorization_confirmed_at')::timestamptz else authorization_confirmed_at end,
        signatories = case when p_payload ? 'signatories' then p_payload->'signatories' else signatories end,
        results_finalized = case when p_payload ? 'results_finalized' then (p_payload->>'results_finalized')::boolean else results_finalized end,
        finalized_by = case when p_payload ? 'finalized_by' then p_payload->>'finalized_by' else finalized_by end,
        finalized_at = case when p_payload ? 'finalized_at' then (p_payload->>'finalized_at')::timestamptz else finalized_at end
      where id = p_id;

    when 'delete_session' then
      delete from public.voting_sessions where id = p_id;

    when 'duplicate_session' then
      select * into v_original from public.voting_sessions where id = p_id;
      if v_original.id is null then raise exception 'Election session not found'; end if;
      insert into public.voting_sessions(name, school_year, grade_mappings, eligible_grade_levels,
        eligible_sections, status, schedule_status)
      values (v_original.name || ' (Copy)', v_original.school_year, v_original.grade_mappings,
        v_original.eligible_grade_levels, v_original.eligible_sections, 'upcoming', 'draft')
      returning id into v_new_id;
      for v_position in select * from public.positions where session_id = p_id loop
        insert into public.positions(name, display_order, max_votes, strict_grade_mapping, session_id)
        values (v_position.name, v_position.display_order, v_position.max_votes,
          v_position.strict_grade_mapping, v_new_id) returning id into v_keep_id;
        v_map := v_map || jsonb_build_object(v_position.id::text, v_keep_id);
      end loop;
      for v_candidate in select * from public.candidates where session_id = p_id loop
        insert into public.candidates(name, party, motto, photo_url, grade_level, section, position_id, session_id, votes)
        values (v_candidate.name, v_candidate.party, v_candidate.motto, v_candidate.photo_url,
          v_candidate.grade_level, v_candidate.section, (v_map->>v_candidate.position_id::text)::bigint, v_new_id, 0);
      end loop;
      return (select to_jsonb(s) from public.voting_sessions s where s.id = v_new_id);

    when 'add_candidate' then
      if not exists (select 1 from public.positions where id = (p_payload->>'position_id')::bigint
        and session_id = (p_payload->>'session_id')::bigint) then raise exception 'Position does not belong to this election'; end if;
      insert into public.candidates(name, party, motto, photo_url, grade_level, section, position_id, session_id, votes)
      values (trim(p_payload->>'name'), coalesce(nullif(trim(p_payload->>'party'), ''), 'Independent'),
        coalesce(p_payload->>'motto', ''), coalesce(p_payload->>'photo_url', ''), coalesce(p_payload->>'grade_level', ''),
        coalesce(p_payload->>'section', ''), (p_payload->>'position_id')::bigint, (p_payload->>'session_id')::bigint, 0);

    when 'update_candidate' then
      if p_payload ? 'position_id' and not exists (
        select 1 from public.positions p join public.candidates c on c.id = p_id
        where p.id = (p_payload->>'position_id')::bigint and p.session_id = c.session_id
      ) then raise exception 'Position does not belong to this election'; end if;
      update public.candidates set
        name = case when p_payload ? 'name' then trim(p_payload->>'name') else name end,
        party = case when p_payload ? 'party' then coalesce(nullif(trim(p_payload->>'party'), ''), 'Independent') else party end,
        motto = case when p_payload ? 'motto' then p_payload->>'motto' else motto end,
        photo_url = case when p_payload ? 'photo_url' then p_payload->>'photo_url' else photo_url end,
        grade_level = case when p_payload ? 'grade_level' then p_payload->>'grade_level' else grade_level end,
        section = case when p_payload ? 'section' then p_payload->>'section' else section end,
        position_id = case when p_payload ? 'position_id' then (p_payload->>'position_id')::bigint else position_id end
      where id = p_id;

    when 'delete_candidate' then delete from public.candidates where id = p_id;

    when 'add_position' then
      if exists (select 1 from public.positions where session_id = (p_payload->>'session_id')::bigint
        and lower(trim(name)) = lower(trim(p_payload->>'name'))) then raise exception 'A position with this name already exists'; end if;
      insert into public.positions(name, display_order, max_votes, strict_grade_mapping, session_id)
      values (trim(p_payload->>'name'), coalesce((p_payload->>'display_order')::integer, 0),
        coalesce((p_payload->>'max_votes')::integer, 1), coalesce((p_payload->>'strict_grade_mapping')::boolean, false),
        (p_payload->>'session_id')::bigint);

    when 'delete_position' then delete from public.positions where id = p_id;

    when 'cleanup_positions' then
      for v_position in select * from public.positions p where p.session_id = p_id order by p.id loop
        select min(id) into v_keep_id from public.positions
        where session_id = p_id and lower(trim(name)) = lower(trim(v_position.name));
        if v_keep_id <> v_position.id then
          update public.candidates set position_id = v_keep_id where position_id = v_position.id;
          update public.votes set position_id = v_keep_id where position_id = v_position.id;
          delete from public.positions where id = v_position.id;
          v_count := v_count + 1;
        end if;
      end loop;
      return jsonb_build_object('success', true, 'count', v_count);

    when 'add_section' then
      insert into public.sections(name, grade_level) values (trim(p_payload->>'name'), p_payload->>'grade_level');
    when 'delete_section' then delete from public.sections where id = p_id;
    else raise exception 'Unsupported administrator action';
  end case;
  if not found then raise exception 'Requested record was not found'; end if;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.secure_process_rollover(p_token text, p_school_year text, p_updates jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_update jsonb;
begin
  if jsonb_typeof(p_updates) <> 'array' then raise exception 'Rollover data is invalid'; end if;
  insert into public.system_settings(id, current_school_year, updated_at)
  values (1, p_school_year, now())
  on conflict (id) do update set current_school_year = excluded.current_school_year, updated_at = excluded.updated_at;
  for v_update in select value from jsonb_array_elements(p_updates)
  loop
    update public.voters set
      grade_level = v_update->>'grade_level', section = coalesce(v_update->>'section', ''),
      status = v_update->>'status', academic_history = v_update->'academic_history'
    where id = (v_update->>'id')::bigint;
  end loop;
end;
$$;

create or replace function public.secure_get_verification_votes(
  p_token text, p_voter_ids bigint[], p_position_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'voterId', v.voter_id::text, 'voterName', vr.name, 'voterLrn', vr.lrn,
      'candidateId', v.candidate_id::text, 'candidateName', c.name
    ))
    from public.votes v
    join public.voters vr on vr.id = v.voter_id
    join public.candidates c on c.id = v.candidate_id
    where v.position_id = p_position_id and v.voter_id = any(p_voter_ids)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.secure_get_audit_data(p_token text, p_session_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
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

create or replace function public.secure_initiate_verification(
  p_token text, p_position_id bigint, p_tied_candidate_ids jsonb,
  p_original_vote_counts jsonb, p_session_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_admin_name text;
  v_selected jsonb;
  v_session_id bigint;
  v_row public.vote_verifications%rowtype;
begin
  if jsonb_typeof(p_tied_candidate_ids) <> 'array' or jsonb_array_length(p_tied_candidate_ids) < 2 then
    raise exception 'At least two tied candidates are required';
  end if;
  select session_id into v_session_id from public.positions where id = p_position_id
    and (p_session_id is null or session_id = p_session_id);
  if v_session_id is null then
    raise exception 'Position does not belong to this election';
  end if;
  select username into v_admin_name from public.admins where id = v_admin_id;
  select coalesce(jsonb_agg(x.voter_id::text), '[]'::jsonb) into v_selected
  from (
    select voter_id from public.votes
    where position_id = p_position_id and session_id = v_session_id
    group by voter_id
    order by random() limit 10
  ) x;
  insert into public.vote_verifications(position_id, tied_candidate_ids, selected_voter_ids,
    verification_status, verified_by, original_vote_counts, session_id)
  values (p_position_id, p_tied_candidate_ids, v_selected, 'in_progress',
    coalesce(v_admin_name, 'Admin'), coalesce(p_original_vote_counts, '{}'::jsonb), v_session_id)
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

create or replace function public.secure_complete_verification(
  p_token text, p_verification_id bigint, p_notes text, p_tie_remains boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
begin
  update public.vote_verifications set
    verification_status = case when p_tie_remains then 'tie_remains' else 'completed' end,
    notes = p_notes,
    verified_at = now()
  where id = p_verification_id;
  if not found then raise exception 'Verification record was not found'; end if;
end;
$$;

create or replace function public.secure_resolve_tie(
  p_token text, p_verification_id bigint, p_position_id bigint,
  p_winner_id bigint, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
  v_admin_name text;
begin
  if not exists (
    select 1 from public.vote_verifications v
    join public.candidates c on c.id = p_winner_id and c.position_id = p_position_id
    where v.id = p_verification_id and v.position_id = p_position_id
      and v.verification_status = 'tie_remains'
      and v.tied_candidate_ids ? p_winner_id::text
  ) then raise exception 'The selected winner is not eligible for this tie'; end if;
  select username into v_admin_name from public.admins where id = v_admin_id;
  insert into public.tie_resolutions(verification_id, position_id, selected_winner_id,
    resolution_method, resolved_by, reason)
  values (p_verification_id, p_position_id, p_winner_id, 'admin_selection',
    coalesce(v_admin_name, 'Admin'), nullif(trim(p_reason), ''));
  update public.vote_verifications set verification_status = 'completed', verified_at = now()
  where id = p_verification_id;
end;
$$;

create or replace function public.secure_update_my_section(p_token text, p_section text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.voters set section = trim(p_section)
  where id = public.require_app_session(p_token, 'voter');
end;
$$;

create or replace function public.secure_voter_session_status(p_token text, p_session_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_voter_id bigint := public.require_app_session(p_token, 'voter');
  v_row public.voter_sessions%rowtype;
begin
  select * into v_row from public.voter_sessions
  where voter_id = v_voter_id and session_id = p_session_id;
  return jsonb_build_object('hasVoted', coalesce(v_row.has_voted, false), 'votedAt', v_row.voted_at);
end;
$$;

create or replace function public.secure_submit_ballot(p_token text, p_session_id bigint, p_votes jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_voter_id bigint := public.require_app_session(p_token, 'voter');
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
  select * into v_voter from public.voters where id = v_voter_id for update;
  if v_voter.status <> 'approved' then raise exception 'Voter is not eligible'; end if;
  if jsonb_typeof(v_session.eligible_grade_levels) = 'array'
     and jsonb_array_length(v_session.eligible_grade_levels) > 0
     and not (v_session.eligible_grade_levels ? coalesce(v_voter.grade_level, '')) then
    raise exception 'Your grade level is not eligible for this election';
  end if;
  if jsonb_typeof(v_session.eligible_sections) = 'array'
     and jsonb_array_length(v_session.eligible_sections) > 0
     and not (v_session.eligible_sections ? coalesce(v_voter.section, '')) then
    raise exception 'Your section is not eligible for this election';
  end if;
  if exists (select 1 from public.voter_sessions where voter_id = v_voter_id and session_id = p_session_id and has_voted) then
    raise exception 'You have already voted in this election';
  end if;

  for v_vote in select value from jsonb_array_elements(p_votes)
  loop
    v_position_id := (v_vote->>'position_id')::bigint;
    v_candidate_id := (v_vote->>'candidate_id')::bigint;
    if v_position_id = any(v_seen) then raise exception 'A position appears more than once in this ballot'; end if;
    v_seen := array_append(v_seen, v_position_id);
    select p.name, c.grade_level into v_position_name, v_candidate_grade
    from public.candidates c join public.positions p on p.id = c.position_id
    where c.id = v_candidate_id and c.position_id = v_position_id
      and c.session_id = p_session_id and p.session_id = p_session_id;
    if v_position_name is null then raise exception 'Invalid candidate selection'; end if;

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
           or (v_rep_grade is null and coalesce(v_candidate_grade, '') <> v_target_grade) then
          raise exception 'Candidate is outside your representative grade assignment';
        end if;
      end if;
    end if;
    insert into public.votes(voter_id, candidate_id, position_id, session_id)
    values (v_voter_id, v_candidate_id, v_position_id, p_session_id);
    update public.candidates set votes = coalesce(votes, 0) + 1 where id = v_candidate_id;
  end loop;

  insert into public.voter_sessions(voter_id, session_id, has_voted, voted_at)
  values (v_voter_id, p_session_id, true, now())
  on conflict (voter_id, session_id)
  do update set has_voted = true, voted_at = excluded.voted_at;
end;
$$;

create or replace function public.secure_reset_session(p_token text, p_session_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id bigint := public.require_app_session(p_token, 'admin');
begin
  if to_regclass('public.tie_resolutions') is not null and to_regclass('public.vote_verifications') is not null then
    execute 'delete from public.tie_resolutions where verification_id in (select id from public.vote_verifications where session_id = $1)'
      using p_session_id;
  end if;
  if to_regclass('public.vote_verifications') is not null then
    execute 'delete from public.vote_verifications where session_id = $1' using p_session_id;
  end if;
  delete from public.votes where session_id = p_session_id;
  delete from public.voter_sessions where session_id = p_session_id;
  update public.candidates set votes = 0 where session_id = p_session_id;
  update public.voting_sessions set is_active = false, status = 'upcoming', results_finalized = false,
    finalized_by = null, finalized_at = null where id = p_session_id;
end;
$$;

revoke all on public.app_sessions from public, anon, authenticated;
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
grant execute on function public.secure_admin_voter_action(text, text, bigint) to anon, authenticated;
grant execute on function public.secure_admin_manage(text, text, bigint, jsonb) to anon, authenticated;
grant execute on function public.secure_process_rollover(text, text, jsonb) to anon, authenticated;
grant execute on function public.secure_get_verification_votes(text, bigint[], bigint) to anon, authenticated;
grant execute on function public.secure_get_audit_data(text, bigint) to anon, authenticated;
grant execute on function public.secure_initiate_verification(text, bigint, jsonb, jsonb, bigint) to anon, authenticated;
grant execute on function public.secure_complete_verification(text, bigint, text, boolean) to anon, authenticated;
grant execute on function public.secure_resolve_tie(text, bigint, bigint, bigint, text) to anon, authenticated;
grant execute on function public.secure_update_my_section(text, text) to anon, authenticated;
grant execute on function public.secure_voter_session_status(text, bigint) to anon, authenticated;
grant execute on function public.secure_submit_ballot(text, bigint, jsonb) to anon, authenticated;
grant execute on function public.secure_reset_session(text, bigint) to anon, authenticated;

-- Browser roles may read public election configuration, but all writes and sensitive reads go through RPCs.
revoke all on public.admins, public.voters, public.votes, public.voter_sessions,
  public.candidates, public.vote_verifications, public.tie_resolutions from public, anon, authenticated;
revoke insert, update, delete on public.voting_sessions, public.positions, public.sections
  from public, anon, authenticated;
grant select on public.voting_sessions, public.positions, public.sections
  to anon, authenticated;

alter table public.admins enable row level security;
alter table public.voters enable row level security;
alter table public.votes enable row level security;
alter table public.voter_sessions enable row level security;
alter table public.voting_sessions enable row level security;
alter table public.candidates enable row level security;
alter table public.positions enable row level security;
alter table public.sections enable row level security;
alter table public.vote_verifications enable row level security;
alter table public.tie_resolutions enable row level security;

drop policy if exists public_read_voting_sessions on public.voting_sessions;
create policy public_read_voting_sessions on public.voting_sessions for select to anon, authenticated using (true);
drop policy if exists public_read_candidates on public.candidates;
drop policy if exists public_read_positions on public.positions;
create policy public_read_positions on public.positions for select to anon, authenticated using (true);
drop policy if exists public_read_sections on public.sections;
create policy public_read_sections on public.sections for select to anon, authenticated using (true);

commit;
