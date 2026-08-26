-- ================================================================
-- CPMNHS iVote — Multiple Voting Sessions Migration
-- Run this script in your Supabase SQL Editor
-- ================================================================

-- 1. Create the voting_sessions table
CREATE TABLE IF NOT EXISTS public.voting_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL DEFAULT 'New Election',
    school_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'active', 'completed', 'finalized')),
    grade_mappings JSONB DEFAULT '{}'::jsonb,
    eligible_grade_levels JSONB DEFAULT '[]'::jsonb,
    eligible_sections JSONB DEFAULT '[]'::jsonb,
    results_finalized BOOLEAN DEFAULT FALSE,
    finalized_by VARCHAR(100),
    finalized_at TIMESTAMPTZ,
    schedule_status VARCHAR(50) DEFAULT 'draft',
    authorization_doc_generated BOOLEAN DEFAULT FALSE,
    authorization_confirmed_at TEXT,
    signatories JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the voter_sessions table
CREATE TABLE IF NOT EXISTS public.voter_sessions (
    id SERIAL PRIMARY KEY,
    voter_id UUID NOT NULL REFERENCES public.voters(id) ON DELETE CASCADE,
    session_id INT NOT NULL REFERENCES public.voting_sessions(id) ON DELETE CASCADE,
    has_voted BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMPTZ,
    UNIQUE(voter_id, session_id)
);

-- 3. Add session_id columns to existing tables
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS session_id INT REFERENCES public.voting_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS session_id INT REFERENCES public.voting_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS session_id INT REFERENCES public.voting_sessions(id) ON DELETE CASCADE;

-- Add session_id to vote_verifications if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vote_verifications' AND table_schema = 'public') THEN
        ALTER TABLE public.vote_verifications ADD COLUMN IF NOT EXISTS session_id INT REFERENCES public.voting_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Migrate legacy election_settings data into voting_sessions as Session 1
INSERT INTO public.voting_sessions (id, name, school_year, start_date, end_date, is_active, status, grade_mappings, results_finalized, finalized_by, finalized_at, schedule_status, authorization_doc_generated, signatories)
SELECT
    1,
    COALESCE(name, 'SSG General Election'),
    COALESCE(school_year, '2026-2027'),
    start_date,
    end_date,
    COALESCE(is_active, false),
    CASE
        WHEN results_finalized = true THEN 'finalized'
        WHEN is_active = true THEN 'active'
        ELSE 'upcoming'
    END,
    COALESCE(grade_mappings, '{}'::jsonb),
    COALESCE(results_finalized, false),
    finalized_by,
    finalized_at,
    COALESCE(schedule_status, 'draft'),
    COALESCE(authorization_doc_generated, false),
    COALESCE(signatories, '{}'::jsonb)
FROM public.election_settings
WHERE id = 1
ON CONFLICT (id) DO NOTHING;

-- If election_settings was empty, create a default session
INSERT INTO public.voting_sessions (id, name, school_year)
VALUES (1, 'SSG General Election', '2026-2027')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence to avoid collision
SELECT setval('voting_sessions_id_seq', GREATEST((SELECT MAX(id) FROM public.voting_sessions), 1));

-- 5. Link all existing data to session 1
UPDATE public.positions SET session_id = 1 WHERE session_id IS NULL;
UPDATE public.candidates SET session_id = 1 WHERE session_id IS NULL;
UPDATE public.votes SET session_id = 1 WHERE session_id IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vote_verifications' AND table_schema = 'public') THEN
        EXECUTE 'UPDATE public.vote_verifications SET session_id = 1 WHERE session_id IS NULL';
    END IF;
END $$;

-- 6. Migrate voter voting status to voter_sessions
INSERT INTO public.voter_sessions (voter_id, session_id, has_voted, voted_at)
SELECT id, 1, has_voted, voted_at
FROM public.voters
WHERE has_voted = TRUE
ON CONFLICT (voter_id, session_id) DO NOTHING;

-- 7. Make session_id NOT NULL after migration
ALTER TABLE public.positions ALTER COLUMN session_id SET DEFAULT 1;
ALTER TABLE public.candidates ALTER COLUMN session_id SET DEFAULT 1;
ALTER TABLE public.votes ALTER COLUMN session_id SET DEFAULT 1;

-- 8. Enable RLS on new tables
ALTER TABLE public.voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voter_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for voting_sessions" ON public.voting_sessions;
DROP POLICY IF EXISTS "Enable all access for voter_sessions" ON public.voter_sessions;

CREATE POLICY "Enable all access for voting_sessions" ON public.voting_sessions FOR ALL USING (true);
CREATE POLICY "Enable all access for voter_sessions" ON public.voter_sessions FOR ALL USING (true);

-- Done! Your existing data is now linked to Session 1.
-- The system will continue working with Session 1 as the default.
