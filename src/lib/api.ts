import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const api = {
  // Auth
  login: async (lrn: string, password: string) => {
    const { data: voter, error } = await supabase.from('voters').select('*').eq('lrn', lrn).single();
    if (error || !voter) throw new Error('You input a wrong password or LRN');
    
    // Check password
    const isValid = await bcrypt.compare(password, voter.password_hash);
    if (!isValid) throw new Error('You input a wrong password or LRN');
    
    if (voter.status !== 'approved') throw new Error('Your account is still pending for approval');
    
    // Setup session
    const user = {
      id: voter.id,
      role: 'voter',
      name: voter.name,
      lrn: voter.lrn,
      gradeLevel: voter.grade_level
    };
    localStorage.setItem('voting_session', JSON.stringify({ user, has_voted: voter.has_voted }));
    
    return { success: true, user, hasVoted: voter.has_voted };
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
    
    // First check plain text (for default 'admin123' inserted by SQL script), then bcrypt
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
    
    // Support both single 'name' or split names from the context
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

  // Voters
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

  // Candidates
  getCandidates: async () => {
    const { data, error } = await supabase.from('candidates').select('*');
    if (error) throw new Error(error.message);
    return data;
  },
  
  addCandidate: async (data: any) => {
    const { error } = await supabase.from('candidates').insert(data);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  updateCandidate: async (data: any) => {
    const { error } = await supabase.from('candidates').update(data).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deleteCandidate: async (id: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Positions
  getPositions: async () => {
    const { data, error } = await supabase.from('positions').select('*').order('display_order', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  },
  
  addPosition: async (data: any) => {
    const { error } = await supabase.from('positions').insert(data);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  deletePosition: async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Sections
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

  // Votes
  submitVotes: async (votes: { candidate_id: string; position_id: string }[]) => {
    const sessionStr = localStorage.getItem('voting_session');
    if (!sessionStr) throw new Error('Not authenticated');
    const session = JSON.parse(sessionStr);

    // 1. Insert votes
    const votesData = votes.map(v => ({
      voter_id: session.user.id,
      candidate_id: v.candidate_id,
      position_id: v.position_id
    }));
    
    const { error: voteError } = await supabase.from('votes').insert(votesData);
    if (voteError) throw new Error(voteError.message);

    // 2. Mark voter as voted
    const { error: updateError } = await supabase
      .from('voters')
      .update({ has_voted: true, voted_at: new Date().toISOString() })
      .eq('id', session.user.id);
      
    if (updateError) throw new Error(updateError.message);
    
    // Update local storage session
    session.has_voted = true;
    localStorage.setItem('voting_session', JSON.stringify(session));

    // 3. Increment candidate vote counts 
    // In a production app you'd use a Supabase RPC to prevent race conditions.
    for (const v of votes) {
      const { data: cand } = await supabase.from('candidates').select('votes').eq('id', v.candidate_id).single();
      if (cand) {
        await supabase.from('candidates').update({ votes: (cand.votes || 0) + 1 }).eq('id', v.candidate_id);
      }
    }

    return { success: true };
  },
  
  getResults: async () => {
    const { data, error } = await supabase.from('candidates').select('*');
    if (error) throw new Error(error.message);
    return data;
  },

  // Election
  getElection: async () => {
    const { data, error } = await supabase.from('election_settings').select('*').eq('id', 1).single();
    if (error) throw new Error(error.message);
    return data;
  },
  
  updateElection: async (data: any) => {
    const { error } = await supabase.from('election_settings').update(data).eq('id', 1);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  resetSystem: async () => {
    // Clean up all data safely
    try { await supabase.from('tie_resolutions').delete().neq('id', 0); } catch (_) {}
    try { await supabase.from('vote_verifications').delete().neq('id', 0); } catch (_) {}
    await supabase.from('votes').delete().neq('id', 0);
    await supabase.from('candidates').update({ votes: 0 }).neq('id', 0);
    await supabase.from('voters').update({ has_voted: false, voted_at: null }).neq('status', 'nonexistent');
    
    try {
      await supabase.from('election_settings').update({ 
        is_active: false, 
        results_finalized: false, 
        finalized_by: null, 
        finalized_at: null 
      }).eq('id', 1);
    } catch (_) {
      await supabase.from('election_settings').update({ is_active: false }).eq('id', 1);
    }

    localStorage.removeItem('election_finalization_backup');
    return { success: true };
  },

  // ==================== Election Report API ====================

  // Get all vote verifications
  getVerifications: async () => {
    try {
      const { data, error } = await supabase
        .from('vote_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Verifications table notice:', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  },

  // Initiate manual vote verification for a tied position
  initiateVerification: async (positionId: string, tiedCandidateIds: string[], originalVoteCounts: Record<string, number>) => {
    // Get voters who voted for this position
    const { data: votesForPosition, error: votesError } = await supabase
      .from('votes')
      .select('voter_id')
      .eq('position_id', positionId);
    
    if (votesError) throw new Error(votesError.message);

    // Get unique voter IDs
    const uniqueVoterIds = [...new Set((votesForPosition || []).map((v: any) => String(v.voter_id)))];
    
    // Randomly select up to 10 voters
    const shuffled = uniqueVoterIds.sort(() => Math.random() - 0.5);
    const selectedVoterIds = shuffled.slice(0, Math.min(10, shuffled.length));

    const sessionStr = localStorage.getItem('voting_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;

    const { data, error } = await supabase
      .from('vote_verifications')
      .insert({
        position_id: positionId,
        tied_candidate_ids: JSON.stringify(tiedCandidateIds),
        selected_voter_ids: JSON.stringify(selectedVoterIds),
        verification_status: 'in_progress',
        verified_by: session?.user?.name || 'Admin',
        original_vote_counts: JSON.stringify(originalVoteCounts),
      })
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

  // Get the votes of selected voters for a verification (transparency)
  getVerificationVotes: async (selectedVoterIds: string[], positionId: string) => {
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('voter_id, candidate_id')
      .eq('position_id', positionId)
      .in('voter_id', selectedVoterIds);

    if (votesError) throw new Error(votesError.message);

    // Get voter names
    const { data: voters, error: votersError } = await supabase
      .from('voters')
      .select('id, name, lrn')
      .in('id', selectedVoterIds);

    if (votersError) throw new Error(votersError.message);

    // Get candidate names
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

  // Complete a verification session
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

  // Get all tie resolutions
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

  // Resolve a tie by selecting a winner
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

    // Update verification status
    const { error: verError } = await supabase
      .from('vote_verifications')
      .update({ verification_status: 'completed' })
      .eq('id', verificationId);

    if (verError) throw new Error(verError.message);

    return { success: true };
  },

  // Finalize election results
  finalizeResults: async () => {
    const sessionStr = localStorage.getItem('voting_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    const finalData = {
      results_finalized: true,
      finalized_by: session?.user?.name || 'Admin',
      finalized_at: new Date().toISOString(),
    };

    localStorage.setItem('election_finalization_backup', JSON.stringify(finalData));

    const { error } = await supabase
      .from('election_settings')
      .update(finalData)
      .eq('id', 1);

    if (error) {
      if (error.message.includes('schema cache') || error.message.includes('column')) {
        throw new Error('Please run the ALTER TABLE script in your Supabase SQL Editor to add finalized_at and results_finalized columns.');
      }
      throw new Error(error.message);
    }
    return { success: true };
  },

  // Unfinalize election results (for corrections)
  unfinalizeResults: async () => {
    localStorage.removeItem('election_finalization_backup');

    const { error } = await supabase
      .from('election_settings')
      .update({
        results_finalized: false,
        finalized_by: null,
        finalized_at: null,
      })
      .eq('id', 1);

    if (error) throw new Error(error.message);
    return { success: true };
  },
};



