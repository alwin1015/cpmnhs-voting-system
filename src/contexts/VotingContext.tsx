import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Candidate, Position, Voter, Section, Election, VotingSession, User } from '@/types/voting';
import { api as onlineApi } from '@/lib/api';
import { offlineApi } from '@/lib/offlineApi';
import { supabase } from '@/lib/supabase';

// ⚡ OFFLINE MODE TOGGLE
const OFFLINE_MODE = true;
const api = OFFLINE_MODE ? offlineApi : onlineApi;

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
  adminLogin: (username: string, password: string) => Promise<boolean>;
  register: (lrn: string, firstName: string, middleInitial: string, lastName: string, gradeLevel: string, section: string, password: string) => Promise<{ success: boolean; message: string }>;
  bulkRegister: (students: any[]) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  adminRegister: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
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
  addCandidate: (candidate: Omit<Candidate, 'id' | 'votes'>) => Promise<void>;
  updateCandidate: (id: string, candidate: Partial<Candidate>) => Promise<void>;
  deleteCandidate: (id: string) => Promise<void>;
  addPosition: (position: Omit<Position, 'id'>) => Promise<void>;
  deletePosition: (id: string) => void;
  cleanupDuplicatePositions: () => Promise<{ success: boolean; count: number }>;
  addSection: (section: Omit<Section, 'id'>) => void;
  deleteSection: (id: string) => void;
  approveVoter: (id: string) => Promise<boolean>;
  rejectVoter: (id: string) => Promise<boolean>;
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
    startDate: new Date(eData.start_date ?? eData.startDate ?? Date.now()),
    endDate: new Date(eData.end_date ?? eData.endDate ?? Date.now()),
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
    signatories: eData.signatories
      ? (typeof eData.signatories === 'string' ? JSON.parse(eData.signatories) : eData.signatories)
      : null,
  };
}

