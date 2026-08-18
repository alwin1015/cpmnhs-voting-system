import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  BarChart3,
  Trophy,
  Users,
  Vote,
  TrendingUp,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
  Printer,
  ArrowLeft,
  AlertTriangle,
  Award,
  Check
} from 'lucide-react';
import schoolLogo from '@/assets/school-logo.png';
import type { TieResolution, VoteVerification } from '@/types/voting';

export default function ResultsPage() {
  const { election, getResults, candidates, positions, user, isLoggedIn, finalizeResults } = useVoting();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [tieResolutions, setTieResolutions] = useState<TieResolution[]>([]);
  const [verifications, setVerifications] = useState<VoteVerification[]>([]);

  const results = getResults();
  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Load tie resolutions & verifications
  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        api.getTieResolutions().catch(() => []),
        api.getVerifications().catch(() => []),
      ]).then(([tData, vData]) => {
        if (Array.isArray(tData)) {
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
        }
        if (Array.isArray(vData)) {
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
        }
      });
    }
  }, [isAdmin]);

  // Total votes & Turnout calculation
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const turnoutPercent = election && election.totalVoters > 0
    ? Math.round((election.totalVoted / election.totalVoters) * 100)
    : 0;

  // Detect unresolved ties
  const detectedTies = useMemo(() => {
    const tiesList: { positionId: string; positionName: string; topVotes: number }[] = [];
    results.forEach(({ position, candidates: posCandidates }) => {
      if (posCandidates.length >= 2) {
        const topVote = posCandidates[0].votes;
        const secondVote = posCandidates[1].votes;
        if (topVote > 0 && topVote === secondVote) {
          // Check if resolved
          const isResolved = tieResolutions.some((r) => r.positionId === position.id);
          if (!isResolved) {
            tiesList.push({
              positionId: position.id,
              positionName: position.name,
              topVotes: topVote,
            });
          }
        }
      }
    });
    return tiesList;
  }, [results, tieResolutions]);

  const hasUnresolvedTies = detectedTies.length > 0;

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await finalizeResults();
      toast({
        title: 'Results Locked & Finalized',
        description: 'Election results are now officially finalized and ready for printing.',
      });
      setShowFinalizeDialog(false);
    } catch (error: any) {
      toast({
        title: 'Finalization Failed',
        description: error.message || 'Could not finalize election results.',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Results Restricted</h2>
              <p className="text-sm text-gray-500 mb-6">
                The live election results tally is restricted to administrators.
              </p>
              <Link to="/">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 text-sm">
                  Return Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Format date helper
  const formatDateTime = (d?: Date | null) => {
    if (!d || isNaN(new Date(d).getTime())) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ==========================================
  // OFFICIAL PRINTABLE RESULTS VIEW
  // ==========================================
  if (showPrintReport) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans">
        {/* Screen Controls Header (Hidden during Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrintReport(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              Official Printable Report Preview
            </span>
          </div>

          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print Final Results
          </Button>
        </div>

        {/* Printable Document Sheet */}
        <div ref={printRef} className="max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:max-w-none text-slate-900">
          
          {/* DepEd & School Formal Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-6 relative">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img
                src={schoolLogo}
                alt="CPMNHS Official Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-full border border-slate-200 shadow-xs"
              />
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider text-slate-600 font-medium">Republic of the Philippines</p>
                <p className="text-xs uppercase tracking-wider text-slate-600 font-medium">Department of Education</p>
                <p className="text-xs text-slate-600">Region VII, Central Visayas • Division of Bohol</p>
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                  CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL
                </h1>
                <p className="text-xs text-slate-600">Cabad, Balilihan, Bohol</p>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-300">
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900">
                OFFICIAL ELECTION RESULTS & CERTIFICATE OF CANVASS
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
                {election?.name || 'Supreme Secondary Learner Government (SSLG) General Election'} • S.Y. {election?.schoolYear || '2026-2027'}
              </p>
            </div>
          </div>

          {/* Canvass Metadata Summary Box */}
          <div className="border border-slate-300 rounded-lg p-3.5 mb-6 bg-slate-50/50 text-xs sm:text-sm grid grid-cols-2 sm:grid-cols-4 gap-3 print:bg-transparent">
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">Election Period</span>
              <strong className="text-slate-900">
                {election?.startDate ? new Date(election.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                {' — '}
                {election?.endDate ? new Date(election.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">Registered Voters</span>
              <strong className="text-slate-900">{election?.totalVoters?.toLocaleString() || '0'} students</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">Ballots Cast</span>
              <strong className="text-slate-900">{election?.totalVoted?.toLocaleString() || '0'} ({turnoutPercent}% turnout)</strong>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-semibold">Status & Canvass Date</span>
              <strong className="text-emerald-700 font-bold">
                {election?.resultsFinalized ? 'OFFICIAL & FINALIZED' : 'PROVISIONAL TALLY'}
              </strong>
              {election?.finalizedAt && (
                <span className="block text-[10px] text-slate-500">
                  {formatDateTime(election.finalizedAt)}
                </span>
              )}
            </div>
          </div>

          {/* Complete Final Results by Position */}
          <div className="space-y-6 mb-8">
            {results.map(({ position, candidates: posCandidates }, posIdx) => {
              const posTotalVotes = posCandidates.reduce((sum, c) => sum + c.votes, 0);
              const tieRes = tieResolutions.find((t) => t.positionId === position.id);

              return (
                <div key={position.id} className="border border-slate-300 rounded-lg overflow-hidden break-inside-avoid">
                  {/* Position Title Bar */}
                  <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                        {posIdx + 1}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 uppercase">
                        {position.name}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      Total Votes: {posTotalVotes.toLocaleString()} (Max Votes Allowed: {position.maxVotes})
                    </span>
                  </div>

                  {/* Table of Candidates */}
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                        <th className="py-2 px-3 w-12 text-center">Rank</th>
                        <th className="py-2 px-3">Candidate Name</th>
                        <th className="py-2 px-3">Party Affiliation</th>
                        <th className="py-2 px-3">Grade & Section</th>
                        <th className="py-2 px-3 text-right">Votes</th>
                        <th className="py-2 px-3 text-right">Percentage</th>
                        <th className="py-2 px-3 text-center w-36">Result Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {posCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-slate-400 italic">
                            No candidates registered for this position.
                          </td>
                        </tr>
                      ) : (
                        posCandidates.map((candidate, idx) => {
                          const percentage = posTotalVotes > 0 ? Math.round((candidate.votes / posTotalVotes) * 100) : 0;
                          const isWinner = idx === 0 && candidate.votes > 0 && (!detectedTies.some(t => t.positionId === position.id) || tieRes?.selectedWinnerId === candidate.id);
                          const isVerifiedWinner = tieRes?.selectedWinnerId === candidate.id;
                          const isTied = detectedTies.some(t => t.positionId === position.id) && candidate.votes === posCandidates[0].votes;

                          return (
                            <tr key={candidate.id} className={isWinner ? 'bg-emerald-50/40 font-semibold' : ''}>
                              <td className="py-2 px-3 text-center font-mono text-xs text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {candidate.name}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {candidate.party || 'Independent'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-xs">
                                Grade {candidate.gradeLevel || '—'} {candidate.section ? `• ${candidate.section}` : ''}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                {candidate.votes.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 text-xs">
                                {percentage}%
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isVerifiedWinner ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ELECTED (Verified)
                                  </span>
                                ) : isWinner ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ELECTED
                                  </span>
                                ) : isTied ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    TIED
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Tie Resolution audit info note if applicable */}
                  {tieRes && (
                    <div className="px-4 py-1.5 bg-blue-50/60 border-t border-blue-200 text-[11px] text-blue-900">
                      <strong>Tie Resolution Canvass:</strong> Winner resolved by {tieRes.resolvedBy} on {formatDateTime(tieRes.resolvedAt)}. Reason: {tieRes.reason || 'Official Tie Breaking procedure'}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Formal DepEd Verification & Signatures Section */}
          <div className="border-t-2 border-slate-900 pt-6 mt-8 break-inside-avoid">
            <p className="text-xs text-slate-700 italic mb-8 leading-relaxed text-center">
              We, the undersigned members of the Board of Canvassers and Election Committee, hereby certify that the foregoing results were accurately counted, canvassed, and verified in accordance with the official Supreme Secondary Learner Government (SSLG) election guidelines.
            </p>

            <div className="grid grid-cols-3 gap-6 text-center text-xs sm:text-sm">
              {/* Election Administrator */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b-2 border-slate-900 mb-1.5 pb-6">
                  <span className="font-bold uppercase text-slate-900 block text-xs">
                    {election?.finalizedBy || user?.name || 'Administrator'}
                  </span>
                </div>
                <span className="font-semibold text-slate-800 text-xs">ELECTION ADMINISTRATOR</span>
                <span className="text-[10px] text-slate-500">CPMNHS SSLG COMELEC</span>
              </div>

              {/* SSLG Adviser */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b-2 border-slate-900 mb-1.5 pb-6">
                  <span className="font-bold uppercase text-slate-900 block text-xs">
                    SSLG ADVISER / DESIGNEE
                  </span>
                </div>
                <span className="font-semibold text-slate-800 text-xs">COMELEC ADVISER</span>
                <span className="text-[10px] text-slate-500">Committee Member</span>
              </div>

              {/* School Principal */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b-2 border-slate-900 mb-1.5 pb-6">
                  <span className="font-bold uppercase text-slate-900 block text-xs">
                    SCHOOL PRINCIPAL
                  </span>
                </div>
                <span className="font-semibold text-slate-800 text-xs">SCHOOL PRINCIPAL</span>
                <span className="text-[10px] text-slate-500">Congressman Pablo Malasarte NHS</span>
              </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
              <p>CPMNHS iVote Electronic Voting System • Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="mt-0.5">This document serves as the official and final election canvass report.</p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN RESULTS SCREEN VIEW
  // ==========================================
  const stats = [
    {
      title: 'Registered Voters',
      value: election?.totalVoters?.toLocaleString() || '0',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Ballots Cast',
      value: election?.totalVoted?.toLocaleString() || '0',
      icon: Vote,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Total Votes Counted',
      value: totalVotes.toLocaleString(),
      icon: BarChart3,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
    },
    {
      title: 'Voter Turnout',
      value: `${turnoutPercent}%`,
      icon: TrendingUp,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Election Results
                </h1>
                {election?.resultsFinalized ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    Finalized & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Live Tally
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {election?.name || 'SSG General Election'} • S.Y. {election?.schoolYear || '2026-2027'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {election?.resultsFinalized ? (
                <Button
                  onClick={() => setShowPrintReport(true)}
                  size="sm"
                  className="h-9 gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  Print Final Results
                </Button>
              ) : (
                <Button
                  onClick={() => setShowFinalizeDialog(true)}
                  disabled={hasUnresolvedTies || isFinalizing}
                  size="sm"
                  className={`h-9 gap-1.5 text-xs sm:text-sm text-white font-semibold shadow-sm rounded-xl ${
                    hasUnresolvedTies
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  {isFinalizing ? 'Finalizing...' : 'Finalize Election Result'}
                </Button>
              )}

              <Link to="/election-report">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs sm:text-sm border-slate-200 text-slate-700 hover:bg-slate-100 font-medium rounded-xl"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  Audit & Verification
                </Button>
              </Link>
            </div>
          </div>

          {/* Finalized Banner */}
          {election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/90 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Election Results are Officially Locked & Finalized</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Finalized by <strong>{election.finalizedBy || 'Administrator'}</strong> on {formatDateTime(election.finalizedAt)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unresolved Tie Alert Banner */}
          {hasUnresolvedTies && !election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Tie Detected in {detectedTies.length} Position{detectedTies.length > 1 ? 's' : ''}</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {detectedTies.map((t) => t.positionName).join(', ')} require verification before finalization.
                  </p>
                </div>
              </div>
              <Link to="/election-report">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1 self-start sm:self-auto rounded-lg shadow-xs"
                >
                  Resolve Ties <FileText className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="border border-slate-200/80 shadow-xs bg-white rounded-lg"
              >
                <CardContent className="p-3 sm:p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{stat.title}</span>
                    <div className={`p-1.5 rounded-md ${stat.iconBg}`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none tracking-tight">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Position Results Grid */}
          <div className="space-y-4">
            {results.map(({ position, candidates: positionCandidates }, positionIndex) => {
              const positionTotalVotes = positionCandidates.reduce((sum, c) => sum + c.votes, 0);
              const topVoteCount = positionCandidates[0]?.votes || 0;
              const hasTieAtTop =
                positionCandidates.length > 1 &&
                topVoteCount > 0 &&
                positionCandidates[1]?.votes === topVoteCount;
              const tieRes = tieResolutions.find((t) => t.positionId === position.id);

              return (
                <Card
                  key={position.id}
                  className="border border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden"
                >
                  {/* Position Card Header */}
                  <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {positionIndex + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {position.name}
                      </h3>
                      {hasTieAtTop && !tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          Tie for 1st
                        </span>
                      )}
                      {tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="h-3 w-3" />
                          Tie Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/70">
                      {positionTotalVotes.toLocaleString()} votes cast
                    </span>
                  </div>

                  {/* Candidate List */}
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {positionCandidates.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center italic">
                        No candidates registered for this position.
                      </p>
                    ) : (
                      positionCandidates.map((candidate, index) => {
                        const percentage = positionTotalVotes > 0
                          ? Math.round((candidate.votes / positionTotalVotes) * 100)
                          : 0;
                        const isLeading = index === 0 && candidate.votes > 0 && (!hasTieAtTop || tieRes?.selectedWinnerId === candidate.id);
                        const isTiedLead = (index === 0 || candidate.votes === topVoteCount) && topVoteCount > 0 && hasTieAtTop && !tieRes;

                        return (
                          <div key={candidate.id} className="space-y-1.5">
                            {/* Candidate Info Line */}
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {isLeading && (
                                  <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                {isTiedLead && (
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                {!isLeading && !isTiedLead && (
                                  <span className="w-3.5 text-center text-xs text-slate-400 font-medium">
                                    {index + 1}
                                  </span>
                                )}
                                <span className={`truncate ${isLeading ? 'text-blue-700 font-bold' : 'text-slate-800 font-medium'}`}>
                                  {candidate.name}
                                </span>
                                {candidate.party && (
                                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                                    ({candidate.party})
                                  </span>
                                )}
                                {candidate.gradeLevel && (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded hidden md:inline">
                                    Gr. {candidate.gradeLevel}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {candidate.votes.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  isLeading
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                    : isTiedLead
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </div>

        {/* Finalize Confirmation Dialog */}
        <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-emerald-700">
                <Lock className="h-5 w-5" />
                Finalize & Lock Election Results?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will officially lock the vote tallies and declare the election winners.
                <br /><br />
                <strong>Once finalized:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-slate-600">
                  <li>Vote counting is officially concluded.</li>
                  <li>Your administrator name and timestamp will be recorded.</li>
                  <li>The formal <strong>Print Final Results</strong> certificate will be permanently generated.</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isFinalizing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleFinalize();
                }}
                disabled={isFinalizing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isFinalizing ? 'Finalizing...' : 'Yes, Finalize & Lock Results'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <Footer />
    </div>
  );
}
