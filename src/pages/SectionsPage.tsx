import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, Plus, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SectionsPage() {
  const { sections, addSection, deleteSection, user, isLoggedIn } = useVoting();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionGrade, setNewSectionGrade] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isAdmin = isLoggedIn && user?.role === 'admin';

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

  const handleAdd = () => {
    if (!newSectionName.trim() || !newSectionGrade) {
      alert('Please fill in both Section Name and Grade Level');
      return;
    }
    addSection({
      name: newSectionName.trim(),
      gradeLevel: newSectionGrade,
    });
    setNewSectionName('');
    setNewSectionGrade('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteSection(id);
    setDeleteConfirm(null);
  };

  const grades = ['7', '8', '9', '10', '11', '12'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between mb-8 animate-slide-up">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sections</h1>
              <p className="text-gray-500">Manage grade sections for registration</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowForm(true)}
                className="gap-2 text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                <Plus className="h-4 w-4" /> Add Section
              </Button>
            </div>
          </div>

          {showForm && (
            <Card className="mb-6 border border-blue-100 shadow-sm animate-fade-in" style={{ background: '#f8faff' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Add New Section</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="mb-1 block">Grade Level</Label>
                    <select
                      value={newSectionGrade}
                      onChange={(e) => setNewSectionGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select Grade</option>
                      {grades.map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Section Name</Label>
                    <Input 
                      value={newSectionName} 
                      onChange={e => setNewSectionName(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAdd} className="bg-blue-600 text-white hover:bg-blue-700">
                    Save Section
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {grades.map(grade => {
              const gradeSections = sections.filter(s => s.gradeLevel === grade);
              return (
                <Card key={grade} className="border border-gray-100 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  <CardContent className="p-0">
                    <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
                      <h3 className="font-semibold text-gray-900">Grade {grade}</h3>
                    </div>
                    {gradeSections.length > 0 ? (
                      <ul className="divide-y divide-gray-50">
                        {gradeSections.map(section => (
                          <li key={section.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                            <span className="text-sm font-medium text-gray-700">{section.name}</span>
                            <div className="flex items-center gap-1">
                              {deleteConfirm === section.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(section.id)}
                                    className="px-2 py-1 text-xs text-white bg-red-500 rounded hover:bg-red-600"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(section.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No sections added yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
