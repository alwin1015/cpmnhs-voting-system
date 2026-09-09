import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { TieResolution } from '@/types/voting';
import cpmnhsLogo from '@/assets/cpmnhs-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import sslgLogo from '@/assets/sslg-logo.png';
import {
  History, ArrowLeft, Search, Filter, Calendar, Users, CheckCircle2, Trophy,
  Printer, Eye, Clock, Award, AlertCircle, Lock, BarChart3, ChevronDown, Loader2
} from 'lucide-react';

interface HistorySession {
  id: string;
  name: string;
  schoolYear: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  resultsFinalized: boolean;
  finalizedBy?: string;
  finalizedAt?: Date | null;
  totalVoters?: number;
  totalVoted?: number;
  signatories?: any;
}

interface HistoryDetailData {
  session: any;
  candidates: any[];
  positions: any[];
  voterSessions: any[];
  tieResolutions: any[];
  verifications: any[];
  totalVoters: number;
  totalVoted: number;
}

function parseHistorySession(s: any): HistorySession {
  if (!s) {
    return {
      id: '',
      name: 'Untitled Election',
      schoolYear: '2026-2027',
      startDate: null,
      endDate: null,
      status: 'completed',
      resultsFinalized: false,
      finalizedBy: null,
      finalizedAt: null,
      totalVoters: 0,
      totalVoted: 0,
      signatories: {},
    };
  }
  let parsedSignatories = {};
  if (s.signatories) {
    try {
      parsedSignatories = typeof s.signatories === 'string' ? JSON.parse(s.signatories) : s.signatories;
    } catch (_) {
      parsedSignatories = {};
    }
  }
  return {
    id: String(s.id || ''),
    name: s.name || 'Untitled Election',
    schoolYear: s.school_year || '2026-2027',
    startDate: s.start_date ? new Date(s.start_date) : null,
    endDate: s.end_date ? new Date(s.end_date) : null,
    status: s.status || 'completed',
    resultsFinalized: Boolean(s.results_finalized),
    finalizedBy: s.finalized_by || null,
    finalizedAt: s.finalized_at ? new Date(s.finalized_at) : null,
    totalVoters: s.total_voters || 0,
    totalVoted: s.total_voted || 0,
    signatories: parsedSignatories,
  };
}

