import { describe, expect, it } from 'vitest';
import { isEligibleForSession, isSessionOpen, parseStoredJson } from './electionRules';
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

  it('applies both grade and section eligibility', () => {
    const restricted = session({ eligibleGradeLevels: ['10'], eligibleSections: ['Rizal'] });
    expect(isEligibleForSession(restricted, { gradeLevel: '10', section: 'Rizal' })).toBe(true);
    expect(isEligibleForSession(restricted, { gradeLevel: '9', section: 'Rizal' })).toBe(false);
  });

  it('falls back safely for malformed stored JSON', () => {
    expect(parseStoredJson('{broken', [])).toEqual([]);
    expect(parseStoredJson('["7"]', [])).toEqual(['7']);
  });
});
