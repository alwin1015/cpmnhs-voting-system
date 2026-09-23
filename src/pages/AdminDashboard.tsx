import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVoting } from '@/contexts/VotingContext';
import type { Voter } from '@/types/voting';
import { useToast } from '@/hooks/use-toast';
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
import { 
  Users, 
  Vote, 
  BarChart3, 
  UserPlus, 
  Clock,
  CheckCircle,
  TrendingUp,
  Shield,
  CalendarClock,
  Rocket,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Settings,
  FileText,
  Lock,
  Unlock,
  X,
  Check,
  Layers,
  History,
  GraduationCap,
} from 'lucide-react';
import { formatSessionEligibility, normalizeGrade } from '@/lib/electionRules';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_authorization: { label: 'Pending Authorization', color: 'text-amber-700', bg: 'bg-amber-50' },
  authorized: { label: 'Authorized', color: 'text-blue-700', bg: 'bg-blue-50' },
  scheduled: { label: 'Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  ongoing: { label: 'Ongoing', color: 'text-green-700', bg: 'bg-green-50' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50' },
};

export default function AdminDashboard() {
  const {
    user,
    isLoggedIn,
    election,
    candidates,
    positions,
    getResults,
    voters,
    sections,
    updateElection,
    resetSystem,
    sessions,
    activeSessionId,
    switchSession,
    currentSchoolYear,
    processRollover,
    isDataLoaded,
    launchSession,
    closeSession,
  } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Schedule panel state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isMappingsOpen, setIsMappingsOpen] = useState(false);
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Schedule detail fields
  const [editName, setEditName] = useState('');
  const [editSchoolYear, setEditSchoolYear] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editIsSchoolWide, setEditIsSchoolWide] = useState(true);
  const [editGrades, setEditGrades] = useState<string[]>([]);

  // Grade Mappings state
  const GRADES = ['7', '8', '9', '10', '11', '12'];
  const [editMappings, setEditMappings] = useState<Record<string, string>>({});

  const scheduleStatus = election?.scheduleStatus || 'draft';
  const statusInfo = STATUS_LABELS[scheduleStatus] || STATUS_LABELS.draft;

  const handleOpenSchedule = () => {
    setEditName(election?.name || '');
    setEditSchoolYear(election?.schoolYear || '');
    
    const formatDate = (d?: Date | string | null) => {
      if (!d) return '';
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return '';
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    };
    const formatTime = (d?: Date | string | null) => {
      if (!d) return '';
      const date = d instanceof Date ? d : new Date(d);
      if (isNaN(date.getTime())) return '';
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[1].slice(0, 5);
    };

    setEditStartDate(formatDate(election?.startDate));
    setEditStartTime(formatTime(election?.startDate));
    setEditEndDate(formatDate(election?.endDate));
    setEditEndTime(formatTime(election?.endDate));

    const existingEligibility = (election?.eligibleGradeLevels || []).map((g) => normalizeGrade(g));
    if (existingEligibility.length === 0) {
      setEditIsSchoolWide(true);
      setEditGrades([]);
    } else {
      setEditIsSchoolWide(false);
      setEditGrades(existingEligibility);
    }

    setIsScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Please enter an election name.', variant: 'destructive' });
      return;
    }
    const parseDateTime = (d: string, t: string) => {
      if (!d) return null;
      const parsed = new Date(`${d}T${t || '00:00'}`);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    setIsSavingSchedule(true);
    try {
      const parsedStart = parseDateTime(editStartDate, editStartTime);
      const parsedEnd = parseDateTime(editEndDate, editEndTime);

      const nextScheduleStatus = election?.scheduleStatus === 'ongoing'
        ? 'ongoing'
        : (parsedStart || parsedEnd ? 'scheduled' : (election?.scheduleStatus || 'draft'));

      await updateElection({
        name: editName.trim(),
        schoolYear: editSchoolYear.trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        scheduleStatus: nextScheduleStatus,
        eligibleGradeLevels: editIsSchoolWide ? [] : editGrades,
      });

      setIsScheduleOpen(false);
      toast({ title: 'Schedule Saved', description: 'Election schedule and eligibility updated successfully.' });
    } catch (err) {
      console.error('Schedule update error:', err);
      toast({ title: 'Save Failed', description: 'The election schedule was not updated.', variant: 'destructive' });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleOpenMappings = () => {
    const existing = election?.gradeMappings || {};
    const fullMappings: Record<string, string> = {};
    GRADES.forEach((g) => {
      fullMappings[g] = existing[g] !== undefined ? existing[g] : g;
    });
    setEditMappings(fullMappings);
    setIsMappingsOpen(true);
  };

  const handleSaveMappings = async () => {
    setIsSavingMappings(true);
    try {
      await updateElection({ gradeMappings: editMappings });
      setIsMappingsOpen(false);
      toast({ title: 'Mappings Saved', description: 'Representative grade mappings have been updated.' });
    } catch (err) {
      console.error('Save mappings error:', err);
      toast({ title: 'Save Failed', description: 'Representative mappings were not updated.', variant: 'destructive' });
    } finally {
      setIsSavingMappings(false);
    }
  };

  const handleToggleElection = async () => {
    if (!election) return;

    if (election.isActive) {
      // End election
      await closeSession(election.id);
      toast({ title: 'Election Ended', description: 'Voting session has been closed. The next session can now be launched.' });
    } else {
      await launchSession(election.id);
      toast({ title: 'Election Launched!', description: 'Students assigned to this session can now cast their votes.' });
    }
  };

  const handleResetSystem = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      toast({
        title: "Session Reset Successful",
        description: "All votes and tallies for this session have been cleared. Voters and candidates remain intact.",
      });
      setIsResetDialogOpen(false);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "An error occurred while resetting the system.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Redirect if not admin
  if (!isLoggedIn || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="glass-card max-w-md w-full text-center p-8">
            <CardContent className="pt-6">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You need admin privileges to access this page.
              </p>
              <Button variant="hero" onClick={() => navigate('/admin-login')}>
                Admin Login
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const results = getResults();
  const voterTurnoutStr = election?.totalVoters > 0 
    ? `${Math.round(((election.totalVoted || 0) / election.totalVoters) * 100)}%` 
    : '0%';

  const pendingRegistrations = voters.filter(v => v.status === 'pending').length;

  const stats = [
    {
      title: 'Total Voters',
      value: election?.totalVoters || 0,
      icon: Users,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
    },
    {
      title: 'Votes Cast',
      value: election?.totalVoted || 0,
      icon: Vote,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
    },
    {
      title: 'Pending Registrations',
      value: pendingRegistrations,
      icon: ClipboardList,
      iconColor: '#ea580c',
      iconBg: '#fff7ed',
    },
    {
      title: 'Voter Turnout',
      value: voterTurnoutStr,
      icon: TrendingUp,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
    },
  ];

  const manageItems = [
    {
      title: 'Candidates',
      description: 'Add or edit candidates',
      icon: UserPlus,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      onClick: () => navigate('/candidates'),
    },
    {
      title: 'Registrations',
      description: 'Approve student signups',
      icon: ClipboardList,
      iconColor: '#ea580c',
      iconBg: '#fff7ed',
      onClick: () => navigate('/registrations'),
    },
    {
      title: 'Voters',
      description: 'View registered voters',
      icon: Users,
      iconColor: '#16a34a',
      iconBg: '#f0fdf4',
      onClick: () => navigate('/voters'),
    },
    {
      title: 'Sections',
      description: 'Manage grade sections',
      icon: LayoutGrid,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      onClick: () => navigate('/sections'),
    },
    {
      title: 'Positions',
      description: 'SSG positions setup',
      icon: MapPin,
      iconColor: '#dc2626',
      iconBg: '#fef2f2',
      onClick: () => navigate('/positions'),
    },
    {
      title: 'Grade Map',
      description: 'Configure voting permissions',
      icon: Settings,
      iconColor: '#9333ea',
      iconBg: '#faf5ff',
      onClick: handleOpenMappings,
    },
    {
      title: 'Sessions',
      description: 'Manage multiple elections',
      icon: Layers,
      iconColor: '#0ea5e9',
      iconBg: '#f0f9ff',
      onClick: () => navigate('/sessions'),
    },
    {
      title: 'Results',
      description: 'View election results',
      icon: BarChart3,
      iconColor: '#0891b2',
      iconBg: '#ecfeff',
      onClick: () => navigate('/results'),
    }
  ];

  const renderScheduleModalContent = () => (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Election Name</Label>
        <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-white" placeholder="SSG General Election" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">School Year</Label>
        <Input value={editSchoolYear} onChange={e => setEditSchoolYear(e.target.value)} className="bg-white" placeholder="2026-2027" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Date</Label>
          <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Start Time</Label>
          <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">End Date</Label>
          <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="bg-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">End Time</Label>
          <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} className="bg-white" />
        </div>
      </div>

      {/* Voter Eligibility / Grade Levels */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span>Assigned Voter Eligibility</span>
          <span className="text-[11px] font-normal text-slate-500">
            {editIsSchoolWide ? 'All Grades' : `${editGrades.length} Grade(s) assigned`}
          </span>
        </Label>

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
          <div className="pt-1 animate-fade-in">
            <p className="text-[11px] text-slate-500 mb-1.5">Select which grade levels can vote when this session is launched:</p>
            <div className="grid grid-cols-3 gap-1.5">
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

      {/* Read-only info: Positions & Sections auto-linked */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-linked from your settings</p>
        <div className="text-xs text-slate-600">
          <span className="font-semibold">Positions:</span> {positions.length > 0 ? positions.map(p => p.name).join(', ') : 'None configured'}
        </div>
        <div className="text-xs text-slate-600">
          <span className="font-semibold">Grade Levels:</span> {GRADES.map(g => `Grade ${g}`).join(', ')}
        </div>
        <div className="text-xs text-slate-600">
          <span className="font-semibold">Sections:</span> {sections.length > 0 ? sections.map(s => `${s.name} (G${s.gradeLevel})`).join(', ') : 'None configured'}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setIsScheduleOpen(false)} className="text-xs" disabled={isSavingSchedule}>Cancel</Button>
        <Button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
          {isSavingSchedule ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-6 relative">
        {/* ===== SET SCHEDULE OVERLAY ===== */}
        {isScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto py-8">
            <Card className="w-full max-w-lg mx-4 animate-in zoom-in-95 shadow-2xl border-0 overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-blue-200" />
                      Set Election Schedule
                    </h2>
                    <button onClick={() => setIsScheduleOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Status badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <CalendarClock className="w-28 h-28 absolute -bottom-8 -right-8 text-white opacity-10 rotate-12" />
              </div>

              {/* Step Content */}
              <CardContent className="p-5 max-h-[70vh] overflow-y-auto">
                {renderScheduleModalContent()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grade Mappings Modal Overlay */}
        {isMappingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto p-3 sm:p-4">
            <Card className="w-full max-w-lg mx-auto animate-in zoom-in-95 shadow-2xl border-0 overflow-hidden my-auto">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Settings className="w-5 h-5 text-purple-200" />
                    Representative Grade Mapping
                  </h2>
                  <p className="text-sm text-purple-100 mt-2 opacity-90 leading-relaxed">
                    Configure voting rules. Students will only see representatives from their mapped grade level.
                  </p>
                </div>
                <Settings className="w-32 h-32 absolute -bottom-10 -right-10 text-white opacity-10 rotate-12" />
              </div>
              <CardContent className="pt-6 pb-6 bg-gray-50/50">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {GRADES.map(grade => (
                    <div 
                      key={grade} 
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-xl bg-white hover:border-purple-200 hover:shadow-md hover:shadow-purple-100/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 mb-3 sm:mb-0">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:scale-110 transition-transform">
                          {grade}
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-900 block">Grade {grade} Voters</Label>
                          <span className="text-xs text-gray-500">Can only vote for</span>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-56 relative">
                        <select
                          value={editMappings[grade] || ''}
                          onChange={(e) => setEditMappings(prev => ({ ...prev, [grade]: e.target.value }))}
                          className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50 hover:bg-gray-100 transition-colors appearance-none cursor-pointer text-gray-700"
                        >
                          <option value="">Any Grade (No Restriction)</option>
                          <option value="none">None (Cannot vote for any Representative)</option>
                          {GRADES.map(g => (
                            <option key={g} value={g}>Grade {g} Representatives</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400 group-hover:text-purple-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setIsMappingsOpen(false)} className="hover:bg-gray-100" disabled={isSavingMappings}>Cancel</Button>
                  <Button onClick={handleSaveMappings} disabled={isSavingMappings} className="shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)', color: 'white' }}>
                    {isSavingMappings ? 'Saving...' : 'Save Mappings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="container mx-auto px-4 max-w-6xl">

          {/* Top Admin Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-500">Welcome back, {user?.name || 'Administrator'}. Manage elections and student voting.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Session Selector */}
              <div className="relative flex-1 min-w-[160px]">
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => switchSession(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <option value="" disabled>Select a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.schoolYear}){s.id === '1' ? ' ★ Main Election' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <Button
                onClick={() => setIsResetDialogOpen(true)}
                variant="outline"
                className="gap-2 h-10 px-3 sm:px-4 text-red-600 border-red-200 bg-red-50/60 hover:bg-red-100 hover:text-red-700 hover:border-red-300 font-semibold shadow-xs transition-all duration-200 rounded-xl whitespace-nowrap flex-shrink-0"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="hidden xs:inline sm:inline">Reset Session</span>
                <span className="inline xs:hidden sm:hidden">Reset</span>
              </Button>
            </div>
          </div>

          {/* Advisory banner if current session is empty but another session (like Session 1) exists */}
          {isDataLoaded && positions.length === 0 && candidates.length === 0 && sessions.length > 1 && (() => {
            const candidateSession = sessions.find(s => s.id === '1') || sessions.find(s => s.id !== activeSessionId);
            if (!candidateSession) return null;
            return (
              <div className="mb-6 p-4 rounded-2xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white flex-shrink-0 shadow-sm">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Currently viewing workspace: "{election?.name || 'Empty Session'}" (0 positions, 0 candidates)
                    </p>
                    <p className="text-xs text-blue-800 font-medium">
                      Your full election configuration is saved in "{candidateSession.name}". Click below to switch back to your main election data.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => switchSession(candidateSession.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-sm self-end sm:self-auto gap-1.5"
                >
                  <span>Switch to {candidateSession.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })()}

          {/* Election Status Banner */}
          <div className="mb-8 relative overflow-hidden rounded-2xl shadow-xl border-0 animate-fade-in group">
            <div className={`absolute inset-0 bg-gradient-to-br ${election?.isActive ? 'from-green-500 to-emerald-700' : 'from-slate-700 to-slate-900'} opacity-95 transition-colors duration-500`}></div>
            
            {/* Background decorative elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
            
            <div className="relative z-10 py-5 px-5 sm:px-8 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${election?.isActive ? 'bg-green-400/20 text-green-100' : 'bg-slate-500/20 text-slate-200'} backdrop-blur-sm flex-shrink-0`}>
                    {election?.isActive ? <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" /> : <Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {election?.isActive ? 'Voting is Now Live' : 'Election is Inactive'}
                  </h2>
                </div>
                <p className="text-sm text-white/80 font-medium max-w-xl leading-relaxed ml-11 hidden sm:block">
                  {election?.isActive 
                    ? 'Students can currently log in and cast their votes. Monitor the turnout and results in real-time.' 
                    : 'The election is currently closed. Set the schedule and click Launch Election to start voting.'}
                </p>
                {/* Schedule Status Badge */}
                <div className="mt-2 flex items-center gap-2 ml-11 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} border`}>
                    Schedule: {statusInfo.label}
                  </span>
                  {election && (
                    <span className="text-xs text-white/90 flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/20 font-medium truncate max-w-full">
                      <GraduationCap className="h-3.5 w-3.5 text-blue-200 flex-shrink-0" />
                      <span className="truncate">Assigned: {formatSessionEligibility(election)}</span>
                    </span>
                  )}
                  {election && (
                    <span className="text-xs text-white/60 flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 truncate max-w-full">
                      <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {(() => {
                          const start = election.startDate ? (election.startDate instanceof Date ? election.startDate : new Date(election.startDate)) : null;
                          return start && !isNaN(start.getTime()) ? start.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No start';
                        })()} 
                        <span className="mx-1 opacity-50">—</span>
                        {(() => {
                          const end = election.endDate ? (election.endDate instanceof Date ? election.endDate : new Date(election.endDate)) : null;
                          return end && !isNaN(end.getTime()) ? end.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No end';
                        })()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col md:flex-row gap-2 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <Button 
                  variant="outline" 
                  onClick={handleOpenSchedule}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all h-10 sm:h-11 px-4 sm:px-5 flex-1 md:flex-initial text-sm"
                >
                  <CalendarClock className="h-4 w-4" />
                  Set Schedule
                </Button>
                <Button 
                  onClick={handleToggleElection}
                  className={`gap-2 h-10 sm:h-11 px-4 sm:px-6 shadow-lg shadow-black/10 transition-all border-0 flex-1 md:flex-initial text-sm ${election?.isActive ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-gray-50 text-slate-900'}`}
                >
                  <Rocket className="h-4 w-4" />
                  {election?.isActive ? 'End Election' : 'Launch Election'}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="border-0 shadow-md hover:shadow-xl transition-all duration-200 group overflow-hidden relative bg-white"
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="w-full h-full" style={{ color: stat.iconColor }} />
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 rounded-2xl shadow-sm transition-transform group-hover:-translate-y-1 group-hover:scale-105 duration-200" style={{ background: stat.iconBg }}>
                      <stat.icon className="h-6 w-6" style={{ color: stat.iconColor }} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{stat.value}</p>
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Manage Section */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Management & Configuration</h2>
            <div className="h-px flex-1 bg-slate-200 ml-6 hidden sm:block"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
            {manageItems.map((item, index) => (
              <Card 
                key={index} 
                className="border border-slate-100 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group bg-white/80 backdrop-blur-sm overflow-hidden"
                onClick={item.onClick}
              >
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 left-0 w-1 h-0 bg-gradient-to-b group-hover:h-full transition-all duration-500 ease-out opacity-70" style={{ backgroundImage: `linear-gradient(to bottom, ${item.iconColor}, transparent)` }}></div>
                  
                  <div className="p-3.5 rounded-2xl w-fit mb-4 transition-transform group-hover:scale-110 duration-300" style={{ background: item.iconBg }}>
                    <item.icon className="h-6 w-6" style={{ color: item.iconColor }} />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1.5 text-lg tracking-tight">{item.title}</h3>
                  <p className="text-sm text-slate-500 mb-5 leading-relaxed">{item.description}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm font-semibold flex items-center gap-1.5 group-hover:gap-2 transition-all opacity-80 group-hover:opacity-100" style={{ color: item.iconColor }}>
                      Open <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>

        {/* Reset System Dialog */}
        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Reset Session Data?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action is <strong>permanent and cannot be undone</strong>. This will delete all cast votes, verifications, and clear the candidate tallies for the <strong>currently selected session</strong>.
                <br /><br />
                The session will be set back to 'upcoming'. Candidates and Voters will NOT be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleResetSystem();
                }}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isResetting ? 'Resetting...' : 'Yes, Clear Votes'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </main>

      <Footer />
    </div>
  );
}
