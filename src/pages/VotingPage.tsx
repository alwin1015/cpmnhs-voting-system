import { useState } from 'react';
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
import { Vote, CheckCircle, ArrowRight, ArrowLeft, Send, Clock, LogOut } from 'lucide-react';

export default function VotingPage() {
  const { candidates, positions, votes, setVote, submitVotes, hasVoted, isLoggedIn, user, election, logout } = useVoting();
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not logged in or not a voter
  if (!isLoggedIn || user?.role !== 'voter') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
                {isLoggedIn && (
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-slate-500 hover:text-slate-800 hover:bg-transparent active:bg-transparent focus:bg-transparent">Logout</Button>
          </div>
        )}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full text-center p-8">
            <CardContent className="pt-6">
              <Vote className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold mb-2">Login Required</h2>
              <p className="text-muted-foreground mb-6">
                Please login as a student to cast your vote.
              </p>
              <Button variant="hero" onClick={() => navigate('/login')}>
                Go to Login
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
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
                {isLoggedIn && (
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-slate-500 hover:text-slate-800 hover:bg-transparent active:bg-transparent focus:bg-transparent">Logout</Button>
          </div>
        )}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full text-center p-8">
            <CardContent className="pt-6">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Election Has Not Started</h2>
              <p className="text-muted-foreground mb-6">
                The election is currently not active. Please wait for the administrator to launch the election.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
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
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
                {isLoggedIn && (
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-slate-500 hover:text-slate-800 hover:bg-transparent active:bg-transparent focus:bg-transparent">Logout</Button>
          </div>
        )}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full text-center p-8 animate-scale-in">
            <CardContent className="pt-6">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="font-display text-3xl font-bold mb-2">Vote Submitted Successfully!</h2>
              <p className="text-muted-foreground mb-6">
                Your vote has been recorded. Thank you for participating in the SSG Election!
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-md shadow-md"
                  onClick={() => navigate('/')}
                >
                  Return Home
                </Button>
              </div>
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
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
                {isLoggedIn && (
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-slate-500 hover:text-slate-800 hover:bg-transparent active:bg-transparent focus:bg-transparent">Logout</Button>
          </div>
        )}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full text-center p-8">
            <CardContent className="pt-6">
              <h2 className="font-display text-2xl font-bold mb-2">No Positions Available</h2>
              <p className="text-muted-foreground mb-6">
                There are currently no positions available to vote on.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
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
  const allPositionsVoted = votablePositions.every(p => {
    let pCands = candidates.filter(c => c.position === p.id);
    if (p.strictGradeMapping && election?.gradeMappings && user?.gradeLevel) {
      const targetGrade = election.gradeMappings[user.gradeLevel];
      if (targetGrade) pCands = pCands.filter(c => c.gradeLevel === targetGrade);
    }
    const hasCandidates = pCands.length > 0;
    return !hasCandidates || votes[p.id];
  });

  const handleNext = () => {
    if (currentPositionIndex < votablePositions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const success = await submitVotes();
      if (success) {
        toast({
          title: 'Vote Submitted!',
          description: 'Your vote has been successfully recorded.',
        });
      } else {
        toast({
          title: 'Vote Failed',
          description: 'Failed to record your vote. Please check your selections.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit your vote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -z-10 -translate-x-1/3 translate-y-1/3"></div>
      
              {isLoggedIn && (
          <div className="absolute top-4 right-4 z-50">
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }} className="text-slate-500 hover:text-slate-800 hover:bg-transparent active:bg-transparent focus:bg-transparent">Logout</Button>
          </div>
        )}
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          {/* Progress */}
          <div className="mb-10 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold tracking-wider text-indigo-600 uppercase">
                Position {currentPositionIndex + 1} of {votablePositions.length}
              </span>
              <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                <span className="text-slate-800 font-bold">{Object.keys(votes).length}</span> / {votablePositions.length} Selected
              </span>
            </div>
            <div className="h-3 bg-white border border-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out relative"
                style={{ width: `${((currentPositionIndex + 1) / votablePositions.length) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Position Progress Dots */}
          <div className="flex justify-center gap-3 mb-10 max-w-2xl mx-auto flex-wrap">
            {votablePositions.map((position, index) => (
              <button
                key={position.id}
                onClick={() => setCurrentPositionIndex(index)}
                className={`transition-all duration-300 relative ${
                  index === currentPositionIndex 
                    ? 'w-10 h-3 rounded-full bg-indigo-600 shadow-md shadow-indigo-200 scale-105' 
                    : votes[position.id] 
                      ? 'w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 hover:scale-110' 
                      : 'w-3 h-3 rounded-full bg-slate-300 hover:bg-slate-400 hover:scale-110'
                }`}
                title={position.name}
              />
            ))}
          </div>

          {/* Current Position */}
          <div className="text-center mb-10 animate-fade-in">
            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-bold tracking-widest uppercase mb-4 shadow-sm">
              Cast your vote for
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-black text-slate-800 tracking-tight">
              {currentPosition.name}
            </h1>
          </div>

          {/* Candidates */}
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto mb-8">
            {positionCandidates.length > 0 ? (
              positionCandidates.map((candidate, index) => (
                <div 
                  key={candidate.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CandidateCard
                    candidate={candidate}
                    position={currentPosition}
                    isSelected={selectedCandidate === candidate.id}
                    onSelect={() => setVote(currentPosition.id, candidate.id)}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-medium">No candidates registered for this position yet.</p>
                <p className="text-sm text-gray-400 mt-1">You may skip to the next position.</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center max-w-3xl mx-auto mt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevious}
              disabled={currentPositionIndex === 0}
              className="bg-white/80 backdrop-blur-sm border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-sm transition-all rounded-xl px-6 h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentPositionIndex === votablePositions.length - 1 ? (
              <Button
                size="lg"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!allPositionsVoted}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all rounded-xl px-8 h-12 border-0"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Votes
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl px-8 h-12 border-0"
              >
                Next Position
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Vote Summary */}
          <Card className="mt-16 max-w-3xl mx-auto bg-white/80 backdrop-blur-md border border-slate-100 shadow-xl rounded-2xl overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="font-display text-xl text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-indigo-500" /> Your Selections Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {votablePositions.map((position) => {
                  const selected = candidates.find(c => c.id === votes[position.id]);
                  return (
                    <div 
                      key={position.id}
                      className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-slate-700 w-1/2">{position.name}</span>
                      {selected ? (
                        <div className="flex items-center gap-2 text-sm text-indigo-600 font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 w-1/2 justify-end">
                          <span>{selected.name}</span>
                          <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic w-1/2 text-right">No candidate selected</span>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Confirm Your Votes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">You are about to submit your votes. This action cannot be undone.</p>
                <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                  {votablePositions.map((position) => {
                    const selected = candidates.find(c => c.id === votes[position.id]);
                    return (
                      <div key={position.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{position.name}:</span>
                        <span className="font-medium text-foreground">{selected?.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gradient-primary"
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





