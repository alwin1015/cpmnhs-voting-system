import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  Trophy,
  Users,
  Vote,
  TrendingUp,
  Shield,
  FileText,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function ResultsPage() {
  const { election, getResults, candidates, user, isLoggedIn } = useVoting();
  const results = getResults();
  const isAdmin = isLoggedIn && user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 border-slate-100 shadow-lg bg-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Results Restricted</h2>
              <p className="text-sm text-gray-500 mb-6">
                The live election results tally is restricted to administrators.
              </p>
              <Link to="/">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 text-sm">
                  Return Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const turnoutPercent = election && election.totalVoters > 0
    ? Math.round((election.totalVoted / election.totalVoters) * 100)
    : 0;

  const stats = [
    {
      title: 'Registered Voters',
      value: election?.totalVoters?.toLocaleString() || '0',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Ballots Cast',
      value: election?.totalVoted?.toLocaleString() || '0',
      icon: Vote,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Total Votes Counted',
      value: totalVotes.toLocaleString(),
      icon: BarChart3,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
    },
    {
      title: 'Voter Turnout',
      value: `${turnoutPercent}%`,
      icon: TrendingUp,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Election Results
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Tally
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                {election?.name || 'SSG General Election'} • S.Y. {election?.schoolYear || '2026-2027'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/election-report">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs sm:text-sm border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  Detailed Report & Verification
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="border border-gray-200/80 shadow-sm bg-white rounded-xl hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">{stat.title}</span>
                    <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Position Results Grid */}
          <div className="space-y-4">
            {results.map(({ position, candidates: positionCandidates }, positionIndex) => {
              const positionTotalVotes = positionCandidates.reduce((sum, c) => sum + c.votes, 0);
              const topVoteCount = positionCandidates[0]?.votes || 0;
              const hasTieAtTop =
                positionCandidates.length > 1 &&
                topVoteCount > 0 &&
                positionCandidates[1]?.votes === topVoteCount;

              return (
                <Card
                  key={position.id}
                  className="border border-gray-200/80 shadow-sm bg-white rounded-xl overflow-hidden"
                >
                  {/* Position Card Header */}
                  <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                        {positionIndex + 1}
                      </span>
                      <h3 className="text-base font-bold text-gray-900">
                        {position.name}
                      </h3>
                      {hasTieAtTop && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          Tie for 1st
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200/70 shadow-2xs">
                      {positionTotalVotes.toLocaleString()} votes cast
                    </span>
                  </div>

                  {/* Candidate List */}
                  <CardContent className="p-4 sm:p-5 space-y-3.5">
                    {positionCandidates.length === 0 ? (
                      <p className="text-xs text-gray-400 py-3 text-center italic">
                        No candidates registered for this position.
                      </p>
                    ) : (
                      positionCandidates.map((candidate, index) => {
                        const percentage = positionTotalVotes > 0
                          ? Math.round((candidate.votes / positionTotalVotes) * 100)
                          : 0;
                        const isLeading = index === 0 && candidate.votes > 0 && !hasTieAtTop;
                        const isTiedLead = (index === 0 || candidate.votes === topVoteCount) && topVoteCount > 0 && hasTieAtTop;

                        return (
                          <div key={candidate.id} className="space-y-1.5">
                            {/* Candidate Info Line */}
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                {isLeading && (
                                  <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                {isTiedLead && (
                                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                )}
                                {!isLeading && !isTiedLead && (
                                  <span className="w-3.5 text-center text-xs text-gray-400 font-medium">
                                    {index + 1}
                                  </span>
                                )}
                                <span className={`font-semibold truncate ${isLeading ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                                  {candidate.name}
                                </span>
                                {candidate.party && (
                                  <span className="text-[11px] text-gray-400 truncate hidden sm:inline">
                                    ({candidate.party})
                                  </span>
                                )}
                                {candidate.gradeLevel && (
                                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded hidden md:inline">
                                    Gr. {candidate.gradeLevel}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                <span className="font-bold text-gray-900">
                                  {candidate.votes.toLocaleString()}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  isLeading
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                                    : isTiedLead
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
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
