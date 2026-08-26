import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { VotingSession } from '@/types/voting';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Plus,
  Copy,
  Trash2,
  Calendar,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  FolderKanban,
  Check,
  CalendarRange,
} from 'lucide-react';

export default function SessionManagerPage() {
  const {
    sessions,
    activeSessionId,
    switchSession,
    createSession,
    deleteSession,
    duplicateSession,
    refreshSessions,
    user,
    isLoggedIn,
  } = useVoting();

  const navigate = useNavigate();
  const { toast } = useToast();

  // Create session dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [isCreating, setIsCreating] = useState(false);

  // Delete dialog state
  const [sessionToDelete, setSessionToDelete] = useState<VotingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicating state
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Guard: Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Shield className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Access Denied</h2>
              <p className="text-sm text-gray-500 mb-6">
                Session management is restricted to authorized administrators only.
              </p>
              <Button
                onClick={() => navigate('/admin-login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-sm font-medium"
              >
                Log in as Administrator
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a session name.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      await createSession({
        name: sessionName.trim(),
        school_year: schoolYear.trim() || '2026-2027',
      });
      toast({
        title: 'Session Created',
        description: `Successfully created "${sessionName.trim()}".`,
      });
      setSessionName('');
      setSchoolYear('2026-2027');
      setIsCreateOpen(false);
    } catch (err: any) {
      console.error('Create session error:', err);
      toast({
        title: 'Error Creating Session',
        description: err?.message || 'Failed to create new voting session.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Manage (Switch Session & Navigate)
  const handleManageSession = (session: VotingSession) => {
    switchSession(session.id);
    navigate('/admin');
  };

  // Handle Duplicate Session
  const handleDuplicateSession = async (session: VotingSession) => {
    try {
      setDuplicatingId(session.id);
      await duplicateSession(session.id);
      toast({
        title: 'Session Duplicated',
        description: `Created a copy of "${session.name}" with its positions and candidates.`,
      });
    } catch (err: any) {
      console.error('Duplicate session error:', err);
      toast({
        title: 'Error Duplicating Session',
        description: err?.message || 'Failed to duplicate session.',
        variant: 'destructive',
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  // Handle Delete Session
  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSession(sessionToDelete.id);
      toast({
        title: 'Session Deleted',
        description: `"${sessionToDelete.name}" has been removed.`,
      });
      setSessionToDelete(null);
    } catch (err: any) {
      console.error('Delete session error:', err);
      toast({
        title: 'Error Deleting Session',
        description: err?.message || 'Failed to delete session.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSessions();
      toast({
        title: 'Sessions Refreshed',
        description: 'Session list has been updated.',
      });
    } catch (err) {
      console.error('Refresh sessions error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper for status badge styling
  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
          dotColor: 'bg-emerald-500',
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
          dotColor: 'bg-amber-500',
        };
      case 'finalized':
        return {
          label: 'Finalized',
          className: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
          dotColor: 'bg-purple-500',
        };
      case 'upcoming':
      default:
        return {
          label: 'Upcoming',
          className: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
          dotColor: 'bg-blue-500',
        };
    }
  };

  // Safe date formatter
  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return 'Not set';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return 'Not set';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Not set';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Top Navigation & Breadcrumbs */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl gap-2 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl gap-2 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Page Banner / Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/10 mb-8 relative overflow-hidden">
          {/* Subtle decorative background circles */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-24 -mb-10 w-36 h-36 rounded-full bg-indigo-500/20 blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-xs text-xs font-semibold tracking-wide uppercase">
                <FolderKanban className="h-3.5 w-3.5 text-blue-200" />
                Session Architecture
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Voting Sessions
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl font-normal">
                Manage multiple election sessions, switch active workspaces, duplicate ballot structures, and launch elections.
              </p>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Create New Session
            </Button>
          </div>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed border-2 border-slate-300 bg-white/80 backdrop-blur-xs rounded-3xl p-12 text-center shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 border border-blue-100 text-blue-600 shadow-inner">
                <Layers className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No Voting Sessions Found</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                Get started by creating your first election session. You can configure positions, candidates, and voter authorization.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md gap-2"
              >
                <Plus className="h-4 w-4" />
                Create New Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sessions.map((session) => {
              const isCurrent = activeSessionId === session.id;
              const statusCfg = getStatusBadgeConfig(session.status);
              const isDuplicating = duplicatingId === session.id;

              return (
                <Card
                  key={session.id}
                  className={`relative flex flex-col justify-between rounded-3xl transition-all duration-200 bg-white shadow-md hover:shadow-xl border ${
                    isCurrent
                      ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-100'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <CardHeader className="pb-3 pt-6 px-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-slate-700 font-medium text-[11px] rounded-lg px-2.5 py-0.5"
                            >
                              S.Y. {session.schoolYear || '2026-2027'}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[11px] rounded-lg px-2.5 py-0.5 inline-flex items-center gap-1.5 ${statusCfg.className}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                              {statusCfg.label}
                            </Badge>
                            {isCurrent && (
                              <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Active Workspace
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight pt-1 leading-snug">
                            {session.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-6 py-2 space-y-4">
                      {/* Dates Box */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Start Date</span>
                          </div>
                          <p className="font-semibold text-slate-700">
                            {formatDate(session.startDate)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                            <span>End Date</span>
                          </div>
                          <p className="font-semibold text-slate-700">
                            {formatDate(session.endDate)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Row */}
                  <CardFooter className="px-6 pb-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4 bg-slate-50/30 rounded-b-3xl">
                    <div className="flex items-center gap-2">
                      {/* Duplicate Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateSession(session)}
                        disabled={isDuplicating}
                        className="rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 px-3 gap-1.5 shadow-2xs"
                        title="Duplicate session structure (positions and candidates)"
                      >
                        <Copy className={`h-3.5 w-3.5 text-slate-500 ${isDuplicating ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Duplicate</span>
                      </Button>

                      {/* Delete Button (Only for upcoming sessions) */}
                      {session.status === 'upcoming' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSessionToDelete(session)}
                          className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 text-xs font-semibold h-9 px-3 gap-1.5 shadow-2xs"
                          title="Delete upcoming session"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      )}
                    </div>

                    {/* Manage Button (Primary) */}
                    <Button
                      size="sm"
                      onClick={() => handleManageSession(session)}
                      className={`rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-sm transition-all ${
                        isCurrent
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>Manage</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create New Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-2 border border-blue-100 text-blue-600">
              <Plus className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Create New Session
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Enter the title and academic year for this election session.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSession} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="session-name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Session Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="session-name"
                placeholder="e.g. SSG General Election 2026-2027"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="h-11 rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white text-sm"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school-year" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                School Year <span className="text-red-500">*</span>
              </Label>
              <Input
                id="school-year"
                placeholder="e.g. 2026-2027"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="h-11 rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white text-sm"
                required
              />
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                className="rounded-xl border-slate-200 text-slate-700 h-10 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !sessionName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold gap-2"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Session
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(sessionToDelete)} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
          <AlertDialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-1 border border-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Delete Voting Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{sessionToDelete?.name}"</span>? This will permanently remove the session and its associated candidate registrations and position setups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl border-slate-200 text-slate-700 h-10 font-semibold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 font-bold gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Confirm Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
