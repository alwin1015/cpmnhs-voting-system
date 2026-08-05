// Offline localStorage-based API — mirrors the Supabase api.ts interface
// All data is stored in localStorage so the app works without internet.

const LS_KEYS = {
  candidates: 'offline_candidates',
  positions: 'offline_positions',
  sections: 'offline_sections',
  voters: 'offline_voters',
  votes: 'offline_votes',
  admins: 'offline_admins',
  election: 'offline_election',
  session: 'voting_session',
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

  if (!localStorage.getItem(LS_KEYS.admins)) {
    setStore(LS_KEYS.admins, [
      { id: '1', username: 'admin', email: 'admin@cpmnhs.edu.ph', password_hash: 'admin123' }
    ]);
  }

  if (!localStorage.getItem(LS_KEYS.election)) {
    setStore(LS_KEYS.election, {
      id: 1,
      name: 'SSG General Election',
      school_year: '2026-2027',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      grade_mappings: {},
    });
  }

  if (!localStorage.getItem(LS_KEYS.candidates)) setStore(LS_KEYS.candidates, []);
  if (!localStorage.getItem(LS_KEYS.sections)) setStore(LS_KEYS.sections, []);
  if (!localStorage.getItem(LS_KEYS.voters)) setStore(LS_KEYS.voters, []);
  if (!localStorage.getItem(LS_KEYS.votes)) setStore(LS_KEYS.votes, []);
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

  resetSystem: async () => {
    setStore(LS_KEYS.votes, []);
    const candidates = getStore<any>(LS_KEYS.candidates);
    candidates.forEach((c: any) => c.votes = 0);
    setStore(LS_KEYS.candidates, candidates);
    const voters = getStore<any>(LS_KEYS.voters);
    voters.forEach((v: any) => { v.has_voted = false; v.voted_at = null; });
    setStore(LS_KEYS.voters, voters);
    const election = JSON.parse(localStorage.getItem(LS_KEYS.election) || '{}');
    election.is_active = false;
    setStore(LS_KEYS.election, election);
    return { success: true };
  },
};
