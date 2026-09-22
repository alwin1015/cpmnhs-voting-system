import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Candidate, Position, Voter, Section, Election, VotingSession, User } from '@/types/voting';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { isEligibleForSession, isSessionOpen, parseStoredJson } from '@/lib/electionRules';

interface VotingContextType {
  user: User | null;
  election: Election | null;
  candidates: Candidate[];
  positions: Position[];
  voters: Voter[];
  sections: Section[];
  votes: Record<string, string>;
  isLoggedIn: boolean;
  hasVoted: boolean;
  // Sessions
  sessions: VotingSession[];
  activeSessionId: string | null;
  activeSession: VotingSession | null;
  switchSession: (id: string) => void;
  createSession: (data: any) => Promise<VotingSession>;
  deleteSession: (id: string) => Promise<void>;
  duplicateSession: (id: string) => Promise<VotingSession>;
  refreshSessions: () => Promise<void>;
  // System
  currentSchoolYear: string;
  processRollover: (newSchoolYear: string, voterUpdates: any[]) => Promise<void>;
  // Auth
  login: (lrn: string, password: string) => Promise<boolean>;
  adminLogin: (username: string, password: string) => Promise<{ success: boolean; mustChangePassword: boolean }>;
  adminChangePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  register: (lrn: string, firstName: string, middleInitial: string, lastName: string, gradeLevel: string, section: string, password: string) => Promise<{ success: boolean; message: string }>;
  bulkRegister: (students: any[]) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  logout: () => void;
  // Voting
  setVote: (positionId: string, candidateId: string) => void;
  submitVotes: () => Promise<boolean>;
  getResults: () => { position: Position; candidates: Candidate[] }[];
  finalizeResults: () => Promise<void>;
  unfinalizeResults: () => Promise<void>;
  updateElection: (updates: Partial<Election>) => Promise<void>;
  resetSystem: () => Promise<void>;
  // CRUD
  addCandidate: (candidate: Omit<Candidate, 'id' | 'votes' | 'sessionId'>) => Promise<void>;
  updateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  addPosition: (position: Omit<Position, 'id' | 'sessionId'>) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  cleanupDuplicatePositions: () => Promise<{ success: boolean; count: number }>;
  addSection: (section: Omit<Section, 'id'>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  approveVoter: (id: string) => Promise<boolean>;
  approveAllVoters: () => Promise<boolean>;
  updateMySection: (voterId: string, newSection: string) => Promise<void>;
  rejectVoter: (id: string) => Promise<boolean>;
  deleteVoter: (id: string) => Promise<boolean>;
  isInitializing: boolean;
  isDataLoaded: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

// Helper: parse a session row from DB into VotingSession
function parseSession(eData: any, voters?: Voter[]): VotingSession {
  let parsedMappings: Record<string, string> = {};
  if (eData.grade_mappings) {
    try {
      parsedMappings = typeof eData.grade_mappings === 'string'
        ? JSON.parse(eData.grade_mappings)
        : eData.grade_mappings;
    } catch (_) {}
  }

  let eligibleGrades: string[] = [];
  if (eData.eligible_grade_levels) {
    try {
      eligibleGrades = typeof eData.eligible_grade_levels === 'string'
        ? JSON.parse(eData.eligible_grade_levels)
        : (eData.eligible_grade_levels || []);
    } catch (_) {}
  }

  let eligibleSections: string[] = [];
  if (eData.eligible_sections) {
    try {
      eligibleSections = typeof eData.eligible_sections === 'string'
        ? JSON.parse(eData.eligible_sections)
        : (eData.eligible_sections || []);
    } catch (_) {}
  }

  return {
    id: String(eData.id),
    name: eData.name || 'Untitled Election',
    schoolYear: eData.school_year ?? eData.schoolYear ?? '',
    startDate: new Date(eData.start_date ?? eData.startDate ?? NaN),
    endDate: new Date(eData.end_date ?? eData.endDate ?? NaN),
    isActive: Boolean(eData.is_active ?? eData.isActive ?? false),
    status: eData.status || 'upcoming',
    gradeMappings: parsedMappings,
    eligibleGradeLevels: eligibleGrades,
    eligibleSections: eligibleSections,
    totalVoters: voters ? voters.filter(v => v.status === 'approved').length : undefined,
    totalVoted: undefined, // computed per-session separately
    resultsFinalized: Boolean(eData.results_finalized ?? false),
    finalizedBy: eData.finalized_by ?? null,
    finalizedAt: eData.finalized_at ? new Date(eData.finalized_at) : undefined,
    scheduleStatus: eData.schedule_status ?? eData.scheduleStatus ?? 'draft',
    authorizationDocGenerated: Boolean(eData.authorization_doc_generated ?? eData.authorizationDocGenerated ?? false),
    authorizationConfirmedAt: eData.authorization_confirmed_at ?? eData.authorizationConfirmedAt ?? null,
    signatories: parseStoredJson(eData.signatories, null),
  };
}

// Stable deep-equality helpers to prevent repeated rendering, context churn, and screen flickering
function areSessionsEqual(a: VotingSession[], b: VotingSession[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const s1 = a[i];
    const s2 = b[i];
    if (
      s1.id !== s2.id ||
      s1.name !== s2.name ||
      s1.schoolYear !== s2.schoolYear ||
      s1.isActive !== s2.isActive ||
      s1.status !== s2.status ||
      s1.scheduleStatus !== s2.scheduleStatus ||
      s1.resultsFinalized !== s2.resultsFinalized ||
      s1.startDate?.getTime() !== s2.startDate?.getTime() ||
      s1.endDate?.getTime() !== s2.endDate?.getTime() ||
      JSON.stringify(s1.gradeMappings || {}) !== JSON.stringify(s2.gradeMappings || {}) ||
      JSON.stringify(s1.eligibleGradeLevels || []) !== JSON.stringify(s2.eligibleGradeLevels || []) ||
      JSON.stringify(s1.eligibleSections || []) !== JSON.stringify(s2.eligibleSections || [])
    ) {
      return false;
    }
  }
  return true;
}

function areCandidatesEqual(a: Candidate[], b: Candidate[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const c1 = a[i];
    const c2 = b[i];
    if (
      c1.id !== c2.id ||
      c1.name !== c2.name ||
      c1.position !== c2.position ||
      c1.party !== c2.party ||
      c1.photo !== c2.photo ||
      c1.motto !== c2.motto ||
      c1.gradeLevel !== c2.gradeLevel ||
      c1.section !== c2.section ||
      c1.votes !== c2.votes ||
      c1.sessionId !== c2.sessionId
    ) {
      return false;
    }
  }
  return true;
}

function arePositionsEqual(a: Position[], b: Position[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p1 = a[i];
    const p2 = b[i];
    if (
      p1.id !== p2.id ||
      p1.name !== p2.name ||
      p1.order !== p2.order ||
      p1.maxVotes !== p2.maxVotes ||
      p1.strictGradeMapping !== p2.strictGradeMapping ||
      p1.sessionId !== p2.sessionId
    ) {
      return false;
    }
  }
  return true;
}

function areSectionsEqual(a: Section[], b: Section[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const s1 = a[i];
    const s2 = b[i];
    if (
      s1.id !== s2.id ||
      s1.name !== s2.name ||
      s1.gradeLevel !== s2.gradeLevel
    ) {
      return false;
    }
  }
  return true;
}

function areVotersEqual(a: Voter[], b: Voter[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const v1 = a[i];
    const v2 = b[i];
    if (
      v1.id !== v2.id ||
      v1.lrn !== v2.lrn ||
      v1.name !== v2.name ||
      v1.gradeLevel !== v2.gradeLevel ||
      v1.section !== v2.section ||
      v1.status !== v2.status ||
      v1.hasVoted !== v2.hasVoted
    ) {
      return false;
    }
  }
  return true;
}

function areElectionsEqual(a: Election | null, b: Election | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.schoolYear === b.schoolYear &&
    a.isActive === b.isActive &&
    a.status === b.status &&
    a.scheduleStatus === b.scheduleStatus &&
    a.totalVoters === b.totalVoters &&
    a.totalVoted === b.totalVoted &&
    a.resultsFinalized === b.resultsFinalized &&
    a.startDate?.getTime() === b.startDate?.getTime() &&
    a.endDate?.getTime() === b.endDate?.getTime() &&
    JSON.stringify(a.gradeMappings || {}) === JSON.stringify(b.gradeMappings || {}) &&
    JSON.stringify(a.eligibleGradeLevels || []) === JSON.stringify(b.eligibleGradeLevels || []) &&
    JSON.stringify(a.eligibleSections || []) === JSON.stringify(b.eligibleSections || [])
  );
}

export function VotingProvider({ children }: { children: ReactNode }) {
  // Helper mappers for real-time payloads
  const mapVoterRow = (v: any): Voter => {
    let academicHistory: any[] = [];
    try {
      academicHistory = v.academic_history ? (typeof v.academic_history === 'string' ? JSON.parse(v.academic_history) : v.academic_history) : [];
    } catch (_) {}
    return {
      id: String(v.id),
      lrn: v.lrn,
      name: v.name,
      gradeLevel: v.grade_level ?? v.gradeLevel ?? '',
      section: v.section ?? '',
      hasVoted: false,
      votedAt: undefined,
      status: v.status ?? 'pending',
      createdAt: v.created_at ? new Date(v.created_at) : v.createdAt ? new Date(v.createdAt) : undefined,
      academicHistory,
    };
  };

  const mapCandidateRow = (c: any, sessionId?: string): Candidate => ({
    id: String(c.id),
    name: c.name,
    position: String(c.position_id ?? c.position),
    party: c.party ?? '',
    photo: c.photo_url ?? c.photo ?? '',
    motto: c.motto ?? '',
    gradeLevel: c.grade_level ?? c.gradeLevel ?? '',
    section: c.section ?? '',
    votes: Number(c.votes ?? 0),
    sessionId: String(c.session_id ?? sessionId ?? '1'),
  });

  const mapPositionRow = (p: any, sessionId?: string): Position => ({
    id: String(p.id),
    name: p.name,
    order: Number(p.display_order ?? p.order ?? 0),
    maxVotes: Number(p.max_votes ?? p.maxVotes ?? 1),
    strictGradeMapping: Boolean(p.strict_grade_mapping ?? p.strictGradeMapping ?? false),
    sessionId: String(p.session_id ?? sessionId ?? '1'),
  });

  const mapSectionRow = (s: any): Section => ({
    id: String(s.id),
    name: s.name,
    gradeLevel: s.grade_level ?? s.gradeLevel ?? '',
  });

  const [user, setUser] = useState<User | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [election, setElection] = useState<Election | null>(null);
  const [sessions, setSessions] = useState<VotingSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentSchoolYear, setCurrentSchoolYear] = useState<string>('2026-2027');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [isCheckingVotingStatus, setIsCheckingVotingStatus] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const activeSessionIdRef = React.useRef<string | null>(null);
  const userRef = React.useRef<User | null>(null);
  userRef.current = user;

