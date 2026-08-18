import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Vote,
  Shield,
  ArrowUpDown,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VotersPage() {
  const { voters, user, isLoggedIn } = useVoting();

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVoted, setFilterVoted] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Extract all unique sections for dropdown
  const availableSections = useMemo(() => {
    const relevantVoters = filterGrade === 'all'
      ? voters
      : voters.filter((v) => v.gradeLevel === filterGrade);
    return [...new Set(relevantVoters.map((v) => v.section).filter(Boolean))].sort();
  }, [voters, filterGrade]);

  // Reset section filter if it no longer applies to selected grade
  const handleGradeChange = (grade: string) => {
    setFilterGrade(grade);
    setFilterSection('all');
    setCurrentPage(1);
  };

  // Filtered & Sorted Voters
  const filteredVoters = useMemo(() => {
    return voters
      .filter((voter) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (voter.name || '').toLowerCase().includes(q);
          const matchLrn = (voter.lrn || '').toLowerCase().includes(q);
          const matchSection = (voter.section || '').toLowerCase().includes(q);
          if (!matchName && !matchLrn && !matchSection) return false;
        }

        // Grade filter
        if (filterGrade !== 'all' && voter.gradeLevel !== filterGrade) {
          return false;
        }

        // Section filter
        if (filterSection !== 'all' && voter.section !== filterSection) {
          return false;
        }

        // Registration status filter
        if (filterStatus !== 'all' && voter.status !== filterStatus) {
          return false;
        }

        // Voting status filter
        if (filterVoted === 'voted' && !voter.hasVoted) return false;
        if (filterVoted === 'not_voted' && voter.hasVoted) return false;

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'name_asc':
            return (a.name || '').localeCompare(b.name || '');
          case 'name_desc':
            return (b.name || '').localeCompare(a.name || '');
          case 'grade_asc':
            return (parseInt(a.gradeLevel) || 0) - (parseInt(b.gradeLevel) || 0) || (a.name || '').localeCompare(b.name || '');
          case 'grade_desc':
            return (parseInt(b.gradeLevel) || 0) - (parseInt(a.gradeLevel) || 0) || (a.name || '').localeCompare(b.name || '');
          case 'date_newest': {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          }
          case 'date_oldest': {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
          }
          case 'lrn':
            return (a.lrn || '').localeCompare(b.lrn || '');
          default:
            return 0;
        }
      });
  }, [voters, searchQuery, filterGrade, filterSection, filterStatus, filterVoted, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredVoters.length / itemsPerPage));
  const paginatedVoters = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVoters.slice(start, start + itemsPerPage);
  }, [filteredVoters, currentPage, itemsPerPage]);

  const hasActiveFilters =
    searchQuery !== '' ||
    filterGrade !== 'all' ||
    filterSection !== 'all' ||
    filterStatus !== 'all' ||
    filterVoted !== 'all' ||
    sortBy !== 'name_asc';

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterGrade('all');
    setFilterSection('all');
    setFilterStatus('all');
    setFilterVoted('all');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  // Summary Metrics
  const totalVotersCount = voters.length;
  const approvedCount = voters.filter((v) => v.status === 'approved').length;
  const votedCount = voters.filter((v) => v.hasVoted).length;
  const pendingCount = voters.filter((v) => v.status === 'pending').length;

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
              <h2 className="text-xl font-bold text-gray-900 mb-1">Access Restricted</h2>
              <p className="text-sm text-gray-500 mb-6">
                The registered voters directory is accessible only to administrators.
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  const formatDate = (date?: Date) => {
    if (!date || isNaN(new Date(date).getTime())) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Registered Voters
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Grade 7 – 12 Directory
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500">
                Complete roster of registered students across all grade levels and sections
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/registrations">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs sm:text-sm border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
                >
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Pending Approvals ({pendingCount})
                </Button>
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-500">Total Registered</span>
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalVotersCount.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Grades 7 to 12 combined</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-500">Approved Voters</span>
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700">{approvedCount.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Eligible to cast ballots</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-500">Ballots Cast</span>
                  <div className="p-2 rounded-lg bg-indigo-50">
                    <Vote className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-indigo-700">{votedCount.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {approvedCount > 0 ? `${Math.round((votedCount / approvedCount) * 100)}% turnout` : '0% turnout'}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-500">Pending Approval</span>
                  <div className="p-2 rounded-lg bg-amber-50">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-amber-700">{pendingCount.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Awaiting verification</p>
              </CardContent>
            </Card>
          </div>

          {/* Search, Filter & Sort Controls */}
          <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl mb-6">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by student name, Student ID / LRN, or section..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50/50 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filter and Sort Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mr-1">
                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                    <span>Filters:</span>
                  </div>

                  {/* Grade Level Filter */}
                  <select
                    value={filterGrade}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Grades (7–12)</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </select>

                  {/* Section Filter */}
                  <select
                    value={filterSection}
                    onChange={(e) => {
                      setFilterSection(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Sections</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>

                  {/* Registration Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Voting Status Filter */}
                  <select
                    value={filterVoted}
                    onChange={(e) => {
                      setFilterVoted(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="all">Voting Status (All)</option>
                    <option value="voted">Has Voted</option>
                    <option value="not_voted">Not Voted</option>
                  </select>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    >
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="name_desc">Name (Z → A)</option>
                      <option value="grade_asc">Grade (7 → 12)</option>
                      <option value="grade_desc">Grade (12 → 7)</option>
                      <option value="date_newest">Date Registered (Newest)</option>
                      <option value="date_oldest">Date Registered (Oldest)</option>
                      <option value="lrn">Student ID / LRN</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1 text-gray-400" /> Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unified Voters Table */}
          <Card className="border border-gray-200/80 shadow-sm bg-white rounded-xl overflow-hidden mb-6">
            {/* Table Header / Count Bar */}
            <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing <strong className="text-gray-900">{filteredVoters.length}</strong> of{' '}
                <strong className="text-gray-900">{totalVotersCount}</strong> registered voters
              </span>
              <span>Page {currentPage} of {totalPages}</span>
            </div>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Student ID (LRN)</th>
                      <th className="py-3 px-4">Grade Level</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4 text-center">Registration Status</th>
                      <th className="py-3 px-4">Date Registered</th>
                      <th className="py-3 px-4 text-right">Voting Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                    {paginatedVoters.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-14 text-center text-gray-400">
                          <Users className="h-9 w-9 mx-auto mb-2 text-gray-300" />
                          <p className="font-semibold text-gray-600 text-sm">No registered voters found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {hasActiveFilters
                              ? 'Try adjusting or clearing your search and filters.'
                              : 'No students have registered yet.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paginatedVoters.map((voter, idx) => {
                        const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr
                            key={voter.id}
                            className="hover:bg-blue-50/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-xs text-gray-400 font-mono text-center">
                              {rowNumber}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {voter.name}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/60">
                                {voter.lrn || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">
                              Grade {voter.gradeLevel}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {voter.section || '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(voter.status)}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {formatDate(voter.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {voter.hasVoted ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <CheckCircle2 className="h-3 w-3" /> Voted
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                  Not Voted
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-gray-500">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, filteredVoters.length)} of{' '}
                    {filteredVoters.length} voters
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2.5 text-xs"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                    </Button>

                    <div className="flex items-center gap-1 px-2">
                      <span className="font-semibold text-gray-800">{currentPage}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-500">{totalPages}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2.5 text-xs"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
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
