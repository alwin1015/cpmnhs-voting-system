import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Candidate, Position, Voter, Section, Election, User } from '@/types/voting';
import { api as onlineApi } from '@/lib/api';
import { offlineApi } from '@/lib/offlineApi';
import { supabase } from '@/lib/supabase';

// ⚡ OFFLINE MODE TOGGLE
// Set to true to use localStorage (no internet needed)
// Set to false to use Supabase (requires internet)
const OFFLINE_MODE = false;

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
  login: (lrn: string, password: string) => Promise<boolean>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  register: (lrn: string, firstName: string, middleInitial: string, lastName: string, gradeLevel: string, section: string, password: string) => Promise<{ success: boolean; message: string }>;
  bulkRegister: (students: any[]) => Promise<{ success: boolean; message: string; errors?: string[] }>;
  adminRegister: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  setVote: (positionId: string, candidateId: string) => void;
  submitVotes: () => Promise<boolean>;
  getResults: () => { position: Position; candidates: Candidate[] }[];
  updateElection: (updates: Partial<Election>) => Promise<void>;
  resetSystem: () => Promise<void>;
  addCandidate: (candidate: Omit<Candidate, 'id' | 'votes'>) => void;
  updateCandidate: (id: string, candidate: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;
  addPosition: (position: Omit<Position, 'id'>) => void;
  deletePosition: (id: string) => void;
  addSection: (section: Omit<Section, 'id'>) => void;
  deleteSection: (id: string) => void;
  approveVoter: (id: string) => void;
  rejectVoter: (id: string) => void;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

export function VotingProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [election, setElection] = useState<Election | null>(null);

  // Fetch all data from the API and map snake_case → camelCase
  const refreshData = useCallback(async () => {
    try {
      const [candidatesRes, positionsRes, sectionsRes, votersRes, electionData] =
        await Promise.all([
          api.getCandidates().catch(() => ({ data: [] })),
          api.getPositions().catch(() => ({ data: [] })),
          api.getSections().catch(() => ({ data: [] })),
          api.getVoters().catch(() => ({ data: [] })),
          api.getElection().catch(() => null),
        ]);

      // Unwrap .data from API responses (PHP returns { success, data })
      const candidatesData = candidatesRes?.data ?? candidatesRes ?? [];
      const positionsData = positionsRes?.data ?? positionsRes ?? [];
      const sectionsData = sectionsRes?.data ?? sectionsRes ?? [];
      const votersData = votersRes?.data ?? votersRes ?? [];

      // Map candidates: DB snake_case → React camelCase
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
        }))
      );

      // Map positions
      setPositions(
        (Array.isArray(positionsData) ? positionsData : []).map((p: any) => {
          return {
            id: String(p.id),
            name: p.name,
            order: Number(p.display_order ?? p.order ?? 0),
            maxVotes: Number(p.max_votes ?? p.maxVotes ?? 1),
            strictGradeMapping: Boolean(p.strict_grade_mapping ?? p.strictGradeMapping ?? false),
          };
        })
      );

      // Map sections
      setSections(
        (Array.isArray(sectionsData) ? sectionsData : []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          gradeLevel: s.grade_level ?? s.gradeLevel ?? '',
        }))
      );

      // Map voters
      const mappedVoters: Voter[] = (Array.isArray(votersData) ? votersData : []).map((v: any) => ({
        id: String(v.id),
        lrn: v.lrn,
        name: v.name,
        gradeLevel: v.grade_level ?? v.gradeLevel ?? '',
        section: v.section ?? '',
        hasVoted: Boolean(v.has_voted ?? v.hasVoted ?? false),
        votedAt: v.voted_at ? new Date(v.voted_at) : v.votedAt ? new Date(v.votedAt) : undefined,
        status: v.status ?? 'pending',
      }));
      setVoters(mappedVoters);

      // Map election
      const eData = electionData?.data ?? electionData;
      if (eData && eData.id) {
        let parsedMappings: Record<string, string> = {};
        if (eData.grade_mappings) {
          try {
            parsedMappings = typeof eData.grade_mappings === 'string' 
              ? JSON.parse(eData.grade_mappings) 
              : eData.grade_mappings;
          } catch (e) {
            console.error('Failed to parse grade_mappings', e);
          }
        }
        
        setElection({
          id: String(eData.id),
          name: eData.name,
          schoolYear: eData.school_year ?? eData.schoolYear ?? '',
          startDate: new Date(eData.start_date ?? eData.startDate),
          endDate: new Date(eData.end_date ?? eData.endDate),
          isActive: Boolean(eData.is_active ?? eData.isActive ?? false),
          totalVoters: mappedVoters.filter((v) => v.status === 'approved').length,
          totalVoted: mappedVoters.filter((v) => v.hasVoted).length,
          gradeMappings: parsedMappings,
        });
      } else {
        // Fallback: compute from voters even without election data
        setElection(null);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, []);

    // On mount: check existing session and load data
  useEffect(() => {
    const init = async () => {
      try {
        const meData = await api.getMe();
        if (meData && meData.id) {
          setUser({
            id: String(meData.id),
            role: meData.role,
            name: meData.name,
            lrn: meData.lrn,
            email: meData.email,
            gradeLevel: meData.gradeLevel || meData.grade_level,
          });
          setHasVoted(Boolean(meData.has_voted ?? meData.hasVoted ?? false));
        }
      } catch {
        // No active session � that's fine
      }
      await refreshData();
    };
    init();

    if (!OFFLINE_MODE) {
      const channel = supabase
        .channel('public:voters')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'voters' }, () => {
          refreshData();
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [refreshData]);

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
          });
          setHasVoted(Boolean(data.hasVoted ?? data.has_voted ?? false));
          await refreshData();
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
          await refreshData();
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
      lrn: string,
      firstName: string,
      middleInitial: string,
      lastName: string,
      gradeLevel: string,
      section: string,
      password: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const data = await api.register({ lrn, firstName, middleInitial, lastName, gradeLevel, section, password });
        return {
          success: data.success ?? true,
          message: data.message ?? 'Registration submitted! Please wait for admin approval.',
        };
      } catch (error: any) {
        console.error('Registration failed:', error);
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
        console.error('Bulk registration failed:', error);
        return { success: false, message: error.message || 'Bulk registration failed.' };
      }
    },
    [refreshData]
  );

  const adminRegister = useCallback(
    async (
      username: string,
      email: string,
      password: string
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const data = await api.adminRegister({ username, email, password });
        return {
          success: data.success ?? true,
          message: data.message ?? 'Admin registration successful! You can now login.',
        };
      } catch (error: any) {
        console.error('Admin registration failed:', error);
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
    setVotes((prev) => ({
      ...prev,
      [positionId]: candidateId,
    }));
  }, []);

  const submitVotes = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      // Convert votes Record<positionId, candidateId> to array
      const votesArray = Object.entries(votes).map(([positionId, candidateId]) => ({
        candidate_id: candidateId,
        position_id: positionId,
      }));
      await api.submitVotes(votesArray);
      setHasVoted(true);
      await refreshData();
      return true;
    } catch (error) {
      console.error('Submit votes failed:', error);
      return false;
    }
  }, [votes, user, refreshData]);

  const getResults = useCallback(() => {
    return positions.map((position) => ({
      position,
      candidates: candidates
        .filter((c) => c.position === position.id)
        .sort((a, b) => b.votes - a.votes),
    }));
  }, [candidates, positions]);

  const updateElection = useCallback(
    async (updates: Partial<Election>) => {
      try {
        const mapped: any = {};
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
        
        await api.updateElection(mapped);
        await refreshData();
      } catch (error) {
        console.error('Update election failed:', error);
      }
    },
    [refreshData]
  );

  const resetSystem = useCallback(async () => {
    try {
      await api.resetSystem();
      await refreshData();
    } catch (error) {
      console.error('Reset system failed:', error);
      throw error;
    }
  }, [refreshData]);

  // Candidate CRUD
  const addCandidate = useCallback(
    (candidateData: Omit<Candidate, 'id' | 'votes'>) => {
      const mapped = {
        name: candidateData.name,
        position_id: candidateData.position,
        party: candidateData.party,
        photo_url: candidateData.photo,
        motto: candidateData.motto,
        grade_level: candidateData.gradeLevel,
        section: candidateData.section,
      };
      api
        .addCandidate(mapped)
        .then(() => refreshData())
        .catch((error) => console.error('Add candidate failed:', error));
    },
    [refreshData]
  );

  const updateCandidate = useCallback(
    (id: string, updates: Partial<Candidate>) => {
      const mapped: any = { id };
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.position !== undefined) mapped.position_id = updates.position;
      if (updates.party !== undefined) mapped.party = updates.party;
      if (updates.photo !== undefined) mapped.photo_url = updates.photo;
      if (updates.motto !== undefined) mapped.motto = updates.motto;
      if (updates.gradeLevel !== undefined) mapped.grade_level = updates.gradeLevel;
      if (updates.section !== undefined) mapped.section = updates.section;
      api
        .updateCandidate(mapped)
        .then(() => refreshData())
        .catch((error) => console.error('Update candidate failed:', error));
    },
    [refreshData]
  );

  const deleteCandidate = useCallback(
    (id: string) => {
      api
        .deleteCandidate(id)
        .then(() => refreshData())
        .catch((error) => console.error('Delete candidate failed:', error));
    },
    [refreshData]
  );

  // Position CRUD
  const addPosition = useCallback(
    (positionData: Omit<Position, 'id'>) => {
      const mapped = {
        name: positionData.name,
        display_order: positionData.order,
        max_votes: positionData.maxVotes,
        strict_grade_mapping: positionData.strictGradeMapping ? true : false,
      };
      api
        .addPosition(mapped)
        .then(() => refreshData())
        .catch((error) => console.error('Add position failed:', error));
    },
    [refreshData]
  );

  const deletePosition = useCallback(
    (id: string) => {
      api
        .deletePosition(id)
        .then(() => refreshData())
        .catch((error) => console.error('Delete position failed:', error));
    },
    [refreshData]
  );

  // Section CRUD
  const addSection = useCallback(
    (sectionData: Omit<Section, 'id'>) => {
      const mapped = {
        name: sectionData.name,
        grade_level: sectionData.gradeLevel,
      };
      api
        .addSection(mapped)
        .then(() => refreshData())
        .catch((error) => console.error('Add section failed:', error));
    },
    [refreshData]
  );

  const deleteSection = useCallback(
    (id: string) => {
      api
        .deleteSection(id)
        .then(() => refreshData())
        .catch((error) => console.error('Delete section failed:', error));
    },
    [refreshData]
  );

  // Voter management
  const approveVoter = useCallback(
    (id: string) => {
      api
        .approveVoter(id)
        .then(() => refreshData())
        .catch((error) => console.error('Approve voter failed:', error));
    },
    [refreshData]
  );

  const rejectVoter = useCallback(
    (id: string) => {
      api
        .rejectVoter(id)
        .then(() => refreshData())
        .catch((error) => console.error('Reject voter failed:', error));
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
        login,
        adminLogin,
        register,
        bulkRegister,
        adminRegister,
        logout,
        setVote,
        submitVotes,
        getResults,
        updateElection,
        resetSystem,
        addCandidate,
        updateCandidate,
        deleteCandidate,
        addPosition,
        deletePosition,
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

