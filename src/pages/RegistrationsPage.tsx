import { useRef, useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  ClipboardList, 
  User as UserIcon, 
  Upload, 
  CheckCheck, 
  Search, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Users,
  Check,
  ArrowRight
} from 'lucide-react';
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
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const GRADES = ['7', '8', '9', '10', '11', '12'];

export default function RegistrationsPage() {
  const { voters, approveVoter, rejectVoter, approveAllVoters, user, isLoggedIn, bulkRegister, sections } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [isUploading, setIsUploading] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [showApproveAllDialog, setShowApproveAllDialog] = useState(false);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeTab, setSelectedGradeTab] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'pending' | 'rejected'>('pending');

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Format date helper
  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Only students for approval (pending) and rejected signups
  const pendingVoters = useMemo(() => voters.filter(v => v.status === 'pending'), [voters]);
  const rejectedVoters = useMemo(() => voters.filter(v => v.status === 'rejected'), [voters]);
  const pendingCount = pendingVoters.length;

  // Active list based on view mode (strictly pending for approval by default)
  const activeList = viewMode === 'pending' ? pendingVoters : rejectedVoters;

  // Filter active list by search query
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return activeList;
    return activeList.filter(v => 
      (v.name || '').toLowerCase().includes(query) || 
      (v.lrn || '').toLowerCase().includes(query) ||
      (v.section || '').toLowerCase().includes(query)
    );
  }, [activeList, searchQuery]);

  // Bulk Approve All Pending
  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      const count = pendingCount;
      const success = await approveAllVoters();
      if (success) {
        toast({
          title: 'All Registrations Approved!',
          description: `Successfully approved ${count} student registration(s). They can now log in and vote.`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to approve all voters. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while approving voters.',
        variant: 'destructive',
      });
    } finally {
      setIsApprovingAll(false);
      setShowApproveAllDialog(false);
    }
  };

  // Individual Approve
  const handleApprove = async (id: string, name: string) => {
    const success = await approveVoter(id);
    if (success) {
      toast({
        title: 'Student Approved',
        description: `${name} is now approved and eligible to log in and vote.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to approve student. Check database permissions.',
        variant: 'destructive',
      });
    }
  };

  // Individual Reject
  const handleReject = async (id: string, name: string) => {
    const success = await rejectVoter(id);
    if (success) {
      toast({
        title: 'Registration Rejected',
        description: `${name}'s registration has been rejected.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to reject registration.',
        variant: 'destructive',
      });
    }
    setRejectConfirmId(null);
  };

  // Bulk Upload handler
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const rows = jsonData.slice(1);
        
        const students = rows.map((row: any) => ({
          lrn: row[0] ? String(row[0]).trim() : '',
          name: row[1] ? String(row[1]).trim() : '',
          gradeLevel: row[2] ? String(row[2]).trim() : '',
          section: row[3] ? String(row[3]).trim() : '',
          password: row[4] ? String(row[4]).trim() : '',
        })).filter((s) => s.lrn && s.name && s.gradeLevel && s.section && s.password);

        if (students.length === 0) {
          toast({
            title: 'Error',
            description: 'No valid students found. Ensure columns are: LRN, Name, Grade Level, Section, Password.',
            variant: 'destructive',
          });
          return;
        }

        const result = await bulkRegister(students);
        
        if (result.success) {
          toast({
            title: 'Bulk Upload Successful',
            description: result.message,
          });
          if (result.errors && result.errors.length > 0) {
             toast({
               title: 'Some rows skipped',
               description: `${result.errors.length} records were skipped (duplicates or missing fields).`,
               variant: 'destructive',
             });
          }
        } else {
          toast({
            title: 'Bulk Upload Failed',
            description: result.message,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: 'Failed to process the uploaded file.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p>Access Denied</p>
        </main>
        <Footer />
      </div>
    );
  }

  // Check how many grades have pending students
  const gradesWithPending = GRADES.filter(g => pendingVoters.some(v => v.gradeLevel === g));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          
          {/* Top Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Awaiting Approval
                </span>
                <span className="text-xs text-slate-400">•</span>
                <Link to="/voters" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  View Approved Voters ({voters.filter(v => v.status === 'approved').length}) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Student Registrations for Approval
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Review and approve student signups organized by Grade Level & Section
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Approve All Button */}
              <Button 
                onClick={() => setShowApproveAllDialog(true)}
                disabled={pendingCount === 0 || isApprovingAll}
                className={`text-white font-bold shadow-sm transition-all duration-200 h-10 px-5 rounded-xl flex items-center gap-2 ${
                  pendingCount > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md ring-2 ring-emerald-500/20 active:scale-95' 
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCheck className="h-4 w-4" />
                {pendingCount > 0 ? `Approve All (${pendingCount})` : 'No Pending Students'}
              </Button>

              {/* Bulk Upload Button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleBulkUpload} 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden" 
              />
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs"
              >
                <Upload className="h-4 w-4 mr-2 text-slate-500" />
                {isUploading ? 'Uploading...' : 'Bulk Upload'}
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pending Approvals</p>
                  <p className="text-2xl font-extrabold text-amber-600">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Grade Levels with Pending</p>
                  <p className="text-2xl font-extrabold text-slate-900">{gradesWithPending.length} of 6</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden col-span-2 sm:col-span-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Rejected Signups</p>
                  <p className="text-2xl font-extrabold text-rose-600">{rejectedVoters.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Navigation Bar */}
          <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl mb-6">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row items-center gap-3 justify-between">
                
                {/* Search Input */}
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search pending by name, LRN, or section..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 rounded-lg bg-slate-50/50 border-slate-200 text-sm focus:bg-white transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Grade Selector Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto py-1 custom-scrollbar">
                  <button
                    onClick={() => setSelectedGradeTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedGradeTab === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Grades
                  </button>
                  {GRADES.map(grade => {
                    const countInGrade = pendingVoters.filter(v => v.gradeLevel === grade).length;
                    return (
                      <button
                        key={grade}
                        onClick={() => setSelectedGradeTab(grade)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          selectedGradeTab === grade
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Grade {grade}
                        {countInGrade > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                            selectedGradeTab === grade ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'
                          }`}>
                            {countInGrade}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Mode Toggle: Pending Approval vs Rejected */}
                <div className="flex items-center gap-1 w-full lg:w-auto justify-end">
                  <button
                    onClick={() => setViewMode('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      viewMode === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setViewMode('rejected')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      viewMode === 'rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Rejected ({rejectedVoters.length})
                  </button>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Grade 7–12 Tables Section for Pending Approvals */}
          {filteredStudents.length === 0 ? (
            <Card className="bg-white border-slate-200/80 shadow-xs rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {searchQuery 
                  ? 'No matching students found' 
                  : viewMode === 'pending' 
                  ? 'No Pending Registrations' 
                  : 'No Rejected Registrations'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                {searchQuery
                  ? 'Try searching with a different name, LRN, or section.'
                  : viewMode === 'pending'
                  ? 'All student registrations have been approved! Registered students can now log in and vote.'
                  : 'There are currently no rejected student registrations.'}
              </p>
              <Button 
                variant="outline"
                onClick={() => navigate('/voters')}
                className="rounded-xl"
              >
                Go to Approved Voters List
              </Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {GRADES.filter(g => selectedGradeTab === 'all' || selectedGradeTab === g).map(grade => {
                // Students in this grade for current view
                const gradeStudents = filteredStudents.filter(v => v.gradeLevel === grade);

                // If no students in this grade matching current filter, skip unless specifically filtered to this grade
                if (gradeStudents.length === 0 && selectedGradeTab === 'all') {
                  return null;
                }

                // All unique sections present in this grade's students
                const gradeDefinedSections = sections.filter(s => s.gradeLevel === grade).map(s => s.name);
                const studentSections = gradeStudents.map(v => v.section).filter(Boolean);
                const uniqueSections = [...new Set([...gradeDefinedSections, ...studentSections])].sort();

                // Check if unassigned exists
                const hasUnassigned = gradeStudents.some(v => !v.section || v.section === 'TBD');
                const allSectionsToDisplay = hasUnassigned ? [...uniqueSections, 'Unassigned'] : uniqueSections;

                return (
                  <div key={grade} className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden animate-fade-in">
                    
                    {/* Grade Header */}
                    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center font-extrabold text-lg text-white">
                          {grade}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                            Grade {grade} Registrations
                          </h2>
                          <p className="text-xs text-blue-100/80">
                            {gradeStudents.length} student{gradeStudents.length === 1 ? '' : 's'} awaiting action in Grade {grade}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 shadow-xs">
                          <Clock className="w-3.5 h-3.5" />
                          {gradeStudents.length} {viewMode === 'pending' ? 'Pending' : 'Rejected'}
                        </span>
                      </div>
                    </div>

                    {/* Section Tables Container */}
                    <div className="p-4 sm:p-6 space-y-6">
                      {gradeStudents.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                          No {viewMode} students in Grade {grade}.
                        </div>
                      ) : (
                        allSectionsToDisplay.map(secName => {
                          const isUnassigned = secName === 'Unassigned';
                          const sectionStudents = gradeStudents.filter(v => 
                            isUnassigned ? (!v.section || v.section === 'TBD') : v.section === secName
                          );

                          // If no students in this section, skip
                          if (sectionStudents.length === 0) {
                            return null;
                          }

                          return (
                            <div 
                              key={secName}
                              className="border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50/40 shadow-2xs"
                            >
                              {/* Section Sub-Header */}
                              <div className="bg-slate-100/90 border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span className="font-bold text-slate-800 text-sm">
                                    {isUnassigned ? 'Unassigned Section' : `Section: ${secName}`}
                                  </span>
                                  <Badge variant="secondary" className="text-[11px] font-semibold bg-white border border-slate-200/80 text-slate-700">
                                    {sectionStudents.length} Student{sectionStudents.length === 1 ? '' : 's'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Section Student Table */}
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left text-xs sm:text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                                      <th className="py-2.5 px-4">Student Name</th>
                                      <th className="py-2.5 px-4">LRN</th>
                                      <th className="py-2.5 px-4">Grade & Section</th>
                                      <th className="py-2.5 px-4">Registration Date</th>
                                      <th className="py-2.5 px-4 text-center">Status</th>
                                      <th className="py-2.5 px-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {sectionStudents.map((student, idx) => (
                                      <tr 
                                        key={student.id} 
                                        className="hover:bg-slate-50/70 transition-colors"
                                      >
                                        <td className="py-3 px-3 text-center text-slate-400 font-medium text-xs">
                                          {idx + 1}
                                        </td>
                                        
                                        {/* Student Info */}
                                        <td className="py-3 px-4">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                                              {student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <p className="font-bold text-slate-900 leading-tight">
                                                {student.name}
                                              </p>
                                              <p className="text-[11px] text-slate-400">
                                                Grade {student.gradeLevel} • {student.section || 'No section'}
                                              </p>
                                            </div>
                                          </div>
                                        </td>

                                        {/* LRN */}
                                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                                          {student.lrn || 'N/A'}
                                        </td>

                                        {/* Grade & Section */}
                                        <td className="py-3 px-4 text-slate-600 text-xs">
                                          Grade {student.gradeLevel} - {student.section || 'Unassigned'}
                                        </td>

                                        {/* Date */}
                                        <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                          {formatDate(student.createdAt)}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="py-3 px-4 text-center">
                                          {student.status === 'pending' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                              <Clock className="w-3.5 h-3.5" />
                                              Pending
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                              <XCircle className="w-3.5 h-3.5" />
                                              Rejected
                                            </span>
                                          )}
                                        </td>

                                        {/* Actions: Approve & Reject buttons */}
                                        <td className="py-3 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {/* Approve Button */}
                                            <Button
                                              size="sm"
                                              onClick={() => handleApprove(student.id, student.name)}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3 rounded-lg text-xs font-semibold shadow-2xs active:scale-95"
                                              title="Approve Student"
                                            >
                                              <Check className="h-3.5 w-3.5 mr-1" />
                                              Approve
                                            </Button>

                                            {/* Reject Button with inline confirmation */}
                                            {rejectConfirmId === student.id ? (
                                              <div className="flex items-center gap-1">
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleReject(student.id, student.name)}
                                                  className="bg-rose-600 hover:bg-rose-700 text-white h-8 px-2.5 rounded-lg text-xs font-semibold"
                                                >
                                                  Confirm
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setRejectConfirmId(null)}
                                                  className="h-8 px-2 rounded-lg text-xs"
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            ) : (
                                              student.status !== 'rejected' && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => setRejectConfirmId(student.id)}
                                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2 rounded-lg text-xs font-medium"
                                                  title="Reject Registration"
                                                >
                                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                                  Reject
                                                </Button>
                                              )
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>

      <Footer />

      {/* Approve All Confirmation Dialog */}
      <AlertDialog open={showApproveAllDialog} onOpenChange={setShowApproveAllDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <CheckCheck className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">
              Approve All Pending Registrations?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-1.5">
              This will approve all <strong>{pendingCount} pending registration(s)</strong> across <strong>Grade 7 to Grade 12 and all sections</strong> at once. 
              <br /><br />
              All approved students will immediately be able to log in and cast their votes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 gap-2">
            <AlertDialogCancel disabled={isApprovingAll} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleApproveAll();
              }}
              disabled={isApprovingAll || pendingCount === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              {isApprovingAll ? 'Approving All...' : `Yes, Approve All (${pendingCount})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
