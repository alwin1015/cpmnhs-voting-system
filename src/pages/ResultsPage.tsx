import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  Check,
  Save,
  Edit2,
  X
} from 'lucide-react';
import { OfficialResultsSheet } from '@/components/OfficialResultsSheet';
import type { TieResolution, VoteVerification } from '@/types/voting';
import { useToast } from '@/hooks/use-toast';

export default function ResultsPage() {
  const { election, getResults, candidates, user, isLoggedIn, sessions, activeSessionId, switchSession, updateElection } = useVoting();
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [showPrintReport, setShowPrintReport] = useState(false);
  const [tieResolutions, setTieResolutions] = useState<TieResolution[]>([]);
  const [verifications, setVerifications] = useState<VoteVerification[]>([]);

  const [showCommitteeForm, setShowCommitteeForm] = useState(false);
  const [committeeChairperson, setCommitteeChairperson] = useState('');
  const [committeeCoChairperson, setCommitteeCoChairperson] = useState('');
  const [committeeMember, setCommitteeMember] = useState('');
  const [committeeOfficer, setCommitteeOfficer] = useState('');
  const [committeePrincipal, setCommitteePrincipal] = useState('');
  const [isSavingCommittee, setIsSavingCommittee] = useState(false);

  // Load existing committee data from election signatories
  useEffect(() => {
    if (election?.signatories) {
      setCommitteeChairperson(election.signatories.chairperson?.name || '');
      setCommitteeCoChairperson(election.signatories.coChairperson?.name || '');
      setCommitteeMember(election.signatories.member?.name || '');
      setCommitteeOfficer(election.signatories.preparedBy?.name || '');
      setCommitteePrincipal(election.signatories.approvedBy?.name || '');
    }
  }, [election?.signatories]);

  const handleSaveCommittee = useCallback(async () => {
    setIsSavingCommittee(true);
    try {
      const signatories = {
        ...(election?.signatories || {}),
        chairperson: { name: committeeChairperson.toUpperCase(), position: 'Chairperson' },
        coChairperson: { name: committeeCoChairperson.toUpperCase(), position: 'Co-Chairperson' },
        member: { name: committeeMember.toUpperCase(), position: 'Member' },
        preparedBy: { name: committeeOfficer.toUpperCase(), position: 'School Election Officer' },
        approvedBy: { name: committeePrincipal.toUpperCase(), position: 'School Principal' },
      };
      await updateElection({ signatories });
      setShowCommitteeForm(false);
      toast({
        title: 'Election Committee Saved',
        description: 'Committee information has been saved successfully.',
      });
    } catch (error) {
      console.error('Failed to save committee:', error);
      toast({
        title: 'Error',
        description: 'Failed to save committee information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCommittee(false);
    }
  }, [election?.signatories, committeeChairperson, committeeCoChairperson, committeeMember, committeeOfficer, committeePrincipal, updateElection, toast]);

  const handlePrintWithValidation = useCallback(() => {
    const officerName = election?.signatories?.preparedBy?.name?.trim();
    const principalName = election?.signatories?.approvedBy?.name?.trim();
    if (!officerName || !principalName) {
      toast({
        title: 'INCOMPLETE ELECTION COMMITTEE',
        description: 'PLEASE COMPLETE THE ELECTION COMMITTEE INFORMATION BEFORE PRINTING THE FINAL RESULTS.',
        variant: 'destructive',
      });
      return;
    }
    setShowPrintReport(true);
  }, [election?.signatories, toast]);

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
    ? Math.round(((election.totalVoted || 0) / election.totalVoters) * 100)
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
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <Printer className="h-4 w-4" /> Print Final Results
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <OfficialResultsSheet ref={printRef} tieResolutions={tieResolutions} />
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
              {/* Session Selector */}
              <div className="relative mr-2">
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => switchSession(e.target.value)}
                  className="w-full sm:w-[200px] appearance-none bg-white border border-slate-200 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <option value="" disabled>Select a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.schoolYear})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              {election?.resultsFinalized && (
                <Button
                  onClick={handlePrintWithValidation}
                  size="sm"
                  className="h-9 gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  Print Final Results
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

          {/* Election Committee Information */}
          {isAdmin && election?.resultsFinalized && (
            <div className="mb-6">
              <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-bold text-slate-800">Election Committee Information</h3>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCommitteeForm(!showCommitteeForm)}
                      className="h-8 gap-1.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      {showCommitteeForm ? <X className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
                      {showCommitteeForm ? 'Cancel' : (election?.signatories?.preparedBy?.name ? 'Edit Committee' : 'Set Up Committee')}
                    </Button>
                  </div>

                  {showCommitteeForm ? (
                    <div className="p-5 space-y-4">
                      <p className="text-xs text-slate-500">Enter the names of the Election Committee members. All names will be automatically converted to UPPERCASE.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Chairperson</label>
                          <input
                            type="text"
                            value={committeeChairperson}
                            onChange={(e) => setCommitteeChairperson(e.target.value)}
                            placeholder="Enter chairperson name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Chairperson</label>
                          <input
                            type="text"
                            value={committeeCoChairperson}
                            onChange={(e) => setCommitteeCoChairperson(e.target.value)}
                            placeholder="Enter co-chairperson name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Member</label>
                          <input
                            type="text"
                            value={committeeMember}
                            onChange={(e) => setCommitteeMember(e.target.value)}
                            placeholder="Enter member name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            School Election Officer <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={committeeOfficer}
                            onChange={(e) => setCommitteeOfficer(e.target.value)}
                            placeholder="Enter school election officer name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            School Principal <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={committeePrincipal}
                            onChange={(e) => setCommitteePrincipal(e.target.value)}
                            placeholder="Enter school principal name"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={handleSaveCommittee}
                          disabled={isSavingCommittee}
                          size="sm"
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                        >
                          <Save className="h-4 w-4" />
                          {isSavingCommittee ? 'Saving...' : 'Save / Confirm Election Committee'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      {election?.signatories?.preparedBy?.name ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Chairperson</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{election?.signatories?.chairperson?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Co-Chairperson</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{election?.signatories?.coChairperson?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">Member</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{election?.signatories?.member?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">School Election Officer</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{election?.signatories?.preparedBy?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-medium">School Principal</p>
                            <p className="text-xs font-bold text-slate-800 uppercase">{election?.signatories?.approvedBy?.name || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic text-center">No committee information set. Click "Set Up Committee" to enter names.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                  Resolve Ties in Audit & Verification <FileText className="h-3.5 w-3.5 ml-1" />
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
      </main>

      <Footer />
    </div>
  );
}
