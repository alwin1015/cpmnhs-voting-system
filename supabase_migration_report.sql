-- Election Report System Migration
-- Run this in Supabase SQL Editor

-- 1. Vote Verifications table - stores manual verification sessions
CREATE TABLE IF NOT EXISTS vote_verifications (
    id SERIAL PRIMARY KEY,
    position_id INT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    tied_candidate_ids TEXT NOT NULL, -- JSON array of candidate IDs
    selected_voter_ids TEXT NOT NULL, -- JSON array of randomly selected voter IDs
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- status values: 'pending', 'in_progress', 'completed', 'tie_remains'
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    notes TEXT,
    original_vote_counts TEXT, -- JSON snapshot of original counts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tie Resolutions table - records how ties were broken
CREATE TABLE IF NOT EXISTS tie_resolutions (
    id SERIAL PRIMARY KEY,
    verification_id INT NOT NULL REFERENCES vote_verifications(id) ON DELETE CASCADE,
    position_id INT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    selected_winner_id INT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    resolution_method VARCHAR(100) NOT NULL DEFAULT 'admin_selection',
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- 3. Add finalization columns to election_settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'election_settings' AND column_name = 'results_finalized'
    ) THEN
        ALTER TABLE election_settings ADD COLUMN results_finalized BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'election_settings' AND column_name = 'finalized_by'
    ) THEN
        ALTER TABLE election_settings ADD COLUMN finalized_by VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'election_settings' AND column_name = 'finalized_at'
    ) THEN
        ALTER TABLE election_settings ADD COLUMN finalized_at TIMESTAMP;
    END IF;
END $$;

-- 4. Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE vote_verifications;
ALTER PUBLICATION supabase_realtime ADD TABLE tie_resolutions;

-- 5. Enable RLS (Row Level Security) but allow all operations for now
ALTER TABLE vote_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tie_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on vote_verifications" ON vote_verifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tie_resolutions" ON tie_resolutions FOR ALL USING (true) WITH CHECK (true);
