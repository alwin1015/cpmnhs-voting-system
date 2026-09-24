import { supabase } from './supabase';
import { isEligibleForSession } from './electionRules';

export type StoredSession = {
  token?: string;
  user?: { id: string; role: 'admin' | 'voter'; name: string; lrn?: string; email?: string; gradeLevel?: string; section?: string };
  has_voted?: boolean;
  activeSessionId?: string;
};

const normalizeSessionPayload = (data: any) => {
  const payload: any = { ...data };
  if (data.school_year || data.schoolYear) {
    payload.school_year = data.school_year || data.schoolYear;
    payload.schoolYear = payload.school_year;
  }
  if (data.start_date || data.startDate) {
    payload.start_date = data.start_date || data.startDate;
    payload.startDate = payload.start_date;
  }
  if (data.end_date || data.endDate) {
    payload.end_date = data.end_date || data.endDate;
    payload.endDate = payload.end_date;
  }
  if (data.is_active !== undefined || data.isActive !== undefined) {
    payload.is_active = data.is_active !== undefined ? data.is_active : data.isActive;
    payload.isActive = payload.is_active;
  }
  if (data.schedule_status || data.scheduleStatus) {
    payload.schedule_status = data.schedule_status || data.scheduleStatus;
    payload.scheduleStatus = payload.schedule_status;
  }
  if (data.eligible_grade_levels || data.eligibleGradeLevels) {
    payload.eligible_grade_levels = data.eligible_grade_levels || data.eligibleGradeLevels;
    payload.eligibleGradeLevels = payload.eligible_grade_levels;
  }
  if (data.eligible_sections || data.eligibleSections) {
    payload.eligible_sections = data.eligible_sections || data.eligibleSections;
    payload.eligibleSections = payload.eligible_sections;
  }
  if (data.grade_mappings || data.gradeMappings) {
    payload.grade_mappings = data.grade_mappings || data.gradeMappings;
    payload.gradeMappings = payload.grade_mappings;
  }
  return payload;
};

// ============================================================================
// SESSION INTEGRITY & ERROR HANDLING
// ============================================================================

const readSession = (): StoredSession | null => {
  const value = localStorage.getItem('voting_session');
  if (!value) return null;
  try { return JSON.parse(value) as StoredSession; } catch { return null; }
};

export const handleSessionError = (error: unknown) => {
  if (!error) return;
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.toLowerCase().includes('invalid or expired session') ||
    msg.toLowerCase().includes('session has expired') ||
    msg.toLowerCase().includes('expired session')
  ) {
    try {
      localStorage.removeItem('voting_session');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:session_expired', { detail: { message: msg } }));
      }
    } catch (_) {}
  }
};

const requireSessionToken = (role?: 'admin' | 'voter') => {
  const session = readSession();
  if (!session?.token || !session.user || (role && session.user.role !== role)) {
    handleSessionError(new Error('Your session has expired. Please sign in again.'));
    throw new Error('Your session has expired. Please sign in again.');
  }
  return session.token;
};

// ============================================================================
// NETWORK RESILIENCE & REQUEST DEDUPLICATION
// ============================================================================

const isTransientNetworkError = (error: unknown): boolean => {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('networkrequestfailed') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('connection refused')
  );
};

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  factor?: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 300;
  const factor = options.factor ?? 2;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= maxRetries || !isTransientNetworkError(err)) {
        throw err;
      }
      const delay = initialDelayMs * Math.pow(factor, attempt - 1);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

const inFlightRequests = new Map<string, Promise<any>>();

function dedupeInFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

// ============================================================================
// IN-MEMORY TTL QUERY CACHE (Prevents Supabase Egress Quota Exhaustion)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const queryCache = new Map<string, CacheEntry<any>>();

export const clearApiCache = (prefix?: string) => {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) {
      queryCache.delete(key);
    }
  }
};

function cachedFetch<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = queryCache.get(key);
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return Promise.resolve(entry.data as T);
  }
  return dedupeInFlight(key, async () => {
    const data = await fn();
    queryCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    return data;
  });
}

