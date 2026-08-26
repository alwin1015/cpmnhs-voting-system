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
  Filter,
  LayoutGrid,
  ExternalLink,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VotersPage() {
  const { voters, sections, user, isLoggedIn } = useVoting();

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterVoted, setFilterVoted] = useState<string>('all');

  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Standard grade levels
  const standardGrades = ['7', '8', '9', '10', '11', '12'];

  // Dynamically extract all grades present in sections or standardGrades
  const allGrades = useMemo(() => {
    const sectionGrades = sections.map((s) => s.gradeLevel);
    const voterGrades = voters.map((v) => v.gradeLevel);
    const combined = [...new Set([...standardGrades, ...sectionGrades, ...voterGrades])]
      .filter(Boolean)
      .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
    return combined;
  }, [sections, voters]);

  // Dynamically build available sections from Manage Grade Sections
  const availableSections = useMemo(() => {
    const list = filterGrade === 'all'
      ? sections
      : sections.filter((s) => s.gradeLevel === filterGrade);
    return [...new Set(list.map((s) => s.name))].sort();
  }, [sections, filterGrade]);

  // Summary Metrics
  const totalVotersCount = voters.length;
  const approvedCount = voters.filter((v) => v.status === 'approved').length;
  const votedCount = voters.filter((v) => v.hasVoted).length;
  const pendingCount = voters.filter((v) => v.status === 'pending').length;
  const totalSectionsCount = sections.length;

  // Filter voters by global search/status/voted
  const searchFilteredVoters = useMemo(() => {
    return voters.filter((voter) => {
      // Search query (name, LRN, section)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (voter.name || '').toLowerCase().includes(q);
        const matchLrn = (voter.lrn || '').toLowerCase().includes(q);
        const matchSection = (voter.section || '').toLowerCase().includes(q);
        if (!matchName && !matchLrn && !matchSection) return false;
      }

      // Registration status filter
      if (filterStatus !== 'all' && voter.status !== filterStatus) {
        return false;
      }

      // Voting status filter
      if (filterVoted === 'voted' && !voter.hasVoted) return false;
      if (filterVoted === 'not_voted' && voter.hasVoted) return false;

      return true;
    });
  }, [voters, searchQuery, filterStatus, filterVoted]);

  // Build the hierarchical structure: Grade Level -> Section -> Voters
  const gradeSectionGroups = useMemo(() => {
    const gradesToShow = filterGrade === 'all' ? allGrades : [filterGrade];

    return gradesToShow.map((grade) => {
      // 1. Get official sections defined in Manage Grade Sections for this grade
      const officialSectionsForGrade = sections
        .filter((s) => s.gradeLevel === grade)
        .map((s) => s.name)
        .sort();

      // 2. Also check if there are voters in this grade with sections not in official list
      const votersInGrade = searchFilteredVoters.filter((v) => v.gradeLevel === grade);
      const voterSectionNames = [...new Set(votersInGrade.map((v) => v.section).filter(Boolean))];
      
      // Combine official sections + any extra section names from voters
      const combinedSectionNames = [...new Set([...officialSectionsForGrade, ...voterSectionNames])].sort();

      // Filter sections if section filter is active
      const finalSectionNames = filterSection === 'all'
        ? combinedSectionNames
        : combinedSectionNames.filter((sec) => sec === filterSection);

      const sectionGroups = finalSectionNames.map((sectionName) => {
        const sectionVoters = votersInGrade
          .filter((v) => (v.section || '').trim().toLowerCase() === sectionName.trim().toLowerCase())
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        return {
          sectionName,
          voters: sectionVoters,
          isOfficial: officialSectionsForGrade.includes(sectionName),
        };
      });

      // Also check if there are voters with no section specified
      const unassignedVoters = votersInGrade.filter((v) => !v.section || v.section.trim() === '');
      if (unassignedVoters.length > 0 && filterSection === 'all') {
        sectionGroups.push({
          sectionName: 'Unassigned Section',
          voters: unassignedVoters,
          isOfficial: false,
        });
      }

      const totalGradeVoters = votersInGrade.length;

      return {
        grade,
        sectionGroups,
        totalGradeVoters,
        totalGradeSections: officialSectionsForGrade.length,
      };
    });
  }, [allGrades, sections, searchFilteredVoters, filterGrade, filterSection]);

  const hasActiveFilters =
    searchQuery !== '' ||
    filterGrade !== 'all' ||
    filterSection !== 'all' ||
    filterStatus !== 'all' ||
    filterVoted !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterGrade('all');
    setFilterSection('all');
    setFilterStatus('all');
    setFilterVoted('all');
  };

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
      case 'graduated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <GraduationCap className="h-3 w-3" /> Graduated
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="h-3 w-3" /> Inactive
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Header />

      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Registered Voters
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Connected to Manage Sections
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Organized tables for every grade level and section linked directly to your grade sections settings
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/sections">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs sm:text-sm border-purple-200 text-purple-700 hover:bg-purple-50 font-medium rounded-xl"
                >
                  <LayoutGrid className="h-4 w-4 text-purple-600" />
                  Manage Grade Sections ({totalSectionsCount})
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-lg">
              <CardContent className="p-3 sm:p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Total Registered</span>
                  <div className="p-1.5 rounded-md bg-blue-50">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none">{totalVotersCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Across all grade levels</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-lg">
              <CardContent className="p-3 sm:p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Approved Voters</span>
                  <div className="p-1.5 rounded-md bg-emerald-50">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-emerald-700 leading-none">{approvedCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Eligible to cast ballots</p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-lg">
              <CardContent className="p-3 sm:p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Ballots Cast</span>
                  <div className="p-1.5 rounded-md bg-indigo-50">
                    <Vote className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-indigo-700 leading-none">{votedCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {approvedCount > 0 ? `${Math.round((votedCount / approvedCount) * 100)}% turnout` : '0% turnout'}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-xs bg-white rounded-lg">
              <CardContent className="p-3 sm:p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Active Sections</span>
                  <div className="p-1.5 rounded-md bg-purple-50">
                    <LayoutGrid className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-bold text-purple-700 leading-none">{totalSectionsCount.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Configured in Sections</p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Dynamic Filter Controls */}
          <Card className="border border-slate-200/80 shadow-xs bg-white rounded-lg mb-6">
            <CardContent className="p-3 sm:p-3.5">
              <div className="flex flex-col gap-2.5">
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search voter by name, Student ID / LRN, or section name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50/60 focus:bg-white rounded-lg"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span>Filter:</span>
                  </div>

                  {/* Grade Level Filter */}
                  <select
                    value={filterGrade}
                    onChange={(e) => {
                      setFilterGrade(e.target.value);
                      setFilterSection('all');
                    }}
                    className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="all">All Grade Levels</option>
                    {allGrades.map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>

                  {/* Dynamic Section Filter based on Manage Grade Sections */}
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="all">All Sections</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section: {sec}
                      </option>
                    ))}
                  </select>

                  {/* Registration Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="all">All Registration Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Voting Status Filter */}
                  <select
                    value={filterVoted}
                    onChange={(e) => setFilterVoted(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                  >
                    <option value="all">All Voting Statuses</option>
                    <option value="voted">Has Voted</option>
                    <option value="not_voted">Not Voted</option>
                  </select>

                  {/* Clear Button */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700 ml-auto"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1 text-slate-400" /> Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Render Grade Levels and their Individual Section Tables */}
          <div className="space-y-10">
            {gradeSectionGroups.map(({ grade, sectionGroups, totalGradeVoters, totalGradeSections }) => {
              // If filtering by a specific section and this grade has no matching section, skip
              if (sectionGroups.length === 0 && filterSection !== 'all') return null;

              return (
                <div key={grade} className="animate-fade-in">
                  
                  {/* Grade Level Banner */}
                  <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                        {grade}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                          Grade {grade}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {totalGradeSections} {totalGradeSections === 1 ? 'section' : 'sections'} configured in Manage Sections • {totalGradeVoters} registered {totalGradeVoters === 1 ? 'voter' : 'voters'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/sections"
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
                    >
                      + Add Grade {grade} Section <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Section Tables under this Grade */}
                  {sectionGroups.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                      <LayoutGrid className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No sections found for Grade {grade}</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Add sections in "Manage Grade Sections" to start organizing Grade {grade} registered voters.
                      </p>
                      <Link to="/sections">
                        <Button size="sm" variant="outline" className="text-xs h-8">
                          Configure Grade {grade} Sections
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {sectionGroups.map(({ sectionName, voters: secVoters, isOfficial }) => {
                        const secApproved = secVoters.filter((v) => v.status === 'approved').length;
                        const secVoted = secVoters.filter((v) => v.hasVoted).length;

                        return (
                          <Card
                            key={sectionName}
                            className="border border-slate-200/80 shadow-sm bg-white rounded-xl overflow-hidden"
                          >
                            {/* Section Header */}
                            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-blue-100/70 text-blue-700">
                                  <GraduationCap className="h-4 w-4" />
                                </div>
                                <div>
                                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                    Grade {grade} – {sectionName}
                                    {!isOfficial && (
                                      <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                        Legacy / Custom
                                      </span>
                                    )}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                                  {secVoters.length} {secVoters.length === 1 ? 'Student' : 'Students'}
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">
                                  {secApproved} Approved
                                </span>
                                <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">
                                  {secVoted} Voted
                                </span>
                              </div>
                            </div>

                            {/* Section Table Content */}
                            <CardContent className="p-0">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                                      <th className="py-2.5 px-4">Student Name</th>
                                      <th className="py-2.5 px-4">Student ID (LRN)</th>
                                      <th className="py-2.5 px-4">Grade & Section</th>
                                      <th className="py-2.5 px-4 text-center">Registration Status</th>
                                      <th className="py-2.5 px-4">Date Registered</th>
                                      <th className="py-2.5 px-4 text-right">Voting Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                                    {secVoters.length === 0 ? (
                                      <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-400">
                                          <Users className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                                          <p className="text-xs font-medium text-slate-500">
                                            No registered voters in Grade {grade} – {sectionName}
                                          </p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">
                                            Students who register under this section will automatically appear here.
                                          </p>
                                        </td>
                                      </tr>
                                    ) : (
                                      secVoters.map((voter, idx) => (
                                        <tr
                                          key={voter.id}
                                          className="hover:bg-blue-50/30 transition-colors"
                                        >
                                          <td className="py-3 px-4 text-xs text-slate-400 font-mono text-center">
                                            {idx + 1}
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900">{voter.name}</div>
                                            {voter.academicHistory && voter.academicHistory.length > 0 && (
                                              <div className="text-[10px] text-slate-500 mt-0.5">
                                                History: {voter.academicHistory.map(h => `G${h.gradeLevel} (${h.schoolYear})`).join(', ')}
                                              </div>
                                            )}
                                          </td>
                                          <td className="py-3 px-4">
                                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                                              {voter.lrn || 'N/A'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-slate-700 font-medium text-xs">
                                            Grade {voter.gradeLevel} – {voter.section}
                                          </td>
                                          <td className="py-3 px-4 text-center">
                                            {getStatusBadge(voter.status)}
                                          </td>
                                          <td className="py-3 px-4 text-slate-500 text-xs">
                                            {formatDate(voter.createdAt)}
                                          </td>
                                          <td className="py-3 px-4 text-right">
                                            {voter.hasVoted ? (
                                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                                <CheckCircle2 className="h-3 w-3" /> Voted
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                Not Voted
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