export default function ElectionHistoryPage() {
  const { user, isLoggedIn } = useVoting();
  const { toast } = useToast();

  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'finalized'>('all');

  // Detail view state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<HistoryDetailData | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Load history sessions
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getElectionHistory();
      setHistorySessions(data.map(parseHistorySession));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load election history.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadHistory();
  }, [isAdmin, loadHistory]);

  // Load detail for selected session
  const loadDetail = useCallback(async (sessionId: string) => {
    setLoadingSessionId(sessionId);
    try {
      const data = await api.getElectionHistoryDetail(sessionId);
      if (!data || !data.session) {
        throw new Error('Election data could not be retrieved.');
      }
      setDetailData(data);
      setSelectedSessionId(sessionId);
    } catch (error: any) {
      console.error('Failed to load election details:', error);
      toast({ 
        title: 'Unable to Load Results', 
        description: error.message || 'Failed to load election details. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setLoadingSessionId(null);
    }
  }, [toast]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return historySessions.filter(s => {
      const matchesSearch = searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.schoolYear.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [historySessions, searchQuery, statusFilter]);

  // Format date helper
  const formatDate = (d?: Date | null) => {
    if (!d || isNaN(new Date(d).getTime())) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (d?: Date | null) => {
    if (!d || isNaN(new Date(d).getTime())) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 bg-white border border-slate-200 shadow-lg rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-sm text-slate-500 mb-6">
                Election History is restricted to administrators.
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

  // ========== PRINT VIEW ==========
  if (showPrintView && detailData) {
    const parsedPositions = (detailData.positions || []).map((p: any) => ({
      id: String(p.id), name: p.name, order: Number(p.display_order ?? 0),
      maxVotes: Number(p.max_votes ?? 1), sessionId: String(p.session_id ?? ''),
    })).sort((a: any, b: any) => a.order - b.order);

    const parsedCandidates = (detailData.candidates || []).map((c: any) => ({
      id: String(c.id), name: c.name, position: String(c.position_id),
      party: c.party ?? '', photo: c.photo_url ?? '', motto: c.motto ?? '',
      gradeLevel: c.grade_level ?? '', section: c.section ?? '',
      votes: Number(c.votes ?? 0), sessionId: String(c.session_id ?? ''),
    }));

    const parsedTieResolutions: TieResolution[] = (detailData.tieResolutions || []).map((t: any) => ({
      id: String(t.id), verificationId: String(t.verification_id),
      positionId: String(t.position_id), selectedWinnerId: String(t.selected_winner_id),
      resolutionMethod: t.resolution_method, resolvedBy: t.resolved_by,
      resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined, reason: t.reason,
    }));

    const histElection = {
      ...parseHistorySession(detailData.session),
      totalVoters: detailData.totalVoters,
      totalVoted: detailData.totalVoted,
    };

    const results = parsedPositions.map((position: any) => ({
      position,
      candidates: parsedCandidates
        .filter((c: any) => c.position === position.id)
        .sort((a: any, b: any) => {
          if (b.votes !== a.votes) return b.votes - a.votes;
          const res = parsedTieResolutions.find(r => r.positionId === position.id);
          if (res) {
            if (res.selectedWinnerId === a.id) return -1;
            if (res.selectedWinnerId === b.id) return 1;
          }
          return 0;
        }),
    }));

    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans">
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="sm"
              onClick={() => setShowPrintView(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to History
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              Historical Election Report — {histElection.name} (S.Y. {histElection.schoolYear})
            </span>
          </div>
          <Button
            onClick={handlePrint} size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print Results
          </Button>
        </div>
        <div className="print-area" ref={printRef}>
          <HistoryResultsSheet
            election={histElection}
            positions={parsedPositions}
            candidates={parsedCandidates}
            results={results}
            tieResolutions={parsedTieResolutions}
          />
        </div>
      </div>
    );
  }

  // ========== DETAIL VIEW ==========
  if (selectedSessionId && detailData) {
    const parsedPositions = (detailData.positions || []).map((p: any) => ({
      id: String(p.id), name: p.name, order: Number(p.display_order ?? 0),
      maxVotes: Number(p.max_votes ?? 1), sessionId: String(p.session_id ?? ''),
    })).sort((a: any, b: any) => a.order - b.order);

    const parsedCandidates = (detailData.candidates || []).map((c: any) => ({
      id: String(c.id), name: c.name, position: String(c.position_id),
      party: c.party ?? '', photo: c.photo_url ?? '', motto: c.motto ?? '',
      gradeLevel: c.grade_level ?? '', section: c.section ?? '',
      votes: Number(c.votes ?? 0), sessionId: String(c.session_id ?? ''),
    }));

    const parsedTieResolutions: TieResolution[] = (detailData.tieResolutions || []).map((t: any) => ({
      id: String(t.id), verificationId: String(t.verification_id),
      positionId: String(t.position_id), selectedWinnerId: String(t.selected_winner_id),
      resolutionMethod: t.resolution_method, resolvedBy: t.resolved_by,
      resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined, reason: t.reason,
    }));

    const histSession = parseHistorySession(detailData.session);
    const turnoutPercent = (detailData.totalVoters || 0) > 0
      ? (((detailData.totalVoted || 0) / detailData.totalVoters) * 100).toFixed(1)
      : '0.0';

    const results = parsedPositions.map((position: any) => ({
      position,
      candidates: parsedCandidates
        .filter((c: any) => c.position === position.id)
        .sort((a: any, b: any) => b.votes - a.votes),
    }));

    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 container mx-auto px-3 sm:px-4 py-5 max-w-5xl">
          {/* Back button */}
          <Button
            variant="ghost" size="sm"
            onClick={() => { setSelectedSessionId(null); setDetailData(null); }}
            className="mb-4 text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Election History
          </Button>

          {/* Election Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{histSession.name}</h1>
                <p className="text-sm text-slate-500 mt-1">School Year {histSession.schoolYear}</p>
              </div>
              <div className="flex items-center gap-2">
                {histSession.resultsFinalized ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <Lock className="h-3 w-3" /> Finalized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="h-3 w-3" /> Completed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Finalized banner */}
          {histSession.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/90 flex items-center gap-3 shadow-xs">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Results Officially Locked & Finalized</h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Finalized by <strong>{histSession.finalizedBy || 'Administrator'}</strong> on {formatDateTime(histSession.finalizedAt)}.
                </p>
              </div>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { title: 'Election Date', value: formatDate(histSession.startDate), icon: Calendar, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
              { title: 'Registered Voters', value: (detailData.totalVoters || 0).toLocaleString(), icon: Users, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
              { title: 'Votes Cast', value: (detailData.totalVoted || 0).toLocaleString(), icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
              { title: 'Voter Turnout', value: `${turnoutPercent}%`, icon: BarChart3, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
            ].map((stat) => (
              <Card key={stat.title} className="border border-slate-200/80 shadow-xs bg-white rounded-xl">
                <CardContent className="p-3 sm:p-4">
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

          {/* Print button */}
          {histSession.resultsFinalized && (
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => setShowPrintView(true)}
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
              >
                <Printer className="h-4 w-4" /> Print Final Results
              </Button>
            </div>
          )}

          {/* Position Results */}
          <div className="space-y-4">
            {results.map(({ position, candidates: posCandidates }, positionIndex) => {
              const positionTotalVotes = posCandidates.reduce((sum: number, c: any) => sum + c.votes, 0);
              const topVoteCount = posCandidates[0]?.votes || 0;
              const hasTieAtTop = posCandidates.length > 1 && topVoteCount > 0 && posCandidates[1]?.votes === topVoteCount;
              const tieRes = parsedTieResolutions.find(t => t.positionId === position.id);

              return (
                <Card key={position.id} className="border border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {positionIndex + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{position.name}</h3>
                      {hasTieAtTop && !tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3 w-3" /> Tie
                        </span>
                      )}
                      {tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Tie Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/70">
                      {positionTotalVotes.toLocaleString()} votes cast
                    </span>
                  </div>

                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {posCandidates.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center italic">No candidates registered for this position.</p>
                    ) : (
                      posCandidates.map((candidate: any, index: number) => {
                        const percentage = positionTotalVotes > 0 ? Math.round((candidate.votes / positionTotalVotes) * 100) : 0;
                        const isLeading = index === 0 && candidate.votes > 0 && (!hasTieAtTop || tieRes?.selectedWinnerId === candidate.id);

                        return (
                          <div key={candidate.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {isLeading ? (
                                  <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                ) : (
                                  <span className="w-3.5 text-center text-xs text-slate-400 font-medium">{index + 1}</span>
                                )}
                                <span className={`truncate ${isLeading ? 'text-blue-700 font-bold' : 'text-slate-800 font-medium'}`}>
                                  {candidate.name}
                                </span>
                                {candidate.party && (
                                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">({candidate.party})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs font-bold tabular-nums ${isLeading ? 'text-blue-700' : 'text-slate-700'}`}>
                                  {candidate.votes.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-slate-400 w-10 text-right">{percentage}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${isLeading ? 'bg-blue-600' : 'bg-slate-300'}`}
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
        </main>
        <Footer />
      </div>
    );
  }

  // ========== LIST VIEW ==========
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 container mx-auto px-3 sm:px-4 py-5 max-w-5xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">Election History</h1>
              <p className="text-xs sm:text-sm text-slate-500">Browse and review past election results</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by election name or school year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="pl-10 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer shadow-xs"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="finalized">Finalized</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-slate-500 font-medium mt-3">Loading election history...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No Past Elections Found</h3>
            <p className="text-sm text-slate-500">
              {searchQuery || statusFilter !== 'all'
                ? 'No elections match your search or filter criteria.'
                : 'Completed or finalized elections will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="border border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Left color accent */}
                    <div className={`w-full sm:w-1.5 h-1.5 sm:h-auto ${session.resultsFinalized ? 'bg-purple-500' : 'bg-amber-500'}`} />

                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{session.name}</h3>
                            {session.resultsFinalized ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Lock className="h-2.5 w-2.5" /> Finalized
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="h-2.5 w-2.5" /> Completed
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> S.Y. {session.schoolYear}
                            </span>
                            {session.startDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatDate(session.startDate)}
                              </span>
                            )}
                          </div>

                          {session.finalizedBy && (
                            <p className="text-[11px] text-slate-400 mt-1.5">
                              Finalized by <strong>{session.finalizedBy}</strong> on {formatDateTime(session.finalizedAt)}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => loadDetail(session.id)}
                            disabled={loadingSessionId !== null}
                            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-xs min-w-[110px]"
                          >
                            {loadingSessionId === session.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                View Results
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ========== SELF-CONTAINED PRINT SHEET FOR HISTORY ==========
// This is a simplified version of OfficialResultsSheet that accepts props
// instead of reading from VotingContext, so it works for historical elections.

function HistoryResultsSheet({ election, positions, candidates, results, tieResolutions }: {
  election: any;
  positions: any[];
  candidates: any[];
  results: { position: any; candidates: any[] }[];
  tieResolutions: TieResolution[];
}) {
  const electionDate = election?.startDate ? new Date(election.startDate) : new Date();
  const electionDateFormatted = electionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const dayWithSuffix = getOrdinal(electionDate.getDate());
  const monthAndYear = electionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const formatTime12 = (d?: Date | null) => {
    if (!d || isNaN(new Date(d).getTime())) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const startTimeStr = election?.startDate ? formatTime12(new Date(election.startDate)) : '7:00 AM';
  const endTimeStr = election?.endDate ? formatTime12(new Date(election.endDate)) : '4:00 PM';
  const electionTimeFormatted = `${startTimeStr} – ${endTimeStr}`;

  const turnoutPercent = election && election.totalVoters && election.totalVoters > 0
    ? (((election.totalVoted || 0) / election.totalVoters) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:max-w-none text-slate-900 bg-white border border-slate-200 shadow-md sm:rounded-xl print:border-0 print:shadow-none">
      {/* Header with 3 Logos */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="w-32 flex-shrink-0 flex justify-center">
            <img src={cpmnhsLogo} alt="CPMNHS Seal" className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-full shadow-xs" />
          </div>
          <div className="flex-1 text-center flex flex-col items-center">
            <div className="flex flex-col items-center leading-none mb-1">
              <img src={depedLogo} alt="DepEd Logo" className="w-36 sm:w-40 object-contain" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-700 font-medium leading-tight">Republic of the Philippines</p>
            <p className="text-[10px] sm:text-xs text-slate-700 font-medium leading-tight">Department of Education</p>
            <p className="text-[10px] sm:text-xs text-slate-700 leading-tight">Region VII – Central Visayas</p>
            <p className="text-[10px] sm:text-xs text-slate-700 leading-tight">Division of Bohol</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-tight">Congressman Pablo Malasarte National High School</p>
            <p className="text-[10px] sm:text-xs text-slate-600 leading-tight">Cabad, Balilihan, Bohol</p>
          </div>
          <div className="w-32 flex-shrink-0 flex justify-center">
            <img src={sslgLogo} alt="SSLG Seal" className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-full shadow-xs" />
          </div>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center space-y-0.5 mb-4">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-widest text-slate-900">PRINT RESULTS</h1>
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800">SCHOOL ELECTION</h2>
        <h3 className="text-xs sm:text-sm font-bold text-slate-800">SCHOOL YEAR {election?.schoolYear || '2025-2026'}</h3>
      </div>

      {/* Metadata */}
      <div className="text-[11px] sm:text-xs text-slate-800 space-y-1 mb-5 bg-slate-50 border border-slate-200 rounded-lg p-3">
        {[
          ['Election Title', election?.name],
          ['Date of Election', electionDateFormatted],
          ['Voting Time', electionTimeFormatted],
          ['Venue', 'Congressman Pablo Malasarte National High School'],
          ['Total Registered Voters', election?.totalVoters?.toLocaleString() || '0'],
          ['Total Votes Cast', election?.totalVoted?.toLocaleString() || '0'],
          ['Voter Turnout', `${turnoutPercent}%`],
        ].map(([label, value]) => (
          <div key={label as string} className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">{label}</span>
            <span>:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {/* Official Results Table */}
      <div className="mb-5">
        <h3 className="text-center font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-2">OFFICIAL RESULTS</h3>
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
            {results.map(({ position, candidates: posCandidates }) => {
              if (posCandidates.length === 0) {
                return (
                  <tr key={position.id} className="border-b border-slate-900">
                    <td className="py-2 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle">
                      {position.name}
                    </td>
                    <td colSpan={3} className="py-2 px-3 text-center text-slate-400 italic">No candidates registered</td>
                  </tr>
                );
              }
              return posCandidates.map((candidate: any, idx: number) => (
                <tr key={candidate.id} className={`border-b ${idx === posCandidates.length - 1 ? 'border-b-slate-900' : 'border-b-slate-300'}`}>
                  {idx === 0 && (
                    <td rowSpan={posCandidates.length} className="py-2.5 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle">
                      {position.name}
                    </td>
                  )}
                  <td className="py-2 px-3 uppercase text-slate-900 border-r border-slate-900 font-medium">{candidate.name}</td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-900 font-mono">{candidate.votes.toLocaleString()}</td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900">{idx + 1}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      {/* Certification */}
      <div className="space-y-5 pt-2 break-inside-avoid text-xs sm:text-sm">
        <div className="space-y-1.5 text-slate-800 leading-relaxed text-justify sm:text-center text-[11px] sm:text-xs">
          <p>We, the undersigned, hereby certify that the above results are true, correct, and officially tallied based on the votes cast during the SSLG Election held on {electionDateFormatted}.</p>
          <p>Certified this {dayWithSuffix} day of {monthAndYear} at Congressman Pablo Malasarte National High School, Cabad, Balilihan, Bohol.</p>
        </div>

        {/* Election Committee */}
        <div className="pt-2">
          <h4 className="font-bold uppercase text-slate-900 text-center text-xs tracking-wider mb-8">ELECTION COMMITTEE</h4>
          <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center">
            {['chairperson', 'coChairperson', 'member'].map((role) => (
              <div key={role} className="flex flex-col items-center">
                <div className="w-full border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-[11px] sm:text-xs block">
                    {election?.signatories?.[role]?.name?.toUpperCase() || '\u00A0'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                  {role === 'chairperson' ? 'Chairperson' : role === 'coChairperson' ? 'Co-Chairperson' : 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Prepared / Approved */}
        <div className="grid grid-cols-2 gap-8 sm:gap-12 pt-6">
          {[
            { key: 'preparedBy', label: 'Certified Correct:', sublabel: 'School Election Officer' },
            { key: 'approvedBy', label: 'Noted by:', sublabel: 'School Principal' },
          ].map(({ key, label, sublabel }) => (
            <div key={key} className="text-center">
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium mb-6">{label}</p>
              <div className="border-b border-slate-900 mb-1 mx-auto max-w-[200px]">
                <span className="font-bold uppercase text-slate-900 text-[11px] sm:text-xs block">
                  {election?.signatories?.[key]?.name?.toUpperCase() || '\u00A0'}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">{sublabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-3 border-t border-slate-200 print:mt-6">
        <p className="text-[9px] sm:text-[10px] text-slate-400 text-center">
          This document was electronically generated by the CPMNHS iVote Online Voting System. Historical Record — Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      </div>
    </div>
  );
}
