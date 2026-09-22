import { describe, expect, it } from 'vitest';
import { isEligibleForSession, isSessionOpen, parseStoredJson, normalizeGrade, formatSessionEligibility, getEligibleActiveSessions } from './electionRules';
import type { VotingSession } from '@/types/voting';

const session = (overrides: Partial<VotingSession> = {}): VotingSession => ({
  id: '1', name: 'Election', schoolYear: '2026-2027',
  startDate: new Date('2026-09-22T00:00:00Z'), endDate: new Date('2026-09-23T00:00:00Z'),
  isActive: true, status: 'active', eligibleGradeLevels: [], eligibleSections: [],
  ...overrides,
});

describe('election rules', () => {
  it('opens only active, unfinished elections inside their schedule', () => {
    expect(isSessionOpen(session(), Date.parse('2026-09-22T12:00:00Z'))).toBe(true);
    expect(isSessionOpen(session(), Date.parse('2026-09-21T12:00:00Z'))).toBe(false);
    expect(isSessionOpen(session({ resultsFinalized: true }), Date.parse('2026-09-22T12:00:00Z'))).toBe(false);
  });

  it('treats ongoing launched sessions as open immediately regardless of ID', () => {
    const launchedSession = session({
      id: '2',
      name: 'Grade 8 Election',
      scheduleStatus: 'ongoing',
      startDate: new Date('2026-09-22T15:00:00Z'), // slightly future date offset
      endDate: new Date('2026-09-23T15:00:00Z'),
    });
    expect(isSessionOpen(launchedSession, Date.parse('2026-09-22T12:00:00Z'))).toBe(true);
  });

  it('applies both grade and section eligibility with flexible normalization', () => {
    const restricted = session({ eligibleGradeLevels: ['10'], eligibleSections: ['Rizal'] });
    expect(isEligibleForSession(restricted, { gradeLevel: '10', section: 'Rizal' })).toBe(true);
    expect(isEligibleForSession(restricted, { gradeLevel: 'Grade 10', section: 'rizal' })).toBe(true);
    expect(isEligibleForSession(restricted, { gradeLevel: '9', section: 'Rizal' })).toBe(false);
    expect(isEligibleForSession(restricted, { gradeLevel: '10', section: 'Bonifacio' })).toBe(false);
  });

  it('allows all approved students if grade levels and sections are empty', () => {
    const schoolWide = session({ eligibleGradeLevels: [], eligibleSections: [] });
    expect(isEligibleForSession(schoolWide, { gradeLevel: '7', section: 'Mabini' })).toBe(true);
    expect(isEligibleForSession(schoolWide, { gradeLevel: '12', section: 'Einstein' })).toBe(true);
  });

  it('formats session eligibility correctly', () => {
    expect(formatSessionEligibility(session({ eligibleGradeLevels: [], eligibleSections: [] }))).toBe('All Grades & Sections');
    expect(formatSessionEligibility(session({ eligibleGradeLevels: ['7'], eligibleSections: [] }))).toBe('Grade 7 (All Sections)');
    expect(formatSessionEligibility(session({ eligibleGradeLevels: ['8'], eligibleSections: ['Diamond', 'Emerald'] }))).toBe('Grade 8 (Sections: Diamond, Emerald)');
  });

  it('falls back safely for malformed stored JSON', () => {
    expect(parseStoredJson('{broken', [])).toEqual([]);
    expect(parseStoredJson('["7"]', [])).toEqual(['7']);
  });

  it('filters multiple concurrently active sessions based on student eligibility', () => {
    const s1 = session({ id: '1', name: 'General Election', isActive: true, status: 'active', eligibleGradeLevels: [] });
    const s2 = session({ id: '2', name: 'Grade 7 Rep', isActive: true, status: 'active', eligibleGradeLevels: ['7'] });
    const s3 = session({ id: '3', name: 'Grade 8 Rep', isActive: true, status: 'active', eligibleGradeLevels: ['8'] });
    const s4Inactive = session({ id: '4', name: 'Club Election', isActive: false, status: 'upcoming', eligibleGradeLevels: [] });

    const allSessions = [s1, s2, s3, s4Inactive];
    const grade7Student = { gradeLevel: '7', section: 'Sampaguita' };
    const grade8Student = { gradeLevel: 'Grade 8', section: 'Rizal' };
    const grade9Student = { gradeLevel: '9', section: 'Mabini' };

    const activeForG7 = getEligibleActiveSessions(allSessions, grade7Student);
    expect(activeForG7.map(s => s.id)).toEqual(['1', '2']);

    const activeForG8 = getEligibleActiveSessions(allSessions, grade8Student);
    expect(activeForG8.map(s => s.id)).toEqual(['1', '3']);

    const activeForG9 = getEligibleActiveSessions(allSessions, grade9Student);
    expect(activeForG9.map(s => s.id)).toEqual(['1']);
  });
});
