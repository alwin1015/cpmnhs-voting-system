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
    // Note: Due to RLS or constraints, doing bulk deletes with neq might be restricted if not using service key,
    // but we enabled open RLS for this specific app setup.
    await supabase.from('votes').delete().neq('id', 0);
    await supabase.from('candidates').update({ votes: 0 }).neq('id', 0);
    await supabase.from('voters').update({ has_voted: false, voted_at: null }).neq('status', 'nonexistent');
    await supabase.from('election_settings').update({ is_active: false }).eq('id', 1);
    return { success: true };
  }
};



