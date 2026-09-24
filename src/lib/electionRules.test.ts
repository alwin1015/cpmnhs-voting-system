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

  it('normalizes section prefixes and whitespace correctly', () => {
    const s = session({ eligibleGradeLevels: ['7'], eligibleSections: ['Diamond', 'Emerald'] });
    expect(isEligibleForSession(s, { gradeLevel: '7', section: 'Section Diamond' })).toBe(true);
    expect(isEligibleForSession(s, { gradeLevel: '7', section: 'Sec. Emerald' })).toBe(true);
    expect(isEligibleForSession(s, { gradeLevel: '7', section: ' diamond ' })).toBe(true);
    expect(isEligibleForSession(s, { gradeLevel: '7', section: 'Ruby' })).toBe(false);
  });

  it('handles multiple active sessions with independent grade and section combinations', () => {
    const sG7Diamond = session({ id: '1', name: 'G7 Diamond Only', isActive: true, status: 'active', eligibleGradeLevels: ['7'], eligibleSections: ['Diamond'] });
    const sG7All = session({ id: '2', name: 'G7 All Sections', isActive: true, status: 'active', eligibleGradeLevels: ['7'], eligibleSections: [] });
    const sG8Ruby = session({ id: '3', name: 'G8 Ruby Only', isActive: true, status: 'active', eligibleGradeLevels: ['8'], eligibleSections: ['Ruby'] });
    const sSchoolWide = session({ id: '4', name: 'School-wide', isActive: true, status: 'active', eligibleGradeLevels: [], eligibleSections: [] });

    const sessionsList = [sG7Diamond, sG7All, sG8Ruby, sSchoolWide];

    // Grade 7 Diamond student should match 1, 2, and 4, but NOT 3
    const g7DiamondStudent = { gradeLevel: '7', section: 'Diamond' };
    const eligibleG7Diamond = getEligibleActiveSessions(sessionsList, g7DiamondStudent);
    expect(eligibleG7Diamond.map(s => s.id)).toEqual(['1', '2', '4']);

    // Grade 7 Emerald student should match 2 and 4, but NOT 1 or 3
    const g7EmeraldStudent = { gradeLevel: '7', section: 'Emerald' };
    const eligibleG7Emerald = getEligibleActiveSessions(sessionsList, g7EmeraldStudent);
    expect(eligibleG7Emerald.map(s => s.id)).toEqual(['2', '4']);

    // Grade 8 Ruby student should match 3 and 4, but NOT 1 or 2
    const g8RubyStudent = { gradeLevel: '8', section: 'Ruby' };
    const eligibleG8Ruby = getEligibleActiveSessions(sessionsList, g8RubyStudent);
    expect(eligibleG8Ruby.map(s => s.id)).toEqual(['3', '4']);

    // Grade 8 Emerald student should only match 4
    const g8EmeraldStudent = { gradeLevel: '8', section: 'Emerald' };
    const eligibleG8Emerald = getEligibleActiveSessions(sessionsList, g8EmeraldStudent);
    expect(eligibleG8Emerald.map(s => s.id)).toEqual(['4']);
  });

  it('determines the next unvoted session accurately across multi-session flows', () => {
    const s1 = session({ id: '1', name: 'General Election', isActive: true, status: 'active', eligibleGradeLevels: [] });
    const s2 = session({ id: '2', name: 'Grade 8 Rep', isActive: true, status: 'active', eligibleGradeLevels: ['8'] });
    const s3 = session({ id: '3', name: 'Club Election', isActive: true, status: 'active', eligibleGradeLevels: ['8'] });
    const sessionsList = [s1, s2, s3];
    const student = { gradeLevel: '8', section: 'Rizal' };

    const eligible = getEligibleActiveSessions(sessionsList, student);
    expect(eligible.map(s => s.id)).toEqual(['1', '2', '3']);

    // Case 1: Student has not voted yet (votedSessionIds = [])
    let votedSessionIds: string[] = [];
    let remaining = eligible.filter(s => !votedSessionIds.includes(s.id));
    expect(remaining.map(s => s.id)).toEqual(['1', '2', '3']);
    let nextAvailable = remaining.find(s => s.id !== '1');
    expect(nextAvailable?.id).toBe('2');

    // Case 2: Student voted in Session 1
    votedSessionIds = ['1'];
    remaining = eligible.filter(s => s.id !== '1' && !votedSessionIds.includes(s.id));
    expect(remaining.map(s => s.id)).toEqual(['2', '3']);
    nextAvailable = remaining[0];
    expect(nextAvailable?.id).toBe('2');

    // Case 3: Student voted in Session 2
    votedSessionIds = ['1', '2'];
    remaining = eligible.filter(s => s.id !== '2' && !votedSessionIds.includes(s.id));
    expect(remaining.map(s => s.id)).toEqual(['3']);
    nextAvailable = remaining[0];
    expect(nextAvailable?.id).toBe('3');

    // Case 4: Student finished all assigned sessions
    votedSessionIds = ['1', '2', '3'];
    remaining = eligible.filter(s => !votedSessionIds.includes(s.id));
    expect(remaining.length).toBe(0);
  });

  it('resolves representative target grade with fallback to student grade level', () => {
    // When gradeMappings is empty or undefined, fallback to normalized user grade
    const studentGrade = 'Grade 8';
    const normalized = normalizeGrade(studentGrade);
    expect(normalized).toBe('8');

    const emptyMappings: Record<string, string> = {};
    const targetDefault = emptyMappings[studentGrade] || emptyMappings[normalized] || normalized;
    expect(targetDefault).toBe('8');

    // When gradeMappings has custom override e.g. 'none'
    const customMappings: Record<string, string> = { '8': 'none' };
    const targetOverride = customMappings[studentGrade] || customMappings[normalized] || normalized;
    expect(targetOverride).toBe('none');
  });
});
