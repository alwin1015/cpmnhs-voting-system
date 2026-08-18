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

function signatureBlock(role: string, name: string, position: string): Paragraph[] {
  const upperName = (name || '').trim().toUpperCase();

  return [
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: `${role}:`, bold: true, size: 22, font: 'Times New Roman' }),
      ],
    }),
    // Space for physical handwritten signature above printed name
    new Paragraph({ spacing: { before: 400, after: 60 }, children: [] }),
    new Paragraph({
      spacing: { after: 15 },
      children: [
        new TextRun({
          text: upperName || '__________________________________________',
          bold: true,
          size: 22,
          font: 'Times New Roman',
          underline: upperName ? { type: UnderlineType.SINGLE } : undefined,
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
      spacing: { after: 20 },
      children: [
        new TextRun({
          text: position || 'Position / Designation',
          size: 20,
          font: 'Times New Roman',
          color: position ? '000000' : '666666',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: 'Date: _____________________________________', size: 20, font: 'Times New Roman' }),
      ],
    }),
  ];
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
            spacing: { before: 100, after: 100 },
            children: [
              new TextRun({ text: 'Respectfully yours,', size: 22, font: 'Times New Roman' }),
            ],
          }),

          // --- SIGNATURES (Prepared by and Approved by ONLY with UPPERCASE name & Signature Over Printed Name format) ---
          ...signatureBlock('Prepared by', data.preparedByName, data.preparedByPosition || 'Election Committee Chairman'),
          ...signatureBlock('Approved by', data.approvedByName, data.approvedByPosition || 'School Principal'),
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
