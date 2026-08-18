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
  createdAt?: Date;
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
  resultsFinalized?: boolean;
  finalizedBy?: string;
  finalizedAt?: Date;
  scheduleStatus?: 'draft' | 'pending_authorization' | 'authorized' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  authorizationDocGenerated?: boolean;
  authorizationConfirmedAt?: string;
  signatories?: {
    preparedBy?: Signatory;
    reviewedBy?: Signatory;
    notedBy?: Signatory;
    approvedBy?: Signatory;
  };
}

export interface Signatory {
  name: string;
  position: string;
  date?: string;
}

export interface ElectionResult {
  positionId: string;
  positionName: string;
  positionOrder: number;
  candidateId: string;
  candidateName: string;
  candidateParty: string;
  candidateGradeLevel: string;
  totalVotes: number;
  rank: number;
  status: 'winner' | 'tied' | 'verified_winner' | 'lost' | 'pending';
  percentage: number;
}

export interface VoteVerification {
  id: string;
  positionId: string;
  tiedCandidateIds: string[];
  selectedVoterIds: string[];
  verificationStatus: 'pending' | 'in_progress' | 'completed' | 'tie_remains';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  originalVoteCounts: Record<string, number>;
  createdAt: Date;
}

export interface TieResolution {
  id: string;
  verificationId: string;
  positionId: string;
  selectedWinnerId: string;
  resolutionMethod: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  reason?: string;
}

export interface VerificationVoterDetail {
  voterId: string;
  voterName: string;
  voterLrn: string;
  candidateId: string;
  candidateName: string;
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
