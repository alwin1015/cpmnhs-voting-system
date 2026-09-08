import { forwardRef, useMemo } from 'react';
import { useVoting } from '@/contexts/VotingContext';
import cpmnhsLogo from '@/assets/cpmnhs-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import sslgLogo from '@/assets/sslg-logo.png';
import type { TieResolution } from '@/types/voting';

interface OfficialResultsSheetProps {
  tieResolutions?: TieResolution[];
  className?: string;
}

export const OfficialResultsSheet = forwardRef<HTMLDivElement, OfficialResultsSheetProps>(
  ({ tieResolutions = [], className = '' }, ref) => {
    const { election, positions, candidates } = useVoting();

    const electionDate = election?.startDate ? new Date(election.startDate) : new Date();
    const electionDateFormatted = election?.startDate
      ? new Date(election.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const getOrdinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const dayWithSuffix = getOrdinal(electionDate.getDate());
    const monthAndYear = electionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const formatTime12 = (d?: Date) => {
      if (!d || isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    const startTimeStr = election?.startDate ? formatTime12(new Date(election.startDate)) : '7:00 AM';
    const endTimeStr = election?.endDate ? formatTime12(new Date(election.endDate)) : '4:00 PM';
    const electionTimeFormatted = `${startTimeStr} – ${endTimeStr}`;

    const turnoutPercent = election && election.totalVoters && election.totalVoters > 0
      ? (((election.totalVoted || 0) / election.totalVoters) * 100).toFixed(2)
      : '0.00';

    // Build sorted results per position, prioritizing tie resolution winners if present
    const results = useMemo(() => {
      return positions.map((position) => {
        const posCandidates = candidates
          .filter((c) => c.position === position.id)
          .sort((a, b) => {
            if (b.votes !== a.votes) return b.votes - a.votes;
            const res = tieResolutions.find((r) => r.positionId === position.id);
            if (res) {
              if (res.selectedWinnerId === a.id) return -1;
              if (res.selectedWinnerId === b.id) return 1;
            }
            return 0;
          });
        return { position, candidates: posCandidates };
      });
    }, [positions, candidates, tieResolutions]);

    return (
      <div
        ref={ref}
        className={`max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:max-w-none text-slate-900 bg-white border border-slate-200 shadow-md sm:rounded-xl print:border-0 print:shadow-none ${className}`}
      >
        {/* Header with 3 Logos (CPMNHS Left, DepEd Center, SSLG Right) */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Left Logo: CPMNHS Seal */}
            <div className="w-32 flex-shrink-0 flex justify-center">
              <img
                src={cpmnhsLogo}
                alt="CPMNHS Seal"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-full shadow-xs"
              />
            </div>

            {/* Center: DepEd Header */}
            <div className="flex-1 text-center flex flex-col items-center">
              {/* DepEd Logo */}
              <div className="flex flex-col items-center leading-none mb-1">
                <img
                  src={depedLogo}
                  alt="DepEd Logo"
                  className="w-36 sm:w-40 object-contain"
                />
              </div>

              <p className="text-[10px] sm:text-xs text-slate-700 font-medium leading-tight">Republic of the Philippines</p>
              <p className="text-[10px] sm:text-xs text-slate-700 font-medium leading-tight">Department of Education</p>
              <p className="text-[10px] sm:text-xs text-slate-700 leading-tight">Region VII – Central Visayas</p>
              <p className="text-[10px] sm:text-xs text-slate-700 leading-tight">Division of Bohol</p>
              <h1 className="text-xs sm:text-base font-black text-slate-900 uppercase tracking-tight mt-1 leading-tight">
                CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-600 leading-tight">Cabad, Balilihan, Bohol</p>
            </div>

            {/* Right Logo: SSLG Seal */}
            <div className="w-32 flex-shrink-0 flex justify-center">
              <img
                src={sslgLogo}
                alt="SSLG Seal"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-full shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div className="text-center mb-4">
          <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900">
            PRINT RESULTS
          </h2>
          <h3 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-wide">
            SCHOOL ELECTION
          </h3>
          <h4 className="text-xs sm:text-sm font-bold uppercase text-slate-800 tracking-wide">
            SCHOOL YEAR {election?.schoolYear || '2025-2026'}
          </h4>
        </div>

        {/* Metadata Section */}
        <div className="max-w-xl text-[11px] sm:text-xs space-y-1 mb-5 text-slate-800 font-medium">
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Election Title</span>
            <span>:</span>
            <span>{election?.name || 'Supreme Secondary Learners Government (SSLG) Election'}</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Date of Election</span>
            <span>:</span>
            <span>{electionDateFormatted}</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Voting Time</span>
            <span>:</span>
            <span>{electionTimeFormatted}</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Venue</span>
            <span>:</span>
            <span>Congressman Pablo Malasarte National High School</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Total Registered Voters</span>
            <span>:</span>
            <span>{election?.totalVoters?.toLocaleString() || '0'}</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Total Votes Cast</span>
            <span>:</span>
            <span>{election?.totalVoted?.toLocaleString() || '0'}</span>
          </div>
          <div className="grid grid-cols-[160px_12px_1fr] sm:grid-cols-[180px_12px_1fr] items-center">
            <span className="font-semibold">Voter Turnout</span>
            <span>:</span>
            <span>{turnoutPercent}%</span>
          </div>
        </div>

        {/* Official Results Table */}
        <div className="mb-5">
          <h3 className="text-center font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-900 mb-2">
            OFFICIAL RESULTS
          </h3>

          <table className="w-full border border-slate-900 text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-sky-100/60 border-b border-slate-900 text-slate-900 font-bold uppercase text-[11px] sm:text-xs">
                <th className="py-2 px-3 border-r border-slate-900 text-center w-1/4">POSITION</th>
                <th className="py-2 px-3 border-r border-slate-900 text-center w-2/5">CANDIDATE NAME</th>
                <th className="py-2 px-3 border-r border-slate-900 text-center w-1/5">TOTAL VOTES</th>
                <th className="py-2 px-3 text-center w-1/6">RANK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {results.map(({ position, candidates: posCandidates }) => {
                if (posCandidates.length === 0) {
                  return (
                    <tr key={position.id} className="border-b border-slate-900">
                      <td className="py-2 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle">
                        {position.name}
                      </td>
                      <td colSpan={3} className="py-2 px-3 text-center text-slate-400 italic">
                        No candidates registered
                      </td>
                    </tr>
                  );
                }

                return posCandidates.map((candidate, idx) => (
                  <tr
                    key={candidate.id}
                    className={`border-b ${idx === posCandidates.length - 1 ? 'border-b-slate-900' : 'border-b-slate-300'}`}
                  >
                    {idx === 0 && (
                      <td
                        rowSpan={posCandidates.length}
                        className="py-2.5 px-3 font-bold uppercase text-slate-900 border-r border-slate-900 text-center align-middle"
                      >
                        {position.name}
                      </td>
                    )}
                    <td className="py-2 px-3 uppercase text-slate-900 border-r border-slate-900 font-medium">
                      {candidate.name}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-900 font-mono">
                      {candidate.votes.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">
                      {idx + 1}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        {/* Certification Text & Signatures */}
        <div className="space-y-5 pt-2 break-inside-avoid text-xs sm:text-sm">
          <div className="space-y-1.5 text-slate-800 leading-relaxed text-justify sm:text-center text-[11px] sm:text-xs">
            <p>
              We, the undersigned, hereby certify that the above results are true, correct, and officially tallied based on the votes cast during the SSLG Election held on {electionDateFormatted}.
            </p>
            <p>
              Certified this {dayWithSuffix} day of {monthAndYear} at Congressman Pablo Malasarte National High School, Cabad, Balilihan, Bohol.
            </p>
          </div>

          {/* ELECTION COMMITTEE Section */}
          <div className="pt-2">
            <h4 className="font-bold uppercase text-slate-900 text-center text-xs tracking-wider mb-8">
              ELECTION COMMITTEE
            </h4>

            <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center">
              {/* Chairperson */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-[11px] sm:text-xs block">
                    {election?.signatories?.chairperson?.name?.toUpperCase() || '\u00A0'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                  Chairperson
                </span>
              </div>

              {/* Co-Chairperson */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-[11px] sm:text-xs block">
                    {election?.signatories?.coChairperson?.name?.toUpperCase() || '\u00A0'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                  Co-Chairperson
                </span>
              </div>

              {/* Member */}
              <div className="flex flex-col items-center">
                <div className="w-full border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-[11px] sm:text-xs block">
                    {election?.signatories?.member?.name?.toUpperCase() || '\u00A0'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                  Member
                </span>
              </div>
            </div>
          </div>

          {/* Certified Correct & Noted by Section */}
          <div className="pt-4 grid grid-cols-2 gap-12 sm:gap-20 text-center">
            {/* Certified Correct */}
            <div className="flex flex-col items-center w-full">
              <span className="text-xs font-semibold text-slate-800 self-start sm:self-center mb-6">
                Certified Correct:
              </span>
              <div className="w-full max-w-[240px] border-b border-slate-900 mb-1 h-5">
                <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                  {election?.signatories?.preparedBy?.name?.toUpperCase() || '\u00A0'}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                {election?.signatories?.preparedBy?.position || 'School Election Officer'}
              </span>
            </div>

            {/* Noted by */}
            <div className="flex flex-col items-center w-full">
              <span className="text-xs font-semibold text-slate-800 self-start sm:self-center mb-6">
                Noted by:
              </span>
              <div className="w-full max-w-[240px] border-b border-slate-900 mb-1 h-5">
                <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                  {election?.signatories?.approvedBy?.name?.toUpperCase() || '\u00A0'}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-600 font-medium">
                {election?.signatories?.approvedBy?.position || 'School Principal'}
              </span>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2 no-print">
            <p>CPMNHS iVote Electronic Voting System • Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    );
  }
);

OfficialResultsSheet.displayName = 'OfficialResultsSheet';
