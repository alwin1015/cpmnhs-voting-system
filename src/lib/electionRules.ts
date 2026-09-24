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

export function normalizeGrade(grade: string | undefined | null): string {
  if (!grade) return '';
  const match = String(grade).match(/\b(\d+)\b/);
  return match ? match[1] : String(grade).trim();
}

export function normalizeSection(section: string | undefined | null): string {
  if (!section) return '';
  const trimmed = String(section).trim();
  // Strip redundant "Section" or "Sec." prefix if present
  const cleaned = trimmed.replace(/^(?:section|sec\.?)\s*[-:]*\s*/i, '');
  return cleaned.trim() || trimmed;
}

export function isEligibleForSession(
  session: Pick<VotingSession, 'eligibleGradeLevels' | 'eligibleSections'> | null | undefined,
  voter: { gradeLevel?: string; section?: string } | null | undefined,
): boolean {
  if (!session || !voter) return false;
  const eligibleGrades = Array.isArray(session.eligibleGradeLevels) ? session.eligibleGradeLevels : [];
  const eligibleSections = Array.isArray(session.eligibleSections) ? session.eligibleSections : [];

  // If no grade levels specified, open to all grades
  const gradeMatches = eligibleGrades.length === 0 || eligibleGrades.some(g => {
    const normG = normalizeGrade(g).toLowerCase();
    const normV = normalizeGrade(voter.gradeLevel).toLowerCase();
    return (normG && normG === normV) || String(g).trim().toLowerCase() === String(voter.gradeLevel || '').trim().toLowerCase();
  });

  // If no sections specified, open to all sections
  const sectionMatches = eligibleSections.length === 0 || eligibleSections.some(s => {
    const normS = normalizeSection(s).toLowerCase();
    const normV = normalizeSection(voter.section).toLowerCase();
    return (normS && normS === normV) || String(s).trim().toLowerCase() === String(voter.section || '').trim().toLowerCase();
  });

  return gradeMatches && sectionMatches;
}

export function isSessionOpen(session: VotingSession | null | undefined, now = Date.now()): boolean {
  if (!session || !session.isActive || session.status !== 'active' || session.resultsFinalized) return false;
  if (session.scheduleStatus === 'completed' || session.scheduleStatus === 'ended' || session.scheduleStatus === 'cancelled') return false;

  const start = session.startDate instanceof Date ? session.startDate.getTime() : (session.startDate ? new Date(session.startDate).getTime() : NaN);
  const end = session.endDate instanceof Date ? session.endDate.getTime() : (session.endDate ? new Date(session.endDate).getTime() : NaN);

  // If configured End Date and Time is reached, the session is ended automatically
  if (Number.isFinite(end) && now >= end) {
    return false;
  }

  // If schedule status is explicitly marked as ongoing by admin, treat as open as long as end date hasn't elapsed
  if (session.scheduleStatus === 'ongoing') {
    return true;
  }

  return (!Number.isFinite(start) || start <= now);
}

export function formatSessionEligibility(session: Pick<VotingSession, 'eligibleGradeLevels' | 'eligibleSections'> | null | undefined): string {
  if (!session) return 'All Students';
  const grades = Array.isArray(session.eligibleGradeLevels) ? session.eligibleGradeLevels : [];
  const sections = Array.isArray(session.eligibleSections) ? session.eligibleSections : [];

  if (grades.length === 0 && sections.length === 0) {
    return 'All Grades & Sections';
  }

  const gradeStr = grades.length > 0 
    ? (grades.length === 1 ? `Grade ${normalizeGrade(grades[0])}` : grades.map(g => `Grade ${normalizeGrade(g)}`).join(', '))
    : 'All Grades';
  const sectionStr = sections.length > 0 ? `Sections: ${sections.map(s => normalizeSection(s)).join(', ')}` : 'All Sections';

  return `${gradeStr} (${sectionStr})`;
}

export function getEligibleSessions<T extends Pick<VotingSession, 'eligibleGradeLevels' | 'eligibleSections'>>(
  sessions: T[],
  voter: { gradeLevel?: string; section?: string } | null | undefined,
): T[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((s) => isEligibleForSession(s, voter));
}

export function getEligibleActiveSessions(
  sessions: VotingSession[],
  voter: { gradeLevel?: string; section?: string } | null | undefined,
): VotingSession[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.filter((s) => s.isActive && s.status === 'active' && isEligibleForSession(s, voter));
}
