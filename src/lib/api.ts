import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const api = {
  // ==================== Auth ====================
  login: async (lrn: string, password: string) => {
    const { data: voter, error } = await supabase.from('voters').select('*').eq('lrn', lrn).single();
    if (error || !voter) throw new Error('You input a wrong password or LRN');
    
    const isValid = await bcrypt.compare(password, voter.password_hash);
    if (!isValid) throw new Error('You input a wrong password or LRN');
    
    if (voter.status !== 'approved') throw new Error('Your account is still pending for approval');
    
    const user = {
      id: voter.id,
      role: 'voter',
      name: voter.name,
      lrn: voter.lrn,
      gradeLevel: voter.grade_level,
      section: voter.section
    };
    localStorage.setItem('voting_session', JSON.stringify({ user, has_voted: false }));
    
    return { success: true, user, hasVoted: false };
  },

  requestPasswordReset: async (lrn: string) => {
    const { data: voter, error: searchError } = await supabase.from('voters').select('id').eq('lrn', lrn).single();
    if (searchError || !voter) throw new Error('LRN not found in our records.');
    
    const { error } = await supabase.from('voters').update({ status: 'pending' }).eq('lrn', lrn);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  adminLogin: async (username: string, password: string) => {
    const { data: admin, error } = await supabase.from('admins').select('*').eq('username', username).single();
    if (error || !admin) throw new Error('Invalid username or password');
    
    let isValid = false;
    if (password === admin.password_hash) {
        isValid = true;
    } else {
        isValid = await bcrypt.compare(password, admin.password_hash).catch(() => false);
    }
    
    if (!isValid) throw new Error('Invalid username or password');
    
    const user = { id: admin.id, role: 'admin', name: admin.username, email: admin.email };
    localStorage.setItem('voting_session', JSON.stringify({ user, has_voted: false }));
    
    return { success: true, user };
  },

  register: async (data: any) => {
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    let fullName = data.name;
    if (!fullName && data.firstName && data.lastName) {
      fullName = `${data.firstName} ${data.middleInitial ? data.middleInitial + '. ' : ''}${data.lastName}`.trim();
    }

    const { error } = await supabase.from('voters').insert({
      lrn: data.lrn,
      name: fullName,
      grade_level: data.gradeLevel,
      section: data.section,
      password_hash: hash,
      status: 'pending'
    });

    if (error) throw new Error(error.message);
    return { success: true, message: 'Registration submitted! Please wait for admin approval.' };
  },

  bulkRegister: async (students: any[]) => {
    const records = await Promise.all(students.map(async (s) => {
      const hash = await bcrypt.hash(s.password, SALT_ROUNDS);
      return {
        lrn: s.lrn,
        name: s.name,
        grade_level: s.gradeLevel,
        section: s.section,
        password_hash: hash,
        status: 'approved'
      };
    }));
    
    const { error } = await supabase.from('voters').insert(records);
    if (error) throw new Error(error.message);
    return { success: true, message: 'Bulk registration processed.' };
  },

  adminRegister: async (data: { username: string; email: string; password: string }) => {
    const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const { error } = await supabase.from('admins').insert({
      username: data.username,
      email: data.email,
      password_hash: hash
    });

    if (error) throw new Error(error.message);
    return { success: true, message: 'Admin registration successful! You can now login.' };
  },

  logout: async () => {
    localStorage.removeItem('voting_session');
    return { success: true };
  },

  getMe: async () => {
    const session = localStorage.getItem('voting_session');
    if (!session) return { user: null };
    return JSON.parse(session);
  },

  // ==================== Voters (Global Registry) ====================
  getVoters: async () => {
    const { data, error } = await supabase.from('voters').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },
  
  approveVoter: async (id: string) => {
    const { error } = await supabase.from('voters').update({ status: 'approved' }).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  updateMySection: async (voterId: string, newSection: string) => {
    const { error } = await supabase.from('voters').update({ section: newSection }).eq('id', voterId);
    if (error) throw new Error(error.message);
    
    // Update local storage session
    const sessionStr = localStorage.getItem('voting_session');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.user && session.user.id === voterId) {
        session.user.section = newSection;
        localStorage.setItem('voting_session', JSON.stringify(session));
      }
    }
    return { success: true };
  },
  
  rejectVoter: async (id: string) => {
    const { error } = await supabase.from('voters').update({ status: 'rejected' }).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  resetVoter: async (id: string) => {
    const { error } = await supabase.from('voters').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ==================== Voter Sessions (Per-Session Voting Status) ====================
  getVoterSessions: async (sessionId: string) => {
    const { data, error } = await supabase.from('voter_sessions').select('*').eq('session_id', sessionId);
    if (error) throw new Error(error.message);
    return data || [];
  },

  getVoterSessionStatus: async (voterId: string, sessionId: string) => {
    const { data, error } = await supabase
      .from('voter_sessions')
      .select('*')
      .eq('voter_id', voterId)
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { hasVoted: data.has_voted, votedAt: data.voted_at } : { hasVoted: false, votedAt: null };
  },

  // ==================== Sessions ====================
  getSessions: async () => {
    const { data, error } = await supabase
      .from('voting_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  getSession: async (id: string) => {
    const { data, error } = await supabase.from('voting_sessions').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },

  createSession: async (data: any) => {
    const payload: any = {
      name: data.name || 'New Election',
      school_year: data.school_year || data.schoolYear || '2026-2027',
      status: 'upcoming',
      schedule_status: 'draft',
    };
    if (data.start_date) payload.start_date = data.start_date;
    if (data.end_date) payload.end_date = data.end_date;
    if (data.eligible_grade_levels) payload.eligible_grade_levels = data.eligible_grade_levels;
    if (data.eligible_sections) payload.eligible_sections = data.eligible_sections;
    if (data.grade_mappings) payload.grade_mappings = data.grade_mappings;

    const { data: created, error } = await supabase.from('voting_sessions').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return created;
  },

  updateSession: async (sessionId: string, data: any) => {
    const { error } = await supabase.from('voting_sessions').update(data).eq('id', sessionId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  deleteSession: async (sessionId: string) => {
    // CASCADE will delete positions, candidates, votes, voter_sessions, vote_verifications
    const { error } = await supabase.from('voting_sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  duplicateSession: async (sessionId: string) => {
    // 1. Get original session
    const { data: original, error: getErr } = await supabase.from('voting_sessions').select('*').eq('id', sessionId).single();
    if (getErr || !original) throw new Error('Session not found');

    // 2. Create new session
    const { data: newSession, error: createErr } = await supabase.from('voting_sessions').insert({
      name: `${original.name} (Copy)`,
      school_year: original.school_year,
      grade_mappings: original.grade_mappings,
      eligible_grade_levels: original.eligible_grade_levels,
      eligible_sections: original.eligible_sections,
      status: 'upcoming',
      schedule_status: 'draft',
    }).select().single();
    if (createErr || !newSession) throw new Error(createErr?.message || 'Failed to create session copy');

    // 3. Copy positions
    const { data: positions } = await supabase.from('positions').select('*').eq('session_id', sessionId);
    if (positions && positions.length > 0) {
      const positionMapping: Record<string, number> = {};
      for (const pos of positions) {
        const { data: newPos } = await supabase.from('positions').insert({
          name: pos.name,
          display_order: pos.display_order,
          max_votes: pos.max_votes,
          strict_grade_mapping: pos.strict_grade_mapping,
          session_id: newSession.id,
        }).select().single();
        if (newPos) positionMapping[String(pos.id)] = newPos.id;
      }

      // 4. Copy candidates (without votes)
      const { data: candidates } = await supabase.from('candidates').select('*').eq('session_id', sessionId);
      if (candidates && candidates.length > 0) {
        const candidateInserts = candidates.map(c => ({
          name: c.name,
          party: c.party,
          motto: c.motto,
          photo_url: c.photo_url,
          grade_level: c.grade_level,
          section: c.section,
          position_id: positionMapping[String(c.position_id)] || c.position_id,
          session_id: newSession.id,
          votes: 0,
        }));
        await supabase.from('candidates').insert(candidateInserts);
      }
    }

    return newSession;
  },

  // Legacy compat: getElection returns first session
  getElection: async () => {
    const { data, error } = await supabase
      .from('voting_sessions')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .single();
    if (error) {
      // Fallback to old election_settings table
      const { data: legacy, error: legacyErr } = await supabase.from('election_settings').select('*').eq('id', 1).single();
      if (legacyErr) throw new Error(legacyErr.message);
      return legacy;
    }
    return data;
  },

  // Legacy compat: updateElection updates the active session or session 1
  updateElection: async (data: any) => {
    try {
      const { error } = await supabase.from('voting_sessions').update(data).eq('id', data.id || 1);
      if (error) {
        // Fallback to old election_settings table
        const { error: legacyErr } = await supabase.from('election_settings').update(data).eq('id', 1);
        if (legacyErr) console.warn('Election update fallback error:', legacyErr);
      }
    } catch (e) {
      console.warn('Election update fallback:', e);
    }
    try {
      const prev = JSON.parse(localStorage.getItem('election_schedule_backup') || '{}');
      localStorage.setItem('election_schedule_backup', JSON.stringify({ ...prev, ...data }));
    } catch (_) {}
    return { success: true };
  },

  // ==================== Candidates (Session-Scoped) ====================
  getCandidates: async (sessionId?: string) => {
    let query = supabase.from('candidates').select('*');
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },
  
  addCandidate: async (data: any) => {
    const payload: any = {
      name: (data.name || '').trim(),
      party: (data.party || '').trim() || 'Independent',
      motto: (data.motto || '').trim(),
      photo_url: data.photo_url || '',
      grade_level: String(data.grade_level || ''),
      section: String(data.section || ''),
      session_id: data.session_id || 1,
    };
    if (data.position_id !== undefined && data.position_id !== '') {
      payload.position_id = isNaN(Number(data.position_id)) ? data.position_id : Number(data.position_id);
    }
    const { error } = await supabase.from('candidates').insert(payload);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  updateCandidate: async (data: any) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.party !== undefined) payload.party = data.party.trim() || 'Independent';
    if (data.motto !== undefined) payload.motto = data.motto.trim();
    if (data.photo_url !== undefined) payload.photo_url = data.photo_url;
    if (data.grade_level !== undefined) payload.grade_level = String(data.grade_level);
    if (data.section !== undefined) payload.section = String(data.section);
    if (data.position_id !== undefined && data.position_id !== '') {
      payload.position_id = isNaN(Number(data.position_id)) ? data.position_id : Number(data.position_id);
    }
    const { error } = await supabase.from('candidates').update(payload).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deleteCandidate: async (id: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ==================== Positions (Session-Scoped) ====================
  getPositions: async (sessionId?: string) => {
    let query = supabase.from('positions').select('*').order('display_order', { ascending: true });
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },
  
  addPosition: async (data: any) => {
    const sessionId = data.session_id || 1;
    // Check if position with same name already exists IN THIS SESSION
    const { data: existing } = await supabase
      .from('positions')
      .select('id, name')
      .ilike('name', data.name.trim())
      .eq('session_id', sessionId);
    
    if (existing && existing.length > 0) {
      throw new Error(`A position named "${data.name}" already exists in this session.`);
    }

    const payload = { ...data, session_id: sessionId };
    const { error } = await supabase.from('positions').insert(payload);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deletePosition: async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  cleanupDuplicatePositions: async (sessionId?: string) => {
    let query = supabase.from('positions').select('*').order('id', { ascending: true });
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data: allPositions, error: posErr } = await query;
    if (posErr) throw new Error(posErr.message);

    const seenNames = new Map<string, any>();
    const toDeleteIds: number[] = [];
    const remapping: Record<string, string> = {};

    for (const pos of allPositions || []) {
      const normalizedName = (pos.name || '').trim().toLowerCase();
      if (seenNames.has(normalizedName)) {
        const primaryPos = seenNames.get(normalizedName);
        toDeleteIds.push(pos.id);
        remapping[String(pos.id)] = String(primaryPos.id);
      } else {
        seenNames.set(normalizedName, pos);
      }
    }

    if (toDeleteIds.length === 0) return { success: true, count: 0 };

    for (const [dupId, keepId] of Object.entries(remapping)) {
      try {
        await supabase.from('candidates').update({ position_id: keepId }).eq('position_id', dupId);
      } catch (_) {}
      try {
        await supabase.from('votes').update({ position_id: keepId }).eq('position_id', dupId);
      } catch (_) {}
    }

    for (const id of toDeleteIds) {
      await supabase.from('positions').delete().eq('id', id);
    }

    return { success: true, count: toDeleteIds.length };
  },

  // ==================== Sections (Global) ====================
  getSections: async () => {
    const { data, error } = await supabase.from('sections').select('*');
    if (error) throw new Error(error.message);
    return data;
  },
  
  addSection: async (data: any) => {
    const { error } = await supabase.from('sections').insert(data);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deleteSection: async (id: string) => {
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ==================== Votes (Session-Scoped) ====================
  submitVotes: async (votes: { candidate_id: string; position_id: string }[], sessionId?: string) => {
    const sessionStr = localStorage.getItem('voting_session');
    if (!sessionStr) throw new Error('Not authenticated');
    const session = JSON.parse(sessionStr);
    const activeSessionId = sessionId || session.activeSessionId || '1';

    // 1. Insert votes with session_id
    const votesData = votes.map(v => ({
      voter_id: session.user.id,
      candidate_id: v.candidate_id,
      position_id: v.position_id,
      session_id: activeSessionId,
    }));
    
    const { error: voteError } = await supabase.from('votes').insert(votesData);
    if (voteError) throw new Error(voteError.message);

    // 2. Mark voter as voted in voter_sessions
    const { error: vsError } = await supabase
      .from('voter_sessions')
      .upsert({
        voter_id: session.user.id,
        session_id: activeSessionId,
        has_voted: true,
        voted_at: new Date().toISOString(),
      }, { onConflict: 'voter_id,session_id' });
    
    if (vsError) {
      // Fallback: update global voters table
      await supabase
        .from('voters')
        .update({ has_voted: true, voted_at: new Date().toISOString() })
        .eq('id', session.user.id);
    }
    
    // Update local storage session
    session.has_voted = true;
    session.activeSessionId = activeSessionId;
    localStorage.setItem('voting_session', JSON.stringify(session));

    // 3. Increment candidate vote counts 
    for (const v of votes) {
      const { data: cand } = await supabase.from('candidates').select('votes').eq('id', v.candidate_id).single();
      if (cand) {
        await supabase.from('candidates').update({ votes: (cand.votes || 0) + 1 }).eq('id', v.candidate_id);
      }
    }

    return { success: true };
  },
  
  getResults: async (sessionId?: string) => {
    let query = supabase.from('candidates').select('*');
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  // ==================== Session Reset ====================
  resetSession: async (sessionId: string) => {
    // 1. Delete tie resolutions for this session's verifications
    try {
      const { data: verifications } = await supabase.from('vote_verifications').select('id').eq('session_id', sessionId);
      if (verifications && verifications.length > 0) {
        const vIds = verifications.map((v: any) => v.id);
        await supabase.from('tie_resolutions').delete().in('verification_id', vIds);
        await supabase.from('vote_verifications').delete().eq('session_id', sessionId);
      }
    } catch (_) {}

    // 2. Delete votes for this session
    try {
      await supabase.from('votes').delete().eq('session_id', sessionId);
    } catch (_) {}

    // 3. Reset candidate tallies for this session
    try {
      const { data: candidates } = await supabase.from('candidates').select('id').eq('session_id', sessionId);
      if (candidates && candidates.length > 0) {
        await supabase.from('candidates').update({ votes: 0 }).eq('session_id', sessionId);
      }
    } catch (_) {}

    // 4. Delete voter_sessions for this session
    try {
      await supabase.from('voter_sessions').delete().eq('session_id', sessionId);
    } catch (_) {}

    // 5. Reset session status
    await supabase.from('voting_sessions').update({
      is_active: false,
      status: 'upcoming',
      results_finalized: false,
      finalized_by: null,
      finalized_at: null,
    }).eq('id', sessionId);

    return { success: true };
  },

  // Legacy compat
  resetSystem: async () => {
    return api.resetSession('1');
  },

  // ==================== Election Report API ====================
  getVerifications: async (sessionId?: string) => {
    try {
      let query = supabase.from('vote_verifications').select('*').order('created_at', { ascending: false });
      if (sessionId) query = query.eq('session_id', sessionId);
      const { data, error } = await query;
      if (error) {
        console.warn('Verifications table notice:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  initiateVerification: async (positionId: string, tiedCandidateIds: string[], originalVoteCounts: Record<string, number>, sessionId?: string) => {
    let query = supabase.from('votes').select('voter_id').eq('position_id', positionId);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data: votesForPosition, error: votesError } = await query;
    
    if (votesError) throw new Error(votesError.message);

    const uniqueVoterIds = [...new Set((votesForPosition || []).map((v: any) => String(v.voter_id)))];
    const shuffled = uniqueVoterIds.sort(() => Math.random() - 0.5);
    const selectedVoterIds = shuffled.slice(0, Math.min(10, shuffled.length));

    const sessionStr = localStorage.getItem('voting_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    const insertPayload: any = {
      position_id: positionId,
      tied_candidate_ids: JSON.stringify(tiedCandidateIds),
      selected_voter_ids: JSON.stringify(selectedVoterIds),
      verification_status: 'in_progress',
      verified_by: session?.user?.name || 'Admin',
      original_vote_counts: JSON.stringify(originalVoteCounts),
    };
    if (sessionId) insertPayload.session_id = sessionId;

    const { data, error } = await supabase
      .from('vote_verifications')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      if (error.message.includes('relation "vote_verifications" does not exist') || error.message.includes('schema cache')) {
        throw new Error('Please run the database migration SQL script in your Supabase SQL Editor first.');
      }
      throw new Error(error.message);
    }
    return data;
  },

  getVerificationVotes: async (selectedVoterIds: string[], positionId: string) => {
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, candidate_id')
      .eq('position_id', positionId)
      .in('voter_id', selectedVoterIds);

    if (votesError) throw new Error(votesError.message);

    const { data: voters, error: votersError } = await supabase
      .from('voters')
      .select('id, name, lrn')
      .in('id', selectedVoterIds);

    if (votersError) throw new Error(votersError.message);

    const candidateIds = [...new Set((votes || []).map((v: any) => v.candidate_id))];
    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('id, name')
      .in('id', candidateIds);

    if (candError) throw new Error(candError.message);

    const voterMap = Object.fromEntries((voters || []).map((v: any) => [String(v.id), v]));
    const candMap = Object.fromEntries((candidates || []).map((c: any) => [String(c.id), c]));

    return (votes || []).map((v: any) => ({
      voterId: String(v.voter_id),
      voterName: voterMap[String(v.voter_id)]?.name || 'Unknown',
      voterLrn: voterMap[String(v.voter_id)]?.lrn || 'N/A',
      candidateId: String(v.candidate_id),
      candidateName: candMap[String(v.candidate_id)]?.name || 'Unknown',
    }));
  },

  completeVerification: async (verificationId: string, notes: string, tieRemains: boolean) => {
    const { error } = await supabase
      .from('vote_verifications')
      .update({
        verification_status: tieRemains ? 'tie_remains' : 'completed',
        notes,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  getTieResolutions: async () => {
    try {
      const { data, error } = await supabase
        .from('tie_resolutions')
        .select('*')
        .order('resolved_at', { ascending: false });
      if (error) {
        console.warn('Tie resolutions table notice:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  resolveTie: async (verificationId: string, positionId: string, winnerId: string, reason: string) => {
    const sessionStr = localStorage.getItem('voting_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    const { error: resError } = await supabase
      .from('tie_resolutions')
      .insert({
        verification_id: verificationId,
        position_id: positionId,
        selected_winner_id: winnerId,
        resolution_method: 'admin_selection',
        resolved_by: session?.user?.name || 'Admin',
        reason,
      });

    if (resError) throw new Error(resError.message);

    const { error: verError } = await supabase
      .from('vote_verifications')
      .update({ verification_status: 'completed' })
      .eq('id', verificationId);

    if (verError) throw new Error(verError.message);

    return { success: true };
  },

  finalizeResults: async (sessionId?: string) => {
    const sessionStr = localStorage.getItem('voting_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const finalData = {
      results_finalized: true,
      finalized_by: session?.user?.name || 'Admin',
      finalized_at: new Date().toISOString(),
      status: 'finalized',
    };

    localStorage.setItem('election_finalization_backup', JSON.stringify(finalData));

    const targetId = sessionId || '1';
    const { error } = await supabase
      .from('voting_sessions')
      .update(finalData)
      .eq('id', targetId);

    if (error) {
      // Fallback to legacy table
      try {
        await supabase.from('election_settings').update({
          results_finalized: true,
          finalized_by: finalData.finalized_by,
          finalized_at: finalData.finalized_at,
        }).eq('id', 1);
      } catch (_) {}
      if (error.message.includes('schema cache') || error.message.includes('column')) {
        throw new Error('Please run the database migration SQL script in your Supabase SQL Editor first.');
      }
    }
    return { success: true };
  },

  unfinalizeResults: async (sessionId?: string) => {
    localStorage.removeItem('election_finalization_backup');

    const targetId = sessionId || '1';
    const { error } = await supabase
      .from('voting_sessions')
      .update({
        results_finalized: false,
        finalized_by: null,
        finalized_at: null,
        status: 'completed',
      })
      .eq('id', targetId);

    if (error) {
      // Fallback to legacy
      await supabase.from('election_settings').update({
        results_finalized: false,
        finalized_by: null,
        finalized_at: null,
      }).eq('id', 1);
    }
    return { success: true };
  },

  // ==================== Eligible Sessions for a Voter ====================
  getEligibleSessions: async (voterGradeLevel: string, voterSection: string) => {
    const { data: sessions, error } = await supabase
      .from('voting_sessions')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'active');
    
    if (error) throw new Error(error.message);
    if (!sessions || sessions.length === 0) return [];

    // Filter sessions by voter eligibility
    return sessions.filter((s: any) => {
      const eligibleGrades: string[] = s.eligible_grade_levels || [];
      const eligibleSections: string[] = s.eligible_sections || [];
      
      // If no grade filter set, all grades eligible
      const gradeOk = eligibleGrades.length === 0 || eligibleGrades.includes(voterGradeLevel);
      // If no section filter set, all sections eligible
      const sectionOk = eligibleSections.length === 0 || eligibleSections.includes(voterSection);
      
      return gradeOk && sectionOk;
    });
  },

  // ==================== School Year Rollover ====================
  getSystemSettings: async () => {
    try {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
      if (error) return { currentSchoolYear: '2026-2027' };
      return { currentSchoolYear: data.current_school_year || '2026-2027' };
    } catch {
      return { currentSchoolYear: '2026-2027' };
    }
  },

  processYearRollover: async (newSchoolYear: string, voterUpdates: { id: string; grade_level: string; section: string; status: string; academic_history: any[] }[]) => {
    // 1. Update system settings
    const { error: sysError } = await supabase.from('system_settings').upsert({
      id: 1,
      current_school_year: newSchoolYear,
      updated_at: new Date().toISOString()
    });
    if (sysError) throw new Error(sysError.message);

    // 2. Batch update voters (Supabase requires multiple updates or a custom RPC)
    // For simplicity, we'll run them sequentially or in batches.
    const batchSize = 50;
    for (let i = 0; i < voterUpdates.length; i += batchSize) {
      const batch = voterUpdates.slice(i, i + batchSize);
      await Promise.all(batch.map(async (v) => {
        await supabase.from('voters').update({
          grade_level: v.grade_level,
          section: v.section,
          status: v.status,
          academic_history: v.academic_history
        }).eq('id', v.id);
      }));
    }
    return { success: true };
  },
};
