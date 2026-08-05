import { useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ClipboardList, User, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function RegistrationsPage() {
  const { voters, approveVoter, rejectVoter, user, isLoggedIn, bulkRegister } = useVoting();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);

  const isAdmin = isLoggedIn && user?.role === 'admin';
  const pendingVoters = voters.filter(v => v.status === 'pending');

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

  const handleReject = async (id: string) => {
    await rejectVoter(id);
    setDeleteConfirm(null);
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
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between mb-8 animate-slide-up">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Registrations</h1>
              <p className="text-gray-500">Approve or reject student signups</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleBulkUpload} 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden" 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Bulk Upload'}
              </Button>
            </div>
          </div>

          <Card className="border border-gray-100 shadow-sm animate-fade-in" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CardContent className="p-6">
              {pendingVoters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Info</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">LRN</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Grade & Section</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingVoters.map((voter) => (
                        <tr key={voter.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                                <User className="h-5 w-5 text-orange-400" />
                              </div>
                              <span className="font-medium text-gray-900">{voter.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-medium text-gray-900">{voter.lrn || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            Grade {voter.gradeLevel} - {voter.section}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={async () => { const success = await approveVoter(voter.id); if (!success) toast({ title: 'Error', description: 'Failed to approve voter. Check console or database permissions.', variant: 'destructive' }); }}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-0"
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Approve
                              </Button>
                              {resetConfirm === voter.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      await resetVoter(voter.id);
                                      setResetConfirm(null);
                                      toast({ title: 'Account Reset', description: 'Student record deleted. They can now register again.' });
                                    }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setResetConfirm(null)}
                                    variant="outline"
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setResetConfirm(voter.id)}
                                  className="text-orange-600 hover:text-orange-800 border-orange-200 hover:bg-orange-50"
                                >
                                  Reset Account
                                </Button>
                              )}
                              {deleteConfirm === voter.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    onClick={async () => { await handleReject(voter.id); }}
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setDeleteConfirm(null)}
                                    variant="outline"
                                  >
                                    No
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirm(voter.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1.5" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No pending registrations</p>
                  <p className="text-sm text-gray-400 mt-1">All student signups have been processed.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}







