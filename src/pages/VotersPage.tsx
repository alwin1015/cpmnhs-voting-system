import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function VotersPage() {
  const { voters, sections, user, isLoggedIn } = useVoting();
  const navigate = useNavigate();
  const [activeGrade, setActiveGrade] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<string>('all');

  const isAdmin = isLoggedIn && user?.role === 'admin';
  const approvedVoters = voters.filter(v => v.status === 'approved');

  // Get sections for the selected grade
  const gradeSections = activeGrade !== 'all'
    ? [...new Set(approvedVoters.filter(v => v.gradeLevel === activeGrade).map(v => v.section))].sort()
    : [];

  // Filter voters by grade and section
  let filteredVoters = approvedVoters;
  if (activeGrade !== 'all') {
    filteredVoters = filteredVoters.filter(v => v.gradeLevel === activeGrade);
  }
  if (activeSection !== 'all') {
    filteredVoters = filteredVoters.filter(v => v.section === activeSection);
  }

  const handleGradeChange = (grade: string) => {
    setActiveGrade(grade);
    setActiveSection('all');
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

  const grades = ['7', '8', '9', '10', '11', '12'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-8 animate-slide-up">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registered Voters</h1>
            <p className="text-gray-500">View approved students by grade level and section</p>
          </div>

          {/* Grade Level Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleGradeChange('all')}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                activeGrade === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              All Grades ({approvedVoters.length})
            </button>
            {grades.map(grade => {
              const count = approvedVoters.filter(v => v.gradeLevel === grade).length;
              return (
                <button
                  key={grade}
                  onClick={() => handleGradeChange(grade)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                    activeGrade === grade
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  Grade {grade} ({count})
                </button>
              );
            })}
          </div>

          {/* Section Filters (show only when a specific grade is selected) */}
          {activeGrade !== 'all' && gradeSections.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
              <button
                onClick={() => setActiveSection('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeSection === 'all'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                All Sections ({approvedVoters.filter(v => v.gradeLevel === activeGrade).length})
              </button>
              {gradeSections.map(section => {
                const count = approvedVoters.filter(v => v.gradeLevel === activeGrade && v.section === section).length;
                return (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeSection === section
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {section} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <Card className="border border-gray-100 shadow-sm animate-fade-in" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <CardContent className="p-6">
              {/* Summary bar */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-bold text-gray-900">{filteredVoters.length}</span> voter{filteredVoters.length !== 1 ? 's' : ''}
                  {activeGrade !== 'all' && <span> in Grade {activeGrade}</span>}
                  {activeSection !== 'all' && <span> — {activeSection}</span>}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-bold text-blue-600">{filteredVoters.filter(v => v.hasVoted).length}</span> voted
                </p>
              </div>

              {filteredVoters.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Name</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">LRN</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Grade & Section</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Voting Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVoters.map((voter) => (
                        <tr key={voter.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">
                            {voter.name}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-medium text-gray-900">{voter.lrn || 'N/A'}</p>
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            Grade {voter.gradeLevel} - {voter.section}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {voter.hasVoted ? (
                              <div className="inline-flex items-center text-blue-600 text-sm font-medium">
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Voted
                              </div>
                            ) : (
                              <div className="inline-flex items-center text-gray-400 text-sm font-medium">
                                Not Voted
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No voters found</p>
                  <p className="text-sm text-gray-400 mt-1">There are no approved voters in this category.</p>
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

