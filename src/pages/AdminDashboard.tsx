import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVoting } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import { generateAuthorizationDocx } from '@/lib/generateAuthorizationDocx';
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
  Download,
  Lock,
  Unlock,
  ChevronRight,
  X,
  Check,
  FileCheck,
  Pen,
  Layers,
  History,
} from 'lucide-react';

type ScheduleStep = 'details' | 'signatories' | 'authorization' | 'activate';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100' },
  pending_authorization: { label: 'Pending Authorization', color: 'text-amber-700', bg: 'bg-amber-50' },
  authorized: { label: 'Authorized', color: 'text-blue-700', bg: 'bg-blue-50' },
  scheduled: { label: 'Scheduled', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  ongoing: { label: 'Ongoing', color: 'text-green-700', bg: 'bg-green-50' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50' },
};

const STEP_LABELS: { key: ScheduleStep; label: string; icon: any }[] = [
  { key: 'details', label: 'Schedule Details', icon: CalendarClock },
  { key: 'signatories', label: 'Signatories', icon: Pen },
  { key: 'authorization', label: 'Authorization', icon: FileCheck },
  { key: 'activate', label: 'Activate', icon: Rocket },
];

export default function AdminDashboard() {
  const { user, isLoggedIn, election, candidates, positions, getResults, voters, sections, updateElection, resetSystem, sessions, activeSessionId, switchSession, currentSchoolYear, processRollover } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Schedule panel state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleStep, setScheduleStep] = useState<ScheduleStep>('details');
  const [isMappingsOpen, setIsMappingsOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLaunchDialogOpen, setIsLaunchDialogOpen] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Schedule detail fields
  const [editName, setEditName] = useState('');
  const [editSchoolYear, setEditSchoolYear] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  // Signatory fields
  const [preparedByName, setPreparedByName] = useState('');
  const [preparedByPosition, setPreparedByPosition] = useState('Election Committee Chairman');
  const [approvedByName, setApprovedByName] = useState('');
  const [approvedByPosition, setApprovedByPosition] = useState('School Principal');

  // Grade Mappings state
  const GRADES = ['7', '8', '9', '10', '11', '12'];
  const [editMappings, setEditMappings] = useState<Record<string, string>>({});

  const scheduleStatus = election?.scheduleStatus || 'draft';
  const statusInfo = STATUS_LABELS[scheduleStatus] || STATUS_LABELS.draft;

  const handleOpenSchedule = () => {
    setEditName(election?.name || '');
    setEditSchoolYear(election?.schoolYear || '');
    
    const formatDate = (d?: Date) => {
      if (!d || isNaN(d.getTime())) return '';
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    };
    const formatTime = (d?: Date) => {
      if (!d || isNaN(d.getTime())) return '';
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[1].slice(0, 5);
    };

    setEditStartDate(formatDate(election?.startDate));
    setEditStartTime(formatTime(election?.startDate));
    setEditEndDate(formatDate(election?.endDate));
    setEditEndTime(formatTime(election?.endDate));

    // Load signatories if they exist
    const sigs = election?.signatories;
    setPreparedByName(sigs?.preparedBy?.name || '');
    setPreparedByPosition(sigs?.preparedBy?.position || 'Election Committee Chairman');
    setApprovedByName(sigs?.approvedBy?.name || '');
    setApprovedByPosition(sigs?.approvedBy?.position || 'School Principal');

    // Determine which step to show based on status
    if (scheduleStatus === 'authorized' || scheduleStatus === 'scheduled') {
      setScheduleStep('activate');
    } else if (scheduleStatus === 'pending_authorization') {
      setScheduleStep('authorization');
    } else {
      setScheduleStep('details');
    }

    setIsScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editName.trim()) {
      toast({ title: 'Error', description: 'Please enter an election name.', variant: 'destructive' });
      return;
    }
    const parseDateTime = (d: string, t: string) => {
      if (!d) return new Date('');
      return new Date(`${d}T${t || '00:00'}`);
    };

    setScheduleStep('signatories');
    toast({ title: 'Schedule Saved', description: 'Election details saved as Draft.' });

    updateElection({
      name: editName,
      schoolYear: editSchoolYear,
      startDate: parseDateTime(editStartDate, editStartTime),
      endDate: parseDateTime(editEndDate, editEndTime),
      scheduleStatus: 'draft',
    }).catch(err => console.error('Schedule update error:', err));
  };

  const handleSaveSignatories = async () => {
    setScheduleStep('authorization');
    toast({ title: 'Signatories Saved', description: 'Signatory details have been recorded.' });

    updateElection({
      signatories: {
        preparedBy: { name: preparedByName, position: preparedByPosition },
        approvedBy: { name: approvedByName, position: approvedByPosition },
      },
    }).catch(err => console.error('Signatories update error:', err));
  };

  const handleGenerateDocx = async () => {
    setIsGeneratingDoc(true);
    try {
      const parseDateTime = (d: string, t: string) => {
        if (!d) return null;
        return new Date(`${d}T${t || '00:00'}`);
      };

      const startDt = parseDateTime(editStartDate, editStartTime);
      const endDt = parseDateTime(editEndDate, editEndTime);

      await generateAuthorizationDocx({
        schoolName: 'CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL',
        schoolAddress: 'Cabad, Balilihan, Bohol',
        electionTitle: editName || 'SSG General Election',
        schoolYear: editSchoolYear || '2026-2027',
        electionDate: startDt ? startDt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '(To be determined)',
        startTime: startDt ? startDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        endTime: endDt ? endDt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
        gradeLevels: GRADES,
        preparedByName,
        preparedByPosition,
        approvedByName,
        approvedByPosition,
      });

      updateElection({
        authorizationDocGenerated: true,
        scheduleStatus: 'pending_authorization',
        signatories: {
          preparedBy: { name: preparedByName, position: preparedByPosition },
          approvedBy: { name: approvedByName, position: approvedByPosition },
        },
      }).catch(err => console.error('Docx election update error:', err));

      toast({ title: 'Document Generated', description: 'The authorization letter (.docx) has been downloaded. Open it in Microsoft Word to edit and print.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to generate the document.', variant: 'destructive' });
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleConfirmAuthorization = async () => {
    setScheduleStep('activate');
    toast({ title: 'Authorization Confirmed', description: 'The election schedule has been authorized. You can now activate it.' });

    updateElection({
      scheduleStatus: 'authorized',
      authorizationConfirmedAt: new Date().toISOString(),
    }).catch(err => console.error('Confirm authorization error:', err));
  };

  const handleActivateSchedule = async () => {
    setIsScheduleOpen(false);
    toast({ title: 'Schedule Activated', description: 'The election is now scheduled. Use "Launch Election" to start voting.' });

    updateElection({ scheduleStatus: 'scheduled' }).catch(err => console.error('Activate schedule error:', err));
  };

  const handleOpenMappings = () => {
    setEditMappings(election?.gradeMappings || {});
    setIsMappingsOpen(true);
  };

  const handleSaveMappings = async () => {
    setIsMappingsOpen(false);
    toast({ title: 'Mappings Saved', description: 'Candidate grade mappings have been updated.' });
    updateElection({ gradeMappings: editMappings }).catch(err => console.error('Save mappings error:', err));
  };

  const canLaunchElection = scheduleStatus === 'authorized' || scheduleStatus === 'scheduled';

  const handleToggleElection = async () => {
    if (!election) return;

    if (election.isActive) {
      // End election
      await updateElection({ isActive: false, scheduleStatus: 'completed' });
      toast({ title: 'Election Ended', description: 'Voting has been closed.' });
    } else {
      // Check if schedule is authorized before launching
      if (!canLaunchElection) {
        setIsLaunchDialogOpen(true);
        return;
      }

      // Check for School Year Rollover
      if (currentSchoolYear && election.schoolYear && currentSchoolYear !== election.schoolYear) {
        try {
          const updates = voters.map(v => {
            if (v.status === 'graduated' || v.status === 'inactive' || !v.gradeLevel) return null;
            let nextGrade = v.gradeLevel;
            let nextStatus = v.status;
            const numGrade = parseInt(v.gradeLevel, 10);
            if (!isNaN(numGrade)) {
              if (numGrade < 12) {
                nextGrade = (numGrade + 1).toString();
              } else if (numGrade === 12) {
                nextGrade = 'Graduated';
                nextStatus = 'graduated';
              }
            }
            return {
              id: v.id,
              grade_level: nextGrade,
              section: 'TBD',
              status: nextStatus,
              academic_history: [...(v.academicHistory || []), { schoolYear: currentSchoolYear, gradeLevel: v.gradeLevel, section: v.section }]
            };
          }).filter(Boolean) as any[];

          if (updates.length > 0) {
            await processRollover(election.schoolYear, updates);
            toast({ title: 'School Year Updated', description: `Voters automatically promoted for ${election.schoolYear}. Grade 12 students graduated.` });
          }
        } catch (err) {
          console.error("Rollover failed", err);
          toast({ title: 'Rollover Error', description: 'Failed to automatically promote students.', variant: 'destructive' });
        }
      }

      await updateElection({ isActive: true, scheduleStatus: 'ongoing' });
      toast({ title: 'Election Launched!', description: 'Students can now cast their votes.' });
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
  const voterTurnoutStr = election && election.totalVoters > 0 
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

  // ------ STEP RENDERERS ------

  const renderStepDetails = () => (
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
        <Button variant="outline" onClick={() => setIsScheduleOpen(false)} className="text-xs">Cancel</Button>
        <Button onClick={handleSaveSchedule} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
          Save & Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderSignatoryInput = (label: string, name: string, setName: (v: string) => void, position: string, setPosition: (v: string) => void) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-white border border-slate-200">
      <div className="sm:col-span-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</p>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-500">Full Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm bg-slate-50" placeholder="e.g. Juan Dela Cruz" />
      </div>
      <div className="space-y-1">
        <Label className="text-[11px] text-slate-500">Position / Designation</Label>
        <Input value={position} onChange={e => setPosition(e.target.value)} className="h-9 text-sm bg-slate-50" placeholder="e.g. Election Committee Chairman" />
      </div>
    </div>
  );

  const renderStepSignatories = () => (
    <div className="space-y-3 animate-fade-in">
      <p className="text-xs text-slate-500 leading-relaxed">
        Enter the names and designations of the school personnel who will prepare and approve the official election authorization letter.
      </p>
      {renderSignatoryInput('Prepared by', preparedByName, setPreparedByName, preparedByPosition, setPreparedByPosition)}
      {renderSignatoryInput('Approved by', approvedByName, setApprovedByName, approvedByPosition, setApprovedByPosition)}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={() => setScheduleStep('details')} className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <Button onClick={handleSaveSignatories} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
          Save & Continue <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );

  const renderStepAuthorization = () => (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-800">Election Summary</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <span className="text-slate-500 font-medium">Title:</span>
          <span className="text-slate-800 font-semibold">{editName || election?.name || '—'}</span>
          <span className="text-slate-500 font-medium">School Year:</span>
          <span className="text-slate-800">{editSchoolYear || election?.schoolYear || '—'}</span>
          <span className="text-slate-500 font-medium">Date:</span>
          <span className="text-slate-800">{editStartDate || '—'}</span>
          <span className="text-slate-500 font-medium">Time:</span>
          <span className="text-slate-800">{editStartTime || '—'} – {editEndTime || '—'}</span>
          <span className="text-slate-500 font-medium">Grade Levels:</span>
          <span className="text-slate-800">{GRADES.map(g => `G${g}`).join(', ')}</span>
        </div>
      </div>

      {/* Signatories Summary */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <h4 className="text-sm font-bold text-slate-800">Signatories (Signature Over Printed Name)</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Prepared by:</span>
            <span className="font-bold text-slate-900 uppercase">{preparedByName || '—'} <span className="font-normal text-slate-500 normal-case">({preparedByPosition || 'Election Committee Chairman'})</span></span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 font-medium">Approved by:</span>
            <span className="font-bold text-slate-900 uppercase">{approvedByName || '—'} <span className="font-normal text-slate-500 normal-case">({approvedByPosition || 'School Principal'})</span></span>
          </div>
        </div>
      </div>

      {/* Generate Document */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 text-center space-y-2">
        <FileText className="h-8 w-8 text-blue-500 mx-auto" />
        <p className="text-sm font-bold text-slate-800">Official Authorization Letter</p>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          Generate an editable Word document (.docx) with the election details and signature blocks. Open and edit in Microsoft Word before printing.
        </p>
        <Button 
          onClick={handleGenerateDocx} 
          disabled={isGeneratingDoc}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-5 mx-auto"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {isGeneratingDoc ? 'Generating...' : 'Generate Word Document (.docx)'}
        </Button>
        {election?.authorizationDocGenerated && (
          <p className="text-[11px] text-green-600 font-semibold flex items-center justify-center gap-1 mt-1">
            <Check className="h-3 w-3" /> Document previously generated
          </p>
        )}
      </div>

      {/* Confirm Authorization */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
        <p className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Important: Confirm only after obtaining all required physical signatures.
        </p>
        <p className="text-[11px] text-amber-700 leading-relaxed">
          By confirming, you attest that the printed authorization letter has been signed by all designated school personnel.
        </p>
      </div>

      <div className="flex justify-between gap-2 pt-1">
        <Button variant="outline" onClick={() => setScheduleStep('signatories')} className="text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <Button 
          onClick={handleConfirmAuthorization} 
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!election?.authorizationDocGenerated}
        >
          <Lock className="h-3.5 w-3.5 mr-1" />
          Confirm Authorization
        </Button>
      </div>
    </div>
  );

  const renderStepActivate = () => {
    const isAuthorized = scheduleStatus === 'authorized' || scheduleStatus === 'scheduled';
    return (
      <div className="space-y-4 animate-fade-in text-center">
        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${isAuthorized ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          {isAuthorized ? <CheckCircle className="h-8 w-8 stroke-[2]" /> : <Clock className="h-8 w-8" />}
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          {isAuthorized ? 'Schedule is Authorized!' : 'Authorization Required'}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {isAuthorized
            ? 'The election schedule has been authorized. You can now activate it and launch the election from the dashboard.'
            : 'Complete the authorization process before activating the schedule.'}
        </p>
        {election?.authorizationConfirmedAt && (
          <p className="text-[11px] text-slate-400">
            Authorized on: {new Date(election.authorizationConfirmedAt).toLocaleString()}
          </p>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={() => setScheduleStep('authorization')} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
          {isAuthorized && scheduleStatus !== 'scheduled' && (
            <Button onClick={handleActivateSchedule} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              <Rocket className="h-3.5 w-3.5 mr-1" />
              Activate Schedule
            </Button>
          )}
          {scheduleStatus === 'scheduled' && (
            <Button onClick={() => setIsScheduleOpen(false)} className="text-xs bg-slate-700 hover:bg-slate-800 text-white">
              Close — Ready to Launch
            </Button>
          )}
        </div>
      </div>
    );
  };

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

              {/* Step Indicator */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                <div className="flex items-center justify-between gap-1">
                  {STEP_LABELS.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = scheduleStep === step.key;
                    const stepIdx = STEP_LABELS.findIndex(s => s.key === scheduleStep);
                    const isPast = i < stepIdx;
                    return (
                      <button
                        key={step.key}
                        onClick={() => setScheduleStep(step.key)}
                        className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all text-center ${
                          isActive
                            ? 'bg-blue-50 border border-blue-200'
                            : isPast
                            ? 'opacity-70 hover:bg-slate-100'
                            : 'opacity-40 hover:opacity-60'
                        }`}
                      >
                        <StepIcon className={`h-4 w-4 ${isActive ? 'text-blue-600' : isPast ? 'text-green-600' : 'text-slate-400'}`} />
                        <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                          {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step Content */}
              <CardContent className="p-5 max-h-[60vh] overflow-y-auto">
                {scheduleStep === 'details' && renderStepDetails()}
                {scheduleStep === 'signatories' && renderStepSignatories()}
                {scheduleStep === 'authorization' && renderStepAuthorization()}
                {scheduleStep === 'activate' && renderStepActivate()}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grade Mappings Modal Overlay */}
        {isMappingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-lg mx-4 animate-in zoom-in-95 shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Settings className="w-5 h-5 text-purple-200" />
                    Candidate Grade Mapping
                  </h2>
                  <p className="text-sm text-purple-100 mt-2 opacity-90 leading-relaxed">
                    Configure voting rules. Students will only see candidates from their mapped grade for restricted positions.
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
                          {GRADES.map(g => (
                            <option key={g} value={g}>Grade {g} Candidates</option>
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
                  <Button variant="outline" onClick={() => setIsMappingsOpen(false)} className="hover:bg-gray-100">Cancel</Button>
                  <Button onClick={handleSaveMappings} className="shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)', color: 'white' }}>Save Mappings</Button>
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
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Session Selector */}
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => switchSession(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm rounded-xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-slate-100 transition-colors cursor-pointer"
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
              <Button
                onClick={() => setIsResetDialogOpen(true)}
                variant="outline"
                className="gap-2 h-10 px-4 text-red-600 border-red-200 bg-red-50/60 hover:bg-red-100 hover:text-red-700 hover:border-red-300 font-semibold shadow-xs transition-all duration-200 rounded-xl whitespace-nowrap"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Reset Session
              </Button>
            </div>
          </div>

          {/* Election Status Banner */}
          <div className="mb-8 relative overflow-hidden rounded-2xl shadow-xl border-0 animate-fade-in group">
            <div className={`absolute inset-0 bg-gradient-to-br ${election?.isActive ? 'from-green-500 to-emerald-700' : 'from-slate-700 to-slate-900'} opacity-95 transition-colors duration-500`}></div>
            
            {/* Background decorative elements */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
            
            <div className="relative z-10 py-6 px-8 sm:px-10 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${election?.isActive ? 'bg-green-400/20 text-green-100' : 'bg-slate-500/20 text-slate-200'} backdrop-blur-sm`}>
                    {election?.isActive ? <CheckCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {election?.isActive ? 'Voting is Now Live' : 'Election is Inactive'}
                  </h2>
                </div>
                <p className="text-sm md:text-base text-white/80 font-medium max-w-xl leading-relaxed ml-11">
                  {election?.isActive 
                    ? 'Students can currently log in and cast their votes. Monitor the turnout and results in real-time.' 
                    : 'The election is currently closed. Set the schedule and complete authorization before launching.'}
                </p>
                {/* Schedule Status Badge */}
                <div className="mt-3 flex items-center gap-2 ml-11 flex-wrap">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} border`}>
                    Schedule: {statusInfo.label}
                  </span>
                  {election && (
                    <span className="text-xs text-white/60 flex items-center gap-1.5 bg-black/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {election.startDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} 
                      <span className="mx-1 opacity-50">—</span>
                      {election.endDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap md:flex-col lg:flex-row gap-3 flex-shrink-0 justify-end w-full md:w-auto mt-4 md:mt-0">
                <Button 
                  variant="outline" 
                  onClick={handleOpenSchedule}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all h-11 px-5"
                >
                  <CalendarClock className="h-4 w-4" />
                  Set Schedule
                </Button>
                <Button 
                  onClick={handleToggleElection}
                  className={`gap-2 h-11 px-6 shadow-lg shadow-black/10 transition-all border-0 ${election?.isActive ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-white hover:bg-gray-50 text-slate-900'}`}
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

        {/* Launch Blocked Dialog */}
        <AlertDialog open={isLaunchDialogOpen} onOpenChange={setIsLaunchDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                <Lock className="h-5 w-5" />
                Authorization Required
              </AlertDialogTitle>
              <AlertDialogDescription>
                The election cannot be launched because the schedule has not been properly authorized yet.
                <br /><br />
                Please complete the following steps first:
                <br />
                1. Set the election schedule details
                <br />
                2. Enter signatory names
                <br />
                3. Generate the official authorization letter (.docx)
                <br />
                4. Confirm authorization after obtaining physical signatures
                <br />
                5. Activate the schedule
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  setIsLaunchDialogOpen(false);
                  handleOpenSchedule();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CalendarClock className="h-4 w-4 mr-1.5" />
                Open Set Schedule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <Footer />
    </div>
  );
}
