export interface Candidate {
  id: string;
  name: string;
  position: string;
  party: string;
  photo: string;
  motto: string;
  gradeLevel: string;
  section: string;
  votes: number;
}

export interface Position {
  id: string;
  name: string;
  order: number;
  maxVotes: number;
  strictGradeMapping?: boolean; // If true, filters candidates by Election.gradeMappings
}

export interface Voter {
  id: string;
  lrn: string;
  name: string;
  gradeLevel: string;
  section: string;
  hasVoted: boolean;
  votedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: string;
}

export interface Election {
  id: string;
  name: string;
  schoolYear: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  totalVoters?: number;
  totalVoted?: number;
  gradeMappings?: Record<string, string>; // Maps voter grade to candidate grade
}

export interface Vote {
  id: string;
  voterId: string;
  candidateId: string;
  positionId: string;
  timestamp: Date;
}

export interface User {
  id: string;
  role: 'admin' | 'voter';
  name: string;
  lrn?: string;
  email?: string;
  gradeLevel?: string; // To enforce voting permissions
}
