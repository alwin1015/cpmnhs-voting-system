// Offline localStorage-based API — mirrors the Supabase api.ts interface
// All data is stored in localStorage so the app works 100% offline without internet.

const LS_KEYS = {
  candidates: 'offline_candidates',
  positions: 'offline_positions',
  sections: 'offline_sections',
  voters: 'offline_voters',
  votes: 'offline_votes',
  admins: 'offline_admins',
  election: 'offline_election',
  session: 'voting_session',
  verifications: 'offline_verifications',
  tieResolutions: 'offline_tie_resolutions',
  sessions: 'offline_sessions',
  voterSessions: 'offline_voter_sessions',
  systemSettings: 'offline_system_settings',
};

function getStore<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setStore<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

let nextId = Number(localStorage.getItem('offline_next_id') || '1000');
function genId(): string {
  nextId++;
  localStorage.setItem('offline_next_id', String(nextId));
  return String(nextId);
}

import { offlineSeed } from './offlineSeed';

export function seedDefaults() {
  if (!localStorage.getItem(LS_KEYS.positions)) setStore(LS_KEYS.positions, offlineSeed.positions || []);
  if (!localStorage.getItem(LS_KEYS.sections)) setStore(LS_KEYS.sections, offlineSeed.sections || []);
  if (!localStorage.getItem(LS_KEYS.candidates)) setStore(LS_KEYS.candidates, offlineSeed.candidates || []);
  if (!localStorage.getItem(LS_KEYS.voters)) setStore(LS_KEYS.voters, offlineSeed.voters || []);
  if (!localStorage.getItem(LS_KEYS.votes)) setStore(LS_KEYS.votes, offlineSeed.votes || []);
  if (!localStorage.getItem(LS_KEYS.sessions)) setStore(LS_KEYS.sessions, offlineSeed.sessions || []);
  if (!localStorage.getItem(LS_KEYS.voterSessions)) setStore(LS_KEYS.voterSessions, offlineSeed.voterSessions || []);
  if (!localStorage.getItem(LS_KEYS.systemSettings)) setStore(LS_KEYS.systemSettings, offlineSeed.settings || []);

  if (!localStorage.getItem(LS_KEYS.admins)) {
    setStore(LS_KEYS.admins, [
      { id: '1', username: 'admin', email: 'admin@cpmnhs.edu.ph', password_hash: 'admin123' }
    ]);
  }

  // Seed election from the first session in offlineSeed if available
  if (!localStorage.getItem(LS_KEYS.election)) {
    const firstSession = (offlineSeed.sessions && offlineSeed.sessions[0]) || null;
    setStore(LS_KEYS.election, firstSession || {
      id: 1,
      name: 'SSG General Election',
      school_year: '2026-2027',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: false,
      grade_mappings: {},
      results_finalized: false,
      finalized_by: null,
      finalized_at: null,
      schedule_status: 'draft',
      authorization_doc_generated: false,
      authorization_confirmed_at: null,
      signatories: null,
    });
  }

  if (!localStorage.getItem(LS_KEYS.verifications)) setStore(LS_KEYS.verifications, []);
  if (!localStorage.getItem(LS_KEYS.tieResolutions)) setStore(LS_KEYS.tieResolutions, []);
}
// NOTE: seedDefaults() is NOT called here automatically.
// It is only called explicitly from VotingContext when OFFLINE_MODE=true,
// to avoid crashing the app with localStorage quota errors in online mode.

