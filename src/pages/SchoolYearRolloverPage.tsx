import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVoting } from '@/contexts/VotingContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, ArrowRight, ArrowLeft, GraduationCap, History, AlertTriangle } from 'lucide-react';
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

export default function SchoolYearRolloverPage() {
  const { user, isLoggedIn, voters, currentSchoolYear, processRollover } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [nextSchoolYear, setNextSchoolYear] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute what will happen
  const preview = useMemo(() => {
    const summary: Record<string, { count: number; nextGrade: string; status: string }> = {};

    voters.forEach(v => {
      if (v.status === 'graduated' || v.status === 'inactive') return;
      
      const currentGrade = v.gradeLevel;
      if (!currentGrade) return;

      if (!summary[currentGrade]) {
        let nextGrade = '';
        let nextStatus = v.status;
        
        const numGrade = parseInt(currentGrade, 10);
        if (!isNaN(numGrade)) {
          if (numGrade < 12) {
            nextGrade = (numGrade + 1).toString();
          } else if (numGrade === 12) {
            nextGrade = 'Graduated';
            nextStatus = 'graduated';
          } else {
            nextGrade = currentGrade;
          }
        } else {
          nextGrade = currentGrade;
        }

        summary[currentGrade] = { count: 0, nextGrade, status: nextStatus };
      }
      
      summary[currentGrade].count++;
    });

    return Object.entries(summary).map(([grade, data]) => ({
      currentGrade: grade,
      ...data
    })).sort((a, b) => {
      const aNum = parseInt(a.currentGrade, 10);
      const bNum = parseInt(b.currentGrade, 10);
      return (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
    });
  }, [voters]);

  const handleExecuteRollover = async () => {
    if (!nextSchoolYear.trim()) {
      toast({ title: 'Error', description: 'Please enter the next school year.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const updates = voters.map(v => {
        if (v.status === 'graduated' || v.status === 'inactive' || !v.gradeLevel) {
          return null;
        }

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

        const historyRecord = {
          schoolYear: currentSchoolYear,
          gradeLevel: v.gradeLevel,
          section: v.section
        };

        return {
          id: v.id,
          grade_level: nextGrade,
          section: 'TBD', // Clear section
          status: nextStatus,
          academic_history: [...(v.academicHistory || []), historyRecord]
        };
      }).filter(Boolean) as any[];

      await processRollover(nextSchoolYear.trim(), updates);
      
      toast({ title: 'Rollover Complete', description: 'Student records have been updated for the new school year.' });
      setIsConfirmOpen(false);
      navigate('/admin');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to process rollover.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isLoggedIn || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8">
            <CardContent className="pt-6">
              <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <Button onClick={() => navigate('/admin-login')}>Admin Login</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6 -ml-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">School Year Rollover</h1>
              <p className="text-slate-500 mt-1">Safely transition student records to the upcoming school year</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-blue-100 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-50 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" /> Current Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Current School Year</label>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{currentSchoolYear}</div>
                </div>
                
                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Set Next School Year</label>
                  <Input 
                    placeholder="e.g. 2027-2028" 
                    value={nextSchoolYear}
                    onChange={(e) => setNextSchoolYear(e.target.value)}
                    className="text-lg h-12"
                  />
                  <p className="text-xs text-slate-500">
                    This will be the new global school year. Students will have their previous records archived into their academic history.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg">Preview of Changes</CardTitle>
                <CardDescription>What will happen when you execute</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {preview.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No active students found to promote.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preview.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">Grade {p.currentGrade}</span>
                          <span className="text-xs text-slate-500">{p.count} students</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                        <div className="flex flex-col text-right">
                          <span className={`font-semibold ${p.status === 'graduated' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {p.nextGrade === 'Graduated' ? 'Graduated' : `Grade ${p.nextGrade}`}
                          </span>
                          <span className="text-xs text-slate-500">Section TBD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 h-12 px-8"
              onClick={() => setIsConfirmOpen(true)}
              disabled={preview.length === 0 || !nextSchoolYear.trim()}
            >
              Review & Execute Rollover
            </Button>
          </div>
        </div>
      </main>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm School Year Rollover
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to promote all active students and set the school year to <strong>{nextSchoolYear}</strong>.
              <br /><br />
              This will clear their current sections (as classes are typically reshuffled) and archive their current grade level. Grade 12 students will be marked as Graduated.
              <br /><br />
              This action cannot be easily undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleExecuteRollover(); }}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? 'Processing...' : 'Confirm & Execute'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
