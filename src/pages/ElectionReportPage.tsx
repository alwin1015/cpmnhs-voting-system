import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { ElectionResult, VoteVerification, TieResolution, VerificationVoterDetail } from '@/types/voting';
import {
  FileText, Trophy, AlertTriangle, CheckCircle, Lock, Printer,
  Shield, Search, Filter, ChevronDown, ChevronUp, Users, XCircle, Award
} from 'lucide-react';
import cpmnhsLogo from '@/assets/cpmnhs-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import sslgLogo from '@/assets/sslg-logo.png';

export default function ElectionReportPage() {
  const { election, candidates, positions, voters, user, isLoggedIn, finalizeResults, unfinalizeResults } = useVoting();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');

  // State
  const [verifications, setVerifications] = useState<VoteVerification[]>([]);
  const [tieResolutions, setTieResolutions] = useState<TieResolution[]>([]);
  const [expandedTie, setExpandedTie] = useState<string | null>(null);
  const [verificationVotes, setVerificationVotes] = useState<Record<string, VerificationVoterDetail[]>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [tieResolveReason, setTieResolveReason] = useState('');
  const [selectedWinner, setSelectedWinner] = useState<string>('');

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Load verifications and tie resolutions
  const loadVerificationData = useCallback(async () => {
    try {
      const [vData, tData] = await Promise.all([
        api.getVerifications(),
        api.getTieResolutions(),
      ]);
      setVerifications(vData.map((v: any) => ({
        id: String(v.id),
        positionId: String(v.position_id),
        tiedCandidateIds: JSON.parse(v.tied_candidate_ids || '[]'),
        selectedVoterIds: JSON.parse(v.selected_voter_ids || '[]'),
        verificationStatus: v.verification_status,
        verifiedBy: v.verified_by,
        verifiedAt: v.verified_at ? new Date(v.verified_at) : undefined,
        notes: v.notes,
        originalVoteCounts: JSON.parse(v.original_vote_counts || '{}'),
        createdAt: new Date(v.created_at),
      })));
      setTieResolutions(tData.map((t: any) => ({
        id: String(t.id),
        verificationId: String(t.verification_id),
        positionId: String(t.position_id),
        selectedWinnerId: String(t.selected_winner_id),
        resolutionMethod: t.resolution_method,
        resolvedBy: t.resolved_by,
        resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined,
        reason: t.reason,
      })));
    } catch (error) {
      console.error('Failed to load verification data:', error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadVerificationData();
    }
  }, [isAdmin, loadVerificationData]);

  // Compute election results
  const computeResults = useCallback((): ElectionResult[] => {
    const results: ElectionResult[] = [];

    positions.forEach((position) => {
      const positionCandidates = candidates
        .filter((c) => c.position === position.id)
        .sort((a, b) => b.votes - a.votes);

      const totalPositionVotes = positionCandidates.reduce((sum, c) => sum + c.votes, 0);

      // Find tie resolution for this position
      const resolution = tieResolutions.find((r) => r.positionId === position.id);

      positionCandidates.forEach((candidate, index) => {
        const percentage = totalPositionVotes > 0
          ? Math.round((candidate.votes / totalPositionVotes) * 100)
          : 0;

        // Determine rank (handle ties)
        let rank = 1;
        for (let i = 0; i < index; i++) {
          if (positionCandidates[i].votes > candidate.votes) {
            rank = i + 1;
            break;
          }
          rank = i + 1;
        }
        if (index > 0 && positionCandidates[index - 1].votes === candidate.votes) {
          rank = results.filter(r => r.positionId === position.id && r.totalVotes > candidate.votes).length + 1;
        } else {
          rank = index + 1;
        }

        // Determine status
        let status: ElectionResult['status'] = 'pending';
        const isTied = index > 0 && positionCandidates[index - 1].votes === candidate.votes;
        const isTiedWithNext = index < positionCandidates.length - 1 && positionCandidates[index + 1]?.votes === candidate.votes;
        const isTopCandidate = rank === 1;

        if (isTopCandidate && !isTied && !isTiedWithNext) {
          status = 'winner';
        } else if (isTopCandidate && (isTied || isTiedWithNext)) {
          // Check if resolved
          if (resolution && resolution.selectedWinnerId === candidate.id) {
            status = 'verified_winner';
          } else if (resolution) {
            status = 'lost'; // Tie was resolved, but not in this candidate's favor
          } else {
            status = 'tied';
          }
        } else if (rank === 1 && (isTied || isTiedWithNext)) {
          if (resolution && resolution.selectedWinnerId === candidate.id) {
            status = 'verified_winner';
          } else if (resolution) {
            status = 'lost';
          } else {
            status = 'tied';
          }
        } else {
          status = 'lost';
        }

        results.push({
          positionId: position.id,
          positionName: position.name,
          positionOrder: position.order,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateParty: candidate.party,
          candidateGradeLevel: candidate.gradeLevel,
          totalVotes: candidate.votes,
          rank,
          status,
          percentage,
        });
      });
    });

    return results.sort((a, b) => a.positionOrder - b.positionOrder || a.rank - b.rank);
  }, [candidates, positions, tieResolutions]);

  const allResults = computeResults();

  // Apply filters
  const filteredResults = allResults.filter((r) => {
    if (filterGrade !== 'all' && r.candidateGradeLevel !== filterGrade) return false;
    if (filterPosition !== 'all' && r.positionId !== filterPosition) return false;
    return true;
  });

  // Detect ties
  const ties = positions
    .map((position) => {
      const positionResults = allResults.filter((r) => r.positionId === position.id && r.status === 'tied');
      if (positionResults.length >= 2) {
        return { positionId: position.id, positionName: position.name, tiedCandidates: positionResults };
      }
      return null;
    })
    .filter(Boolean) as { positionId: string; positionName: string; tiedCandidates: ElectionResult[] }[];

  const allTiesResolved = ties.length === 0;

  // Get unique grade levels from candidates
  const gradeOptions = [...new Set(candidates.map((c) => c.gradeLevel))].sort();

  // Handlers
  const handleInitiateVerification = async (positionId: string, tiedCandidateIds: string[]) => {
    setIsVerifying(true);
    try {
      const voteCounts: Record<string, number> = {};
      tiedCandidateIds.forEach((id) => {
        const cand = candidates.find((c) => c.id === id);
        if (cand) voteCounts[id] = cand.votes;
      });

      const verification = await api.initiateVerification(positionId, tiedCandidateIds, voteCounts);
      toast({ title: 'Verification Initiated', description: `${JSON.parse(verification.selected_voter_ids).length} voters randomly selected for verification.` });
      await loadVerificationData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to initiate verification.', variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadVerificationVotes = async (verification: VoteVerification) => {
    try {
      const votes = await api.getVerificationVotes(verification.selectedVoterIds, verification.positionId);
      setVerificationVotes((prev) => ({ ...prev, [verification.id]: votes }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCompleteVerification = async (verification: VoteVerification, tieRemains: boolean) => {
    try {
      await api.completeVerification(verification.id, verificationNotes, tieRemains);
      toast({
        title: tieRemains ? 'Tie Remains' : 'Verification Completed',
        description: tieRemains
          ? 'Tie remains after verification. Further action required.'
          : 'Verification completed successfully.',
      });
      setVerificationNotes('');
      await loadVerificationData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleResolveTie = async (verification: VoteVerification) => {
    if (!selectedWinner) {
      toast({ title: 'Error', description: 'Please select a winner.', variant: 'destructive' });
      return;
    }
    try {
      await api.resolveTie(verification.id, verification.positionId, selectedWinner, tieResolveReason);
      toast({ title: 'Tie Resolved', description: 'The tie has been resolved and a winner selected.' });
      setSelectedWinner('');
      setTieResolveReason('');
      await loadVerificationData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleFinalizeResults = async () => {
    setIsFinalizing(true);
    try {
      await finalizeResults();
      toast({ title: 'Results Finalized', description: 'Election results have been locked and finalized.' });
      setShowFinalizeDialog(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const getStatusBadge = (status: ElectionResult['status']) => {
    switch (status) {
      case 'winner':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><Trophy className="h-3 w-3" />Winner</span>;
      case 'tied':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700"><AlertTriangle className="h-3 w-3" />Tie Detected</span>;
      case 'verified_winner':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"><CheckCircle className="h-3 w-3" />Verified Winner</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500">Lost</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-400">Pending</span>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-xl bg-white/80 backdrop-blur-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2 text-slate-800">Access Denied</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                The election report is only accessible to administrators.
              </p>
              <Button
                onClick={() => window.location.href = '/'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 transition-colors"
              >
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // ==================== OFFICIAL REPORT (PRINTABLE) ====================
  if (showOfficialReport) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#fff' }}>
        {/* Screen-only controls */}
        <div className="no-print p-4 bg-gray-50 border-b flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowOfficialReport(false)}>
            ← Back to Report
          </Button>
          <Button
            onClick={() => window.print()}
            className="gap-2 text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            <Printer className="h-4 w-4" />
            Print Official Results
          </Button>
        </div>

        {/* Printable content */}
        <div ref={printRef} className="max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:max-w-none text-slate-900 bg-white">
          {/* Header with 3 Logos (CPMNHS Left, DepEd Center, SSLG Right) */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              {/* Left Logo: CPMNHS Seal */}
              <div className="w-16 flex-shrink-0 flex justify-center">
                <img
                  src={cpmnhsLogo}
                  alt="CPMNHS Seal"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs"
                />
              </div>

              {/* Center: DepEd Header */}
              <div className="flex-1 text-center flex flex-col items-center">
                {/* DepEd Logo */}
                <div className="flex flex-col items-center leading-none mb-1">
                  <img
                    src={depedLogo}
                    alt="DepEd Logo"
                    className="w-24 sm:w-32 object-contain"
                  />
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium leading-tight">Republic of the Philippines</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium leading-tight">Department of Education</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-tight">Region VII – Central Visayas</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-tight">Division of Bohol</p>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5 leading-tight">
                  CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight">Cabad, Balilihan, Bohol</p>
              </div>

              {/* Right Logo: SSLG Seal */}
              <div className="w-16 flex-shrink-0 flex justify-center">
                <img
                  src={sslgLogo}
                  alt="SSLG Seal"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Title Header */}
          <div className="text-center mb-4">
            <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900">
              PRINT RESULTS
            </h2>
            <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-wide">
              SCHOOL ELECTION
            </h3>
            <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-wide">
              SCHOOL YEAR {election?.schoolYear || '2025-2026'}
            </h4>
          </div>

          {/* Metadata Section */}
          <div className="max-w-xl text-[11px] sm:text-xs space-y-1 mb-5 text-slate-800 font-medium">
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Election Title</span>
              <span>:</span>
              <span>{election?.name || 'Supreme Secondary Learners Government (SSLG) Election'}</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Date of Election</span>
              <span>:</span>
              <span>{election?.startDate ? new Date(election.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'May 23, 2025'}</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Voting Time</span>
              <span>:</span>
              <span>7:00 AM – 4:00 PM</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Venue</span>
              <span>:</span>
              <span>Congressman Pablo Malasarte National High School</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Total Registered Voters</span>
              <span>:</span>
              <span>{election?.totalVoters?.toLocaleString() || '0'}</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Total Votes Cast</span>
              <span>:</span>
              <span>{election?.totalVoted?.toLocaleString() || '0'}</span>
            </div>
            <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
              <span className="font-semibold">Voter Turnout</span>
              <span>:</span>
              <span>{election && election.totalVoters > 0 ? Math.round(((election.totalVoted || 0) / election.totalVoters) * 100) : 0}%</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="mb-5">
            <h3 className="text-center font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-2">
              OFFICIAL RESULTS
            </h3>

            <table className="w-full border border-slate-900 text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-sky-100/60 border-b border-slate-900 text-slate-900 font-bold uppercase text-[11px] sm:text-xs">
                  <th className="py-2 px-3 border-r border-slate-900 text-center w-1/4">POSITION</th>
                  <th className="py-2 px-3 border-r border-slate-900 text-center w-2/5">CANDIDATE NAME</th>
                  <th className="py-2 px-3 border-r border-slate-900 text-center w-1/5">TOTAL VOTES</th>
                  <th className="py-2 px-3 text-center w-1/6">RANK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {positions.map((pos) => {
                  const posResults = allResults.filter((r) => r.positionId === pos.id);
                  if (posResults.length === 0) {
                    return (
                      <tr key={pos.id} className="border-b border-slate-900">
                        <td className="py-2 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle">
                          {pos.name}
                        </td>
                        <td colSpan={3} className="py-2 px-3 text-center text-slate-400 italic">
                          No candidates registered
                        </td>
                      </tr>
                    );
                  }

                  return posResults.map((r, idx) => (
                    <tr
                      key={`${r.positionId}-${r.candidateId}`}
                      className={`border-b ${idx === posResults.length - 1 ? 'border-b-slate-900' : 'border-b-slate-300'}`}
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={posResults.length}
                          className="py-2.5 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle"
                        >
                          {pos.name}
                        </td>
                      )}
                      <td className="py-2 px-3 uppercase text-slate-900 border-r border-slate-900 font-medium">
                        {r.candidateName}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-900 font-mono">
                        {r.totalVotes.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {r.rank}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>

          {/* Certification Text & Signatures */}
          <div className="space-y-5 pt-2 break-inside-avoid text-xs sm:text-sm">
            <div className="space-y-1.5 text-slate-800 leading-relaxed text-justify sm:text-center text-[11px] sm:text-xs">
              <p>
                We, the undersigned, hereby certify that the above results are true, correct, and officially tallied based on the votes cast during the SSLG Election held on {election?.startDate ? new Date(election.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'May 23, 2025'}.
              </p>
              <p>
                Certified this {new Date().getDate()}th day of {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} at Congressman Pablo Malasarte National High School, Cabad, Balilihan, Bohol.
              </p>
            </div>

            {/* ELECTION COMMITTEE Section */}
            <div className="pt-2">
              <h4 className="font-bold uppercase text-slate-900 text-center text-xs tracking-wider mb-8">
                ELECTION COMMITTEE
              </h4>

              <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center">
                {/* Chairperson */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Chairperson
                  </span>
                </div>

                {/* Co-Chairperson */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Co-Chairperson
                  </span>
                </div>

                {/* Member */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Member
                  </span>
                </div>
              </div>
            </div>

            {/* Certified Correct & Noted by Section */}
            <div className="pt-4 grid grid-cols-2 gap-12 sm:gap-20 text-center">
              {/* Certified Correct */}
              <div className="flex flex-col items-center w-full">
                <span className="text-xs font-semibold text-slate-800 self-start sm:self-center mb-6">
                  Certified Correct:
                </span>
                <div className="w-full max-w-[240px] border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                    {election?.signatories?.preparedBy?.name || 'MS. LIZA MAY A. BELTRAN'}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  {election?.signatories?.preparedBy?.position || 'School Election Officer'}
                </span>
              </div>

              {/* Noted by */}
              <div className="flex flex-col items-center w-full">
                <span className="text-xs font-semibold text-slate-800 self-start sm:self-center mb-6">
                  Noted by:
                </span>
                <div className="w-full max-w-[240px] border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                    {election?.signatories?.approvedBy?.name || 'DR. ROLANDO D. VILLARIN'}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  {election?.signatories?.approvedBy?.position || 'School Principal'}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 no-print">
              <p>CPMNHS iVote Electronic Voting System • Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN REPORT VIEW ====================
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-slide-up">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Election Results Report</h1>
              <p className="text-gray-500">{election?.name} • S.Y. {election?.schoolYear}</p>
            </div>
            <div className="flex items-center gap-2">
              {election?.resultsFinalized && (
                <Button
                  onClick={() => setShowOfficialReport(true)}
                  className="gap-2 text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Final Results
                </Button>
              )}
            </div>
          </div>

          {/* Finalized Banner */}
          {election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">Results Finalized</p>
                  <p className="text-sm text-emerald-600">
                    Finalized by {election.finalizedBy} on {election.finalizedAt
                      ? new Date(election.finalizedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tie Detection Banner */}
          {ties.length > 0 && !election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Tie Detected – Verification Required</p>
                  <p className="text-sm text-amber-600">
                    {ties.length} position{ties.length > 1 ? 's have' : ' has'} tied candidates. Please verify and resolve ties before finalizing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <Card className="border border-gray-100 shadow-sm mb-6 animate-fade-in" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600">Filters:</span>
                </div>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="h-9 px-3 text-sm rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Grade Levels</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>

                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="h-9 px-3 text-sm rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Positions</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {(filterGrade !== 'all' || filterPosition !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterGrade('all'); setFilterPosition('all'); }} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card className="border border-gray-100 shadow-sm mb-6 animate-fade-in" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Election</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Grade</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Position</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Candidate</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Votes</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rank</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400">
                          <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="font-medium">No results found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r, idx) => {
                        const isNewPosition = idx === 0 || filteredResults[idx - 1].positionId !== r.positionId;
                        return (
                          <tr
                            key={`${r.positionId}-${r.candidateId}`}
                            className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${isNewPosition && idx > 0 ? 'border-t-2 border-t-gray-100' : ''}`}
                          >
                            <td className="py-3 px-4 text-sm text-gray-500">
                              {isNewPosition ? `${election?.name || 'Election'}` : ''}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {isNewPosition ? `Grade ${r.candidateGradeLevel}` : `Grade ${r.candidateGradeLevel}`}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {isNewPosition ? r.positionName : ''}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{r.candidateName}</span>
                                <span className="text-xs text-gray-400">({r.candidateParty})</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-sm font-bold text-gray-900">{r.totalVotes}</span>
                              <span className="text-xs text-gray-400 ml-1">({r.percentage}%)</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                                {r.rank}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(r.status)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tie Detection & Verification Section */}
          {ties.length > 0 && !election?.resultsFinalized && (
            <div className="space-y-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Tie Detection & Verification
              </h2>

              {ties.map((tie) => {
                const existingVerification = verifications.find(
                  (v) => v.positionId === tie.positionId && (v.verificationStatus === 'in_progress' || v.verificationStatus === 'tie_remains')
                );
                const isExpanded = expandedTie === tie.positionId;

                return (
                  <Card key={tie.positionId} className="border border-amber-200 shadow-sm" style={{ background: 'rgba(255,251,235,0.8)' }}>
                    <CardContent className="p-4">
                      {/* Header */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedTie(isExpanded ? null : tie.positionId)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{tie.positionName}</p>
                            <p className="text-sm text-amber-600">
                              {tie.tiedCandidates.length} candidates tied at {tie.tiedCandidates[0].totalVotes} votes each
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!existingVerification && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInitiateVerification(tie.positionId, tie.tiedCandidates.map((c) => c.candidateId));
                              }}
                              disabled={isVerifying}
                              className="text-white"
                              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                              <Search className="h-4 w-4 mr-1" />
                              {isVerifying ? 'Starting...' : 'Initiate Verification'}
                            </Button>
                          )}
                          {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-amber-200 space-y-4">
                          {/* Tied Candidates */}
                          <div>
                            <p className="text-sm font-medium text-gray-600 mb-2">Tied Candidates:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {tie.tiedCandidates.map((c) => (
                                <div key={c.candidateId} className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-amber-100">
                                  <Award className="h-4 w-4 text-amber-500" />
                                  <span className="text-sm font-medium">{c.candidateName}</span>
                                  <span className="text-xs text-gray-400">({c.candidateParty})</span>
                                  <span className="ml-auto text-sm font-bold text-amber-700">{c.totalVotes} votes</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Verification Panel */}
                          {existingVerification && (
                            <div className="p-4 rounded-lg bg-white/80 border border-gray-200 space-y-3">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold text-gray-700">
                                  Manual Vote Verification — {existingVerification.selectedVoterIds.length} voters selected
                                </span>
                                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                                  existingVerification.verificationStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  existingVerification.verificationStatus === 'tie_remains' ? 'bg-red-100 text-red-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {existingVerification.verificationStatus.replace('_', ' ')}
                                </span>
                              </div>

                              {/* Load votes button */}
                              {!verificationVotes[existingVerification.id] && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLoadVerificationVotes(existingVerification)}
                                  className="text-sm"
                                >
                                  <Search className="h-3 w-3 mr-1" />
                                  View Selected Voters' Votes
                                </Button>
                              )}

                              {/* Voter votes table */}
                              {verificationVotes[existingVerification.id] && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-100">
                                        <th className="text-left py-2 px-2 text-xs text-gray-400">Voter</th>
                                        <th className="text-left py-2 px-2 text-xs text-gray-400">LRN</th>
                                        <th className="text-left py-2 px-2 text-xs text-gray-400">Voted For</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {verificationVotes[existingVerification.id].map((vv, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                          <td className="py-1.5 px-2">{vv.voterName}</td>
                                          <td className="py-1.5 px-2 text-gray-500">{vv.voterLrn}</td>
                                          <td className="py-1.5 px-2 font-medium">{vv.candidateName}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Complete Verification / Resolve Tie */}
                              {existingVerification.verificationStatus === 'in_progress' && (
                                <div className="space-y-2 pt-2 border-t border-gray-100">
                                  <textarea
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    placeholder="Add verification notes..."
                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg resize-none h-20"
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleCompleteVerification(existingVerification, false)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Verification Complete (No Tie)
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleCompleteVerification(existingVerification, true)}
                                      className="border-red-200 text-red-600 hover:bg-red-50">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> Tie Remains
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {existingVerification.verificationStatus === 'tie_remains' && (
                                <div className="space-y-3 pt-2 border-t border-red-200 bg-red-50/50 p-3 rounded-lg">
                                  <p className="text-sm font-semibold text-red-700">
                                    Tie Remains – Further Action Required
                                  </p>
                                  <p className="text-xs text-red-600">
                                    Select the winner based on your school's approved tie-breaking procedure.
                                  </p>
                                  <select
                                    value={selectedWinner}
                                    onChange={(e) => setSelectedWinner(e.target.value)}
                                    className="w-full h-9 px-3 text-sm rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                  >
                                    <option value="">Select Winner</option>
                                    {tie.tiedCandidates.map((c) => (
                                      <option key={c.candidateId} value={c.candidateId}>{c.candidateName}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={tieResolveReason}
                                    onChange={(e) => setTieResolveReason(e.target.value)}
                                    placeholder="Reason for selection (e.g., coin toss, academic standing)..."
                                    className="w-full p-2 text-sm border border-gray-200 rounded-lg"
                                  />
                                  <Button size="sm" onClick={() => handleResolveTie(existingVerification)}
                                    disabled={!selectedWinner}
                                    className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <Trophy className="h-3 w-3 mr-1" /> Confirm Winner Selection
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Finalize Button */}
          {!election?.resultsFinalized && (
            <div className="text-center py-6">
              <Button
                onClick={() => setShowFinalizeDialog(true)}
                disabled={!allTiesResolved || isFinalizing}
                size="lg"
                className="gap-2 text-white shadow-lg"
                style={{
                  background: allTiesResolved
                    ? 'linear-gradient(135deg, #059669, #047857)'
                    : 'linear-gradient(135deg, #9ca3af, #6b7280)',
                }}
              >
                <Lock className="h-5 w-5" />
                {isFinalizing ? 'Finalizing...' : 'Finalize Election Results'}
              </Button>
              {!allTiesResolved && (
                <p className="text-sm text-gray-400 mt-2">All ties must be resolved before finalizing results.</p>
              )}
            </div>
          )}

          {/* Finalize Confirmation Dialog */}
          <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-600" />
                  Finalize Election Results
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently lock the election results. Once finalized, the results cannot be changed without administrator authorization.
                  <br /><br />
                  <strong>This action will:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Lock all vote counts from further changes</li>
                    <li>Record your name and the current date/time</li>
                    <li>Enable the "Generate Official Results" function</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleFinalizeResults}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Yes, Finalize Results
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>

      <Footer />
    </div>
  );
}
