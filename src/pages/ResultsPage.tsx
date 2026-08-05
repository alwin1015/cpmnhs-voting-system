import { useRef } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Trophy, Users, Vote, Printer, TrendingUp } from 'lucide-react';
import schoolLogo from '@/assets/school-logo.png';

export default function ResultsPage() {
  const { election, getResults, candidates, user, isLoggedIn } = useVoting();
  const results = getResults();
  const printRef = useRef<HTMLDivElement>(null);
  const isAdmin = isLoggedIn && user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-xl bg-white/80 backdrop-blur-md rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2 text-slate-800">Results Hidden</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                The election results are only visible to administrators.
              </p>
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 transition-colors"
              >
                Return Home
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const voterTurnoutStr = election && election.totalVoters > 0 
    ? `${Math.round((election.totalVoted / election.totalVoters) * 100)}%` 
    : 'Result';

  const handlePrint = () => {
    window.print();
  };

  const stats = [
    { title: 'Total Voters', value: election?.totalVoters || 0, color: '#2563eb', bg: '#eff6ff', icon: Users },
    { title: 'Votes Cast', value: election?.totalVoted || 0, color: '#16a34a', bg: '#f0fdf4', icon: Vote },
    { title: 'Total Votes', value: totalVotes, color: '#ea580c', bg: '#fff7ed', icon: BarChart3 },
    { title: 'Voter Turnout', value: voterTurnoutStr, color: '#7c3aed', bg: '#f5f3ff', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 40%, #ffffff 100%)' }}>
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-6 animate-slide-up no-print">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Election Results</h1>
                <p className="text-gray-500">Real-time voting results for {election?.name}</p>
              </div>
              {isAdmin && (
                <Button 
                  onClick={handlePrint}
                  className="gap-2 text-white shadow-md"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                >
                  <Printer className="h-4 w-4" />
                  Print Results
                </Button>
              )}
            </div>
          </div>

          {/* ====== PRINT-ONLY HEADER ====== */}
          <div className="print-only-header" ref={printRef}>
            <img src={schoolLogo} alt="CPMNHS Logo" className="print-school-logo" />
            <div className="print-school-name">Congressman Pablo Malasarte National High School</div>
            <div className="print-school-address">Cabad, Balilihan, Bohol</div>
            <div className="print-election-title">
              iVote: Student Voting System — Official Election Results
            </div>
            <div className="print-election-name">{election?.name} • S.Y. {election?.schoolYear}</div>
            <div className="print-stats-row">
              <div className="print-stat">
                <span className="print-stat-value">{election?.totalVoters}</span>
                <span className="print-stat-label">Registered Voters</span>
              </div>
              <div className="print-stat">
                <span className="print-stat-value">{election?.totalVoted}</span>
                <span className="print-stat-label">Votes Cast</span>
              </div>
              <div className="print-stat">
                <span className="print-stat-value">{voterTurnoutStr}</span>
                <span className="print-stat-label">Voter Turnout</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 no-print">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="border border-gray-100 shadow-sm animate-fade-in"
                style={{ background: 'rgba(255,255,255,0.9)', animationDelay: `${index * 80}ms` }}
              >
                <CardContent className="py-5 px-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl" style={{ background: stat.bg }}>
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ====== PRINT-ONLY: Final Results Winners Table ====== */}
          <div className="print-only-winners">
            <div className="print-winners-title">OFFICIAL FINAL RESULTS — WINNERS</div>
            <table className="print-winners-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>#</th>
                  <th style={{ width: '25%' }}>Position</th>
                  <th style={{ width: '30%' }}>Winner</th>
                  <th style={{ width: '20%' }}>Party</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Votes</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ position, candidates: positionCandidates }, idx) => {
                  const winner = positionCandidates[0];
                  if (!winner) return null;
                  const totalVotes = positionCandidates.reduce((s, c) => s + c.votes, 0);
                  const pctStr = totalVotes > 0 ? `${Math.round((winner.votes / totalVotes) * 100)}%` : 'Result';
                  return (
                    <tr key={position.id}>
                      <td>{idx + 1}</td>
                      <td className="print-winner-position">{position.name}</td>
                      <td className="print-winner-name">{winner.name}</td>
                      <td>{winner.party}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{winner.votes} votes</td>
                      <td style={{ textAlign: 'right' }}>{pctStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Results by Position */}
          <div className="space-y-6 no-print-full">
            {results.map(({ position, candidates: positionCandidates }, positionIndex) => {
              const positionTotalVotes = positionCandidates.reduce((sum, c) => sum + c.votes, 0);

              return (
                <Card 
                  key={position.id} 
                  className="border border-gray-100 shadow-sm animate-fade-in"
                  style={{ background: 'rgba(255,255,255,0.95)', animationDelay: `${positionIndex * 80}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                        {positionIndex + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{position.name}</h3>
                        <p className="text-xs text-gray-400">{positionTotalVotes} total votes</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {positionCandidates.map((candidate, index) => {
                        const percentage = positionTotalVotes > 0 
                          ? Math.round((candidate.votes / positionTotalVotes) * 100) 
                          : 0;
                        const pctStr = positionTotalVotes > 0 ? `${percentage}%` : 'Result';
                        const isLeading = index === 0;
                        
                        return (
                          <div key={candidate.id} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isLeading && <Trophy className="h-4 w-4" style={{ color: '#f59e0b' }} />}
                                <span className={`font-medium text-sm ${isLeading ? 'text-blue-600' : 'text-gray-700'}`}>
                                  {candidate.name}
                                </span>
                                <span className="text-xs text-gray-400">({candidate.party})</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-gray-900">{candidate.votes} votes</span>
                                <span className="text-gray-400 text-xs ml-1.5">({pctStr})</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-1000"
                                style={{ 
                                  width: `${percentage}%`,
                                  background: isLeading ? 'linear-gradient(90deg, #2563eb, #3b82f6)' : '#cbd5e1'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Print Footer */}
          <div className="print-only-footer">
            <div className="print-footer-line" />
            <p>This is a computer-generated document. No signature required.</p>
            <p>iVote: Student Voting System — Congressman Pablo Malasarte National High School</p>
            <p className="print-date">Printed on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