// Minimal column projections to eliminate select('*') over-fetching
const SESSION_COLUMNS = 'id, name, school_year, start_date, end_date, is_active, status, schedule_status, grade_mappings, eligible_grade_levels, eligible_sections, results_finalized, finalized_by, finalized_at, authorization_doc_generated, authorization_confirmed_at, signatories, created_at';
const POSITION_COLUMNS = 'id, session_id, name, display_order, max_votes, strict_grade_mapping';
const SECTION_COLUMNS = 'id, name, grade_level';
const SYSTEM_SETTINGS_COLUMNS = 'id, current_school_year';
const LEGACY_ELECTION_COLUMNS = 'id, is_active, election_status, school_year';

// ============================================================================
// UNIFIED ADMIN DISPATCHER
// ============================================================================

const adminManage = async (
  action: string,
  id: string | number | null = null,
  payload: Record<string, unknown> = {},
) => {
  let sanitizedId: number | null = null;
  if (id !== null && id !== undefined && id !== '') {
    const num = Number(id);
    sanitizedId = isNaN(num) ? null : num;
  }

  try {
    const { data, error } = await supabase.rpc('secure_admin_manage', {
      p_token: requireSessionToken('admin'),
      p_action: action,
      p_id: sanitizedId,
      p_payload: payload,
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    handleSessionError(err);
    throw err;
  }
};

let isSubmittingBallotLock = false;

// ============================================================================
// EXPORTED API CLIENT
// ============================================================================

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
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
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
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    return { success: true, message: `${count || 0} students registered.` };
  },

  logout: async () => {
    const token = readSession()?.token;
    if (token) {
      try { await supabase.rpc('secure_logout', { p_token: token }); } catch { /* local logout still proceeds */ }
    }
    localStorage.removeItem('voting_session');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:session_expired', { detail: { message: 'Logged out' } }));
    }
    return { success: true };
  },

  getMe: async () => {
    const session = localStorage.getItem('voting_session');
    if (!session) return { user: null };
    try {
      return JSON.parse(session);
    } catch {
      localStorage.removeItem('voting_session');
      return { user: null };
    }
  },

  // ==================== Voters (Global Registry) ====================
  getVoters: async () => {
    const token = readSession()?.token;
    if (!token) return [];
    return cachedFetch(`getVoters:${token}`, 15000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_voters', { p_token: token });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as any[]) || [];
      })
    );
  },
  
  approveVoter: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'approve', p_voter_id: String(id),
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    return { success: true };
  },

  approveAllPendingVoters: async () => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'approve_all', p_voter_id: null,
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    return { success: true };
  },

  updateMySection: async (voterId: string, newSection: string) => {
    void voterId;
    const { error } = await supabase.rpc('secure_update_my_section', { p_token: requireSessionToken('voter'), p_section: newSection });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    
    // Update local storage session
    const sessionStr = localStorage.getItem('voting_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.user && session.user.id === voterId) {
          session.user.section = newSection;
          localStorage.setItem('voting_session', JSON.stringify(session));
        }
      } catch (_) {}
    }
    return { success: true };
  },
  
  rejectVoter: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'reject', p_voter_id: String(id),
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    return { success: true };
  },

  resetVoterBallot: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'reset_ballot', p_voter_id: String(id),
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    clearApiCache('getVoterSessions');
    clearApiCache('getVoterSessionStatus');
    clearApiCache('getCandidates');
    return { success: true };
  },

  resetVoter: async (id: string) => {
    clearApiCache('getVoters');
    return api.deleteVoter(id);
  },

  deleteVoter: async (id: string) => {
    const { error } = await supabase.rpc('secure_admin_voter_action', {
      p_token: requireSessionToken('admin'), p_action: 'delete', p_voter_id: String(id),
    });
    if (error) {
      handleSessionError(error);
      throw new Error(error.message);
    }
    clearApiCache('getVoters');
    return { success: true };
  },

  // ==================== Voter Sessions (Per-Session Voting Status) ====================
  getVoterSessions: async (sessionId: string) => {
    const token = readSession()?.token;
    if (!token) return [];
    return cachedFetch(`getVoterSessions:${sessionId}:${token}`, 15000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_voter_sessions', {
          p_token: token, p_session_id: Number(sessionId),
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as Array<{ voter_id: string | number; has_voted: boolean; voted_at: string | null }>) || [];
      })
    );
  },

  getVoterSessionStatus: async (voterId: string, sessionId: string) => {
    void voterId;
    const token = requireSessionToken('voter');
    return cachedFetch(`getVoterSessionStatus:${sessionId}:${token}`, 10000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_voter_session_status', {
          p_token: token, p_session_id: Number(sessionId),
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as { hasVoted: boolean; votedAt: string | null } | null) || { hasVoted: false, votedAt: null };
      })
    );
  },

  // ==================== Sessions ====================
  getSessions: async () => {
    return cachedFetch('getSessions', 30000, () =>
      withRetry(async () => {
        const { data, error } = await supabase
          .from('voting_sessions')
          .select(SESSION_COLUMNS)
          .order('id', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
      })
    );
  },

  getSession: async (id: string) => {
    return cachedFetch(`getSession:${id}`, 30000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.from('voting_sessions').select(SESSION_COLUMNS).eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
      })
    );
  },

  createSession: async (data: any) => {
    const payload: any = {
      name: data.name || 'New Election',
      school_year: data.school_year || data.schoolYear || '2026-2027',
      status: 'upcoming',
      schedule_status: 'draft',
    };
    if (data.start_date || data.startDate) payload.start_date = data.start_date || data.startDate;
    if (data.end_date || data.endDate) payload.end_date = data.end_date || data.endDate;
    if (data.eligible_grade_levels || data.eligibleGradeLevels) {
      payload.eligible_grade_levels = data.eligible_grade_levels || data.eligibleGradeLevels;
    }
    if (data.eligible_sections || data.eligibleSections) {
      payload.eligible_sections = data.eligible_sections || data.eligibleSections;
    }
    if (data.grade_mappings || data.gradeMappings) {
      payload.grade_mappings = data.grade_mappings || data.gradeMappings;
    }

    const res = await adminManage('create_session', null, payload);
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getElection');
    return res;
  },

  updateSession: async (sessionId: string, data: any) => {
    const payload = normalizeSessionPayload(data);
    await adminManage('update_session', sessionId, payload);
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getElection');
    return { success: true };
  },

  deleteSession: async (sessionId: string) => {
    await adminManage('delete_session', sessionId);
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getElection');
    return { success: true };
  },

  duplicateSession: async (sessionId: string) => {
    const res = await adminManage('duplicate_session', sessionId);
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getElection');
    return res;
  },

  // Legacy compat: getElection returns first session
  getElection: async () => {
    return cachedFetch('getElection', 30000, () =>
      withRetry(async () => {
        const { data, error } = await supabase
          .from('voting_sessions')
          .select(SESSION_COLUMNS)
          .order('id', { ascending: true })
          .limit(1)
          .single();
        if (error) {
          // Fallback to old election_settings table
          const { data: legacy, error: legacyErr } = await supabase.from('election_settings').select(LEGACY_ELECTION_COLUMNS).eq('id', 1).single();
          if (legacyErr) throw new Error(legacyErr.message);
          return legacy;
        }
        return data;
      })
    );
  },

  // Legacy compat: updateElection updates the active session or session 1
  updateElection: async (data: any) => {
    const targetId = data.id || 1;
    const { id: _id, ...updates } = data;
    void _id;
    const payload = normalizeSessionPayload(updates);
    await adminManage('update_session', targetId, payload);
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getElection');
    try {
      const prev = JSON.parse(localStorage.getItem('election_schedule_backup') || '{}');
      localStorage.setItem('election_schedule_backup', JSON.stringify({ ...prev, ...data }));
    } catch (_) {}
    return { success: true };
  },

  // ==================== Candidates (Session-Scoped) ====================
  getCandidates: async (sessionId?: string) => {
    const token = readSession()?.token || null;
    const key = `getCandidates:${sessionId || 'all'}:${token || 'anon'}`;
    return cachedFetch(key, 60000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_candidates', {
          p_token: token,
          p_session_id: sessionId ? Number(sessionId) : null,
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as any[]) || [];
      })
    );
  },
  
  addCandidate: async (data: any) => {
    const payload: any = {
      name: (data.name || '').trim(),
      party: (data.party || '').trim() || 'Independent',
      motto: (data.motto || '').trim(),
      photo_url: data.photo_url || data.photoUrl || '',
      photoUrl: data.photo_url || data.photoUrl || '',
      grade_level: String(data.grade_level || data.gradeLevel || ''),
      gradeLevel: String(data.grade_level || data.gradeLevel || ''),
      section: String(data.section || ''),
      session_id: data.session_id || data.sessionId || 1,
      sessionId: data.session_id || data.sessionId || 1,
    };
    if (data.position_id !== undefined && data.position_id !== '') {
      payload.position_id = isNaN(Number(data.position_id)) ? data.position_id : Number(data.position_id);
      payload.positionId = payload.position_id;
    } else if (data.positionId !== undefined && data.positionId !== '') {
      payload.position_id = isNaN(Number(data.positionId)) ? data.positionId : Number(data.positionId);
      payload.positionId = payload.position_id;
    }
    const res = await adminManage('add_candidate', null, payload);
    clearApiCache('getCandidates');
    return res || { success: true };
  },
  
  updateCandidate: async (data: any) => {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.party !== undefined) payload.party = data.party.trim() || 'Independent';
    if (data.motto !== undefined) payload.motto = data.motto.trim();
    if (data.photo_url !== undefined || data.photoUrl !== undefined) {
      payload.photo_url = data.photo_url !== undefined ? data.photo_url : data.photoUrl;
      payload.photoUrl = payload.photo_url;
    }
    if (data.grade_level !== undefined || data.gradeLevel !== undefined) {
      payload.grade_level = String(data.grade_level !== undefined ? data.grade_level : data.gradeLevel);
      payload.gradeLevel = payload.grade_level;
    }
    if (data.section !== undefined) payload.section = String(data.section);
    if ((data.position_id !== undefined && data.position_id !== '') || (data.positionId !== undefined && data.positionId !== '')) {
      const posVal = data.position_id !== undefined && data.position_id !== '' ? data.position_id : data.positionId;
      payload.position_id = isNaN(Number(posVal)) ? posVal : Number(posVal);
      payload.positionId = payload.position_id;
    }
    const res = await adminManage('update_candidate', data.id, payload);
    clearApiCache('getCandidates');
    return res || { success: true };
  },
  
  deleteCandidate: async (id: string) => {
    const res = await adminManage('delete_candidate', id);
    clearApiCache('getCandidates');
    return res || { success: true };
  },

  // ==================== Positions (Session-Scoped) ====================
  getPositions: async (sessionId?: string) => {
    const key = `getPositions:${sessionId || 'all'}`;
    return cachedFetch(key, 60000, () =>
      withRetry(async () => {
        let query = supabase.from('positions').select(POSITION_COLUMNS).order('display_order', { ascending: true });
        if (sessionId) query = query.eq('session_id', sessionId);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return data || [];
      })
    );
  },
  
  addPosition: async (data: any) => {
    const payload = {
      ...data,
      session_id: data.session_id || data.sessionId || 1,
      sessionId: data.session_id || data.sessionId || 1,
      display_order: data.display_order !== undefined ? data.display_order : data.order,
      order: data.display_order !== undefined ? data.display_order : data.order,
      max_votes: data.max_votes !== undefined ? data.max_votes : data.maxVotes,
      maxVotes: data.max_votes !== undefined ? data.max_votes : data.maxVotes,
    };
    const res = await adminManage('add_position', null, payload);
    clearApiCache('getPositions');
    return res || { success: true };
  },
  
  deletePosition: async (id: string) => {
    const res = await adminManage('delete_position', id);
    clearApiCache('getPositions');
    return res || { success: true };
  },

  cleanupDuplicatePositions: async (sessionId?: string) => {
    const result = await adminManage('cleanup_positions', sessionId || null);
    clearApiCache('getPositions');
    return (result as { success: true; count: number }) || { success: true, count: 0 };
  },

  // ==================== Sections (Global) ====================
  getSections: async () => {
    return cachedFetch('getSections', 300000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.from('sections').select(SECTION_COLUMNS).order('name', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
      })
    );
  },
  
  addSection: async (data: any) => {
    const res = await adminManage('add_section', null, data);
    clearApiCache('getSections');
    return res || { success: true };
  },
  
  deleteSection: async (id: string) => {
    const res = await adminManage('delete_section', id);
    clearApiCache('getSections');
    return res || { success: true };
  },

  // ==================== Votes (Session-Scoped) ====================
  submitVotes: async (votes: { candidate_id: string; position_id: string }[], sessionId?: string) => {
    if (isSubmittingBallotLock) {
      throw new Error('Ballot submission is already processing. Please do not submit multiple times.');
    }

    isSubmittingBallotLock = true;
    try {
      const session = readSession();
      if (!session?.user) throw new Error('Not authenticated');
      const activeSessionId = sessionId || session.activeSessionId;
      if (!activeSessionId) throw new Error('No election selected');

      const { error } = await supabase.rpc('secure_submit_ballot', {
        p_token: requireSessionToken('voter'), p_session_id: Number(activeSessionId), p_votes: votes,
      });

      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }

      session.has_voted = true;
      session.activeSessionId = activeSessionId;
      localStorage.setItem('voting_session', JSON.stringify(session));
      clearApiCache('getVoterSessions');
      clearApiCache('getVoterSessionStatus');
      clearApiCache('getCandidates');
      clearApiCache('getPositions');
      return { success: true };
    } catch (err) {
      handleSessionError(err);
      throw err;
    } finally {
      isSubmittingBallotLock = false;
    }
  },
  
  getResults: async (sessionId?: string) => {
    return api.getCandidates(sessionId);
  },

  // ==================== Session Reset ====================
  resetSession: async (sessionId: string) => {
    try {
      const { error } = await supabase.rpc('secure_reset_session', {
        p_token: requireSessionToken('admin'), p_session_id: Number(sessionId),
      });
      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }
      clearApiCache('getCandidates');
      clearApiCache('getVoterSessions');
      clearApiCache('getVoterSessionStatus');
      clearApiCache('getSessions');
      clearApiCache('getElection');
      return { success: true };
    } catch (err) {
      handleSessionError(err);
      throw err;
    }
  },

  // Legacy compat
  resetSystem: async () => {
    return api.resetSession('1');
  },

  // ==================== Election Report API ====================
  getVerifications: async (sessionId?: string) => {
    const token = requireSessionToken('admin');
    return dedupeInFlight(`getVerifications:${sessionId || 'all'}`, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_audit_data', {
          p_token: token, p_session_id: sessionId ? Number(sessionId) : null,
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as { verifications?: any[] } | null)?.verifications || [];
      })
    );
  },

  initiateVerification: async (positionId: string, tiedCandidateIds: string[], originalVoteCounts: Record<string, number>, sessionId?: string) => {
    try {
      const { data, error } = await supabase.rpc('secure_initiate_verification', {
        p_token: requireSessionToken('admin'),
        p_position_id: Number(positionId),
        p_tied_candidate_ids: tiedCandidateIds,
        p_original_vote_counts: originalVoteCounts,
        p_session_id: sessionId ? Number(sessionId) : null,
      });
      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      handleSessionError(err);
      throw err;
    }
  },

  getVerificationVotes: async (selectedVoterIds: string[], positionId: string) => {
    const token = requireSessionToken('admin');
    return dedupeInFlight(`getVerificationVotes:${positionId}:${selectedVoterIds.join(',')}`, () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_verification_votes', {
          p_token: token,
          p_voter_ids: selectedVoterIds.map(String), p_position_id: Number(positionId),
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as any[]) || [];
      })
    );
  },

  completeVerification: async (verificationId: string, notes: string, tieRemains: boolean) => {
    try {
      const { error } = await supabase.rpc('secure_complete_verification', {
        p_token: requireSessionToken('admin'), p_verification_id: Number(verificationId),
        p_notes: notes, p_tie_remains: tieRemains,
      });
      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      handleSessionError(err);
      throw err;
    }
  },

  getTieResolutions: async () => {
    const token = requireSessionToken('admin');
    return dedupeInFlight('getTieResolutions', () =>
      withRetry(async () => {
        const { data, error } = await supabase.rpc('secure_get_audit_data', {
          p_token: token, p_session_id: null,
        });
        if (error) {
          handleSessionError(error);
          throw new Error(error.message);
        }
        return (data as { tieResolutions?: any[] } | null)?.tieResolutions || [];
      })
    );
  },

  resolveTie: async (verificationId: string, positionId: string, winnerId: string, reason: string) => {
    try {
      const { error } = await supabase.rpc('secure_resolve_tie', {
        p_token: requireSessionToken('admin'), p_verification_id: Number(verificationId),
        p_position_id: Number(positionId), p_winner_id: Number(winnerId), p_reason: reason,
      });
      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }
      return { success: true };
    } catch (err) {
      handleSessionError(err);
      throw err;
    }
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
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getCandidates');
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
    clearApiCache('getSessions');
    clearApiCache('getSession');
    clearApiCache('getCandidates');
    return { success: true };
  },

  // ==================== Eligible Sessions for a Voter ====================
  getEligibleSessions: async (voterGradeLevel: string, voterSection: string) => {
    const key = `getEligibleSessions:${voterGradeLevel}:${voterSection}`;
    return cachedFetch(key, 30000, () =>
      withRetry(async () => {
        const { data: sessions, error } = await supabase
          .from('voting_sessions')
          .select('id, name, school_year, is_active, status, eligible_grade_levels, eligible_sections')
          .eq('is_active', true)
          .eq('status', 'active');
        
        if (error) throw new Error(error.message);
        if (!sessions || sessions.length === 0) return [];

        // Filter sessions by voter eligibility using unified normalization rules
        return sessions.filter((s: any) =>
          isEligibleForSession(
            {
              eligibleGradeLevels: s.eligible_grade_levels,
              eligibleSections: s.eligible_sections,
            },
            { gradeLevel: voterGradeLevel, section: voterSection }
          )
        );
      })
    );
  },

  // ==================== School Year Rollover ====================
  getSystemSettings: async () => {
    return cachedFetch('getSystemSettings', 600000, () =>
      withRetry(async () => {
        const { data, error } = await supabase.from('system_settings').select(SYSTEM_SETTINGS_COLUMNS).eq('id', 1).single();
        if (error) return { currentSchoolYear: '2026-2027' };
        return { currentSchoolYear: data.current_school_year || '2026-2027' };
      }).catch(() => ({ currentSchoolYear: '2026-2027' }))
    );
  },

  processYearRollover: async (newSchoolYear: string, voterUpdates: { id: string; grade_level: string; section: string; status: string; academic_history: any[] }[]) => {
    try {
      const { error } = await supabase.rpc('secure_process_rollover', {
        p_token: requireSessionToken('admin'), p_school_year: newSchoolYear, p_updates: voterUpdates,
      });
      if (error) {
        handleSessionError(error);
        throw new Error(error.message);
      }
      clearApiCache('getSystemSettings');
      clearApiCache('getVoters');
      clearApiCache('getSessions');
      return { success: true };
    } catch (err) {
      handleSessionError(err);
      throw err;
    }
  },

  // ==================== Election History ====================
  getElectionHistory: async () => {
    return cachedFetch('getElectionHistory', 60000, () =>
      withRetry(async () => {
        const { data, error } = await supabase
          .from('voting_sessions')
          .select(SESSION_COLUMNS)
          .in('status', ['completed', 'finalized'])
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      })
    );
  },

  getElectionHistoryDetail: async (sessionId: string) => {
    return dedupeInFlight(`getElectionHistoryDetail:${sessionId}`, async () => {
      try {
        const [sessionRes, candidatesRes, positionsRes, voterSessions, auditRes, approvedCount] = await Promise.all([
          supabase.from('voting_sessions').select(SESSION_COLUMNS).eq('id', sessionId).maybeSingle(),
          api.getCandidates(sessionId).then(data => ({ data, error: null })),
          supabase.from('positions').select(POSITION_COLUMNS).eq('session_id', sessionId).order('display_order', { ascending: true }),
          api.getVoterSessions(sessionId),
          supabase.rpc('secure_get_audit_data', {
            p_token: requireSessionToken('admin'), p_session_id: Number(sessionId),
          }),
          api.getVoters().then(voters => voters.filter((v: any) => v.status === 'approved').length).catch(() => 0),
        ]);

        if (sessionRes.error) {
          console.error('Session fetch error:', sessionRes.error);
          throw new Error(sessionRes.error.message);
        }

        if (!sessionRes.data) {
          throw new Error(`Election session #${sessionId} not found.`);
        }

        if (auditRes.error) {
          handleSessionError(auditRes.error);
          throw new Error(auditRes.error.message);
        }
        const auditData = auditRes.data as { verifications?: any[]; tieResolutions?: any[] } | null;
        const verifications = auditData?.verifications || [];
        const tieResolutions = auditData?.tieResolutions || [];

        // Count total approved voters and those who voted in this session
        const totalVoted = voterSessions.filter((vs: any) => vs.has_voted).length;
        const totalVoters = approvedCount || voterSessions.length;

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
        handleSessionError(error);
        console.error('getElectionHistoryDetail failed:', error);
        throw error;
      }
    });
  },
};
