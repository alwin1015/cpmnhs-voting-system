import { supabase } from './supabase';
type StoredSession = {
  token?: string;
  user?: { id: string; role: 'admin' | 'voter'; name: string; lrn?: string; email?: string; gradeLevel?: string; section?: string };
  has_voted?: boolean;
  activeSessionId?: string;
};

const readSession = (): StoredSession | null => {
  const value = localStorage.getItem('voting_session');
  if (!value) return null;
  try { return JSON.parse(value) as StoredSession; } catch { return null; }
};

const requireSessionToken = (role?: 'admin' | 'voter') => {
  const session = readSession();
  if (!session?.token || !session.user || (role && session.user.role !== role)) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session.token;
};

const adminManage = async (
  action: string,
  id: string | number | null = null,
  payload: Record<string, unknown> = {},
) => {
  const { data, error } = await supabase.rpc('secure_admin_manage', {
    p_token: requireSessionToken('admin'),
    p_action: action,
    p_id: id === null ? null : Number(id),
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const api = {
  // ======= Auth =======
  login: async (lrn: string, password: string) => {
    const { data, error } = await supabase.rpc('secure_login_voter', { p_lrn: lrn, p_password: password });
    if (error || !data?.user || !data?.token) throw new Error(error?.message || 'Invalid LRN or password');
    localStorage.setItem('voting_session', JSON.stringify({ token: data.token, user: data.user, has_voted: false }));
    return { success: true, user: data.user, hasVoted: false };
  },

  requestPasswordReset: async (lrn: string) => {
    if (!/^\d{12}$/.test(lrn)) throw new Error('Enter a valid 12-digit LRN.');
    throw new Error('Password recovery requires assistance from the election administrator.');
  },

  adminLogin: async (username: string, password: string) => {
    const { data, error } = await supabase.rpc('secure_login_admin', { p_username: username, p_password: password });
    if (error || !data?.user || !data?.token) throw new Error(error?.message || 'Invalid username or password');
    localStorage.setItem('voting_session', JSON.stringify({ token: data.token, user: data.user, has_voted: false }));
    return { success: true, user: data.user, mustChangePassword: Boolean(data.mustChangePassword) };
  },

  adminChangePassword: async (adminId: string, currentPassword: string, newPassword: string) => {
    void adminId;
    const { error } = await supabase.rpc('secure_change_admin_password', {
      p_token: requireSessionToken('admin'), p_current_password: currentPassword, p_new_password: newPassword,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  register: async (data: any) => {
    let fullName = data.name;
    if (!fullName && data.firstName && data.lastName) {
      fullName = `${data.firstName} ${data.middleInitial ? data.middleInitial + '. ' : ''}${data.lastName}`.trim();
    }

    const { error } = await supabase.rpc('secure_register_voter', {
      p_lrn: data.lrn, p_name: fullName, p_grade_level: data.gradeLevel,
      p_section: data.section, p_password: data.password,
    });

    if (error) throw new Error(error.message);
    return { success: true, message: 'Registration submitted! Please wait for admin approval.' };
  },

  bulkRegister: async (students: any[]) => {
    const { data: count, error } = await supabase.rpc('secure_bulk_register_voters', {
      p_token: requireSessionToken('admin'), p_students: students,
    });
    if (error) throw new Error(error.message);
    return { success: true, message: `${count || 0} students registered.` };
  },


  logout: async () => {
    const token = readSession()?.token;
    if (token) {
      try { await supabase.rpc('secure_logout', { p_token: token }); } catch { /* local logout still proceeds */ }
    }
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
    const token = readSession()?.token;
    if (!token) return [];
    const { data, error } = await supabase.rpc('secure_get_voters', { p_token: token });
    if (error) throw new Error(error.message);
    return (data as any[]) || [];
  },
  
  approveVoter: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'approve', p_voter_id: Number(id),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  approveAllPendingVoters: async () => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'approve_all', p_voter_id: null,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  updateMySection: async (voterId: string, newSection: string) => {
    void voterId;
    const { error } = await supabase.rpc('secure_update_my_section', { p_token: requireSessionToken('voter'), p_section: newSection });
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
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'reject', p_voter_id: Number(id),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  resetVoter: async (id: string) => {
    return api.deleteVoter(id);
  },

  deleteVoter: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'delete', p_voter_id: Number(id),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ==================== Voter Sessions (Per-Session Voting Status) ====================
  getVoterSessions: async (sessionId: string) => {
    const token = readSession()?.token;
    if (!token) return [];
    const { data, error } = await supabase.rpc('secure_get_voter_sessions', {
      p_token: token, p_session_id: Number(sessionId),
    });
    if (error) throw new Error(error.message);
    return (data as Array<{ voter_id: string | number; has_voted: boolean; voted_at: string | null }>) || [];
  },

  getVoterSessionStatus: async (voterId: string, sessionId: string) => {
    void voterId;
    const { data, error } = await supabase.rpc('secure_voter_session_status', {
      p_token: requireSessionToken('voter'), p_session_id: Number(sessionId),
    });
    if (error) throw new Error(error.message);
    return (data as { hasVoted: boolean; votedAt: string | null } | null) || { hasVoted: false, votedAt: null };
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

    return adminManage('create_session', null, payload);
  },

  updateSession: async (sessionId: string, data: any) => {
    await adminManage('update_session', sessionId, data);
    return { success: true };
  },

  deleteSession: async (sessionId: string) => {
    await adminManage('delete_session', sessionId);
    return { success: true };
  },

  duplicateSession: async (sessionId: string) => {
    return adminManage('duplicate_session', sessionId);
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
    const targetId = data.id || 1;
    const { id: _id, ...updates } = data;
    void _id;
    await adminManage('update_session', targetId, updates);
    try {
      const prev = JSON.parse(localStorage.getItem('election_schedule_backup') || '{}');
      localStorage.setItem('election_schedule_backup', JSON.stringify({ ...prev, ...data }));
    } catch (_) {}
    return { success: true };
  },

  // ==================== Candidates (Session-Scoped) ====================
  getCandidates: async (sessionId?: string) => {
    const { data, error } = await supabase.rpc('secure_get_candidates', {
      p_token: readSession()?.token || null,
      p_session_id: sessionId ? Number(sessionId) : null,
    });
    if (error) throw new Error(error.message);
    return (data as any[]) || [];
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
    await adminManage('add_candidate', null, payload);
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
    await adminManage('update_candidate', data.id, payload);
    return { success: true };
  },
  
  deleteCandidate: async (id: string) => {
    await adminManage('delete_candidate', id);
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
    const payload = { ...data, session_id: data.session_id || 1 };
    await adminManage('add_position', null, payload);
    return { success: true };
  },
  
  deletePosition: async (id: string) => {
    await adminManage('delete_position', id);
    return { success: true };
  },

  cleanupDuplicatePositions: async (sessionId?: string) => {
    const result = await adminManage('cleanup_positions', sessionId || null);
    return (result as { success: true; count: number }) || { success: true, count: 0 };
  },

  // ==================== Sections (Global) ====================
  getSections: async () => {
    const { data, error } = await supabase.from('sections').select('*');
    if (error) throw new Error(error.message);
    return data;
  },
  
  addSection: async (data: any) => {
    await adminManage('add_section', null, data);
    return { success: true };
  },
  
  deleteSection: async (id: string) => {
    await adminManage('delete_section', id);
    return { success: true };
  },

  // ==================== Votes (Session-Scoped) ====================
  submitVotes: async (votes: { candidate_id: string; position_id: string }[], sessionId?: string) => {
    const session = readSession();
    if (!session?.user) throw new Error('Not authenticated');
    const activeSessionId = sessionId || session.activeSessionId;
    if (!activeSessionId) throw new Error('No election selected');
    const { error } = await supabase.rpc('secure_submit_ballot', {
      p_token: requireSessionToken('voter'), p_session_id: Number(activeSessionId), p_votes: votes,
    });
    if (error) throw new Error(error.message);
    session.has_voted = true;
    session.activeSessionId = activeSessionId;
    localStorage.setItem('voting_session', JSON.stringify(session));
    return { success: true };
  },
  
  getResults: async (sessionId?: string) => {
    return api.getCandidates(sessionId);
  },

  // ==================== Session Reset ====================
  resetSession: async (sessionId: string) => {
    const { error } = await supabase.rpc('secure_reset_session', {
      p_token: requireSessionToken('admin'), p_session_id: Number(sessionId),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Legacy compat
  resetSystem: async () => {
    return api.resetSession('1');
  },

  // ==================== Election Report API ====================
  getVerifications: async (sessionId?: string) => {
    const { data, error } = await supabase.rpc('secure_get_audit_data', {
      p_token: requireSessionToken('admin'), p_session_id: sessionId ? Number(sessionId) : null,
    });
    if (error) throw new Error(error.message);
    return (data as { verifications?: any[] } | null)?.verifications || [];
  },

  initiateVerification: async (positionId: string, tiedCandidateIds: string[], originalVoteCounts: Record<string, number>, sessionId?: string) => {
    const { data, error } = await supabase.rpc('secure_initiate_verification', {
      p_token: requireSessionToken('admin'),
      p_position_id: Number(positionId),
      p_tied_candidate_ids: tiedCandidateIds,
      p_original_vote_counts: originalVoteCounts,
      p_session_id: sessionId ? Number(sessionId) : null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  getVerificationVotes: async (selectedVoterIds: string[], positionId: string) => {
    const { data, error } = await supabase.rpc('secure_get_verification_votes', {
      p_token: requireSessionToken('admin'),
      p_voter_ids: selectedVoterIds.map(Number), p_position_id: Number(positionId),
    });
    if (error) throw new Error(error.message);
    return (data as any[]) || [];
  },

  completeVerification: async (verificationId: string, notes: string, tieRemains: boolean) => {
    const { error } = await supabase.rpc('secure_complete_verification', {
      p_token: requireSessionToken('admin'), p_verification_id: Number(verificationId),
      p_notes: notes, p_tie_remains: tieRemains,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  getTieResolutions: async () => {
    const { data, error } = await supabase.rpc('secure_get_audit_data', {
      p_token: requireSessionToken('admin'), p_session_id: null,
    });
    if (error) throw new Error(error.message);
    return (data as { tieResolutions?: any[] } | null)?.tieResolutions || [];
  },

  resolveTie: async (verificationId: string, positionId: string, winnerId: string, reason: string) => {
    const { error } = await supabase.rpc('secure_resolve_tie', {
      p_token: requireSessionToken('admin'), p_verification_id: Number(verificationId),
      p_position_id: Number(positionId), p_winner_id: Number(winnerId), p_reason: reason,
    });
    if (error) throw new Error(error.message);
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
    await adminManage('update_session', targetId, finalData);
    return { success: true };
  },

  unfinalizeResults: async (sessionId?: string) => {
    localStorage.removeItem('election_finalization_backup');

    const targetId = sessionId || '1';
    await adminManage('update_session', targetId, {
      results_finalized: false,
      finalized_by: null,
      finalized_at: null,
      status: 'completed',
    });
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
    const { error } = await supabase.rpc('secure_process_rollover', {
      p_token: requireSessionToken('admin'), p_school_year: newSchoolYear, p_updates: voterUpdates,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // ==================== Election History ====================
  getElectionHistory: async () => {
    const { data, error } = await supabase
      .from('voting_sessions')
      .select('*')
      .in('status', ['completed', 'finalized'])
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  getElectionHistoryDetail: async (sessionId: string) => {
    try {
      const [sessionRes, candidatesRes, positionsRes, voterSessions, auditRes, voters] = await Promise.all([
        supabase.from('voting_sessions').select('*').eq('id', sessionId).maybeSingle(),
        api.getCandidates(sessionId).then(data => ({ data, error: null })),
        supabase.from('positions').select('*').eq('session_id', sessionId).order('display_order', { ascending: true }),
        api.getVoterSessions(sessionId),
        supabase.rpc('secure_get_audit_data', {
          p_token: requireSessionToken('admin'), p_session_id: Number(sessionId),
        }),
        api.getVoters(),
      ]);

      if (sessionRes.error) {
        console.error('Session fetch error:', sessionRes.error);
        throw new Error(sessionRes.error.message);
      }

      if (!sessionRes.data) {
        throw new Error(`Election session #${sessionId} not found.`);
      }

      if (auditRes.error) throw new Error(auditRes.error.message);
      const auditData = auditRes.data as { verifications?: any[]; tieResolutions?: any[] } | null;
      const verifications = auditData?.verifications || [];
      const tieResolutions = auditData?.tieResolutions || [];

      // Count total approved voters and those who voted in this session
      const totalVoted = voterSessions.filter((vs: any) => vs.has_voted).length;
      const totalVoters = voters.filter((v: any) => v.status === 'approved').length || voterSessions.length;

      return {
        session: sessionRes.data,
        candidates: candidatesRes.data || [],
        positions: positionsRes.data || [],
        voterSessions,
        tieResolutions,
        verifications,
        totalVoters: totalVoters || 0,
        totalVoted,
      };
    } catch (error) {
      console.error('getElectionHistoryDetail failed:', error);
      throw error;
    }
  },
};
