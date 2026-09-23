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
  RefreshCw,
  FolderKanban,
  Check,
  CalendarRange,
  GraduationCap,
  Rocket,
  Power,
  Settings2,
} from 'lucide-react';
import { formatSessionEligibility, normalizeGrade, normalizeSection } from '@/lib/electionRules';
import { api } from '@/lib/api';

export default function SessionManagerPage() {
  const {
    sessions,
    activeSessionId,
    switchSession,
    createSession,
    deleteSession,
    duplicateSession,
    refreshSessions,
    launchSession,
    closeSession,
    user,
    isLoggedIn,
    sections,
  } = useVoting();

  const navigate = useNavigate();
  const { toast } = useToast();

  const GRADES = ['7', '8', '9', '10', '11', '12'];

  // Helper: get available sections for the currently selected grade levels
  const getSectionsForGrades = (isSchoolWideGrades: boolean, gradeList: string[]) => {
    if (isSchoolWideGrades || gradeList.length === 0) {
      return sections;
    }
    const normalizedGrades = gradeList.map(g => normalizeGrade(g));
    return sections.filter(s => normalizedGrades.includes(normalizeGrade(s.gradeLevel)));
  };

  // Create session dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [isSchoolWide, setIsSchoolWide] = useState(true);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [isAllSections, setIsAllSections] = useState(true);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [customSectionInput, setCustomSectionInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit Assignment dialog state
  const [sessionToEdit, setSessionToEdit] = useState<VotingSession | null>(null);
  const [editIsSchoolWide, setEditIsSchoolWide] = useState(true);
  const [editGrades, setEditGrades] = useState<string[]>([]);
  const [editIsAllSections, setEditIsAllSections] = useState(true);
  const [editSections, setEditSections] = useState<string[]>([]);
  const [editCustomSectionInput, setEditCustomSectionInput] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete dialog state
  const [sessionToDelete, setSessionToDelete] = useState<VotingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Duplicating state
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [togglingSessionId, setTogglingSessionId] = useState<string | null>(null);
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
      const updatedGrades = isSchoolWide ? [] : selectedGrades;
      const updatedSections = isAllSections ? [] : selectedSections;
      await createSession({
        name: sessionName.trim(),
        school_year: schoolYear.trim() || '2026-2027',
        eligible_grade_levels: updatedGrades,
        eligible_sections: updatedSections,
      });
      toast({
        title: 'Session Created',
        description: `Successfully created "${sessionName.trim()}".`,
      });
      setSessionName('');
      setSchoolYear('2026-2027');
      setIsSchoolWide(true);
      setSelectedGrades([]);
      setIsAllSections(true);
      setSelectedSections([]);
      setCustomSectionInput('');
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

  // Handle Launch Session
  const handleLaunchSession = async (session: VotingSession) => {
    try {
      setTogglingSessionId(session.id);
      await launchSession(session.id);
      toast({
        title: 'Session Launched!',
        description: `"${session.name}" is now live and accepting votes for assigned students.`,
      });
    } catch (err: any) {
      console.error('Launch session error:', err);
      toast({
        title: 'Launch Failed',
        description: err?.message || 'Failed to launch voting session.',
        variant: 'destructive',
      });
    } finally {
      setTogglingSessionId(null);
    }
  };

  // Handle Close / End Session
  const handleCloseSession = async (session: VotingSession) => {
    try {
      setTogglingSessionId(session.id);
      await closeSession(session.id);
      toast({
        title: 'Session Closed',
        description: `"${session.name}" has been completed. The next session in sequence can now be launched.`,
      });
    } catch (err: any) {
      console.error('Close session error:', err);
      toast({
        title: 'Close Failed',
        description: err?.message || 'Failed to close voting session.',
        variant: 'destructive',
      });
    } finally {
      setTogglingSessionId(null);
    }
  };

  // Open Edit Assignment Dialog
  const handleOpenEdit = (session: VotingSession) => {
    setSessionToEdit(session);
    const existingGrades = (session.eligibleGradeLevels || []).map(g => normalizeGrade(g));
    if (existingGrades.length === 0) {
      setEditIsSchoolWide(true);
      setEditGrades([]);
    } else {
      setEditIsSchoolWide(false);
      setEditGrades(existingGrades);
    }

    const existingSections = (session.eligibleSections || []).map(s => normalizeSection(s));
    if (existingSections.length === 0) {
      setEditIsAllSections(true);
      setEditSections([]);
    } else {
      setEditIsAllSections(false);
      setEditSections(existingSections);
    }
    setEditCustomSectionInput('');
  };

  // Save Edit Assignment
  const handleSaveEdit = async () => {
    if (!sessionToEdit) return;
    try {
      setIsSavingEdit(true);
      const updatedGrades = editIsSchoolWide ? [] : editGrades;
      const updatedSections = editIsAllSections ? [] : editSections;
      await api.updateSession(sessionToEdit.id, {
        eligible_grade_levels: updatedGrades,
        eligible_sections: updatedSections,
      });
      await refreshSessions();
      toast({
        title: 'Eligibility Updated',
        description: `Assigned participants for "${sessionToEdit.name}" were updated successfully.`,
      });
      setSessionToEdit(null);
    } catch (err: any) {
      console.error('Save assignment error:', err);
      toast({
        title: 'Update Failed',
        description: err?.message || 'Failed to update session eligibility.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
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
        {/* Top Actions */}
        <div className="flex items-center justify-end gap-4 mb-6">

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

                        {/* Quick Delete Icon inside session card header */}
                        {sessions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(session);
                            }}
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                            title="Delete this session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-6 py-2 space-y-3">
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

                      {/* Assigned Voters / Grade Assignment Box */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-blue-900/70 uppercase tracking-wider">Assigned Voters</p>
                            <p className="font-bold text-slate-800 truncate text-xs" title={formatSessionEligibility(session)}>
                              {formatSessionEligibility(session)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(session)}
                          className="h-7 px-2.5 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-100/70 rounded-xl font-semibold gap-1 flex-shrink-0"
                          title="Assign Grade Levels and Sections for this session"
                        >
                          <Settings2 className="h-3 w-3" />
                          <span>Assign</span>
                        </Button>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Row */}
                  <CardFooter className="px-6 pb-6 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 mt-4 bg-slate-50/30 rounded-b-3xl">
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

                      {/* Delete Button */}
                      {sessions.length > 1 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSessionToDelete(session)}
                          className="rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 text-xs font-semibold h-9 px-3 gap-1.5 shadow-2xs"
                          title="Delete session"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Launch / End Session Button */}
                      {session.status === 'active' || session.isActive ? (
                        <Button
                          size="sm"
                          onClick={() => handleCloseSession(session)}
                          disabled={togglingSessionId === session.id}
                          className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold h-9 px-3.5 gap-1.5 shadow-xs"
                          title="Close this voting session"
                        >
                          <Power className={`h-3.5 w-3.5 ${togglingSessionId === session.id ? 'animate-spin' : ''}`} />
                          <span>End Session</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleLaunchSession(session)}
                          disabled={togglingSessionId === session.id}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-3.5 gap-1.5 shadow-xs"
                          title="Launch this session for assigned grade levels"
                        >
                          <Rocket className={`h-3.5 w-3.5 ${togglingSessionId === session.id ? 'animate-bounce' : ''}`} />
                          <span>Launch</span>
                        </Button>
                      )}

                      {/* Manage Button (Primary) */}
                      <Button
                        size="sm"
                        onClick={() => handleManageSession(session)}
                        className={`rounded-xl text-xs font-bold h-9 px-3.5 gap-1.5 shadow-sm transition-all ${
                          isCurrent
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>Manage</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create New Session Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col rounded-3xl p-0 bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-3 space-y-1 text-left border-b border-slate-100 flex-shrink-0">
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

          <form onSubmit={handleCreateSession} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
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

            {/* Voter Eligibility / Grade Levels */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Voter Eligibility</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {isSchoolWide ? 'All Grades' : `${selectedGrades.length} Grade(s) selected`}
                </span>
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSchoolWide(true);
                    setSelectedGrades([]);
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    isSchoolWide
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Grades (School-wide)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSchoolWide(false);
                    if (selectedGrades.length === 0) setSelectedGrades(['7']);
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    !isSchoolWide
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Specific Grade Level(s)
                </button>
              </div>

              {!isSchoolWide && (
                <div className="pt-2 animate-fade-in">
                  <p className="text-[11px] text-slate-500 mb-2">Select which grade levels can vote in this session:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRADES.map((grade) => {
                      const isSelected = selectedGrades.includes(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (selectedGrades.length > 1) {
                                setSelectedGrades(selectedGrades.filter((g) => g !== grade));
                              }
                            } else {
                              setSelectedGrades([...selectedGrades, grade]);
                            }
                          }}
                          className={`text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Grade {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section Assignment */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Section Assignment</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {isAllSections ? 'All Sections' : `${selectedSections.length} Section(s) selected`}
                </span>
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAllSections(true);
                    setSelectedSections([]);
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    isAllSections
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Sections
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAllSections(false);
                    const relevant = getSectionsForGrades(isSchoolWide, selectedGrades);
                    if (selectedSections.length === 0 && relevant.length > 0) {
                      setSelectedSections([relevant[0].name]);
                    }
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    !isAllSections
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Specific Section(s)
                </button>
              </div>

              {!isAllSections && (
                <div className="pt-2 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Select allowed section(s):</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const relevant = getSectionsForGrades(isSchoolWide, selectedGrades);
                          setSelectedSections(Array.from(new Set(relevant.map(s => s.name))));
                        }}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSections([])}
                        className="text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50/50">
                    {getSectionsForGrades(isSchoolWide, selectedGrades).length === 0 && selectedSections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 px-1">No sections pre-configured. Type a custom section name below.</p>
                    ) : (
                      getSectionsForGrades(isSchoolWide, selectedGrades).map((sec) => {
                        const isSelected = selectedSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(sec.name).toLowerCase());
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSections(selectedSections.filter(s => normalizeSection(s).toLowerCase() !== normalizeSection(sec.name).toLowerCase()));
                              } else {
                                setSelectedSections([...selectedSections, sec.name]);
                              }
                            }}
                            className={`text-xs py-1 px-2.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{sec.name}</span>
                            <span className={`text-[10px] opacity-75 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>(G{sec.gradeLevel})</span>
                          </button>
                        );
                      })
                    )}
                    {selectedSections
                      .filter(s => !getSectionsForGrades(isSchoolWide, selectedGrades).some(sec => normalizeSection(sec.name).toLowerCase() === normalizeSection(s).toLowerCase()))
                      .map((customSec) => (
                        <button
                          key={customSec}
                          type="button"
                          onClick={() => setSelectedSections(selectedSections.filter(s => s !== customSec))}
                          className="text-xs py-1 px-2.5 rounded-lg border font-medium bg-blue-600 border-blue-600 text-white shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{customSec}</span>
                          <span className="text-[10px] opacity-75">(Custom)</span>
                        </button>
                      ))}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Input
                      placeholder="Add custom section name..."
                      value={customSectionInput}
                      onChange={(e) => setCustomSectionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customSectionInput.trim();
                          if (val && !selectedSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(val).toLowerCase())) {
                            setSelectedSections([...selectedSections, val]);
                            setCustomSectionInput('');
                          }
                        }
                      }}
                      className="h-8 text-xs rounded-lg bg-white border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const val = customSectionInput.trim();
                        if (val && !selectedSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(val).toLowerCase())) {
                          setSelectedSections([...selectedSections, val]);
                          setCustomSectionInput('');
                        }
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg font-semibold"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex-shrink-0 gap-2 sm:gap-0">
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
                disabled={isCreating || !sessionName.trim() || (!isSchoolWide && selectedGrades.length === 0) || (!isAllSections && selectedSections.length === 0)}
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

      {/* Edit Session Assignment Dialog */}
      <Dialog open={Boolean(sessionToEdit)} onOpenChange={(open) => !open && setSessionToEdit(null)}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col rounded-3xl p-0 bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <DialogHeader className="p-6 pb-3 space-y-1 text-left border-b border-slate-100 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-2 border border-indigo-100 text-indigo-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              Configure Session Participants
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Configure which grade levels and sections are authorized to vote in <span className="font-semibold text-slate-800">"{sessionToEdit?.name}"</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditIsSchoolWide(true);
                  setEditGrades([]);
                }}
                className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  editIsSchoolWide
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Grades (School-wide)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditIsSchoolWide(false);
                  if (editGrades.length === 0) setEditGrades(['7']);
                }}
                className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  !editIsSchoolWide
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Specific Grade Level(s)
              </button>
            </div>

            {!editIsSchoolWide && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-[11px] text-slate-500">Select which grade levels can participate in this session:</p>
                <div className="grid grid-cols-3 gap-2">
                  {GRADES.map((grade) => {
                    const isSelected = editGrades.includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (editGrades.length > 1) {
                              setEditGrades(editGrades.filter((g) => g !== grade));
                            }
                          } else {
                            setEditGrades([...editGrades, grade]);
                          }
                        }}
                        className={`text-xs py-2 px-2 rounded-xl border font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        Grade {grade}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edit Section Assignment */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Section Assignment</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {editIsAllSections ? 'All Sections' : `${editSections.length} Section(s) selected`}
                </span>
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditIsAllSections(true);
                    setEditSections([]);
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    editIsAllSections
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Sections
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditIsAllSections(false);
                    const relevant = getSectionsForGrades(editIsSchoolWide, editGrades);
                    if (editSections.length === 0 && relevant.length > 0) {
                      setEditSections([relevant[0].name]);
                    }
                  }}
                  className={`text-xs py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    !editIsAllSections
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Specific Section(s)
                </button>
              </div>

              {!editIsAllSections && (
                <div className="pt-2 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Select allowed section(s):</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const relevant = getSectionsForGrades(editIsSchoolWide, editGrades);
                          setEditSections(Array.from(new Set(relevant.map(s => s.name))));
                        }}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setEditSections([])}
                        className="text-slate-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-100 rounded-xl bg-slate-50/50">
                    {getSectionsForGrades(editIsSchoolWide, editGrades).length === 0 && editSections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1 px-1">No sections pre-configured. Type a custom section name below.</p>
                    ) : (
                      getSectionsForGrades(editIsSchoolWide, editGrades).map((sec) => {
                        const isSelected = editSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(sec.name).toLowerCase());
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setEditSections(editSections.filter(s => normalizeSection(s).toLowerCase() !== normalizeSection(sec.name).toLowerCase()));
                              } else {
                                setEditSections([...editSections, sec.name]);
                              }
                            }}
                            className={`text-xs py-1 px-2.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            <span>{sec.name}</span>
                            <span className={`text-[10px] opacity-75 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>(G{sec.gradeLevel})</span>
                          </button>
                        );
                      })
                    )}
                    {editSections
                      .filter(s => !getSectionsForGrades(editIsSchoolWide, editGrades).some(sec => normalizeSection(sec.name).toLowerCase() === normalizeSection(s).toLowerCase()))
                      .map((customSec) => (
                        <button
                          key={customSec}
                          type="button"
                          onClick={() => setEditSections(editSections.filter(s => s !== customSec))}
                          className="text-xs py-1 px-2.5 rounded-lg border font-medium bg-blue-600 border-blue-600 text-white shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{customSec}</span>
                          <span className="text-[10px] opacity-75">(Custom)</span>
                        </button>
                      ))}
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <Input
                      placeholder="Add custom section name..."
                      value={editCustomSectionInput}
                      onChange={(e) => setEditCustomSectionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = editCustomSectionInput.trim();
                          if (val && !editSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(val).toLowerCase())) {
                            setEditSections([...editSections, val]);
                            setEditCustomSectionInput('');
                          }
                        }
                      }}
                      className="h-8 text-xs rounded-lg bg-white border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const val = editCustomSectionInput.trim();
                        if (val && !editSections.some(s => normalizeSection(s).toLowerCase() === normalizeSection(val).toLowerCase())) {
                          setEditSections([...editSections, val]);
                          setEditCustomSectionInput('');
                        }
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg font-semibold"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex-shrink-0 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSessionToEdit(null)}
              disabled={isSavingEdit}
              className="rounded-xl border-slate-200 text-slate-700 h-10 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit || (!editIsSchoolWide && editGrades.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold gap-2"
            >
              {isSavingEdit ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Eligibility
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
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