export function VotingProvider({ children }: { children: ReactNode }) {
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

  // Computed active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Fetch all sessions
  const refreshSessions = useCallback(async () => {
    try {
      const sessionsData = await api.getSessions().catch(() => []);
      const rawSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.data || [];
      const parsed = rawSessions.map((s: any) => parseSession(s));
      setSessions(parsed);
      return parsed;
    } catch (e) {
      console.error('Failed to refresh sessions:', e);
      return [];
    }
  }, []);

  const isRefreshingRef = React.useRef(false);

  // Fetch scoped data for the active session
  const refreshData = useCallback(async (overrideSessionId?: string) => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;

    try {
      const sessionId = overrideSessionId || activeSessionId || undefined;

      const [candidatesRes, positionsRes, sectionsRes, votersRes, settingsRes, sessionsData] = await Promise.all([
        api.getCandidates(sessionId).catch(() => []),
        api.getPositions(sessionId).catch(() => []),
        api.getSections().catch(() => []),
        api.getVoters().catch(() => []),
        api.getSystemSettings().catch(() => ({ currentSchoolYear: '2026-2027' })),
        api.getSessions().catch(() => []),
      ]);

      const candidatesData = (candidatesRes as any)?.data ?? candidatesRes ?? [];
      const positionsData = (positionsRes as any)?.data ?? positionsRes ?? [];
      const sectionsData = (sectionsRes as any)?.data ?? sectionsRes ?? [];
      const votersData = (votersRes as any)?.data ?? votersRes ?? [];
      const rawSessions = Array.isArray(sessionsData) ? sessionsData : (sessionsData as any)?.data || [];
      const parsedSessions = rawSessions.map((s: any) => parseSession(s));

      setSessions(parsedSessions);
      setCurrentSchoolYear(settingsRes?.currentSchoolYear || '2026-2027');

      // Map candidates
      setCandidates(
        (Array.isArray(candidatesData) ? candidatesData : []).map((c: any) => ({
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
        }))
      );

      // Map positions with deduplication
      const seenPositionNames = new Set<string>();
      const uniquePositions: Position[] = [];
      (Array.isArray(positionsData) ? positionsData : []).forEach((p: any) => {
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
      setPositions(uniquePositions.sort((a, b) => a.order - b.order));

      // Map sections (global)
      setSections(
        (Array.isArray(sectionsData) ? sectionsData : []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          gradeLevel: s.grade_level ?? s.gradeLevel ?? '',
        }))
      );

      // Fetch voter sessions if a session is active
      let voterSessionsData: any[] = [];
      if (sessionId) {
        voterSessionsData = await api.getVoterSessions(sessionId).catch(() => []);
      }
      const voterSessionMap = new Map(voterSessionsData.map(vs => [String(vs.voter_id), vs]));

      // Map voters (global) + merge session-specific voting status
      const mappedVoters: Voter[] = (Array.isArray(votersData) ? votersData : []).map((v: any) => {
        const vs = voterSessionMap.get(String(v.id));
        let academicHistory = [];
        try {
          academicHistory = v.academic_history ? (typeof v.academic_history === 'string' ? JSON.parse(v.academic_history) : v.academic_history) : [];
        } catch (_) {}

        return {
          id: String(v.id),
          lrn: v.lrn,
          name: v.name,
          gradeLevel: v.grade_level ?? v.gradeLevel ?? '',
          section: v.section ?? '',
          hasVoted: vs ? Boolean(vs.has_voted) : false,
          votedAt: vs && vs.voted_at ? new Date(vs.voted_at) : undefined,
          status: v.status ?? 'pending',
          createdAt: v.created_at ? new Date(v.created_at) : v.createdAt ? new Date(v.createdAt) : undefined,
          academicHistory
        };
      });
      setVoters(mappedVoters);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [activeSessionId]);

  // Keep election in sync with activeSession from sessions state
  useEffect(() => {
    if (activeSessionId && sessions.length > 0) {
      const s = sessions.find(s => s.id === activeSessionId);
      if (s) {
        setElection({
          ...s,
          totalVoters: voters.filter(v => v.status === 'approved').length,
          totalVoted: voters.filter(v => v.status === 'approved' && v.hasVoted).length,
        });
      }
    } else if (sessions.length > 0) {
      // Default to first session
      const defaultSession = sessions[0];
      setElection({
        ...defaultSession,
        totalVoters: voters.filter(v => v.status === 'approved').length,
        totalVoted: voters.filter(v => v.status === 'approved' && v.hasVoted).length,
      });
    }
  }, [activeSessionId, sessions, voters]);

  // On mount: check auth and load initial data
  useEffect(() => {
    let isMounted = true;

    // FORCIBLY CLEAR OLD OFFLINE DATA ONCE TO LOAD NEW SEED
    if (OFFLINE_MODE && !localStorage.getItem('offline_synced_v2')) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('offline_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('offline_synced_v2', 'true');
      // This will force seedDefaults() to run again in offlineApi
    }

    const init = async () => {
      try {
        const meData = await api.getMe();
        if (isMounted && meData && (meData.user || meData.id)) {
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
          let resolvedSessionId: string | null = null;
          if (savedSessionId && parsed.find((s: VotingSession) => s.id === savedSessionId)) {
            resolvedSessionId = savedSessionId;
          } else if (parsed.length > 0) {
            resolvedSessionId = parsed[0].id;
          }
          if (resolvedSessionId) {
            setActiveSessionId(resolvedSessionId);
          }
          // Pass the resolved session ID directly to avoid the race condition
          // where activeSessionId state hasn't updated yet
          await refreshData(resolvedSessionId || undefined);
        }
      } catch (_) {
        if (isMounted) {
          await refreshData();
        }
      }
    };
    init();

    if (!OFFLINE_MODE) {
      let debounceTimer: any = null;
      const debouncedRefresh = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isMounted) refreshData();
        }, 1200);
      };

      const channel = supabase
        .channel('db-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, () => debouncedRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => debouncedRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => debouncedRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_sessions' }, () => debouncedRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_sessions' }, () => debouncedRefresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => debouncedRefresh())
        .subscribe();

      // Gentle polling every 45 seconds only as safety fallback
      const pollInterval = setInterval(() => {
        if (isMounted) debouncedRefresh();
      }, 45000);

      return () => {
        isMounted = false;
        clearTimeout(debounceTimer);
        clearInterval(pollInterval);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('activeSessionId', activeSessionId);
    }
  }, [activeSessionId]);

  // Session management
  const switchSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setVotes({});
    refreshData(id);
  }, [refreshData]);

  const createSessionFn = useCallback(async (data: any): Promise<VotingSession> => {
    const created = await api.createSession(data);
    await refreshData();
    return parseSession(created);
  }, [refreshData]);

  const deleteSessionFn = useCallback(async (id: string) => {
    await api.deleteSession(id);
    if (activeSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }
    await refreshData();
  }, [activeSessionId, sessions, refreshData]);

  const duplicateSessionFn = useCallback(async (id: string): Promise<VotingSession> => {
    const created = await api.duplicateSession(id);
    await refreshData();
    return parseSession(created);
  }, [refreshData]);

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
          setHasVoted(false); // Reset — will be checked per-session
          refreshData();
          return true;
        }
        return false;
      } catch (error) {
        console.error('Login failed:', error);
        return false;
      }
    },
    [refreshData]
  );

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
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
          return true;
        }
        return false;
      } catch (error) {
        console.error('Admin login failed:', error);
        return false;
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
        return {
          success: data.success ?? true,
          message: data.message ?? 'Registration submitted! Please wait for admin approval.',
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Registration failed.' };
      }
    },
    []
  );

  const bulkRegister = useCallback(
    async (students: any[]): Promise<{ success: boolean; message: string; errors?: string[] }> => {
      try {
        const data = await api.bulkRegister(students);
        await refreshData();
        return {
          success: data.success ?? true,
          message: data.message ?? 'Bulk registration processed.',
          errors: data.errors,
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Bulk registration failed.' };
      }
    },
    [refreshData]
  );

  const adminRegister = useCallback(
    async (username: string, email: string, password: string): Promise<{ success: boolean; message: string }> => {
      try {
        const data = await api.adminRegister({ username, email, password });
        return {
          success: data.success ?? true,
          message: data.message ?? 'Admin registration successful! You can now login.',
        };
      } catch (error: any) {
        return { success: false, message: error.message || 'Admin registration failed.' };
      }
    },
    []
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
    if (!user) return false;
    try {
      const votesArray = Object.entries(votes).map(([positionId, candidateId]) => ({
        candidate_id: candidateId,
        position_id: positionId,
      }));
      await api.submitVotes(votesArray, activeSessionId || undefined);
      setHasVoted(true);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Submit votes failed:', error);
      return false;
    }
  }, [votes, user, activeSessionId, refreshData]);

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
      await api.finalizeResults(activeSessionId || undefined);
      await refreshData();
    } catch (error) {
      console.error('Finalize results failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData]);

  const unfinalizeResults = useCallback(async () => {
    try {
      await api.unfinalizeResults(activeSessionId || undefined);
      await refreshData();
    } catch (error) {
      console.error('Unfinalize results failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData]);

  const updateElection = useCallback(
    async (updates: Partial<Election>) => {
      try {
        setElection((prev) => (prev ? { ...prev, ...updates } : null));

        const mapped: any = { id: activeSessionId || '1' };
        if (updates.name !== undefined) mapped.name = updates.name;
        if (updates.schoolYear !== undefined) mapped.school_year = updates.schoolYear;

        const toMySQLDateTime = (d: Date) => {
          if (isNaN(d.getTime())) return null;
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19).replace('T', ' ');
        };

        if (updates.startDate !== undefined) {
          mapped.start_date = updates.startDate ? toMySQLDateTime(updates.startDate) : null;
        }
        if (updates.endDate !== undefined) {
          mapped.end_date = updates.endDate ? toMySQLDateTime(updates.endDate) : null;
        }
        if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
        if (updates.gradeMappings !== undefined) {
          mapped.grade_mappings = JSON.stringify(updates.gradeMappings);
        }
        if (updates.scheduleStatus !== undefined) mapped.schedule_status = updates.scheduleStatus;
        if (updates.authorizationDocGenerated !== undefined) mapped.authorization_doc_generated = updates.authorizationDocGenerated;
        if (updates.authorizationConfirmedAt !== undefined) mapped.authorization_confirmed_at = updates.authorizationConfirmedAt;
        if (updates.signatories !== undefined) mapped.signatories = updates.signatories;
        if (updates.status !== undefined) mapped.status = updates.status;
        if ((updates as any).eligibleGradeLevels !== undefined) mapped.eligible_grade_levels = (updates as any).eligibleGradeLevels;
        if ((updates as any).eligibleSections !== undefined) mapped.eligible_sections = (updates as any).eligibleSections;

        await api.updateSession(activeSessionId || '1', mapped);
        await refreshData();
      } catch (error) {
        console.error('Update election failed:', error);
      }
    },
    [activeSessionId, refreshData]
  );

  const resetSystem = useCallback(async () => {
    try {
      await api.resetSession(activeSessionId || '1');
      await refreshData();
    } catch (error) {
      console.error('Reset system failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData]);

  const processRollover = useCallback(async (newSchoolYear: string, voterUpdates: any[]) => {
    try {
      await api.processYearRollover(newSchoolYear, voterUpdates);
      await refreshData();
    } catch (error) {
      console.error('Process rollover failed:', error);
      throw error;
    }
  }, [refreshData]);

  // Candidate CRUD
  const addCandidate = useCallback(
    async (candidateData: Omit<Candidate, 'id' | 'votes'>) => {
      const tempId = `temp-${Date.now()}`;
      setCandidates((prev) => [...prev, { ...candidateData, id: tempId, votes: 0 }]);

      const mapped: any = {
        name: candidateData.name,
        position_id: candidateData.position,
        party: candidateData.party,
        photo_url: candidateData.photo,
        motto: candidateData.motto,
        grade_level: candidateData.gradeLevel,
        section: candidateData.section,
        session_id: activeSessionId || '1',
      };
      try {
        await api.addCandidate(mapped);
        await refreshData();
      } catch (error) {
        console.error('Add candidate failed:', error);
        await refreshData();
        throw error;
      }
    },
    [activeSessionId, refreshData]
  );

  const updateCandidate = useCallback(
    async (id: string, updates: Partial<Candidate>) => {
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
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
        await refreshData();
      } catch (error) {
        console.error('Update candidate failed:', error);
        await refreshData();
        throw error;
      }
    },
    [refreshData]
  );

  const deleteCandidate = useCallback(
    async (id: string) => {
      setCandidates(prev => prev.filter(c => c.id !== id));
      try {
        await api.deleteCandidate(id);
        await refreshData();
      } catch (error) {
        console.error('Delete candidate failed:', error);
        await refreshData();
        throw error;
      }
    },
    [refreshData]
  );

  // Position CRUD
  const addPosition = useCallback(
    async (positionData: Omit<Position, 'id'>) => {
      const tempId = `temp-${Date.now()}`;
      setPositions((prev) => [...prev, { ...positionData, id: tempId }]);

      const mapped: any = {
        name: positionData.name,
        display_order: positionData.order,
        max_votes: positionData.maxVotes,
        strict_grade_mapping: positionData.strictGradeMapping ? true : false,
        session_id: activeSessionId || '1',
      };
      try {
        await api.addPosition(mapped);
        await refreshData();
      } catch (error) {
        console.error('Add position failed:', error);
        await refreshData();
        throw error;
      }
    },
    [activeSessionId, refreshData]
  );

  const deletePosition = useCallback(
    (id: string) => {
      setPositions(prev => prev.filter(p => p.id !== id));
      api
        .deletePosition(id)
        .then(() => refreshData())
        .catch((error) => {
          console.error('Delete position failed:', error);
          refreshData();
        });
    },
    [refreshData]
  );

  const cleanupDuplicatePositions = useCallback(async () => {
    try {
      const result = await api.cleanupDuplicatePositions(activeSessionId || undefined);
      await refreshData();
      return result;
    } catch (error) {
      console.error('Cleanup duplicate positions failed:', error);
      throw error;
    }
  }, [activeSessionId, refreshData]);

  // Section CRUD (global)
  const addSection = useCallback(
    (sectionData: Omit<Section, 'id'>) => {
      const tempId = `temp-${Date.now()}`;
      setSections((prev) => [...prev, { ...sectionData, id: tempId }]);

      const mapped = {
        name: sectionData.name,
        grade_level: sectionData.gradeLevel,
      };
      api
        .addSection(mapped)
        .then(() => refreshData())
        .catch((error) => {
          console.error('Add section failed:', error);
          refreshData();
        });
    },
    [refreshData]
  );

  const deleteSection = useCallback(
    (id: string) => {
      setSections(prev => prev.filter(s => s.id !== id));
      api
        .deleteSection(id)
        .then(() => refreshData())
        .catch((error) => {
          console.error('Delete section failed:', error);
          refreshData();
        });
    },
    [refreshData]
  );

  // Voter management
  const approveVoter = useCallback(
    async (id: string) => {
      setVoters(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
      try {
        await api.approveVoter(id);
        refreshData();
        return true;
      } catch (error) {
        console.error('Approve voter failed:', error);
        refreshData();
        return false;
      }
    },
    [refreshData]
  );

  const rejectVoter = useCallback(
    async (id: string) => {
      setVoters(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v));
      try {
        await api.rejectVoter(id);
        refreshData();
        return true;
      } catch (error) {
        console.error('Reject voter failed:', error);
        refreshData();
        return false;
      }
    },
    [refreshData]
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
        register,
        bulkRegister,
        adminRegister,
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
        rejectVoter,
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