export const offlineApi = {
  // Auth
  login: async (lrn: string, password: string) => {
    const voters = getStore<any>(LS_KEYS.voters);
    const voter = voters.find((v: any) => v.lrn === lrn);
    if (!voter) throw new Error('Invalid LRN');
    if (voter.password_hash !== password) throw new Error('Invalid password');
    if (voter.status !== 'approved') throw new Error('Your registration is still pending approval.');

    const user = { id: voter.id, role: 'voter', name: voter.name, lrn: voter.lrn, gradeLevel: voter.grade_level, section: voter.section };
    localStorage.setItem(LS_KEYS.session, JSON.stringify({ user, has_voted: voter.has_voted }));
    return { success: true, user, hasVoted: voter.has_voted };
  },

  adminLogin: async (username: string, password: string) => {
    const admins = getStore<any>(LS_KEYS.admins);
    const admin = admins.find((a: any) => a.username === username);
    if (!admin) throw new Error('Invalid username or password');
    if (admin.password_hash !== password) throw new Error('Invalid username or password');

    const user = { id: admin.id, role: 'admin', name: admin.username, email: admin.email };
    localStorage.setItem(LS_KEYS.session, JSON.stringify({ user, has_voted: false }));
    return { success: true, user };
  },

  register: async (data: any) => {
    const voters = getStore<any>(LS_KEYS.voters);
    if (voters.find((v: any) => v.lrn === data.lrn)) throw new Error('LRN already registered');
    
    let fullName = data.name;
    if (!fullName && data.firstName && data.lastName) {
      fullName = `${data.firstName} ${data.middleInitial ? data.middleInitial + '. ' : ''}${data.lastName}`.trim();
    }

    voters.push({
      id: genId(),
      lrn: data.lrn,
      name: fullName,
      grade_level: data.gradeLevel,
      section: data.section,
      password_hash: data.password,
      status: 'pending',
      has_voted: false,
      voted_at: null,
      created_at: new Date().toISOString(),
    });
    setStore(LS_KEYS.voters, voters);
    return { success: true, message: 'Registration submitted! Please wait for admin approval.' };
  },

  bulkRegister: async (students: any[]) => {
    const voters = getStore<any>(LS_KEYS.voters);
    for (const s of students) {
      voters.push({
        id: genId(),
        lrn: s.lrn,
        name: s.name,
        grade_level: s.gradeLevel,
        section: s.section,
        password_hash: s.password,
        status: 'approved',
        has_voted: false,
        voted_at: null,
        created_at: new Date().toISOString(),
      });
    }
    setStore(LS_KEYS.voters, voters);
    return { success: true, message: 'Bulk registration processed.' };
  },

  adminRegister: async (data: { username: string; email: string; password: string }) => {
    const admins = getStore<any>(LS_KEYS.admins);
    if (admins.find((a: any) => a.username === data.username)) throw new Error('Username already taken');
    admins.push({ id: genId(), username: data.username, email: data.email, password_hash: data.password });
    setStore(LS_KEYS.admins, admins);
    return { success: true, message: 'Admin registration successful! You can now login.' };
  },

  logout: async () => {
    localStorage.removeItem(LS_KEYS.session);
    return { success: true };
  },

  getMe: async () => {
    const session = localStorage.getItem(LS_KEYS.session);
    if (!session) return { user: null };
    return JSON.parse(session);
  },

  // Voters
  getVoters: async () => getStore(LS_KEYS.voters),
  approveVoter: async (id: string) => {
    const voters = getStore<any>(LS_KEYS.voters);
    const v = voters.find((v: any) => String(v.id) === id);
    if (v) v.status = 'approved';
    setStore(LS_KEYS.voters, voters);
    return { success: true };
  },
  updateMySection: async (voterId: string, newSection: string) => {
    const voters = getStore<any>(LS_KEYS.voters);
    const v = voters.find((v: any) => String(v.id) === voterId);
    if (v) v.section = newSection;
    setStore(LS_KEYS.voters, voters);
    
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
    const voters = getStore<any>(LS_KEYS.voters);
    const v = voters.find((v: any) => String(v.id) === id);
    if (v) v.status = 'rejected';
    setStore(LS_KEYS.voters, voters);
    return { success: true };
  },

  // Candidates
  getCandidates: async (sessionId?: string) => {
    let candidates = getStore<any>(LS_KEYS.candidates);
    if (sessionId) candidates = candidates.filter((c: any) => String(c.session_id) === String(sessionId));
    return candidates;
  },
  addCandidate: async (data: any) => {
    const candidates = getStore<any>(LS_KEYS.candidates);
    candidates.push({ ...data, id: genId(), votes: 0 });
    setStore(LS_KEYS.candidates, candidates);
    return { success: true };
  },
  updateCandidate: async (data: any) => {
    const candidates = getStore<any>(LS_KEYS.candidates);
    const idx = candidates.findIndex((c: any) => String(c.id) === String(data.id));
    if (idx !== -1) candidates[idx] = { ...candidates[idx], ...data };
    setStore(LS_KEYS.candidates, candidates);
    return { success: true };
  },
  deleteCandidate: async (id: string) => {
    let candidates = getStore<any>(LS_KEYS.candidates);
    candidates = candidates.filter((c: any) => String(c.id) !== id);
    setStore(LS_KEYS.candidates, candidates);
    return { success: true };
  },

  // Positions
  getPositions: async (sessionId?: string) => {
    let positions = getStore<any>(LS_KEYS.positions);
    if (sessionId) positions = positions.filter((p: any) => String(p.session_id) === String(sessionId));
    return positions.sort((a: any, b: any) => a.display_order - b.display_order);
  },
  addPosition: async (data: any) => {
    const positions = getStore<any>(LS_KEYS.positions);
    positions.push({ ...data, id: genId() });
    setStore(LS_KEYS.positions, positions);
    return { success: true };
  },
  deletePosition: async (id: string) => {
    let positions = getStore<any>(LS_KEYS.positions);
    positions = positions.filter((p: any) => String(p.id) !== id);
    setStore(LS_KEYS.positions, positions);
    return { success: true };
  },
  cleanupDuplicatePositions: async () => {
    const positions = getStore<any>(LS_KEYS.positions);
    const uniquePositions: any[] = [];
    const seen = new Set<string>();
    for (const p of positions) {
      const key = p.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniquePositions.push(p);
      }
    }
    const removedCount = positions.length - uniquePositions.length;
    setStore(LS_KEYS.positions, uniquePositions);
    return { success: true, count: removedCount };
  },

  // Sections
  getSections: async () => getStore(LS_KEYS.sections),
  addSection: async (data: any) => {
    const sections = getStore<any>(LS_KEYS.sections);
    sections.push({ ...data, id: genId() });
    setStore(LS_KEYS.sections, sections);
    return { success: true };
  },
  deleteSection: async (id: string) => {
    let sections = getStore<any>(LS_KEYS.sections);
    sections = sections.filter((s: any) => String(s.id) !== id);
    setStore(LS_KEYS.sections, sections);
    return { success: true };
  },

  // Votes
  submitVotes: async (votes: { candidate_id: string; position_id: string }[], sessionId?: string) => {
    const sessionStr = localStorage.getItem(LS_KEYS.session);
    if (!sessionStr) throw new Error('Not authenticated');
    const session = JSON.parse(sessionStr);

    const allVotes = getStore<any>(LS_KEYS.votes);
    for (const v of votes) {
      allVotes.push({ id: genId(), voter_id: session.user.id, session_id: sessionId || '1', ...v, timestamp: new Date().toISOString() });
    }
    setStore(LS_KEYS.votes, allVotes);

    // Mark voter as voted in the session
    const voterSessions = getStore<any>(LS_KEYS.voterSessions);
    let vs = voterSessions.find((vs: any) => String(vs.voter_id) === String(session.user.id) && String(vs.session_id) === String(sessionId || '1'));
    if (!vs) {
      vs = { id: genId(), voter_id: session.user.id, session_id: sessionId || '1', has_voted: true, voted_at: new Date().toISOString() };
      voterSessions.push(vs);
    } else {
      vs.has_voted = true;
      vs.voted_at = new Date().toISOString();
    }
    setStore(LS_KEYS.voterSessions, voterSessions);

    // Legacy fallback
    const voters = getStore<any>(LS_KEYS.voters);
    const voter = voters.find((v: any) => String(v.id) === String(session.user.id));
    if (voter) {
      voter.has_voted = true;
      voter.voted_at = new Date().toISOString();
    }
    setStore(LS_KEYS.voters, voters);

    // Increment candidate vote counts
    const candidates = getStore<any>(LS_KEYS.candidates);
    for (const v of votes) {
      const c = candidates.find((c: any) => String(c.id) === String(v.candidate_id));
      if (c) c.votes = (c.votes || 0) + 1;
    }
    setStore(LS_KEYS.candidates, candidates);

    session.has_voted = true;
    localStorage.setItem(LS_KEYS.session, JSON.stringify(session));
    return { success: true };
  },

  getResults: async (sessionId?: string) => {
    let candidates = getStore<any>(LS_KEYS.candidates);
    if (sessionId) {
      candidates = candidates.filter((c: any) => String(c.session_id) === String(sessionId));
    }
    return candidates;
  },

  // Sessions
  getSystemSettings: async () => {
    return getStore<any>(LS_KEYS.systemSettings)[0] || { id: 1, current_school_year: '2026-2027', updated_at: new Date().toISOString() };
  },
  processYearRollover: async (newSchoolYear: string, voterUpdates: any[]) => {
    const settings = getStore<any>(LS_KEYS.systemSettings);
    if (settings[0]) settings[0].current_school_year = newSchoolYear;
    setStore(LS_KEYS.systemSettings, settings);

    const voters = getStore<any>(LS_KEYS.voters);
    voterUpdates.forEach(update => {
      const v = voters.find((vt: any) => String(vt.id) === String(update.id));
      if (v) {
        v.grade_level = update.grade_level;
        v.section = update.section;
        v.status = update.status;
        v.academic_history = update.academic_history;
      }
    });
    setStore(LS_KEYS.voters, voters);
    return { success: true };
  },
  getSessions: async () => getStore<any>(LS_KEYS.sessions).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  getSession: async (id: string) => {
    const s = getStore<any>(LS_KEYS.sessions).find((s: any) => String(s.id) === String(id));
    if (!s) throw new Error('Session not found');
    return s;
  },
  createSession: async (data: any) => {
    const sessions = getStore<any>(LS_KEYS.sessions);
    const newSession = { ...data, id: genId(), created_at: new Date().toISOString() };
    sessions.push(newSession);
    setStore(LS_KEYS.sessions, sessions);
    return newSession;
  },
  updateSession: async (id: string, data: any) => {
    const sessions = getStore<any>(LS_KEYS.sessions);
    const idx = sessions.findIndex((s: any) => String(s.id) === String(id));
    if (idx !== -1) {
      if (data.is_active) {
        sessions.forEach((s: any) => s.is_active = false);
      }
      sessions[idx] = { ...sessions[idx], ...data };
      setStore(LS_KEYS.sessions, sessions);
    }
    return { success: true };
  },
  deleteSession: async (id: string) => {
    let sessions = getStore<any>(LS_KEYS.sessions);
    sessions = sessions.filter((s: any) => String(s.id) !== String(id));
    setStore(LS_KEYS.sessions, sessions);
    return { success: true };
  },
  duplicateSession: async (id: string) => {
    const sessions = getStore<any>(LS_KEYS.sessions);
    const original = sessions.find((s: any) => String(s.id) === String(id));
    if (!original) throw new Error('Not found');
    sessions.push({ ...original, id: genId(), name: `${original.name} (Copy)`, is_active: false, status: 'upcoming', created_at: new Date().toISOString() });
    setStore(LS_KEYS.sessions, sessions);
    return { success: true };
  },
  resetSession: async (id: string) => {
    let votes = getStore<any>(LS_KEYS.votes);
    votes = votes.filter((v: any) => String(v.session_id) !== String(id));
    setStore(LS_KEYS.votes, votes);

    let voterSessions = getStore<any>(LS_KEYS.voterSessions);
    voterSessions = voterSessions.filter((vs: any) => String(vs.session_id) !== String(id));
    setStore(LS_KEYS.voterSessions, voterSessions);

    const candidates = getStore<any>(LS_KEYS.candidates);
    candidates.forEach((c: any) => { if (String(c.session_id) === String(id)) c.votes = 0; });
    setStore(LS_KEYS.candidates, candidates);
    return { success: true };
  },
  getEligibleSessions: async (gradeLevel: string, section: string) => {
    const sessions = getStore<any>(LS_KEYS.sessions).filter((s: any) => s.isActive && s.status === 'active');
    return sessions.filter((s: any) => {
      const g = !s.eligible_grade_levels || s.eligible_grade_levels.length === 0 || s.eligible_grade_levels.includes(gradeLevel);
      const sec = !s.eligible_sections || s.eligible_sections.length === 0 || s.eligible_sections.includes(section);
      return g && sec;
    });
  },
  getVoterSessions: async (sessionId: string) => {
    return getStore<any>(LS_KEYS.voterSessions).filter((vs: any) => String(vs.session_id) === String(sessionId));
  },
  getVoterSessionStatus: async (voterId: string, sessionId: string) => {
    const vs = getStore<any>(LS_KEYS.voterSessions).find((vs: any) => String(vs.voter_id) === String(voterId) && String(vs.session_id) === String(sessionId));
    return vs ? { hasVoted: vs.has_voted, votedAt: vs.voted_at } : { hasVoted: false, votedAt: null };
  },

  // Election
  getElection: async () => {
    const raw = localStorage.getItem(LS_KEYS.election);
    return raw ? JSON.parse(raw) : null;
  },
  updateElection: async (data: any) => {
    const existing = JSON.parse(localStorage.getItem(LS_KEYS.election) || '{}');
    setStore(LS_KEYS.election, { ...existing, ...data });
    return { success: true };
  },
  finalizeResults: async (sessionId?: string) => {
    const sessions = getStore<any>(LS_KEYS.sessions);
    const s = sessions.find((s: any) => String(s.id) === String(sessionId || '1'));
    if (s) {
      const authSession = JSON.parse(localStorage.getItem(LS_KEYS.session) || '{}');
      s.results_finalized = true;
      s.finalized_by = authSession?.user?.name || 'Administrator';
      s.finalized_at = new Date().toISOString();
      setStore(LS_KEYS.sessions, sessions);
    }
    return { success: true };
  },
  unfinalizeResults: async (sessionId?: string) => {
    const sessions = getStore<any>(LS_KEYS.sessions);
    const s = sessions.find((s: any) => String(s.id) === String(sessionId || '1'));
    if (s) {
      s.results_finalized = false;
      s.finalized_by = null;
      s.finalized_at = null;
      setStore(LS_KEYS.sessions, sessions);
    }
    return { success: true };
  },

  // Verifications & Tie Resolutions
  getVerifications: async (sessionId?: string) => {
    return getStore<any>(LS_KEYS.verifications);
  },
  getTieResolutions: async () => getStore(LS_KEYS.tieResolutions),
  initiateVerification: async (positionId: string, tiedCandidateIds: string[], originalVoteCounts: Record<string, number>) => {
    const voters = getStore<any>(LS_KEYS.voters).filter((v: any) => v.has_voted);
    const selectedVoterIds = voters.slice(0, 5).map((v: any) => v.id);
    const verifications = getStore<any>(LS_KEYS.verifications);
    const newVer = {
      id: genId(),
      position_id: positionId,
      tied_candidate_ids: JSON.stringify(tiedCandidateIds),
      selected_voter_ids: JSON.stringify(selectedVoterIds),
      verification_status: 'in_progress',
      original_vote_counts: JSON.stringify(originalVoteCounts),
      created_at: new Date().toISOString(),
    };
    verifications.push(newVer);
    setStore(LS_KEYS.verifications, verifications);
    return newVer;
  },
  getVerificationVotes: async (voterIds: string[], positionId: string) => {
    const votes = getStore<any>(LS_KEYS.votes);
    const voters = getStore<any>(LS_KEYS.voters);
    const candidates = getStore<any>(LS_KEYS.candidates);
    return votes
      .filter((v: any) => voterIds.includes(String(v.voter_id)) && String(v.position_id) === String(positionId))
      .map((v: any) => {
        const voter = voters.find((vt: any) => String(vt.id) === String(v.voter_id));
        const cand = candidates.find((c: any) => String(c.id) === String(v.candidate_id));
        return {
          voterName: voter?.name || 'Voter',
          voterLrn: voter?.lrn || '—',
          candidateName: cand?.name || 'Candidate',
        };
      });
  },
  completeVerification: async (verificationId: string, notes: string, tieRemains: boolean) => {
    const verifications = getStore<any>(LS_KEYS.verifications);
    const v = verifications.find((item: any) => String(item.id) === String(verificationId));
    if (v) {
      v.verification_status = tieRemains ? 'tie_remains' : 'completed';
      v.notes = notes;
      v.verified_at = new Date().toISOString();
      const session = JSON.parse(localStorage.getItem(LS_KEYS.session) || '{}');
      v.verified_by = session?.user?.name || 'Admin';
    }
    setStore(LS_KEYS.verifications, verifications);
    return { success: true };
  },
  resolveTie: async (verificationId: string, positionId: string, winnerId: string, reason: string) => {
    const tieResolutions = getStore<any>(LS_KEYS.tieResolutions);
    const session = JSON.parse(localStorage.getItem(LS_KEYS.session) || '{}');
    tieResolutions.push({
      id: genId(),
      verification_id: verificationId,
      position_id: positionId,
      selected_winner_id: winnerId,
      resolution_method: 'admin_resolution',
      resolved_by: session?.user?.name || 'Administrator',
      resolved_at: new Date().toISOString(),
      reason,
    });
    setStore(LS_KEYS.tieResolutions, tieResolutions);
    return { success: true };
  },

  resetSystem: async () => {
    setStore(LS_KEYS.votes, []);
    const candidates = getStore<any>(LS_KEYS.candidates);
    candidates.forEach((c: any) => c.votes = 0);
    setStore(LS_KEYS.candidates, candidates);
    setStore(LS_KEYS.voters, []);
    setStore(LS_KEYS.verifications, []);
    setStore(LS_KEYS.tieResolutions, []);
    const election = JSON.parse(localStorage.getItem(LS_KEYS.election) || '{}');
    election.is_active = false;
    election.results_finalized = false;
    election.finalized_by = null;
    election.finalized_at = null;
    setStore(LS_KEYS.election, election);
    return { success: true };
  },
};
