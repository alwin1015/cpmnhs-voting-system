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

// Seed default data if empty
function seedDefaults() {
  if (!localStorage.getItem(LS_KEYS.positions)) {
    const defaultPositions = [
      { id: '1', name: 'President', display_order: 1, max_votes: 1, strict_grade_mapping: false },
      { id: '2', name: 'Vice President', display_order: 2, max_votes: 1, strict_grade_mapping: false },
      { id: '3', name: 'Secretary', display_order: 3, max_votes: 1, strict_grade_mapping: false },
      { id: '4', name: 'Treasurer', display_order: 4, max_votes: 1, strict_grade_mapping: false },
      { id: '5', name: 'Auditor', display_order: 5, max_votes: 1, strict_grade_mapping: false },
      { id: '6', name: 'Public Information Officer', display_order: 6, max_votes: 1, strict_grade_mapping: false },
      { id: '7', name: 'Protocol Officer', display_order: 7, max_votes: 1, strict_grade_mapping: false },
      { id: '8', name: 'Grade 7 Representative', display_order: 8, max_votes: 1, strict_grade_mapping: false },
      { id: '9', name: 'Grade 8 Representative', display_order: 9, max_votes: 1, strict_grade_mapping: false },
      { id: '10', name: 'Grade 9 Representative', display_order: 10, max_votes: 1, strict_grade_mapping: false },
      { id: '11', name: 'Grade 10 Representative', display_order: 11, max_votes: 1, strict_grade_mapping: false },
      { id: '12', name: 'Grade 11 Representative', display_order: 12, max_votes: 1, strict_grade_mapping: false },
      { id: '13', name: 'Grade 12 Representative', display_order: 13, max_votes: 1, strict_grade_mapping: false },
    ];
    setStore(LS_KEYS.positions, defaultPositions);
  }

  if (!localStorage.getItem(LS_KEYS.sections)) {
    const defaultSections = [
      { id: '1', grade_level: '7', name: 'Diamond' },
      { id: '2', grade_level: '7', name: 'Emerald' },
      { id: '3', grade_level: '8', name: 'Ruby' },
      { id: '4', grade_level: '8', name: 'Sapphire' },
      { id: '5', grade_level: '9', name: 'Topaz' },
      { id: '6', grade_level: '10', name: 'Garnet' },
      { id: '7', grade_level: '11', name: 'STEM A' },
      { id: '8', grade_level: '12', name: 'HUMSS A' },
    ];
    setStore(LS_KEYS.sections, defaultSections);
  }

  if (!localStorage.getItem(LS_KEYS.candidates)) {
    const defaultCandidates = [
      { id: '101', name: 'Juan Dela Cruz', position_id: '1', party: 'LAKAS PARTY', grade_level: '12', section: 'HUMSS A', motto: 'Service with Integrity', votes: 0 },
      { id: '102', name: 'Maria Clara Santos', position_id: '1', party: 'PROGRESSIVE PARTY', grade_level: '11', section: 'STEM A', motto: 'Leadership for Tomorrow', votes: 0 },
      { id: '103', name: 'Pedro Penduko', position_id: '2', party: 'LAKAS PARTY', grade_level: '11', section: 'STEM A', motto: 'Action above words', votes: 0 },
      { id: '104', name: 'Gabriela Silang', position_id: '2', party: 'PROGRESSIVE PARTY', grade_level: '10', section: 'Garnet', motto: 'Empowering Student Voices', votes: 0 },
      { id: '105', name: 'Jose Rizal', position_id: '3', party: 'LAKAS PARTY', grade_level: '10', section: 'Garnet', motto: 'Honesty and Dedication', votes: 0 },
      { id: '106', name: 'Andres Bonifacio', position_id: '4', party: 'PROGRESSIVE PARTY', grade_level: '9', section: 'Topaz', motto: 'Transparent and Accountable', votes: 0 },
    ];
    setStore(LS_KEYS.candidates, defaultCandidates);
  }

  if (!localStorage.getItem(LS_KEYS.admins)) {
    setStore(LS_KEYS.admins, [
      { id: '1', username: 'admin', email: 'admin@cpmnhs.edu.ph', password_hash: 'admin123' }
    ]);
  }

  if (!localStorage.getItem(LS_KEYS.voters)) {
    const defaultVoters = [
      {
        id: '201',
        lrn: '123456789012',
        name: 'Carlos Yulo',
        grade_level: '12',
        section: 'HUMSS A',
        password_hash: 'student123',
        status: 'approved',
        has_voted: false,
        voted_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: '202',
        lrn: '123456789013',
        name: 'Hidilyn Diaz',
        grade_level: '11',
        section: 'STEM A',
        password_hash: 'student123',
        status: 'approved',
        has_voted: false,
        voted_at: null,
        created_at: new Date().toISOString(),
      }
    ];
    setStore(LS_KEYS.voters, defaultVoters);
  }

  if (!localStorage.getItem(LS_KEYS.election)) {
    setStore(LS_KEYS.election, {
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

  if (!localStorage.getItem(LS_KEYS.votes)) setStore(LS_KEYS.votes, []);
  if (!localStorage.getItem(LS_KEYS.verifications)) setStore(LS_KEYS.verifications, []);
  if (!localStorage.getItem(LS_KEYS.tieResolutions)) setStore(LS_KEYS.tieResolutions, []);
}

seedDefaults();

export const offlineApi = {
  // Auth
  login: async (lrn: string, password: string) => {
    const voters = getStore<any>(LS_KEYS.voters);
    const voter = voters.find((v: any) => v.lrn === lrn);
    if (!voter) throw new Error('Invalid LRN');
    if (voter.password_hash !== password) throw new Error('Invalid password');
    if (voter.status !== 'approved') throw new Error('Your registration is still pending approval.');

    const user = { id: voter.id, role: 'voter', name: voter.name, lrn: voter.lrn, gradeLevel: voter.grade_level };
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
  rejectVoter: async (id: string) => {
    const voters = getStore<any>(LS_KEYS.voters);
    const v = voters.find((v: any) => String(v.id) === id);
    if (v) v.status = 'rejected';
    setStore(LS_KEYS.voters, voters);
    return { success: true };
  },

  // Candidates
  getCandidates: async () => getStore(LS_KEYS.candidates),
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
  getPositions: async () => {
    const positions = getStore<any>(LS_KEYS.positions);
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
  submitVotes: async (votes: { candidate_id: string; position_id: string }[]) => {
    const sessionStr = localStorage.getItem(LS_KEYS.session);
    if (!sessionStr) throw new Error('Not authenticated');
    const session = JSON.parse(sessionStr);

    const allVotes = getStore<any>(LS_KEYS.votes);
    for (const v of votes) {
      allVotes.push({ id: genId(), voter_id: session.user.id, ...v, timestamp: new Date().toISOString() });
    }
    setStore(LS_KEYS.votes, allVotes);

    // Mark voter as voted
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

  getResults: async () => getStore(LS_KEYS.candidates),

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
  finalizeResults: async () => {
    const election = JSON.parse(localStorage.getItem(LS_KEYS.election) || '{}');
    const session = JSON.parse(localStorage.getItem(LS_KEYS.session) || '{}');
    election.results_finalized = true;
    election.finalized_by = session?.user?.name || 'Administrator';
    election.finalized_at = new Date().toISOString();
    setStore(LS_KEYS.election, election);
    return { success: true };
  },
  unfinalizeResults: async () => {
    const election = JSON.parse(localStorage.getItem(LS_KEYS.election) || '{}');
    election.results_finalized = false;
    election.finalized_by = null;
    election.finalized_at = null;
    setStore(LS_KEYS.election, election);
    return { success: true };
  },

  // Verifications & Tie Resolutions
  getVerifications: async () => getStore(LS_KEYS.verifications),
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
