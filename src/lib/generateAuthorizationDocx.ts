import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
  convertInchesToTwip,
  ShadingType,
  UnderlineType,
} from 'docx';

export interface AuthorizationDocData {
  schoolName: string;
  schoolAddress: string;
  electionTitle: string;
  schoolYear: string;
  electionDate: string;
  startTime: string;
  endTime: string;
  gradeLevels: string[];
  preparedByName: string;
  preparedByPosition: string;
  approvedByName: string;
  approvedByPosition: string;
}

function makeSignatureTable(
  preparedByName: string,
  preparedByPosition: string,
  approvedByName: string,
  approvedByPosition: string
): Table {
  const upperPrepared = (preparedByName || '').trim().toUpperCase();
  const upperApproved = (approvedByName || '').trim().toUpperCase();

  const borderlessCell = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    },
    rows: [
      new TableRow({
        children: [
          // Left Column: Prepared by
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: borderlessCell,
            children: [
              new Paragraph({
                spacing: { before: 200, after: 60 },
                children: [
                  new TextRun({ text: 'Prepared by:', bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              // Signature space
              new Paragraph({ spacing: { before: 400, after: 60 }, children: [] }),
              new Paragraph({
                spacing: { after: 15 },
                children: [
                  new TextRun({
                    text: upperPrepared || '__________________________________',
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                    underline: upperPrepared ? { type: UnderlineType.SINGLE } : undefined,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 15 },
                children: [
                  new TextRun({
                    text: '(Signature Over Printed Name)',
                    size: 18,
                    font: 'Times New Roman',
                    italics: true,
                    color: '555555',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: preparedByPosition || 'Election Committee Chairman',
                    size: 20,
                    font: 'Times New Roman',
                    color: '000000',
                  }),
                ],
              }),
            ],
          }),

          // Middle spacer column
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: borderlessCell,
            children: [new Paragraph({ children: [] })],
          }),

          // Right Column: Approved by
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: borderlessCell,
            children: [
              new Paragraph({
                spacing: { before: 200, after: 60 },
                children: [
                  new TextRun({ text: 'Approved by:', bold: true, size: 22, font: 'Times New Roman' }),
                ],
              }),
              // Signature space
              new Paragraph({ spacing: { before: 400, after: 60 }, children: [] }),
              new Paragraph({
                spacing: { after: 15 },
                children: [
                  new TextRun({
                    text: upperApproved || '__________________________________',
                    bold: true,
                    size: 22,
                    font: 'Times New Roman',
                    underline: upperApproved ? { type: UnderlineType.SINGLE } : undefined,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 15 },
                children: [
                  new TextRun({
                    text: '(Signature Over Printed Name)',
                    size: 18,
                    font: 'Times New Roman',
                    italics: true,
                    color: '555555',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: approvedByPosition || 'School Principal',
                    size: 20,
                    font: 'Times New Roman',
                    color: '000000',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function generateAuthorizationDocx(data: AuthorizationDocData): Promise<void> {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const gradeListStr = data.gradeLevels.length > 0
    ? data.gradeLevels.map(g => `Grade ${g}`).join(', ')
    : 'Grade 7, Grade 8, Grade 9, Grade 10, Grade 11, Grade 12';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          // --- LETTERHEAD ---
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({ text: 'Republic of the Philippines', size: 20, font: 'Times New Roman', italics: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({ text: 'Department of Education', size: 22, font: 'Times New Roman', bold: true }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({ text: 'Region VII – Central Visayas', size: 20, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            children: [
              new TextRun({ text: 'Schools Division of Bohol', size: 20, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [
              new TextRun({
                text: data.schoolName || 'CONGRESSMAN PABLO MALASARTE NATIONAL HIGH SCHOOL',
                bold: true,
                size: 24,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: data.schoolAddress || 'Cabad, Balilihan, Bohol',
                size: 20,
                font: 'Times New Roman',
                italics: true,
              }),
            ],
          }),

          // --- Divider line ---
          new Paragraph({
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: '000000' },
            },
            children: [],
          }),

          // --- Date ---
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: today, size: 22, font: 'Times New Roman' }),
            ],
          }),

          // --- TO / FROM / RE ---
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'TO:', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: '          The School Principal', size: 22, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: 'FROM:', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({ text: '     Election Committee / Election Administrator', size: 22, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: 'RE:', bold: true, size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: `          Request for Authorization to Conduct the ${data.electionTitle || 'Supreme Student Government (SSG) Election'}`,
                size: 22,
                font: 'Times New Roman',
                bold: true,
              }),
            ],
          }),

          // --- Divider line ---
          new Paragraph({
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 3, space: 1, color: '000000' },
            },
            children: [],
          }),

          // --- BODY ---
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({ text: 'Dear Ma\'am/Sir,', size: 22, font: 'Times New Roman' }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: '          ', size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: `The undersigned respectfully requests for your approval and authorization to conduct the `,
                size: 22,
                font: 'Times New Roman',
              }),
              new TextRun({
                text: data.electionTitle || 'Supreme Student Government (SSG) General Election',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
              new TextRun({
                text: ` for School Year ${data.schoolYear || '2026-2027'}. The details of the proposed election are as follows:`,
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),

          // --- Election Details Table ---
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              makeDetailRow('Election Title', data.electionTitle || 'SSG General Election'),
              makeDetailRow('School Year', data.schoolYear || '2026-2027'),
              makeDetailRow('Date of Election', data.electionDate || '(To be determined)'),
              makeDetailRow('Voting Period', `${data.startTime || '(Start Time)'} – ${data.endTime || '(End Time)'}`),
              makeDetailRow('Participating Grade Levels', gradeListStr),
            ],
          }),

          new Paragraph({
            spacing: { before: 250, after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: '          ', size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: 'The election shall be conducted through the official CPMNHS Online Student Voting System (iVote) to ensure a secure, transparent, and efficient electoral process. Only registered and approved student voters shall be allowed to cast their ballots during the designated voting period.',
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: '          ', size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: 'We humbly request your favorable endorsement and approval for the conduct of the said election. Your support will greatly contribute to the development of student leadership and the democratic values of our school community.',
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: '          ', size: 22, font: 'Times New Roman' }),
              new TextRun({
                text: 'Thank you very much for your continued support and guidance.',
                size: 22,
                font: 'Times New Roman',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 80 },
            children: [
              new TextRun({ text: 'Respectfully yours,', size: 22, font: 'Times New Roman' }),
            ],
          }),

          // --- SIGNATURES (Prepared by on the LEFT, Approved by on the RIGHT side-by-side) ---
          makeSignatureTable(
            data.preparedByName,
            data.preparedByPosition,
            data.approvedByName,
            data.approvedByPosition
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Election_Authorization_Letter_${(data.electionTitle || 'SSG').replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function makeDetailRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: label, bold: true, size: 22, font: 'Times New Roman' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({ text: value, size: 22, font: 'Times New Roman' }),
            ],
          }),
        ],
      }),
    ],
  });
}
