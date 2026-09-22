import type { VotingSession } from '@/types/voting';

export function parseStoredJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function isEligibleForSession(
  session: Pick<VotingSession, 'eligibleGradeLevels' | 'eligibleSections'>,
  voter: { gradeLevel?: string; section?: string },
): boolean {
  return (!session.eligibleGradeLevels.length || session.eligibleGradeLevels.includes(voter.gradeLevel || ''))
    && (!session.eligibleSections.length || session.eligibleSections.includes(voter.section || ''));
}

export function isSessionOpen(session: VotingSession | null, now = Date.now()): boolean {
  if (!session || !session.isActive || session.status !== 'active' || session.resultsFinalized) return false;
  const start = session.startDate?.getTime();
  const end = session.endDate?.getTime();
  return (!Number.isFinite(start) || start <= now) && (!Number.isFinite(end) || now < end);
}