  // Deletion tombstones to prevent deleted items from temporarily reappearing due to race conditions
  const deletedIdsRef = React.useRef<Map<string, number>>(new Map());

  const markDeleted = useCallback((id: string | number) => {
    deletedIdsRef.current.set(String(id), Date.now() + 20000);
  }, []);

  const isRecentlyDeleted = useCallback((id: string | number): boolean => {
    const expiry = deletedIdsRef.current.get(String(id));
    if (!expiry) return false;
    if (Date.now() > expiry) {
      deletedIdsRef.current.delete(String(id));
      return false;
    }
    return true;
  }, []);

  // Voter status overrides (e.g. pending -> approved or pending -> rejected)
  const voterStatusOverridesRef = React.useRef<Map<string, { status: Voter['status']; expiresAt: number }>>(new Map());

  const setVoterStatusOverride = useCallback((id: string | number, status: Voter['status']) => {
    voterStatusOverridesRef.current.set(String(id), { status, expiresAt: Date.now() + 25000 });
  }, []);

  const getVoterStatusOverride = useCallback((id: string | number, fetchedStatus: any): Voter['status'] => {
    const override = voterStatusOverridesRef.current.get(String(id));
    if (!override) return (fetchedStatus as Voter['status']) || 'pending';
    if (Date.now() > override.expiresAt) {
      voterStatusOverridesRef.current.delete(String(id));
      return (fetchedStatus as Voter['status']) || 'pending';
    }
    if (fetchedStatus === override.status) {
      voterStatusOverridesRef.current.delete(String(id));
      return (fetchedStatus as Voter['status']) || 'pending';
    }
    return override.status;
  }, []);

  // Computed active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Fetch all sessions
  const refreshSessions = useCallback(async () => {
    try {
      const sessionsData = await api.getSessions().catch(() => []);
      const rawSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.data || [];
      const parsed = rawSessions
        .filter((s: any) => !isRecentlyDeleted(String(s.id)))
        .map((s: any) => parseSession(s));
      setSessions(prev => areSessionsEqual(prev, parsed) ? prev : parsed);
      return parsed;
    } catch (e) {
      console.error('Failed to refresh sessions:', e);
      return [];
    }
  }, [isRecentlyDeleted]);

  const refreshRequestRef = React.useRef(0);
  const realtimeChannelRef = React.useRef<any>(null);
  const inFlightRefreshRef = React.useRef<Promise<void> | null>(null);
  const queuedRefreshRef = React.useRef(false);
  const queuedSessionIdRef = React.useRef<string | null | undefined>(undefined);

