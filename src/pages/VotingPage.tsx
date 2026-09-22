import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CandidateCard } from '@/components/CandidateCard';
import { Button } from '@/components/ui/button';
import { useVoting } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Vote, CheckCircle, CheckCircle2, ArrowRight, ArrowLeft, Send, Clock, User, Check, Sparkles } from 'lucide-react';
import { isEligibleForSession, formatSessionEligibility } from '@/lib/electionRules';
import type { VotingSession } from '@/types/voting';

export default function VotingPage() {
  const {
    candidates,
    positions,
    votes,
    setVote,
    submitVotes,
    hasVoted,
    isLoggedIn,
    user,
    election,
    logout,
    sessions,
    activeSessionId,
    switchSession,
    voters,
    isInitializing,
    isDataLoaded,
    dataError,
    refreshData,
    votedSessionIds,
    checkVoterSessionStatuses,
  } = useVoting();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-select an active session the voter is eligible for, prioritizing sessions they haven't voted in yet
  useEffect(() => {
    if (user?.role === 'voter' && sessions.length > 0) {
      const eligibleActives = sessions.filter(
        (s) => s.isActive && s.status === 'active' && isEligibleForSession(s, user)
      );

      if (eligibleActives.length > 0) {
        // Prioritize unvoted session
        const unvoted = eligibleActives.find((s) => !votedSessionIds.includes(s.id));
        if (unvoted && unvoted.id !== activeSessionId) {
          switchSession(unvoted.id);
        } else if (!unvoted && !eligibleActives.some((s) => s.id === activeSessionId)) {
          // If all completed, select the first eligible session so they view the completion summary
          switchSession(eligibleActives[0].id);
        }
      }
    }
  }, [user, sessions, votedSessionIds, activeSessionId, switchSession]);

  // Redirect if not logged in or not a voter
  if (!isLoggedIn || user?.role !== 'voter') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-lg rounded-2xl">
            <CardContent className="pt-4 sm:pt-6">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Vote className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">Login Required</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Please login with your student credentials to cast your ballot.
              </p>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-semibold"
              >
                Go to Student Login
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentVoter = user ? voters.find(v => v.id === user.id) : null;
  if (currentVoter && (currentVoter.status === 'graduated' || currentVoter.status === 'inactive')) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-lg rounded-2xl">
            <CardContent className="pt-4 sm:pt-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <User className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">Alumni / Inactive</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                Your account is marked as {currentVoter.status === 'graduated' ? 'Graduated (Alumni)' : 'Inactive'}. Thank you for your past participation, but you are not eligible to vote in current elections.
              </p>
              <Button 
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-semibold"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 bg-white">
          <CardContent className="pt-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Election Data Unavailable</h2>
            <p className="text-sm text-slate-600 mb-5">{dataError}</p>
            <Button onClick={() => void refreshData()} className="w-full">Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wait for initial data load to accurately check hasVoted state before rendering ballot
  if (isInitializing || !isDataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-slate-500 font-medium">Checking your voting status...</p>
        </div>
      </div>
    );
  }

  // Check multi-session status for the voter
  const eligibleActiveSessions = sessions.filter(
    (s) => s.isActive && s.status === 'active' && isEligibleForSession(s, user)
  );

  const remainingSessions = eligibleActiveSessions.filter(
    (s) => s.id !== activeSessionId && !votedSessionIds.includes(s.id)
  );

  const nextAvailableSession = remainingSessions[0] || null;

  const handleProceedToNextSession = (sessionToOpen: VotingSession) => {
    setJustVoted(false);
    setCurrentPositionIndex(0);
    switchSession(sessionToOpen.id);
  };

  // Show thank you / confirmation page if voted in this session
  if (hasVoted) {
    // If there is another active session assigned to this student that they haven't voted in yet
    if (nextAvailableSession) {
      return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
          <Header />
          <main className="flex-1 flex items-center justify-center p-4">
            <Card className="max-w-lg w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-2xl rounded-3xl animate-scale-in">
              <CardContent className="pt-2 sm:pt-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <CheckCircle className="h-8 w-8 stroke-[2.5]" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Check className="h-3 w-3 stroke-[3]" />
                  {justVoted ? 'Vote Submitted Successfully' : 'Session Already Voted'}
                </div>

                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
                  {election?.name || 'Election Session Completed'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                  Thank you, <strong>{user?.name}</strong>! Your official ballot has been securely counted and recorded.
                </p>

                {/* Next Available Session Card Prompt */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200/80 text-left mb-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                      <Vote className="h-3 w-3" />
                      Next Election Available
                    </span>
                    <span className="text-[11px] font-semibold text-blue-900/60">
                      S.Y. {nextAvailableSession.schoolYear || '2026-2027'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {nextAvailableSession.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Assigned to: <span className="font-semibold text-blue-800">{formatSessionEligibility(nextAvailableSession)}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-blue-200/60">
                    You are also authorized to vote in this session. Proceed now to cast your ballot.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <Button
                    onClick={() => handleProceedToNextSession(nextAvailableSession)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 text-sm font-bold shadow-md shadow-blue-600/20 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Proceed to {nextAvailableSession.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/')}
                      className="rounded-xl border-slate-200 text-slate-700 h-10 text-xs font-semibold"
                    >
                      Return Home
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="rounded-xl text-slate-500 hover:text-slate-800 h-10 text-xs font-semibold"
                    >
                      Log Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </main>
          <Footer />
        </div>
      );
    }

    // Otherwise, all assigned sessions have been completed!
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/20">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-2xl rounded-3xl animate-scale-in">
            <CardContent className="pt-2 sm:pt-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <CheckCircle className="h-8 w-8 stroke-[2.5]" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2">
                <Check className="h-3 w-3 stroke-[3]" />
                All Sessions Completed
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
                Thank You for Voting!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed">
                Great job, <strong>{user?.name}</strong>! You have completed all voting sessions assigned to your grade level and section.
              </p>

              {/* Completed Sessions Checklist */}
              {eligibleActiveSessions.length > 0 && (
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left mb-6">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Completed Ballots ({eligibleActiveSessions.length})
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {eligibleActiveSessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs"
                      >
                        <span className="font-semibold text-slate-800 truncate mr-2">{s.name}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md flex-shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                          Voted
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 text-sm font-semibold shadow-xs"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                >
                  Log Out
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 rounded-xl h-10 text-xs font-medium"
                  onClick={() => navigate('/')}
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }


  // Check if there is an active voting session
  const activeSessions = sessions.filter(s => s.isActive && s.status === 'active');
  if (activeSessions.length === 0 || !election || !election.isActive) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-lg rounded-2xl">
            <CardContent className="pt-4 sm:pt-6">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">No Active Voting Session</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                There is currently no election session open for voting. Sessions are launched in sequence by the election administrator.
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full rounded-xl h-11 text-sm font-medium"
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

  // Strict Validation: Only students whose grade level and section are assigned to this session can vote
  const isAssigned = isEligibleForSession(election, user);
  if (!isAssigned) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 sm:p-8 bg-white border border-slate-200/80 shadow-xl rounded-3xl animate-scale-in">
            <CardContent className="pt-2 sm:pt-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-5 shadow-xs">
                <Clock className="h-8 w-8 stroke-[2.2]" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1" />
                Session In Progress
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
                Waiting for Your Grade Level's Session
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                Voting is currently open for another session. Each grade level votes in sequence. Your official ballot will automatically become available when your session is launched.
              </p>

              {/* Session details vs Student profile */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left mb-6 text-xs sm:text-sm">
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Active Session:</span>
                  <span className="font-bold text-slate-800 text-right">{election.name}</span>
                </div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Assigned To:</span>
                  <span className="font-semibold text-blue-700 text-right">{formatSessionEligibility(election)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 font-medium">Your Profile:</span>
                  <span className="font-semibold text-slate-700 text-right">
                    Grade {user?.gradeLevel || 'N/A'} — Section {user?.section || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live connection active. Auto-refreshes when your session launches.</span>
              </div>

              <Button 
                onClick={() => navigate('/')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 text-sm font-semibold shadow-xs"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Helper to extract grade number from a Representative position name (e.g. "Grade 8 Representative" -> "8")
  const getRepresentativeGrade = (posName: string): string | null => {
    if (!/representative|rep\b/i.test(posName)) return null;
    const m = posName.match(/(?:grade|gr\.?|g)\s*(\d+)/i) ||
              posName.match(/(\d+)(?:st|nd|rd|th)?\s*(?:grade|gr\.?|representative|rep)/i) ||
              posName.match(/\b(\d+)\b/);
    return m ? m[1] : null;
  };

  // Filter positions: each voter only sees the Representative assigned to their grade, or none if set to 'none'
  const votablePositions = positions.filter(p => {
    const isRep = /representative|rep\b/i.test(p.name);
    if (!isRep) return true; // Non-representative positions (President, VP, etc.) are always visible

    // If election has gradeMappings configured and voter has a gradeLevel:
    if (election?.gradeMappings && user?.gradeLevel) {
      const targetGrade = election.gradeMappings[user.gradeLevel];

      // If 'none' is selected, this grade cannot see or vote for any Grade 7–12 Representative
      if (targetGrade === 'none') {
        return false;
      }

      // If mapped to a specific grade (e.g. '8')
      if (targetGrade) {
        const repGrade = getRepresentativeGrade(p.name);
        // If this position has a specific grade in its title (e.g. "Grade 8 Representative"),
        // only keep it if it matches the target grade
        if (repGrade) {
          return repGrade === targetGrade;
        }
        // Generic representative position with no grade in title: keep it
        return true;
      }
    }

    return true;
  });

  if (votablePositions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-lg rounded-2xl">
            <CardContent className="pt-4 sm:pt-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1.5">No Positions Configured</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                There are currently no active positions configured for this election.
              </p>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-xl h-11">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const currentPosition = votablePositions[currentPositionIndex] || votablePositions[0];
  
  let positionCandidates = candidates.filter(c => c.position === currentPosition.id);
  const isRepresentativePosition = /representative|rep\b/i.test(currentPosition.name);
  if (isRepresentativePosition && election?.gradeMappings && user?.gradeLevel) {
    const targetGrade = election.gradeMappings[user.gradeLevel];
    if (targetGrade && targetGrade !== 'none') {
      const repGrade = getRepresentativeGrade(currentPosition.name);
      // Only filter candidates by candidate.gradeLevel if the position itself is generic (no grade in position name)
      if (!repGrade) {
        positionCandidates = positionCandidates.filter(c => c.gradeLevel === targetGrade);
      }
    }
  }

  const selectedCandidate = votes[currentPosition.id];
  const votedCount = Object.keys(votes).length;

  const handleNext = () => {
    if (currentPositionIndex < votablePositions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const success = await submitVotes();
      if (success) {
        toast({
          title: 'Ballot Submitted Successfully!',
          description: 'Your votes have been recorded.',
        });
        setJustVoted(true);
      } else {
        toast({
          title: 'Submission Failed',
          description: 'Failed to record your vote. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit your vote. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80">
      <Header />
      
      <main className="flex-1 py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
          
          {/* Multi-Session Indicator */}
          {eligibleActiveSessions.length > 1 && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 mb-4 text-xs animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md bg-blue-600 text-white font-bold text-[10px] px-2 uppercase">
                  Session {eligibleActiveSessions.findIndex((s) => s.id === activeSessionId) + 1} of {eligibleActiveSessions.length}
                </span>
                <span className="font-bold text-slate-800 truncate">{election?.name}</span>
              </div>
              {remainingSessions.length > 0 && (
                <span className="text-[11px] font-semibold text-blue-700 whitespace-nowrap bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                  +{remainingSessions.length} more session(s)
                </span>
              )}
            </div>
          )}

          {/* Progress Tracker Card */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 sm:p-4 mb-5 sm:mb-6">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs sm:text-sm font-bold text-indigo-700 uppercase tracking-wide">
                Position {currentPositionIndex + 1} of {votablePositions.length}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                <span className="font-bold text-indigo-600">{votedCount}</span> / {votablePositions.length} Selected
              </span>
            </div>

            {/* Continuous Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                style={{ width: `${((currentPositionIndex + 1) / votablePositions.length) * 100}%` }}
              />
            </div>

            {/* Position Dots Navigation */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              {votablePositions.map((position, index) => {
                const isSelected = votes[position.id];
                const isCurrent = index === currentPositionIndex;

                return (
                  <button
                    key={position.id}
                    type="button"
                    onClick={() => {
                      setCurrentPositionIndex(index);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`transition-all duration-200 h-2.5 sm:h-3 rounded-full cursor-pointer touch-manipulation ${
                      isCurrent 
                        ? 'w-7 sm:w-8 bg-indigo-600 shadow-xs ring-2 ring-indigo-300' 
                        : isSelected
                        ? 'w-2.5 sm:w-3 bg-emerald-500 hover:bg-emerald-600' 
                        : 'w-2.5 sm:w-3 bg-slate-300 hover:bg-slate-400'
                    }`}
                    title={`${position.name} (${isSelected ? 'Selected' : 'Pending'})`}
                  />
                );
              })}
            </div>
          </div>

          {/* Current Position Title */}
          <div className="text-center mb-6 animate-fade-in px-2">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
              Select Your Choice
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {currentPosition.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Choose 1 candidate for this position
            </p>
          </div>

          {/* Responsive Candidates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-6">
            {positionCandidates.length > 0 ? (
              positionCandidates.map((candidate) => (
                <div key={candidate.id} className="animate-fade-in">
                  <CandidateCard
                    candidate={candidate}
                    position={currentPosition}
                    isSelected={selectedCandidate === candidate.id}
                    onSelect={() => setVote(currentPosition.id, candidate.id)}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-sm font-medium text-slate-600">No candidates available for this position.</p>
                <p className="text-xs text-slate-400 mt-0.5">You can proceed to the next position.</p>
              </div>
            )}
          </div>

          {/* Step Navigation Controls */}
          <div className="flex items-center justify-between gap-3 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentPositionIndex === 0}
              className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold touch-manipulation"
            >
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-1.5" />
              Previous
            </Button>

            {currentPositionIndex === votablePositions.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm touch-manipulation"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Submit Ballot
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleNext}
                className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm touch-manipulation"
              >
                Next Position
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            )}
          </div>

          {/* Real-time Selections Summary */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden mb-8">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-3 sm:p-4">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-indigo-600" />
                  Your Ballot Summary
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {votedCount} of {votablePositions.length} Voted
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                {votablePositions.map((pos) => {
                  const chosen = candidates.find(c => c.id === votes[pos.id]);
                  return (
                    <div 
                      key={pos.id}
                      className="flex items-center justify-between p-3 sm:px-4 sm:py-2.5 hover:bg-slate-50/50 transition-colors gap-2"
                    >
                      <span className="font-semibold text-slate-700 truncate">{pos.name}</span>
                      {chosen ? (
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 text-xs shrink-0 max-w-[55%] truncate">
                          <Check className="h-3 w-3 text-indigo-600 shrink-0 stroke-[3]" />
                          <span className="truncate">{chosen.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] sm:text-xs shrink-0">
                          Not selected
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md w-[92vw] sm:w-full rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold text-slate-900">
              Confirm & Submit Ballot?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-xs sm:text-sm text-slate-600">
                  Please review your selections below. Once submitted, your vote is final and cannot be changed.
                </p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 max-h-48 overflow-y-auto divide-y divide-slate-200/60 text-xs">
                  {votablePositions.map((pos) => {
                    const chosen = candidates.find(c => c.id === votes[pos.id]);
                    return (
                      <div key={pos.id} className="flex justify-between py-1.5 gap-2">
                        <span className="text-slate-600 font-medium truncate">{pos.name}:</span>
                        <strong className={chosen ? "text-indigo-700 truncate" : "text-slate-400 italic"}>
                          {chosen ? chosen.name : 'Skipped'}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row sm:justify-end gap-2 pt-2">
            <AlertDialogCancel disabled={isSubmitting} className="flex-1 sm:flex-initial h-10 rounded-xl text-xs sm:text-sm">
              Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
