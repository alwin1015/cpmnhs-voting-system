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
import { Vote, CheckCircle, ArrowRight, ArrowLeft, Send, Clock, User, Check } from 'lucide-react';

export default function VotingPage() {
  const { candidates, positions, votes, setVote, submitVotes, hasVoted, isLoggedIn, user, election, logout, sessions, activeSessionId, switchSession } = useVoting();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-select an active session the voter is eligible for
  useEffect(() => {
    if (user?.role === 'voter' && sessions.length > 0) {
      const activeSessions = sessions.filter(s => s.isActive && s.status === 'active');
      const eligible = activeSessions.filter(s => {
        const gradeOk = !s.eligibleGradeLevels || s.eligibleGradeLevels.length === 0 || s.eligibleGradeLevels.includes(user.gradeLevel || '');
        const sectionOk = !s.eligibleSections || s.eligibleSections.length === 0 || s.eligibleSections.includes(user.section || '');
        return gradeOk && sectionOk;
      });
      if (eligible.length > 0 && (!activeSessionId || !eligible.find(s => s.id === activeSessionId))) {
        switchSession(eligible[0].id);
      }
    }
  }, [user, sessions, activeSessionId, switchSession]);

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

  // Check if election is active
  if (election && !election.isActive) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-lg rounded-2xl">
            <CardContent className="pt-4 sm:pt-6">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5">Election Not Active</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">
                The voting period has not started yet or has concluded. Please check with your election administrator.
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

  // Show thank you page if already voted
  if (hasVoted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-6 sm:p-8 bg-white border border-slate-200/80 shadow-xl rounded-2xl animate-scale-in">
            <CardContent className="pt-4 sm:pt-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <CheckCircle className="h-8 w-8 stroke-[2.5]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">Vote Submitted Successfully!</h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                Thank you, <strong>{user?.name}</strong>! Your official ballot has been securely counted and recorded for this election.
              </p>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-semibold shadow-xs"
                onClick={() => navigate('/')}
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

  const votablePositions = positions;

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

  const currentPosition = votablePositions[currentPositionIndex];
  
  let positionCandidates = candidates.filter(c => c.position === currentPosition.id);
  if (currentPosition.strictGradeMapping && election?.gradeMappings && user?.gradeLevel) {
    const targetGrade = election.gradeMappings[user.gradeLevel];
    if (targetGrade) {
      positionCandidates = positionCandidates.filter(c => c.gradeLevel === targetGrade);
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