  const broadcastChange = useCallback((event: string, payload?: any) => {
    try {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'app_change',
          payload: { event, ...payload },
        }).catch(() => {});
      }
    } catch (_) {}
  }, []);

  // Fetch scoped data for the active session
  const performRefresh = useCallback(async (overrideSessionId?: string | null) => {
    const requestId = ++refreshRequestRef.current;

    try {
      const sessionId = (overrideSessionId === undefined ? activeSessionIdRef.current : overrideSessionId) || undefined;

      const [candidatesRes, positionsRes, sectionsRes, votersRes, settingsRes, sessionsData, voterSessionsData] = await Promise.all([
        sessionId ? api.getCandidates(sessionId).catch(err => { console.error('Candidates fetch error:', err); return null; }) : Promise.resolve([]),
        sessionId ? api.getPositions(sessionId).catch(err => { console.error('Positions fetch error:', err); return null; }) : Promise.resolve([]),
        api.getSections().catch(err => { console.error('Sections fetch error:', err); return null; }),
        api.getVoters().catch(err => { console.error('Voters fetch error:', err); return null; }),
        api.getSystemSettings().catch(() => ({ currentSchoolYear: '2026-2027' })),
        api.getSessions().catch(err => { console.error('Sessions fetch error:', err); return null; }),
        sessionId ? api.getVoterSessions(sessionId).catch(err => { console.error('VoterSessions fetch error:', err); return []; }) : Promise.resolve([]),
      ]);
      if (requestId !== refreshRequestRef.current) return;

      if (sessionsData !== null) {
        const rawSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.data || [];
        const parsedSessions = rawSessions
          .filter((s: any) => !isRecentlyDeleted(String(s.id)))
          .map((s: any) => parseSession(s));
        setSessions(prev => areSessionsEqual(prev, parsedSessions) ? prev : parsedSessions);
      }

      if (settingsRes?.currentSchoolYear) {
        setCurrentSchoolYear(prev => prev === settingsRes.currentSchoolYear ? prev : settingsRes.currentSchoolYear);
      }

      // Map candidates with optimistic preservation & tombstone filtering
      if (candidatesRes !== null) {
        const candidatesData = (candidatesRes as any)?.data ?? candidatesRes ?? [];
        const fetchedCandidates: Candidate[] = (Array.isArray(candidatesData) ? candidatesData : [])
          .filter((c: any) => !isRecentlyDeleted(String(c.id)))
          .map((c: any) => ({
            id: String(c.id),
            name: c.name,
            position: String(c.position_id ?? c.position),
            party: c.party ?? '',
            photo: c.photo_url ?? c.photo ?? '',
            motto: c.motto ?? '',
            gradeLevel: c.grade_level ?? c.gradeLevel ?? '',
            section: c.section ?? '',
            votes: Number(c.votes ?? 0),
            sessionId: String(c.session_id ?? sessionId ?? '1'),
          }));

        setCandidates(prev => {
          const pendingOptimistic = prev.filter(p =>
            p.id.startsWith('temp-') &&
            !fetchedCandidates.some(f => f.name.trim().toLowerCase() === p.name.trim().toLowerCase() && f.position === p.position)
          );
          const reconciled = [...fetchedCandidates, ...pendingOptimistic];
          return areCandidatesEqual(prev, reconciled) ? prev : reconciled;
        });
      }

      // Map positions with deduplication, optimistic preservation & tombstone filtering
      if (positionsRes !== null) {
        const positionsData = (positionsRes as any)?.data ?? positionsRes ?? [];
        const seenPositionNames = new Set<string>();
        const uniquePositions: Position[] = [];
        (Array.isArray(positionsData) ? positionsData : [])
          .filter((p: any) => !isRecentlyDeleted(String(p.id)))
          .forEach((p: any) => {
            const normalized = (p.name || '').trim().toLowerCase();
            if (!seenPositionNames.has(normalized)) {
              seenPositionNames.add(normalized);
              uniquePositions.push({
                id: String(p.id),
                name: p.name,
                order: Number(p.display_order ?? p.order ?? 0),
                maxVotes: Number(p.max_votes ?? p.maxVotes ?? 1),
                strictGradeMapping: Boolean(p.strict_grade_mapping ?? p.strictGradeMapping ?? false),
                sessionId: String(p.session_id ?? sessionId ?? '1'),
              });
            }
          });
        const sorted = uniquePositions.sort((a, b) => a.order - b.order);

        setPositions(prev => {
          const pendingOptimistic = prev.filter(p =>
            p.id.startsWith('temp-') &&
            !sorted.some(s => s.name.trim().toLowerCase() === p.name.trim().toLowerCase())
          );
          const reconciled = [...sorted, ...pendingOptimistic].sort((a, b) => a.order - b.order);
          return arePositionsEqual(prev, reconciled) ? prev : reconciled;
        });
      }

      // Map sections with optimistic preservation & tombstone filtering
      if (sectionsRes !== null) {
        const sectionsData = (sectionsRes as any)?.data ?? sectionsRes ?? [];
        const fetchedSections: Section[] = (Array.isArray(sectionsData) ? sectionsData : [])
          .filter((s: any) => !isRecentlyDeleted(String(s.id)))
          .map((s: any) => ({
            id: String(s.id),
            name: s.name,
            gradeLevel: s.grade_level ?? s.gradeLevel ?? '',
          }));

        setSections(prev => {
          const pendingOptimistic = prev.filter(p =>
            p.id.startsWith('temp-') &&
            !fetchedSections.some(f => f.name.trim().toLowerCase() === p.name.trim().toLowerCase() && f.gradeLevel === p.gradeLevel)
          );
          const reconciled = [...fetchedSections, ...pendingOptimistic];
          return areSectionsEqual(prev, reconciled) ? prev : reconciled;
        });
      }

      // Map voters with status overrides & tombstone filtering
      if (votersRes !== null) {
        const votersData = (votersRes as any)?.data ?? votersRes ?? [];
        const voterSessions = Array.isArray(voterSessionsData) ? voterSessionsData : [];
        const voterSessionMap = new Map(voterSessions.map(vs => [String(vs.voter_id), vs]));

        const mappedVoters: Voter[] = (Array.isArray(votersData) ? votersData : [])
          .filter((v: any) => !isRecentlyDeleted(String(v.id)))
          .map((v: any) => {
            const vs = voterSessionMap.get(String(v.id));
            let academicHistory = [];
            try {
              academicHistory = v.academic_history ? (typeof v.academic_history === 'string' ? JSON.parse(v.academic_history) : v.academic_history) : [];
            } catch (_) {}

            const rawStatus = v.status ?? 'pending';
            const effectiveStatus = getVoterStatusOverride(String(v.id), rawStatus);

            return {
              id: String(v.id),
              lrn: v.lrn,
              name: v.name,
              gradeLevel: v.grade_level ?? v.gradeLevel ?? '',
              section: v.section ?? '',
              hasVoted: vs ? Boolean(vs.has_voted) : false,
              votedAt: vs && vs.voted_at ? new Date(vs.voted_at) : undefined,
              status: effectiveStatus,
              createdAt: v.created_at ? new Date(v.created_at) : v.createdAt ? new Date(v.createdAt) : undefined,
              academicHistory,
            };
          });

        setVoters(prev => areVotersEqual(prev, mappedVoters) ? prev : mappedVoters);
        const currentUser = userRef.current;
        if (currentUser?.role === 'voter') {
          setHasVoted(Boolean(voterSessionMap.get(currentUser.id)?.has_voted));
        }
      }
      setDataError(null);
      setIsDataLoaded(true);
    } catch (error) {
      if (requestId !== refreshRequestRef.current) return;
      console.error('Failed to refresh data:', error);
      setDataError(error instanceof Error ? error.message : 'Unable to load election data. Please retry.');
    }
  }, [isRecentlyDeleted, getVoterStatusOverride]);

  // Coalescing single-flight refresh to prevent network saturation and hard freezes
  const refreshData = useCallback(async (overrideSessionId?: string | null): Promise<void> => {
    if (inFlightRefreshRef.current) {
      queuedRefreshRef.current = true;
      if (overrideSessionId !== undefined) {
        queuedSessionIdRef.current = overrideSessionId;
      }
      return inFlightRefreshRef.current;
    }

    const run = async () => {
      try {
        await performRefresh(overrideSessionId);
      } finally {
        inFlightRefreshRef.current = null;
        if (queuedRefreshRef.current) {
          queuedRefreshRef.current = false;
          const nextSession = queuedSessionIdRef.current;
          queuedSessionIdRef.current = undefined;
          refreshData(nextSession).catch(console.error);
        }
      }
    };

    inFlightRefreshRef.current = run();
    return inFlightRefreshRef.current;
  }, [performRefresh]);

  // Keep election in sync with activeSession from sessions state
  useEffect(() => {
    if (activeSessionId) {
      const s = sessions.find(s => s.id === activeSessionId);
      if (s) {
        const nextElection: Election = {
          ...s,
          totalVoters: voters.filter(v => v.status === 'approved' && isEligibleForSession(s, v)).length,
          totalVoted: voters.filter(v => v.status === 'approved' && v.hasVoted).length,
        };
        setElection(prev => areElectionsEqual(prev, nextElection) ? prev : nextElection);
      } else {
        setElection(prev => prev === null ? prev : null);
      }
    } else {
      setElection(prev => prev === null ? prev : null);
    }
  }, [activeSessionId, sessions, voters]);

  // Securely fetch and sync hasVoted state directly from database for the active session
  useEffect(() => {
    let cancelled = false;
    setHasVoted(false);
    if (user?.role === 'voter' && activeSessionId) {
        setIsCheckingVotingStatus(true);
        api.getVoterSessionStatus(user.id, activeSessionId)
          .then(status => {
            if (!cancelled) setHasVoted(Boolean(status.hasVoted));
          })
          .catch(error => {
            if (!cancelled) setDataError(error instanceof Error ? error.message : 'Unable to check voting status.');
          })
          .finally(() => { if (!cancelled) setIsCheckingVotingStatus(false); });
    } else {
      setIsCheckingVotingStatus(false);
    }
    return () => { cancelled = true; };
  }, [user, activeSessionId]);

  // On mount: check auth and load initial data
  useEffect(() => {
    let isMounted = true;
    const requestRef = refreshRequestRef;

    const init = async () => {
      try {
        const meData = await api.getMe();
        if (isMounted && meData && (meData.user || meData.id)) {
          // If token is missing from old session, clear stale auth so RPCs don't fail
          if (!meData.token) {
            localStorage.removeItem('voting_session');
            setUser(null);
          } else {
            const userData = meData.user || meData;
            setUser({
              id: String(userData.id),
              role: userData.role,
              name: userData.name,
              lrn: userData.lrn,
              email: userData.email,
              gradeLevel: userData.gradeLevel || userData.grade_level,
              section: userData.section,
            });
            setHasVoted(Boolean(meData.has_voted ?? meData.hasVoted ?? false));
          }
        }
      } catch {
        // No active user session
      }

      // Initial load of sessions
      try {
        const sessionsData = await api.getSessions().catch(() => []);
        const rawSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.data || [];
        const parsed = rawSessions.map((s: any) => parseSession(s));
        if (isMounted) {
          setSessions(parsed);
          const savedSessionId = localStorage.getItem('activeSessionId');
          const isUserSelected = localStorage.getItem('session_user_selected') === 'true';
          const primarySession = parsed.find((s: VotingSession) => s.id === '1');
          let resolvedSessionId: string | null = null;

          if (savedSessionId && isUserSelected && parsed.find((s: VotingSession) => s.id === savedSessionId)) {
            resolvedSessionId = savedSessionId;
          } else if (primarySession && primarySession.isActive) {
            // Default to primary election (SSG General Election)
            resolvedSessionId = primarySession.id;
          } else if (savedSessionId && parsed.find((s: VotingSession) => s.id === savedSessionId)) {
            resolvedSessionId = savedSessionId;
          } else if (primarySession) {
            resolvedSessionId = primarySession.id;
          } else if (parsed.length > 0) {
            const activeSession = parsed.find((s: VotingSession) => s.isActive && s.status === 'active');
            resolvedSessionId = activeSession ? activeSession.id : parsed[0].id;
          }
          if (resolvedSessionId) {
            activeSessionIdRef.current = resolvedSessionId;
            setActiveSessionId(resolvedSessionId);
            try {
              localStorage.setItem('activeSessionId', resolvedSessionId);
            } catch (_) {}
          }
          // Pass the resolved session ID directly to avoid the race condition
          // where activeSessionId state hasn't updated yet
          await refreshData(resolvedSessionId || undefined);
        }
      } catch (_) {
        if (isMounted) {
          await refreshData();
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };
    init();

    // --- Targeted real-time handlers (no full refresh, zero flicker) ---
    const handlePositions = (payload: any) => {
      if (!isMounted) return;
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType !== 'DELETE' && String(newRow?.session_id) !== activeSessionIdRef.current) return;
      if (eventType === 'INSERT' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        setPositions(prev => {
          if (prev.some(p => p.id === String(newRow.id))) return prev;
          const mapped = mapPositionRow(newRow);
          const tempIdx = prev.findIndex(p => p.id.startsWith('temp-') && p.name.trim().toLowerCase() === mapped.name.trim().toLowerCase());
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = mapped;
            return next.sort((a, b) => a.order - b.order);
          }
          return [...prev, mapped].sort((a, b) => a.order - b.order);
        });
      } else if (eventType === 'UPDATE' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        const mapped = mapPositionRow(newRow);
        setPositions(prev => {
          const next = prev.map(p => p.id === id ? mapped : p).sort((a, b) => a.order - b.order);
          return arePositionsEqual(prev, next) ? prev : next;
        });
      } else if (eventType === 'DELETE' && oldRow) {
        markDeleted(oldRow.id);
        setPositions(prev => prev.filter(p => p.id !== String(oldRow.id)));
      }
    };

    const handleSessions = (payload: any) => {
      if (!isMounted) return;
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        setSessions(prev => {
          if (prev.some(s => s.id === String(newRow.id))) return prev;
          return [parseSession(newRow), ...prev];
        });
      } else if (eventType === 'UPDATE' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        const updated = parseSession(newRow);
        setSessions(prev => {
          const next = prev.map(s => s.id === id ? updated : s);
          return areSessionsEqual(prev, next) ? prev : next;
        });
      } else if (eventType === 'DELETE' && oldRow) {
        markDeleted(oldRow.id);
        setSessions(prev => prev.filter(s => s.id !== String(oldRow.id)));
      }
    };

    const handleSections = (payload: any) => {
      if (!isMounted) return;
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        setSections(prev => {
          const id = String(newRow.id);
          if (prev.some(s => s.id === id)) return prev;
          const tempIdx = prev.findIndex(s => s.id.startsWith('temp-') && s.name.trim().toLowerCase() === String(newRow.name).trim().toLowerCase() && s.gradeLevel === String(newRow.grade_level || ''));
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = { id, name: String(newRow.name), gradeLevel: String(newRow.grade_level || '') };
            return next;
          }
          return [...prev, { id, name: String(newRow.name), gradeLevel: String(newRow.grade_level || '') }];
        });
      } else if (eventType === 'UPDATE' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        setSections(prev => {
          const next = prev.map(s => s.id === id ? { id, name: String(newRow.name), gradeLevel: String(newRow.grade_level || '') } : s);
          return areSectionsEqual(prev, next) ? prev : next;
        });
      } else if (eventType === 'DELETE' && oldRow) {
        markDeleted(oldRow.id);
        setSections(prev => prev.filter(s => s.id !== String(oldRow.id)));
      }
    };

    const handleCandidates = (payload: any) => {
      if (!isMounted) return;
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType !== 'DELETE' && activeSessionIdRef.current && String(newRow?.session_id) !== activeSessionIdRef.current) return;
      if (eventType === 'INSERT' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        setCandidates(prev => {
          const id = String(newRow.id);
          if (prev.some(c => c.id === id)) return prev;
          const mapped: Candidate = {
            id,
            name: newRow.name,
            position: String(newRow.position_id),
            party: newRow.party || '',
            photo: newRow.photo_url || '',
            motto: newRow.motto || '',
            gradeLevel: newRow.grade_level || '',
            section: newRow.section || '',
            votes: Number(newRow.votes || 0),
            sessionId: String(newRow.session_id || '1'),
          };
          const tempIdx = prev.findIndex(c => c.id.startsWith('temp-') && c.name.trim().toLowerCase() === String(newRow.name).trim().toLowerCase());
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = mapped;
            return next;
          }
          return [...prev, mapped];
        });
      } else if (eventType === 'UPDATE' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        setCandidates(prev => {
          const next = prev.map(c => c.id === id ? {
            ...c,
            name: newRow.name ?? c.name,
            position: String(newRow.position_id ?? c.position),
            party: newRow.party ?? c.party,
            photo: newRow.photo_url ?? c.photo,
            motto: newRow.motto ?? c.motto,
            gradeLevel: newRow.grade_level ?? c.gradeLevel,
            section: newRow.section ?? c.section,
            votes: newRow.votes !== undefined ? Number(newRow.votes) : c.votes,
          } : c);
          return areCandidatesEqual(prev, next) ? prev : next;
        });
      } else if (eventType === 'DELETE' && oldRow) {
        markDeleted(oldRow.id);
        setCandidates(prev => prev.filter(c => c.id !== String(oldRow.id)));
      }
    };

    const handleVoters = (payload: any) => {
      if (!isMounted) return;
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        const status = getVoterStatusOverride(id, newRow.status || 'pending');
        setVoters(prev => {
          if (prev.some(v => v.id === id || v.lrn === newRow.lrn)) {
            return prev.map(v => (v.id === id || v.lrn === newRow.lrn) ? {
              ...v,
              id,
              name: newRow.name,
              lrn: newRow.lrn,
              gradeLevel: newRow.grade_level || '',
              section: newRow.section || '',
              status,
            } : v);
          }
          return [{
            id,
            lrn: newRow.lrn,
            name: newRow.name,
            gradeLevel: newRow.grade_level || '',
            section: newRow.section || '',
            status,
            hasVoted: false,
            createdAt: newRow.created_at ? new Date(newRow.created_at) : new Date(),
          }, ...prev];
        });
      } else if (eventType === 'UPDATE' && newRow) {
        if (isRecentlyDeleted(newRow.id)) return;
        const id = String(newRow.id);
        const status = getVoterStatusOverride(id, newRow.status);
        setVoters(prev => {
          const next = prev.map(v => v.id === id ? {
            ...v,
            name: newRow.name ?? v.name,
            gradeLevel: newRow.grade_level ?? v.gradeLevel,
            section: newRow.section ?? v.section,
            status: status ?? v.status,
            hasVoted: newRow.has_voted !== undefined ? Boolean(newRow.has_voted) : v.hasVoted,
          } : v);
          return areVotersEqual(prev, next) ? prev : next;
        });
      } else if (eventType === 'DELETE' && oldRow) {
        markDeleted(oldRow.id);
        setVoters(prev => prev.filter(v => v.id !== String(oldRow.id)));
      }
    };

    const channel = supabase
      .channel('cpmnhs-realtime-global', { config: { broadcast: { self: false } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_sessions' }, handleSessions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, handlePositions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, handleSections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, handleCandidates)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, handleVoters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_sessions' }, () => {
        if (isMounted) refreshData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        if (isMounted) refreshData();
      })
      .on('broadcast', { event: 'app_change' }, (msg: any) => {
        if (!isMounted) return;
        const p = msg?.payload;
        if (!p) return;

        if (p.event === 'voter_approved' && (p.id || p.lrn)) {
          if (p.id) setVoterStatusOverride(p.id, 'approved');
          setVoters(prev => {
            if (p.lrn && !prev.some(v => v.lrn === p.lrn || v.id === p.id)) {
              return [{ id: p.id || 'approved-' + p.lrn, lrn: p.lrn, name: p.name || 'Student', status: 'approved' as const, hasVoted: false, gradeLevel: '', section: '' } as Voter, ...prev];
            }
            const next: Voter[] = prev.map(v => (v.id === p.id || v.lrn === p.lrn) ? { ...v, status: 'approved' as const } : v);
            return areVotersEqual(prev, next) ? prev : next;
          });
        } else if (p.event === 'voters_approved_all') {
          setVoters(prev => {
            prev.forEach(v => {
              if (v.status === 'pending') setVoterStatusOverride(v.id, 'approved');
            });
            const next: Voter[] = prev.map(v => v.status === 'pending' ? { ...v, status: 'approved' as const } : v);
            return areVotersEqual(prev, next) ? prev : next;
          });
        } else if (p.event === 'voter_rejected' && (p.id || p.lrn)) {
          if (p.id) setVoterStatusOverride(p.id, 'rejected');
          setVoters(prev => {
            const next: Voter[] = prev.map(v => (v.id === p.id || v.lrn === p.lrn) ? { ...v, status: 'rejected' as const } : v);
            return areVotersEqual(prev, next) ? prev : next;
          });
        } else if (p.event === 'voter_deleted' && p.id) {
          markDeleted(p.id);
          setVoters(prev => prev.filter(v => v.id !== p.id));
        } else if (p.event === 'candidate_added' && p.candidate) {
          if (p.sessionId && activeSessionIdRef.current && p.sessionId !== activeSessionIdRef.current) return;
          setCandidates(prev => {
            if (prev.some(c => c.id === p.candidate.id)) return prev;
            return [...prev, p.candidate];
          });
        } else if (p.event === 'candidate_updated' && p.id && p.updates) {
          setCandidates(prev => prev.map(c => c.id === p.id ? { ...c, ...p.updates } : c));
        } else if (p.event === 'candidate_deleted' && p.id) {
          markDeleted(p.id);
          setCandidates(prev => prev.filter(c => c.id !== p.id));
        } else if (p.event === 'position_added' && p.position) {
          if (p.sessionId && activeSessionIdRef.current && p.sessionId !== activeSessionIdRef.current) return;
          setPositions(prev => {
            if (prev.some(pos => pos.id === p.position.id)) return prev;
            return [...prev, p.position].sort((a, b) => a.order - b.order);
          });
        } else if (p.event === 'position_deleted' && p.id) {
          markDeleted(p.id);
          setPositions(prev => prev.filter(pos => pos.id !== p.id));
        } else if (p.event === 'section_added' && p.section) {
          setSections(prev => {
            if (prev.some(s => s.id === p.section.id)) return prev;
            return [...prev, p.section];
          });
        } else if (p.event === 'section_deleted' && p.id) {
          markDeleted(p.id);
          setSections(prev => prev.filter(s => s.id !== p.id));
        } else if (p.event === 'session_created' && p.session) {
          setSessions(prev => {
            if (prev.some(s => s.id === p.session.id)) return prev;
            return [p.session, ...prev];
          });
        } else if (p.event === 'session_duplicated' && p.session) {
          setSessions(prev => {
            if (prev.some(s => s.id === p.session.id)) return prev;
            return [p.session, ...prev];
          });
        } else if (p.event === 'session_deleted' && p.id) {
          markDeleted(p.id);
          setSessions(prev => prev.filter(s => s.id !== p.id));
        } else if (p.event === 'session_reset') {
          if (p.sessionId === activeSessionIdRef.current) {
            setCandidates(prev => prev.map(c => ({ ...c, votes: 0 })));
            setVoters(prev => prev.map(v => ({ ...v, hasVoted: false, votedAt: undefined })));
          }
        } else if (p.event === 'election_updated' && p.updates && p.sessionId) {
          setSessions(prev => {
            const next = prev.map(s => s.id === p.sessionId ? { ...s, ...p.updates } : s);
            return areSessionsEqual(prev, next) ? prev : next;
          });
          if (p.sessionId === activeSessionIdRef.current) {
            setElection(prev => {
              const next = prev ? { ...prev, ...p.updates } : null;
              return areElectionsEqual(prev, next) ? prev : next;
            });
          }
        } else if (p.event === 'results_finalized' && p.sessionId) {
          const updates = { resultsFinalized: true, finalizedAt: new Date() };
          setSessions(prev => prev.map(s => s.id === p.sessionId ? { ...s, ...updates } : s));
          if (p.sessionId === activeSessionIdRef.current) {
            setElection(prev => prev ? { ...prev, ...updates } : null);
          }
        } else if (p.event === 'results_unfinalized' && p.sessionId) {
          const updates = { resultsFinalized: false, finalizedAt: undefined, finalizedBy: null };
          setSessions(prev => prev.map(s => s.id === p.sessionId ? { ...s, ...updates } : s));
          if (p.sessionId === activeSessionIdRef.current) {
            setElection(prev => prev ? { ...prev, ...updates } : null);
          }
        } else {
          // Only perform single-flight refresh for unhandled / global actions
          refreshData().catch(console.error);
        }
      })
      .subscribe((status: string) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          // Channel connected or reconnected after a network blip; immediately sync latest data
          refreshData().catch(console.error);
        }
      });

    realtimeChannelRef.current = channel;

    // Relaxed background polling fallback (15 seconds) to avoid network flooding and unnecessary CPU usage
    const pollInterval = setInterval(() => {
      if (isMounted) refreshData();
    }, 15000);

    // Refresh immediately when window/tab is focused or becomes visible
    const handleVisibility = () => {
      if (isMounted && document.visibilityState === 'visible') {
        refreshData();
      }
    };
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    // Synchronize authentication and session state across multiple browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (!isMounted) return;
      if (e.key === 'voting_session') {
        if (!e.newValue) {
          setUser(null);
          setHasVoted(false);
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed?.user) {
              setUser({
                id: String(parsed.user.id),
                role: parsed.user.role,
                name: parsed.user.name,
                lrn: parsed.user.lrn,
                email: parsed.user.email,
                gradeLevel: parsed.user.gradeLevel || parsed.user.grade_level,
                section: parsed.user.section,
              });
              setHasVoted(Boolean(parsed.has_voted ?? parsed.hasVoted ?? false));
            }
          } catch (_) {}
        }
      } else if (e.key === 'activeSessionId') {
        if (e.newValue && e.newValue !== activeSessionIdRef.current) {
          activeSessionIdRef.current = e.newValue;
          setActiveSessionId(e.newValue);
          refreshData(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for session expiry notification dispatched by API client
    const handleSessionExpired = (e: Event) => {
      if (!isMounted) return;
      const customEvent = e as CustomEvent;
      setUser(null);
      setHasVoted(false);
      setDataError(customEvent.detail?.message || 'Your session has expired. Please sign in again.');
    };
    window.addEventListener('auth:session_expired', handleSessionExpired);

    return () => {
      isMounted = false;
      ++requestRef.current;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth:session_expired', handleSessionExpired);
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [refreshData, isRecentlyDeleted, getVoterStatusOverride, setVoterStatusOverride, markDeleted]);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('activeSessionId', activeSessionId);
    } else {
      localStorage.removeItem('activeSessionId');
    }
  }, [activeSessionId]);

  // Session management
  const switchSession = useCallback((id: string) => {
    if (!id) return;
    if (activeSessionIdRef.current === id && isDataLoaded) return;

    try {
      localStorage.setItem('activeSessionId', id);
      localStorage.setItem('session_user_selected', 'true');
    } catch (_) {}

    activeSessionIdRef.current = id;
    setActiveSessionId(id);
    setVotes({});
    setHasVoted(false);
    refreshData(id);
  }, [refreshData, isDataLoaded]);

  const createSessionFn = useCallback(async (data: any): Promise<VotingSession> => {
    const created = await api.createSession(data);
    const parsed = parseSession(created);
    setSessions(prev => [parsed, ...prev.filter(s => s.id !== parsed.id)]);
    broadcastChange('session_created', { session: parsed });
    return parsed;
  }, [broadcastChange]);

  const deleteSessionFn = useCallback(async (id: string) => {
    markDeleted(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      const nextId = remaining[0]?.id ?? null;
      activeSessionIdRef.current = nextId;
      setActiveSessionId(nextId);
      setVotes({});
      setHasVoted(false);
    }
    await api.deleteSession(id);
    broadcastChange('session_deleted', { id });
  }, [activeSessionId, sessions, broadcastChange, markDeleted]);

  const duplicateSessionFn = useCallback(async (id: string): Promise<VotingSession> => {
    const created = await api.duplicateSession(id);
    const parsed = parseSession(created);
    setSessions(prev => [parsed, ...prev.filter(s => s.id !== parsed.id)]);
    broadcastChange('session_duplicated', { session: parsed });
    return parsed;
  }, [broadcastChange]);

  // Auth
  const login = useCallback(
    async (lrn: string, password: string): Promise<boolean> => {
      try {
        const data = await api.login(lrn, password);
        if (data && data.success && data.user) {
          setUser({
            id: String(data.user.id),
            role: 'voter',
            name: data.user.name,
            lrn: data.user.lrn ?? lrn,
            gradeLevel: data.user.gradeLevel,
            section: data.user.section,
          });
          setHasVoted(data.hasVoted ?? false);
          refreshData();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    [refreshData]
  );

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; mustChangePassword: boolean }> => {
      try {
        const data = await api.adminLogin(username, password);
        if (data && data.success && data.user) {
          setUser({
            id: String(data.user.id),
            role: 'admin',
            name: data.user.name ?? username,
            email: data.user.email,
          });
          refreshData();
          return { success: true, mustChangePassword: Boolean(data.mustChangePassword) };
        }
        return { success: false, mustChangePassword: false };
      } catch (error) {
        console.error('Admin login failed:', error);
        throw error;
      }
    },
    [refreshData]
  );

  const register = useCallback(
    async (
      lrn: string, firstName: string, middleInitial: string, lastName: string,
      gradeLevel: string, section: string, password: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const data = await api.register({ lrn, firstName, middleInitial, lastName, gradeLevel, section, password });
        broadcastChange('voter_registered');
        await refreshData();
        return {
          success: data.success ?? true,
          message: data.message ?? 'Registration submitted! Please wait for admin approval.',
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Registration failed.' };
      }
    },
    [refreshData, broadcastChange]
  );

  const bulkRegister = useCallback(
    async (students: any[]): Promise<{ success: boolean; message: string; errors?: string[] }> => {
      try {
        const data = await api.bulkRegister(students);
        broadcastChange('voters_bulk_registered');
        await refreshData();
        return {
          success: data.success ?? true,
          message: data.message ?? 'Bulk registration processed.',
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Bulk registration failed.' };
      }
    },
    [refreshData, broadcastChange]
  );

  const adminChangePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      try {
        if (!user || user.role !== 'admin') {
          return { success: false, message: 'Not authenticated as admin.' };
        }
        const data = await api.adminChangePassword(String(user.id), currentPassword, newPassword);
        return {
          success: data.success ?? true,
          message: 'Password changed successfully!',
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Password change failed.' };
      }
    },
    [user]
  );

  const logout = useCallback(() => {
    api.logout().catch((error) => console.error('Logout failed:', error));
    setUser(null);
    setVotes({});
    setHasVoted(false);
  }, []);

  const setVote = useCallback((positionId: string, candidateId: string) => {
    setVotes((prev) => ({ ...prev, [positionId]: candidateId }));
  }, []);

  const submitVotes = useCallback(async (): Promise<boolean> => {
    if (!user || user.role !== 'voter' || hasVoted || !isDataLoaded || dataError
      || !isSessionOpen(election) || !isEligibleForSession(election, user)) return false;
    try {
      const votesArray = Object.entries(votes).map(([positionId, candidateId]) => ({
        candidate_id: candidateId,
        position_id: positionId,
      }));
      await api.submitVotes(votesArray, activeSessionId || undefined);
      setHasVoted(true);
      broadcastChange('ballot_submitted', { sessionId: activeSessionId });
      await refreshData();
      return true;
    } catch (error) {
      console.error('Submit votes failed:', error);
      return false;
    }
  }, [votes, user, hasVoted, isDataLoaded, dataError, election, activeSessionId, refreshData, broadcastChange]);

  const getResults = useCallback(() => {
    return positions.map((position) => ({
      position,
      candidates: candidates
        .filter((c) => c.position === position.id)
        .sort((a, b) => b.votes - a.votes),
    }));
  }, [candidates, positions]);

  const finalizeResults = useCallback(async () => {
    try {
      const updates = { resultsFinalized: true, finalizedAt: new Date() };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
      setElection(prev => prev ? { ...prev, ...updates } : null);
      await api.finalizeResults(activeSessionId || undefined);
      broadcastChange('results_finalized', { sessionId: activeSessionId });
    } catch (error) {
      console.error('Finalize results failed:', error);
      refreshData().catch(console.error);
      throw error;
    }
  }, [activeSessionId, refreshData, broadcastChange]);

  const unfinalizeResults = useCallback(async () => {
    try {
      const updates = { resultsFinalized: false, finalizedAt: undefined, finalizedBy: null };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...updates } : s));
      setElection(prev => prev ? { ...prev, ...updates } : null);
      await api.unfinalizeResults(activeSessionId || undefined);
      broadcastChange('results_unfinalized', { sessionId: activeSessionId });
    } catch (error) {
      console.error('Unfinalize results failed:', error);
      refreshData().catch(console.error);
      throw error;
    }
  }, [activeSessionId, refreshData, broadcastChange]);

  const updateElection = useCallback(
    async (updates: Partial<Election>) => {
      try {
        if (!activeSessionId) throw new Error('Select an election first.');

        const mapped: any = { id: activeSessionId || '1' };
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.schoolYear !== undefined) mapped.school_year = updates.schoolYear;

        const toMySQLDateTime = (d: Date | string | null | undefined) => {
          if (!d) return null;
          const date = d instanceof Date ? d : new Date(d);
          if (isNaN(date.getTime())) return null;
          return date.toISOString();
        };

        if (updates.startDate !== undefined) {
          mapped.start_date = updates.startDate ? toMySQLDateTime(updates.startDate) : null;
        }
        if (updates.endDate !== undefined) {
          mapped.end_date = updates.endDate ? toMySQLDateTime(updates.endDate) : null;
        }
        if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
        if (updates.gradeMappings !== undefined) {
          mapped.grade_mappings = updates.gradeMappings;
        }
        if (updates.scheduleStatus !== undefined) mapped.schedule_status = updates.scheduleStatus;
        if (updates.authorizationDocGenerated !== undefined) mapped.authorization_doc_generated = updates.authorizationDocGenerated;
        if (updates.authorizationConfirmedAt !== undefined) mapped.authorization_confirmed_at = updates.authorizationConfirmedAt;
        if (updates.signatories !== undefined) mapped.signatories = updates.signatories;
        if (updates.status !== undefined) mapped.status = updates.status;
        if ((updates as any).eligibleGradeLevels !== undefined) mapped.eligible_grade_levels = (updates as any).eligibleGradeLevels;
        if ((updates as any).eligibleSections !== undefined) mapped.eligible_sections = (updates as any).eligibleSections;

        // Optimistically update sessions and election so UI immediately reflects changes
        setSessions(prev =>
          prev.map(s => (s.id === activeSessionId ? { ...s, ...updates } : s))
        );
        setElection(prev => (prev ? { ...prev, ...updates } : null));

        await api.updateSession(activeSessionId || '1', mapped);
        broadcastChange('election_updated', { sessionId: activeSessionId, updates });
      } catch (error) {
        console.error('Update election failed:', error);
        refreshData().catch(console.error);
        throw error;
      }
    },
    [activeSessionId, refreshData, broadcastChange]
  );

  const resetSystem = useCallback(async () => {
    try {
      await api.resetSession(activeSessionId || '1');
      broadcastChange('session_reset', { sessionId: activeSessionId });
      await refreshData();
    } catch (error) {
      console.error('Reset system failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData, broadcastChange]);

  const processRollover = useCallback(async (newSchoolYear: string, voterUpdates: any[]) => {
    try {
      await api.processYearRollover(newSchoolYear, voterUpdates);
      broadcastChange('rollover_processed');
      await refreshData();
    } catch (error) {
      console.error('Process rollover failed:', error);
      throw error;
    }
  }, [refreshData, broadcastChange]);

  // Candidate CRUD
  const addCandidate = useCallback(
    async (candidateData: Omit<Candidate, 'id' | 'votes' | 'sessionId'>) => {
      if (!activeSessionId) throw new Error('Select an election first.');

      const tempId = 'temp-cand-' + Date.now();
      const newCandidate: Candidate = {
        ...candidateData,
        id: tempId,
        votes: 0,
        sessionId: activeSessionId || '1',
      };
      setCandidates(prev => [...prev, newCandidate]);

      const mapped: any = {
        name: candidateData.name.trim(),
        position_id: candidateData.position,
        party: candidateData.party.trim() || 'Independent',
        photo_url: candidateData.photo,
        motto: candidateData.motto.trim(),
        grade_level: candidateData.gradeLevel,
        section: candidateData.section,
        session_id: activeSessionId || '1',
      };
      try {
        const res = await api.addCandidate(mapped);
        const realId = res?.id ? String(res.id) : tempId;
        const finalized: Candidate = { ...newCandidate, id: realId };
        setCandidates(prev => prev.map(c => (c.id === tempId || (c.id.startsWith('temp-') && c.name.trim().toLowerCase() === newCandidate.name.trim().toLowerCase())) ? finalized : c));
        broadcastChange('candidate_added', { candidate: finalized, sessionId: activeSessionId });
      } catch (error) {
        setCandidates(prev => prev.filter(c => c.id !== tempId));
        console.error('Add candidate failed:', error);
        throw error;
      }
    },
    [activeSessionId, broadcastChange]
  );

  const updateCandidate = useCallback(
    async (id: string, updates: Partial<Candidate>) => {
      let original: Candidate | undefined;
      setCandidates(prev => {
        original = prev.find(c => c.id === id);
        return prev.map(c => c.id === id ? { ...c, ...updates } : c);
      });
      const mapped: any = { id };
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.position !== undefined) mapped.position_id = updates.position;
      if (updates.party !== undefined) mapped.party = updates.party;
      if (updates.photo !== undefined) mapped.photo_url = updates.photo;
      if (updates.motto !== undefined) mapped.motto = updates.motto;
      if (updates.gradeLevel !== undefined) mapped.grade_level = updates.gradeLevel;
      if (updates.section !== undefined) mapped.section = updates.section;
      try {
        await api.updateCandidate(mapped);
        broadcastChange('candidate_updated', { id, updates, sessionId: activeSessionId });
      } catch (error) {
        if (original) {
          setCandidates(prev => prev.map(c => c.id === id ? original! : c));
        }
        console.error('Update candidate failed:', error);
        throw error;
      }
    },
    [activeSessionId, broadcastChange]
  );

  const deleteCandidate = useCallback(
    async (id: string) => {
      markDeleted(id);
      let removed: Candidate | undefined;
      setCandidates(prev => {
        removed = prev.find(c => c.id === id);
        return prev.filter(c => c.id !== id);
      });
      try {
        await api.deleteCandidate(id);
        broadcastChange('candidate_deleted', { id, sessionId: activeSessionId });
      } catch (error) {
        if (removed) {
          deletedIdsRef.current.delete(id);
          setCandidates(prev => [...prev, removed!]);
        }
        console.error('Delete candidate failed:', error);
        throw error;
      }
    },
    [activeSessionId, broadcastChange, markDeleted]
  );

  // Position CRUD
  const addPosition = useCallback(
    async (positionData: Omit<Position, 'id' | 'sessionId'>) => {
      if (!activeSessionId) throw new Error('Select an election first.');

      const tempId = 'temp-pos-' + Date.now();
      const newPos: Position = {
        id: tempId,
        name: positionData.name.trim(),
        order: positionData.order,
        maxVotes: positionData.maxVotes,
        strictGradeMapping: positionData.strictGradeMapping,
        sessionId: activeSessionId || '1',
      };
      setPositions(prev => [...prev, newPos].sort((a, b) => a.order - b.order));

      const mapped: any = {
        name: positionData.name.trim(),
        display_order: positionData.order,
        max_votes: positionData.maxVotes,
        strict_grade_mapping: positionData.strictGradeMapping ? true : false,
        session_id: activeSessionId || '1',
      };
      try {
        const res = await api.addPosition(mapped);
        const realId = res?.id ? String(res.id) : tempId;
        const finalized: Position = { ...newPos, id: realId };
        setPositions(prev => prev.map(p => (p.id === tempId || (p.id.startsWith('temp-') && p.name.trim().toLowerCase() === newPos.name.trim().toLowerCase())) ? finalized : p).sort((a, b) => a.order - b.order));
        broadcastChange('position_added', { position: finalized, sessionId: activeSessionId });
      } catch (error) {
        setPositions(prev => prev.filter(p => p.id !== tempId));
        console.error('Add position failed:', error);
        throw error;
      }
    },
    [activeSessionId, broadcastChange]
  );

  const deletePosition = useCallback(
    async (id: string) => {
      markDeleted(id);
      let removed: Position | undefined;
      setPositions(prev => {
        removed = prev.find(p => p.id === id);
        return prev.filter(p => p.id !== id);
      });

      try {
        await api.deletePosition(id);
        broadcastChange('position_deleted', { id, sessionId: activeSessionId });
      } catch (error) {
        if (removed) {
          deletedIdsRef.current.delete(id);
          setPositions(prev => [...prev, removed!].sort((a, b) => a.order - b.order));
        }
        console.error('Delete position failed:', error);
        throw error;
      }
    },
    [activeSessionId, broadcastChange, markDeleted]
  );

  const cleanupDuplicatePositions = useCallback(async () => {
    try {
      const result = await api.cleanupDuplicatePositions(activeSessionId || undefined);
      broadcastChange('positions_cleaned');
      await refreshData();
      return result;
    } catch (error) {
      console.error('Cleanup duplicate positions failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData, broadcastChange]);

  // Section CRUD (global)
  const addSection = useCallback(
    async (sectionData: Omit<Section, 'id'>) => {
      const tempId = 'temp-sec-' + Date.now();
      const optimisticSec: Section = {
        id: tempId,
        name: sectionData.name.trim(),
        gradeLevel: sectionData.gradeLevel,
      };
      setSections(prev => {
        if (prev.some(s => s.name.trim().toLowerCase() === optimisticSec.name.toLowerCase() && s.gradeLevel === optimisticSec.gradeLevel)) {
          return prev;
        }
        return [...prev, optimisticSec];
      });

      try {
        const mapped = {
          name: sectionData.name.trim(),
          grade_level: sectionData.gradeLevel,
        };
        const res = await api.addSection(mapped);
        const realId = res?.id ? String(res.id) : tempId;
        const finalized: Section = { ...optimisticSec, id: realId };
        setSections(prev => prev.map(s => (s.id === tempId || (s.id.startsWith('temp-') && s.name.trim().toLowerCase() === optimisticSec.name.toLowerCase() && s.gradeLevel === optimisticSec.gradeLevel)) ? finalized : s));
        broadcastChange('section_added', { section: finalized });
      } catch (err) {
        setSections(prev => prev.filter(s => s.id !== tempId));
        console.error('Add section error:', err);
        throw err;
      }
    },
    [broadcastChange]
  );

  const deleteSection = useCallback(
    async (id: string) => {
      markDeleted(id);
      let removed: Section | undefined;
      setSections(prev => {
        removed = prev.find(s => s.id === id);
        return prev.filter(s => s.id !== id);
      });

      try {
        await api.deleteSection(id);
        broadcastChange('section_deleted', { id });
      } catch (err) {
        if (removed) {
          deletedIdsRef.current.delete(id);
          setSections(prev => [...prev, removed!]);
        }
        console.error('Delete section error:', err);
        throw err;
      }
    },
    [broadcastChange, markDeleted]
  );

  // Voter management
  const approveVoter = useCallback(
    async (id: string) => {
      const voter = voters.find(v => v.id === id);
      setVoterStatusOverride(id, 'approved');
      setVoters(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
      try {
        await api.approveVoter(id);
        broadcastChange('voter_approved', { id, lrn: voter?.lrn, name: voter?.name });
        return true;
      } catch (error) {
        console.error('Approve voter failed:', error);
        voterStatusOverridesRef.current.delete(id);
        setVoters(prev => prev.map(v => v.id === id ? { ...v, status: voter?.status || 'pending' } : v));
        return false;
      }
    },
    [voters, broadcastChange, setVoterStatusOverride]
  );

  const approveAllVoters = useCallback(
    async () => {
      const prevVoters = [...voters];
      voters.forEach(v => {
        if (v.status === 'pending') {
          setVoterStatusOverride(v.id, 'approved');
        }
      });
      setVoters(prev => prev.map(v => v.status === 'pending' ? { ...v, status: 'approved' } : v));
      try {
        await api.approveAllPendingVoters();
        broadcastChange('voters_approved_all');
        return true;
      } catch (error) {
        console.error('Approve all voters failed:', error);
        setVoters(prevVoters);
        return false;
      }
    },
    [voters, broadcastChange, setVoterStatusOverride]
  );

  const updateMySection = useCallback(
    async (voterId: string, newSection: string) => {
      setVoters(prev => prev.map(v => v.id === voterId ? { ...v, section: newSection } : v));
      if (user && user.id === voterId) {
        setUser(prev => prev ? { ...prev, section: newSection } : null);
      }
      try {
        await api.updateMySection(voterId, newSection);
        broadcastChange('section_updated', { voterId, newSection });
      } catch (error) {
        console.error('Update section failed:', error);
        refreshData().catch(console.error);
        throw error;
      }
    },
    [refreshData, user, broadcastChange]
  );

  const rejectVoter = useCallback(
    async (id: string) => {
      const voter = voters.find(v => v.id === id);
      setVoterStatusOverride(id, 'rejected');
      setVoters(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v));
      try {
        await api.rejectVoter(id);
        broadcastChange('voter_rejected', { id, lrn: voter?.lrn });
        return true;
      } catch (error) {
        console.error('Reject voter failed:', error);
        voterStatusOverridesRef.current.delete(id);
        setVoters(prev => prev.map(v => v.id === id ? { ...v, status: voter?.status || 'pending' } : v));
        return false;
      }
    },
    [voters, broadcastChange, setVoterStatusOverride]
  );

  const deleteVoter = useCallback(
    async (id: string) => {
      markDeleted(id);
      let removed: Voter | undefined;
      setVoters(prev => {
        removed = prev.find(v => v.id === id);
        return prev.filter(v => v.id !== id);
      });
      try {
        await api.deleteVoter(id);
        broadcastChange('voter_deleted', { id });
        return true;
      } catch (error) {
        if (removed) {
          deletedIdsRef.current.delete(id);
          setVoters(prev => [...prev, removed!]);
        }
        console.error('Delete voter failed:', error);
        return false;
      }
    },
    [broadcastChange, markDeleted]
  );

  return (
    <VotingContext.Provider
      value={{
        user,
        election,
        candidates,
        positions,
        sections,
        voters,
        votes,
        isLoggedIn: !!user,
        hasVoted,
        sessions,
        activeSessionId,
        activeSession,
        switchSession,
        createSession: createSessionFn,
        deleteSession: deleteSessionFn,
        duplicateSession: duplicateSessionFn,
        refreshSessions,
        currentSchoolYear,
        processRollover,
        login,
        adminLogin,
        adminChangePassword,
        register,
        bulkRegister,
        logout,
        setVote,
        submitVotes,
        getResults,
        finalizeResults,
        unfinalizeResults,
        updateElection,
        resetSystem,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        addPosition,
        deletePosition,
        cleanupDuplicatePositions,
        addSection,
        deleteSection,
        approveVoter,
        approveAllVoters,
        updateMySection,
        rejectVoter,
        deleteVoter,
        isInitializing: isInitializing || isCheckingVotingStatus,
        isDataLoaded,
        dataError,
        refreshData,
      }}
    >
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  return context;
}
