import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  BarChart3,
  Trophy,
  Users,
  Vote,
  TrendingUp,
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Lock,
  Printer,
  ArrowLeft,
  AlertTriangle,
  Check,
  FileDown
} from 'lucide-react';
import cpmnhsLogo from '@/assets/cpmnhs-logo.png';
import depedLogo from '@/assets/deped-logo.png';
import sslgLogo from '@/assets/sslg-logo.png';
import type { TieResolution, VoteVerification } from '@/types/voting';

export default function ResultsPage() {
  const { election, getResults, candidates, user, isLoggedIn, sessions, activeSessionId, switchSession } = useVoting();
  const printRef = useRef<HTMLDivElement>(null);

  const [showPrintReport, setShowPrintReport] = useState(false);
  const [tieResolutions, setTieResolutions] = useState<TieResolution[]>([]);
  const [verifications, setVerifications] = useState<VoteVerification[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const results = getResults();
  const isAdmin = isLoggedIn && user?.role === 'admin';

  // Load tie resolutions & verifications
  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        api.getTieResolutions().catch(() => []),
        api.getVerifications().catch(() => []),
      ]).then(([tData, vData]) => {
        if (Array.isArray(tData)) {
          setTieResolutions(tData.map((t: any) => ({
            id: String(t.id),
            verificationId: String(t.verification_id),
            positionId: String(t.position_id),
            selectedWinnerId: String(t.selected_winner_id),
            resolutionMethod: t.resolution_method,
            resolvedBy: t.resolved_by,
            resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined,
            reason: t.reason,
          })));
        }
        if (Array.isArray(vData)) {
          setVerifications(vData.map((v: any) => ({
            id: String(v.id),
            positionId: String(v.position_id),
            tiedCandidateIds: JSON.parse(v.tied_candidate_ids || '[]'),
            selectedVoterIds: JSON.parse(v.selected_voter_ids || '[]'),
            verificationStatus: v.verification_status,
            verifiedBy: v.verified_by,
            verifiedAt: v.verified_at ? new Date(v.verified_at) : undefined,
            notes: v.notes,
            originalVoteCounts: JSON.parse(v.original_vote_counts || '{}'),
            createdAt: new Date(v.created_at),
          })));
        }
      });
    }
  }, [isAdmin]);

  // Total votes & Turnout calculation
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const turnoutPercent = election && election.totalVoters > 0
    ? Math.round(((election.totalVoted || 0) / election.totalVoters) * 100)
    : 0;

  // Detect unresolved ties
  const detectedTies = useMemo(() => {
    const tiesList: { positionId: string; positionName: string; topVotes: number }[] = [];
    results.forEach(({ position, candidates: posCandidates }) => {
      if (posCandidates.length >= 2) {
        const topVote = posCandidates[0].votes;
        const secondVote = posCandidates[1].votes;
        if (topVote > 0 && topVote === secondVote) {
          // Check if resolved
          const isResolved = tieResolutions.some((r) => r.positionId === position.id);
          if (!isResolved) {
            tiesList.push({
              positionId: position.id,
              positionName: position.name,
              topVotes: topVote,
            });
          }
        }
      }
    });
    return tiesList;
  }, [results, tieResolutions]);

  const hasUnresolvedTies = detectedTies.length > 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    try {
      if (!printRef.current) return;
      
      // Clone the print area
      const clone = printRef.current.cloneNode(true) as HTMLElement;
      
      // Convert all images to Base64 so they appear in Word offline, and remove black backgrounds
      const images = clone.getElementsByTagName('img');
      for (let img of Array.from(images)) {
        if (img.src && !img.src.startsWith('data:')) {
          try {
            const response = await fetch(img.src);
            const blob = await response.blob();
            const imgBitmap = await createImageBitmap(blob);
            
            const canvas = document.createElement('canvas');
            canvas.width = imgBitmap.width;
            canvas.height = imgBitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(imgBitmap, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              // Remove black background (pixels that are very dark)
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // If pixel is black or very close to black (e.g., RGB all < 30), make it transparent
                if (r < 30 && g < 30 && b < 30) {
                  data[i + 3] = 0; // Alpha to 0
                }
              }
              ctx.putImageData(imageData, 0, 0);
              img.src = canvas.toDataURL('image/png');
            }
            img.width = img.clientWidth || 60; // Set explicit widths for Word
            img.height = img.clientHeight || 60;
          } catch (e) {
            console.error('Failed to convert image to base64', e);
          }
        }
      }

      // Hide anything with 'no-print' class in the clone
      const noPrintElements = clone.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');

      // Basic CSS to ensure it looks decent in Word
      const styles = `
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; border: 1px solid #000; text-align: center; }
          .border-b-2 { border-bottom: 2px solid #000; }
          .border-b { border-bottom: 1px solid #000; }
          .font-bold { font-weight: bold; }
          .text-center { text-align: center; }
          .uppercase { text-transform: uppercase; }
          .flex { display: table; width: 100%; }
          .grid { display: table; width: 100%; }
        </style>
      `;

      // Word HTML format requirements
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Export HTML To Doc</title>
          ${styles}
        </head>
        <body>
          ${clone.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CPMNHS_Election_Results_${election?.schoolYear || 'SY'}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    } finally {
      setIsDownloading(false);
    }
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

  // Format date helper
  const formatDateTime = (d?: Date | null) => {
    if (!d || isNaN(new Date(d).getTime())) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // ==========================================
  // OFFICIAL PRINTABLE RESULTS VIEW
  // ==========================================
  // ==========================================
  // OFFICIAL PRINTABLE RESULTS VIEW
  // ==========================================
  if (showPrintReport) {
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

    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans">
        {/* Screen Controls Header (Hidden during Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrintReport(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-xs sm:text-sm font-medium text-slate-300">
              Official Printable Report Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadDocx}
              disabled={isDownloading}
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              <FileDown className="h-4 w-4" />
              {isDownloading ? 'Generating...' : 'Download Word Doc'}
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <Printer className="h-4 w-4" /> Print Final Results
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div ref={printRef} className="max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:max-w-none text-slate-900">
          
          {/* Header with 3 Logos (CPMNHS Left, DepEd Center, SSLG Right) */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              {/* Left Logo: CPMNHS Seal */}
              <div className="w-16 flex-shrink-0 flex justify-center">
                <img
                  src={cpmnhsLogo}
                  alt="CPMNHS Seal"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs"
                />
              </div>

              {/* Center: DepEd Header */}
              <div className="flex-1 text-center flex flex-col items-center">
                {/* DepEd Logo */}
                <div className="flex flex-col items-center leading-none mb-1">
                  <img
                    src={depedLogo}
                    alt="DepEd Logo"
                    className="w-24 sm:w-32 object-contain"
                  />
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium leading-tight">Republic of the Philippines</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 font-medium leading-tight">Department of Education</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-tight">Region VII – Central Visayas</p>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-tight">Division of Bohol</p>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight mt-0.5 leading-tight">
                  CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600 leading-tight">Cabad, Balilihan, Bohol</p>
              </div>

              {/* Right Logo: SSLG Seal */}
              <div className="w-16 flex-shrink-0 flex justify-center">
                <img
                  src={sslgLogo}
                  alt="SSLG Seal"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full shadow-xs"
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
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Chairperson
                  </span>
                </div>

                {/* Co-Chairperson */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">
                    Co-Chairperson
                  </span>
                </div>

                {/* Member */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-slate-900 mb-1"></div>
                  <span className="text-[11px] sm:text-xs text-slate-800 font-bold leading-tight">
                    Signature over Printed Name
                  </span>
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
                <div className="w-full max-w-[240px] border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                    {election?.signatories?.preparedBy?.name || 'MS. LIZA MAY A. BELTRAN'}
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
                <div className="w-full max-w-[240px] border-b border-slate-900 mb-1">
                  <span className="font-bold uppercase text-slate-900 text-xs sm:text-sm block">
                    {election?.signatories?.approvedBy?.name || 'DR. ROLANDO D. VILLARIN'}
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
      </div>
    );
  }

  // ==========================================
  // MAIN RESULTS SCREEN VIEW
  // ==========================================
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-slide-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Election Results
                </h1>
                {election?.resultsFinalized ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    Finalized & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Live Tally
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                {election?.name || 'SSG General Election'} • S.Y. {election?.schoolYear || '2026-2027'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Session Selector */}
              <div className="relative mr-2">
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => switchSession(e.target.value)}
                  className="w-full sm:w-[200px] appearance-none bg-white border border-slate-200 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <option value="" disabled>Select a session...</option>
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.schoolYear})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              {election?.resultsFinalized && (
                <Button
                  onClick={() => setShowPrintReport(true)}
                  size="sm"
                  className="h-9 gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm rounded-xl"
                >
                  <Printer className="h-4 w-4" />
                  Print Final Results
                </Button>
              )}

              <Link to="/election-report">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1.5 text-xs sm:text-sm border-slate-200 text-slate-700 hover:bg-slate-100 font-medium rounded-xl"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  Audit & Verification
                </Button>
              </Link>
            </div>
          </div>

          {/* Finalized Banner */}
          {election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/90 flex items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Election Results are Officially Locked & Finalized</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Finalized by <strong>{election.finalizedBy || 'Administrator'}</strong> on {formatDateTime(election.finalizedAt)}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unresolved Tie Alert Banner */}
          {hasUnresolvedTies && !election?.resultsFinalized && (
            <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Tie Detected in {detectedTies.length} Position{detectedTies.length > 1 ? 's' : ''}</h4>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {detectedTies.map((t) => t.positionName).join(', ')} require verification before finalization.
                  </p>
                </div>
              </div>
              <Link to="/election-report">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1 self-start sm:self-auto rounded-lg shadow-xs"
                >
                  Resolve Ties in Audit & Verification <FileText className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
            {stats.map((stat, index) => (
              <Card
                key={index}
                className="border border-slate-200/80 shadow-xs bg-white rounded-lg"
              >
                <CardContent className="p-3 sm:p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{stat.title}</span>
                    <div className={`p-1.5 rounded-md ${stat.iconBg}`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none tracking-tight">
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
              const tieRes = tieResolutions.find((t) => t.positionId === position.id);

              return (
                <Card
                  key={position.id}
                  className="border border-slate-200/80 shadow-xs bg-white rounded-xl overflow-hidden"
                >
                  {/* Position Card Header */}
                  <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {positionIndex + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {position.name}
                      </h3>
                      {hasTieAtTop && !tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="h-3 w-3" />
                          Tie for 1st
                        </span>
                      )}
                      {tieRes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="h-3 w-3" />
                          Tie Resolved
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200/70">
                      {positionTotalVotes.toLocaleString()} votes cast
                    </span>
                  </div>

                  {/* Candidate List */}
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    {positionCandidates.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center italic">
                        No candidates registered for this position.
                      </p>
                    ) : (
                      positionCandidates.map((candidate, index) => {
                        const percentage = positionTotalVotes > 0
                          ? Math.round((candidate.votes / positionTotalVotes) * 100)
                          : 0;
                        const isLeading = index === 0 && candidate.votes > 0 && (!hasTieAtTop || tieRes?.selectedWinnerId === candidate.id);
                        const isTiedLead = (index === 0 || candidate.votes === topVoteCount) && topVoteCount > 0 && hasTieAtTop && !tieRes;

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
                                  <span className="w-3.5 text-center text-xs text-slate-400 font-medium">
                                    {index + 1}
                                  </span>
                                )}
                                <span className={`truncate ${isLeading ? 'text-blue-700 font-bold' : 'text-slate-800 font-medium'}`}>
                                  {candidate.name}
                                </span>
                                {candidate.party && (
                                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                                    ({candidate.party})
                                  </span>
                                )}
                                {candidate.gradeLevel && (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded hidden md:inline">
                                    Gr. {candidate.gradeLevel}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {candidate.votes.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({percentage}%)
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
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
