import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  HeadingLevel,
  TabStopType,
  TabStopPosition,
  ShadingType,
  VerticalAlign,
  Header,
  PageNumber,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

// Import the 3 logo images as URLs
import cpmnhsLogoUrl from '@/assets/cpmnhs-logo.jpg';
import sslgLogoUrl from '@/assets/sslg-logo.jpg';
import depedLogoUrl from '@/assets/deped-logo.jpg';

interface ResultCandidate {
  id: string;
  name: string;
  votes: number;
  party?: string;
  gradeLevel?: string;
}

interface ResultPosition {
  id: string;
  name: string;
}

interface ResultEntry {
  position: ResultPosition;
  candidates: ResultCandidate[];
}

interface ElectionData {
  name?: string;
  schoolYear?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  totalVoters?: number;
  totalVoted?: number;
  signatories?: {
    preparedBy?: { name: string; position: string };
    approvedBy?: { name: string; position: string };
  };
}

/**
 * Fetches an image from a URL and returns it as an ArrayBuffer.
 */
async function fetchImageAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

/**
 * Generates and downloads a Word (.docx) document with the official election results.
 */
export async function generateResultsDocx(
  results: ResultEntry[],
  election: ElectionData | null,
  turnoutPercent: number
) {
  // Fetch all 3 logos as array buffers
  const [cpmnhsLogo, depedLogo, sslgLogo] = await Promise.all([
    fetchImageAsArrayBuffer(cpmnhsLogoUrl),
    fetchImageAsArrayBuffer(depedLogoUrl),
    fetchImageAsArrayBuffer(sslgLogoUrl),
  ]);

  // Format dates
  const electionDate = election?.startDate ? new Date(election.startDate) : new Date();
  const electionDateFormatted = electionDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTime12 = (d?: Date) => {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const startTimeStr = election?.startDate ? formatTime12(new Date(election.startDate)) : '7:00 AM';
  const endTimeStr = election?.endDate ? formatTime12(new Date(election.endDate)) : '4:00 PM';
  const electionTimeFormatted = `${startTimeStr} – ${endTimeStr}`;

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  const dayWithSuffix = getOrdinal(electionDate.getDate());
  const monthAndYear = electionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Helper to make a border-less cell for the logo row
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0 },
    bottom: { style: BorderStyle.NONE, size: 0 },
    left: { style: BorderStyle.NONE, size: 0 },
    right: { style: BorderStyle.NONE, size: 0 },
  } as const;

  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 1 },
    bottom: { style: BorderStyle.SINGLE, size: 1 },
    left: { style: BorderStyle.SINGLE, size: 1 },
    right: { style: BorderStyle.SINGLE, size: 1 },
  } as const;

  // --- Build document sections ---

  // 1. Logo Header Row (3 logos in a table: CPMNHS | DepEd | SSLG)
  const logoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      new TableRow({
        children: [
          // CPMNHS Logo (left)
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: cpmnhsLogo,
                    transformation: { width: 70, height: 70 },
                    type: 'jpg',
                  }),
                ],
              }),
            ],
          }),
          // DepEd Logo + Text (center)
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: depedLogo,
                    transformation: { width: 130, height: 65 },
                    type: 'jpg',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ text: 'Republic of the Philippines', size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Department of Education', size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Region VII – Central Visayas', size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Division of Bohol', size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: 'CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL',
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Cabad, Balilihan, Bohol', size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
          // SSLG Logo (right)
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: noBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: sslgLogo,
                    transformation: { width: 70, height: 70 },
                    type: 'jpg',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 2. Horizontal line after header
  const headerLine = new Paragraph({
    spacing: { before: 100, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    },
    children: [],
  });

  // 3. Title section
  const titleParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'PRINT RESULTS', bold: true, size: 28, font: 'Arial' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({ text: 'SCHOOL ELECTION', bold: true, size: 22, font: 'Arial' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `SCHOOL YEAR ${election?.schoolYear || '2025-2026'}`,
          bold: true,
          size: 22,
          font: 'Arial',
        }),
      ],
    }),
  ];

  // 4. Metadata section (key-value pairs)
  const metadataItems = [
    ['Election Title', election?.name || 'Supreme Secondary Learners Government (SSLG) Election'],
    ['Date of Election', electionDateFormatted],
    ['Voting Time', electionTimeFormatted],
    ['Venue', 'Congressman Pablo Malasarte National High School'],
    ['Total Registered Voters', (election?.totalVoters || 0).toLocaleString()],
    ['Total Votes Cast', (election?.totalVoted || 0).toLocaleString()],
    ['Voter Turnout', `${turnoutPercent}%`],
  ];

  const metadataTable = new Table({
    width: { size: 70, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: metadataItems.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: label, bold: true, size: 20, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 5, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: ':', size: 20, font: 'Arial' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: noBorder,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value, size: 20, font: 'Arial' })],
                }),
              ],
            }),
          ],
        })
    ),
  });

  // 5. OFFICIAL RESULTS heading
  const resultsHeading = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 200 },
    children: [
      new TextRun({ text: 'OFFICIAL RESULTS', bold: true, size: 22, font: 'Arial' }),
    ],
  });

  // 6. Results table
  // Table header row
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: 'D6EAF8' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'POSITION', bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: 'D6EAF8' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'CANDIDATE NAME', bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: 'D6EAF8' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'TOTAL VOTES', bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: thinBorder,
        shading: { type: ShadingType.SOLID, color: 'D6EAF8' },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'RANK', bold: true, size: 20, font: 'Arial' })],
          }),
        ],
      }),
    ],
  });

  // Build data rows
  const tableDataRows: TableRow[] = [];
  results.forEach(({ position, candidates: posCandidates }) => {
    if (posCandidates.length === 0) {
      tableDataRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: thinBorder,
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: position.name.toUpperCase(), bold: true, size: 20, font: 'Arial' }),
                  ],
                }),
              ],
            }),
            new TableCell({
              columnSpan: 3,
              borders: thinBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'No candidates registered', italics: true, size: 20, font: 'Arial', color: '888888' }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
      return;
    }

    posCandidates.forEach((candidate, idx) => {
      const cells: TableCell[] = [];

      // Position cell (merged for first row only)
      if (idx === 0) {
        cells.push(
          new TableCell({
            rowSpan: posCandidates.length,
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: position.name.toUpperCase(),
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          })
        );
      }

      // Candidate name
      cells.push(
        new TableCell({
          borders: thinBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              spacing: { before: 30, after: 30 },
              children: [
                new TextRun({
                  text: candidate.name.toUpperCase(),
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        })
      );

      // Votes
      cells.push(
        new TableCell({
          borders: thinBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: candidate.votes.toLocaleString(),
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        })
      );

      // Rank
      cells.push(
        new TableCell({
          borders: thinBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: String(idx + 1),
                  bold: true,
                  size: 20,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        })
      );

      tableDataRows.push(new TableRow({ children: cells }));
    });
  });

  const resultsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...tableDataRows],
  });

  // 7. Certification text
  const certificationParagraphs = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 300, after: 80 },
      children: [
        new TextRun({
          text: `We, the undersigned, hereby certify that the above results are true, correct, and officially tallied based on the votes cast during the SSLG Election held on ${electionDateFormatted}.`,
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Certified this ${dayWithSuffix} day of ${monthAndYear} at Congressman Pablo Malasarte National High School, Cabad, Balilihan, Bohol.`,
          size: 20,
          font: 'Arial',
        }),
      ],
    }),
  ];

  // 8. Election Committee section
  const committeeHeading = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 },
    children: [
      new TextRun({ text: 'ELECTION COMMITTEE', bold: true, size: 22, font: 'Arial' }),
    ],
  });

  const committeeTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      // Signature lines row
      new TableRow({
        children: [
          // Chairperson
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' } },
                children: [new TextRun({ text: '', size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({ text: 'Signature over Printed Name', bold: true, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Chairperson', size: 18, font: 'Arial', italics: true }),
                ],
              }),
            ],
          }),
          // Co-Chairperson
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' } },
                children: [new TextRun({ text: '', size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({ text: 'Signature over Printed Name', bold: true, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Co-Chairperson', size: 18, font: 'Arial', italics: true }),
                ],
              }),
            ],
          }),
          // Member
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' } },
                children: [new TextRun({ text: '', size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({ text: 'Signature over Printed Name', bold: true, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Member', size: 18, font: 'Arial', italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 9. Certified Correct & Noted by section
  const preparedByName = election?.signatories?.preparedBy?.name || 'MS. LIZA MAY A. BELTRAN';
  const preparedByPosition = election?.signatories?.preparedBy?.position || 'School Election Officer';
  const approvedByName = election?.signatories?.approvedBy?.name || 'DR. ROLANDO D. VILLARIN';
  const approvedByPosition = election?.signatories?.approvedBy?.position || 'School Principal';

  const signatoriesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    rows: [
      // Labels row
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 200 },
                children: [
                  new TextRun({ text: 'Certified Correct:', bold: true, size: 20, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 200 },
                children: [
                  new TextRun({ text: 'Noted by:', bold: true, size: 20, font: 'Arial' }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Names and positions row
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' } },
                indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
                children: [
                  new TextRun({
                    text: preparedByName.toUpperCase(),
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ text: preparedByPosition, size: 18, font: 'Arial', italics: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' } },
                indent: { left: convertInchesToTwip(0.5), right: convertInchesToTwip(0.5) },
                children: [
                  new TextRun({
                    text: approvedByName.toUpperCase(),
                    bold: true,
                    size: 20,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({ text: approvedByPosition, size: 18, font: 'Arial', italics: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // --- Build document ---
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          logoTable,
          headerLine,
          ...titleParagraphs,
          metadataTable,
          resultsHeading,
          resultsTable,
          ...certificationParagraphs,
          committeeHeading,
          committeeTable,
          signatoriesTable,
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const fileName = `CPMNHS_Election_Results_${election?.schoolYear || 'SY'}.docx`;
  saveAs(blob, fileName);
}
