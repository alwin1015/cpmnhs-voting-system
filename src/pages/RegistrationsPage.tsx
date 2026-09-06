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
  Filter, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  AlertCircle,
  Users,
  Check
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
import { useNavigate } from 'react-router-dom';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Format date helper
  const formatDate = (date?: Date | string) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Metrics
  const totalStudents = voters.length;
  const pendingVoters = voters.filter(v => v.status === 'pending');
  const approvedVoters = voters.filter(v => v.status === 'approved');
  const rejectedVoters = voters.filter(v => v.status === 'rejected');
  const pendingCount = pendingVoters.length;

  // Filter voters by search & status
  const filteredVoters = useMemo(() => {
    return voters.filter(v => {
      // Search filter
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        (v.name || '').toLowerCase().includes(query) || 
        (v.lrn || '').toLowerCase().includes(query) ||
        (v.section || '').toLowerCase().includes(query);

      // Status filter
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [voters, searchQuery, statusFilter]);

  // Bulk Approve All
  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      const success = await approveAllVoters();
      if (success) {
        toast({
          title: 'All Registrations Approved!',
          description: `All ${pendingCount} pending registrations across Grade 7–12 have been approved.`,
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
        description: `${name} is now approved and can log in to vote.`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to approve student. Check database connection.',
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
             console.warn("Bulk upload errors:", result.errors);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          
          {/* Top Header & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Administration
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Student Registrations
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Organize, review, and approve registered students by Grade Level & Section
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Approve All Button */}
              <Button 
                onClick={() => setShowApproveAllDialog(true)}
                disabled={pendingCount === 0 || isApprovingAll}
                className={`text-white font-bold shadow-sm transition-all duration-200 h-10 px-4 rounded-xl ${
                  pendingCount > 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md ring-2 ring-emerald-500/20' 
                    : 'bg-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {pendingCount > 0 ? `Approve All (${pendingCount})` : 'All Approved'}
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

          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Total Registered</p>
                  <p className="text-xl font-extrabold text-slate-900">{totalStudents}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pending Approvals</p>
                  <p className="text-xl font-extrabold text-amber-600">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Approved Students</p>
                  <p className="text-xl font-extrabold text-emerald-600">{approvedVoters.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Rejected Signups</p>
                  <p className="text-xl font-extrabold text-rose-600">{rejectedVoters.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Search Bar */}
          <Card className="bg-white border-slate-200/80 shadow-xs rounded-xl mb-6">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row items-center gap-3 justify-between">
                
                {/* Search Input */}
                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by student name, LRN, or section..."
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

                {/* Grade Quick Jump Tabs */}
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
                    const countInGrade = voters.filter(v => v.gradeLevel === grade).length;
                    const pendingInGrade = voters.filter(v => v.gradeLevel === grade && v.status === 'pending').length;
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
                        {pendingInGrade > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            selectedGradeTab === grade ? 'bg-white text-blue-700' : 'bg-amber-500 text-white'
                          }`}>
                            {pendingInGrade}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 w-full lg:w-auto justify-end">
                  <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" />
                    Status:
                  </span>
                  {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                        statusFilter === status
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Grade 7–12 Tables Section */}
          <div className="space-y-8">
            {GRADES.filter(g => selectedGradeTab === 'all' || selectedGradeTab === g).map(grade => {
              // Students in this grade matching current search and status filters
              const gradeStudents = filteredVoters.filter(v => v.gradeLevel === grade);
              const totalInGrade = voters.filter(v => v.gradeLevel === grade).length;
              const pendingInGrade = voters.filter(v => v.gradeLevel === grade && v.status === 'pending').length;

              // All unique sections for this grade (from configured sections and students)
              const gradeDefinedSections = sections.filter(s => s.gradeLevel === grade).map(s => s.name);
              const studentSections = voters.filter(v => v.gradeLevel === grade).map(v => v.section).filter(Boolean);
              const uniqueSections = [...new Set([...gradeDefinedSections, ...studentSections])].sort();

              // Check if any unassigned students exist for this grade
              const hasUnassigned = voters.some(v => v.gradeLevel === grade && (!v.section || v.section === 'TBD'));
              const allSectionsToDisplay = hasUnassigned ? [...uniqueSections, 'Unassigned'] : uniqueSections;

              return (
                <div key={grade} className="bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden animate-fade-in">
                  
                  {/* Grade Banner Header */}
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
                          {totalInGrade} Registered Students • {allSectionsToDisplay.length} Section{allSectionsToDisplay.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pendingInGrade > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 shadow-xs">
                          <Clock className="w-3.5 h-3.5" />
                          {pendingInGrade} Pending Approval{pendingInGrade === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                          <Check className="w-3.5 h-3.5" />
                          All Up to Date
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Section Tables Container */}
                  <div className="p-4 sm:p-6 space-y-6">
                    {allSectionsToDisplay.length === 0 && gradeStudents.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">No students registered in Grade {grade} yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Students will appear here once they register or are uploaded.</p>
                      </div>
                    ) : (
                      allSectionsToDisplay.map(secName => {
                        const isUnassigned = secName === 'Unassigned';
                        const sectionStudents = gradeStudents.filter(v => 
                          isUnassigned ? (!v.section || v.section === 'TBD') : v.section === secName
                        );

                        // If user is searching/filtering and section has 0 matching students, don't show empty table
                        if (sectionStudents.length === 0 && (searchQuery || statusFilter !== 'all')) {
                          return null;
                        }

                        const secPendingCount = sectionStudents.filter(s => s.status === 'pending').length;

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
                                {secPendingCount > 0 && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[11px] font-bold">
                                    {secPendingCount} Pending
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Section Student Table */}
                            {sectionStudents.length > 0 ? (
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full text-left text-xs sm:text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                                      <th className="py-2.5 px-4">Student Name</th>
                                      <th className="py-2.5 px-4">LRN</th>
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
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
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

                                        {/* Date */}
                                        <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                                          {formatDate(student.createdAt)}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="py-3 px-4 text-center">
                                          {student.status === 'approved' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              <CheckCircle2 className="w-3.5 h-3.5" />
                                              Approved
                                            </span>
                                          )}
                                          {student.status === 'pending' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                              <Clock className="w-3.5 h-3.5" />
                                              Pending
                                            </span>
                                          )}
                                          {student.status === 'rejected' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                              <XCircle className="w-3.5 h-3.5" />
                                              Rejected
                                            </span>
                                          )}
                                          {student.status === 'graduated' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                              Graduated
                                            </span>
                                          )}
                                        </td>

                                        {/* Actions: Approve & Reject buttons */}
                                        <td className="py-3 px-4 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            {/* Approve Button */}
                                            {student.status !== 'approved' && (
                                              <Button
                                                size="sm"
                                                onClick={() => handleApprove(student.id, student.name)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 rounded-lg text-xs font-semibold shadow-2xs"
                                                title="Approve Registration"
                                              >
                                                <Check className="h-3.5 w-3.5 mr-1" />
                                                Approve
                                              </Button>
                                            )}

                                            {/* Reject Button with confirmation */}
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
                            ) : (
                              <div className="py-4 px-4 text-center text-xs text-slate-400 bg-white">
                                No registered students in this section yet.
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

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
              This will approve all <strong>{pendingCount} pending registrations</strong> across <strong>Grade 7 to Grade 12 and all sections</strong> at once. 
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
