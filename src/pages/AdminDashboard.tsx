import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVoting } from '@/contexts/VotingContext';
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
  LayoutGrid,
  MapPin,
  ClipboardList,
  AlertTriangle,
  Settings
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoggedIn, election, candidates, positions, getResults, voters, updateElection, resetSystem } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isMappingsOpen, setIsMappingsOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSchoolYear, setEditSchoolYear] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
  // Grade Mappings state
  const GRADES = ['7', '8', '9', '10', '11', '12'];
  const [editMappings, setEditMappings] = useState<Record<string, string>>({});

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
    setIsScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    const parseDateTime = (d: string, t: string) => {
      if (!d) return new Date('');
      return new Date(`${d}T${t || '00:00'}`);
    };

    await updateElection({
      name: editName,
      schoolYear: editSchoolYear,
      startDate: parseDateTime(editStartDate, editStartTime),
      endDate: parseDateTime(editEndDate, editEndTime)
    });
    setIsScheduleOpen(false);
  };

  const handleOpenMappings = () => {
    setEditMappings(election?.gradeMappings || {});
    setIsMappingsOpen(true);
  };

  const handleSaveMappings = async () => {
    await updateElection({ gradeMappings: editMappings });
    setIsMappingsOpen(false);
  };

  const handleToggleElection = async () => {
    if (election) {
      await updateElection({ isActive: !election.isActive });
    }
  };

  const handleResetSystem = async () => {
    setIsResetting(true);
    try {
      await resetSystem();
      toast({
        title: "System Reset Successful",
        description: "All votes, candidates, and voters have been permanently deleted.",
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
    ? `${Math.round((election.totalVoted / election.totalVoters) * 100)}%` 
    : 'Result';

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
      title: 'Results',
      description: 'View election results',
      icon: BarChart3,
      iconColor: '#0891b2',
      iconBg: '#ecfeff',
      onClick: () => navigate('/results'),
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-6 relative">
        {/* Schedule Modal Overlay */}
        {isScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <Card className="w-full max-w-md mx-4 animate-in zoom-in-95">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-xl font-bold">Election Schedule</h2>
                <div className="space-y-2">
                  <Label>Election Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>School Year</Label>
                  <Input value={editSchoolYear} onChange={e => setEditSchoolYear(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveSchedule} style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white' }}>Save</Button>
                </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-slate-500">Welcome back, {user?.name || 'Administrator'}. Manage elections and student voting.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsResetDialogOpen(true)}
                variant="outline"
                className="gap-2 h-10 px-4 text-red-600 border-red-200 bg-red-50/60 hover:bg-red-100 hover:text-red-700 hover:border-red-300 font-semibold shadow-xs transition-all duration-200 rounded-xl"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Reset Data
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
                    : 'The election is currently closed. Configure the schedule or manage candidates before launching.'}
                </p>
                {election && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-white/70 bg-black/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 ml-11">
                    <CalendarClock className="h-4 w-4" />
                    <span>
                      {election.startDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} 
                      <span className="mx-2 opacity-50">—</span>
                      {election.endDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                )}
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
                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 animate-fade-in group overflow-hidden relative bg-white"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500">
                  <stat.icon className="w-full h-full" style={{ color: stat.iconColor }} />
                </div>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 rounded-2xl shadow-sm transition-transform group-hover:-translate-y-1 group-hover:scale-105 duration-300" style={{ background: stat.iconBg }}>
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
                className="border border-slate-100 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fade-in group bg-white/80 backdrop-blur-sm overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
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
                Reset Entire System?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action is <strong>permanent and cannot be undone</strong>. This will delete all cast votes, remove all candidates, and delete all registered voters from the system.
                <br /><br />
                The election will also be paused. Only do this if you are preparing for a new school year or a brand new election.
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
                {isResetting ? 'Resetting...' : 'Yes, Delete Everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <Footer />
    </div>
  );
}
