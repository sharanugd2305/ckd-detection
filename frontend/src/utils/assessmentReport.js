import { jsPDF } from 'jspdf';

const FIELD_LABELS = {
  Age: 'Age',
  BMI: 'BMI',
  HbA1c: 'HbA1c',
  SerumCreatinine: 'Serum creatinine',
  BUNLevels: 'BUN',
  GFR: 'eGFR',
  HemoglobinLevels: 'Hemoglobin',
  SystolicBP: 'Systolic blood pressure',
  ProteinInUrine: 'Protein in urine',
  UrinaryTractInfections: 'UTI count',
  FamilyHistoryKidneyDisease: 'Family history',
  Gender: 'Gender',
  Smoking: 'Smoking',
};
const FIELD_UNITS = {
  Age: 'years',
  BMI: 'kg/m2',
  HbA1c: '%',
  SerumCreatinine: 'mg/dL',
  BUNLevels: 'mg/dL',
  GFR: 'mL/min',
  HemoglobinLevels: 'g/dL',
  SystolicBP: 'mmHg',
  ProteinInUrine: 'g/day',
};
const COLORS = {
  navy: [15, 27, 48],
  blue: [67, 111, 245],
  teal: [14, 165, 145],
  text: [35, 49, 70],
  muted: [105, 119, 139],
  border: [224, 231, 239],
  light: [245, 248, 252],
  low: [39, 166, 122],
  moderate: [231, 164, 45],
  high: [228, 100, 75],
  veryHigh: [184, 57, 64],
};
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function displayInputValue(key, value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (key === 'Gender') return Number(value) === 1 ? 'Male' : Number(value) === 0 ? 'Female' : String(value);
  if (key === 'Smoking' || key === 'FamilyHistoryKidneyDisease') {
    return Number(value) === 1 ? 'Yes' : Number(value) === 0 ? 'No' : String(value);
  }
  const unit = FIELD_UNITS[key];
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function normalizeProbability(value) {
  if (value === null || value === undefined || value === '') return null;
  const probability = Number(value);
  return Number.isFinite(probability) ? Math.max(0, Math.min(100, probability)) : null;
}

export function downloadAssessmentReport({
  fileName,
  reportDate,
  patientName,
  label,
  probability,
  riskLevel,
  stage,
  modelName,
  interpretation,
  riskFactors = [],
  warnings = [],
  recommendations = [],
  inputs = {},
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const score = normalizeProbability(probability);
  const generatedAt = new Date(reportDate || Date.now()).toLocaleString();
  let y;

  const drawHeader = (continuation = false) => {
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, PAGE_WIDTH, continuation ? 22 : 38, 'F');
    doc.setFillColor(...COLORS.teal);
    doc.rect(0, continuation ? 22 : 38, PAGE_WIDTH, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(continuation ? 12 : 19);
    doc.text(continuation ? 'NephroScan | CKD Risk Assessment' : 'CKD Risk Assessment', MARGIN, continuation ? 14 : 17);
    if (!continuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(207, 219, 236);
      doc.text('Clinical screening summary', MARGIN, 26);
      doc.setFontSize(8);
      doc.text('NEPHROSCAN', PAGE_WIDTH - MARGIN, 17, { align: 'right' });
    }
  };

  const startPage = () => {
    doc.addPage();
    drawHeader(true);
    y = 34;
  };

  const ensureSpace = (height) => {
    if (y + height > PAGE_HEIGHT - 19) startPage();
  };

  drawHeader();
  y = 47;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.text(patientName || 'Assessment record', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Report date: ${generatedAt}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
  y += 8;

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 34, 3, 3, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('ASSESSMENT', MARGIN + 5, y + 7);
  doc.text('ESTIMATED CKD PROBABILITY', PAGE_WIDTH - MARGIN - 5, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.text(label || 'Result unavailable', MARGIN + 5, y + 16);
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.blue);
  doc.text(score === null ? 'N/A' : `${score.toFixed(1)}%`, PAGE_WIDTH - MARGIN - 5, y + 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Risk level: ${riskLevel || 'Not available'}`, MARGIN + 5, y + 26);
  y += 42;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('Probability on the risk scale', MARGIN, y);
  y += 6;

  const chartX = MARGIN;
  const chartY = y;
  const chartWidth = CONTENT_WIDTH;
  const chartHeight = 7;
  [
    { end: 30, color: COLORS.low },
    { end: 55, color: COLORS.moderate },
    { end: 75, color: COLORS.high },
    { end: 100, color: COLORS.veryHigh },
  ].forEach((band, index, bands) => {
    const start = index === 0 ? 0 : bands[index - 1].end;
    const width = chartWidth * (band.end - start) / 100;
    doc.setFillColor(...band.color);
    doc.rect(chartX + chartWidth * start / 100, chartY, width, chartHeight, 'F');
  });
  if (score !== null) {
    const markerX = chartX + chartWidth * score / 100;
    doc.setDrawColor(...COLORS.navy);
    doc.setLineWidth(0.8);
    doc.line(markerX, chartY - 2, markerX, chartY + chartHeight + 2);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...COLORS.navy);
    doc.circle(markerX, chartY - 2, 1.8, 'FD');
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.muted);
  [
    { label: 'Low (<30%)', start: 0, end: 30 },
    { label: 'Moderate (30-54%)', start: 30, end: 55 },
    { label: 'High (55-74%)', start: 55, end: 75 },
    { label: 'Very high (75%+)', start: 75, end: 100 },
  ].forEach((band) => {
    const center = chartX + chartWidth * (band.start + band.end) / 200;
    doc.text(band.label, center, chartY + 12, { align: 'center' });
  });
  y += 21;

  const summaryItems = [
    ['AGE', inputs.Age != null && inputs.Age !== '' ? `${inputs.Age} years` : 'Not provided'],
    ['CKD STAGE', stage || 'Not available'],
    ['MODEL', modelName || 'Not available'],
  ];
  const cardGap = 3;
  const cardWidth = (CONTENT_WIDTH - cardGap * 2) / 3;
  summaryItems.forEach(([title, value], index) => {
    const x = MARGIN + index * (cardWidth + cardGap);
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardWidth, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(title, x + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.text(doc.splitTextToSize(String(value), cardWidth - 6)[0], x + 3, y + 11);
  });
  y += 23;

  const addSection = (title, lines) => {
    const content = lines.length ? lines : ['Not available.'];
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.blue);
    doc.text(title, MARGIN, y);
    y += 5;

    content.forEach((line) => {
      const wrappedLines = doc.splitTextToSize(String(line), CONTENT_WIDTH - 2);
      wrappedLines.forEach((wrappedLine) => {
        ensureSpace(6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.text);
        doc.text(wrappedLine, MARGIN + 1, y);
        y += 4.5;
      });
    });
    y += 3;
  };

  addSection('Clinical interpretation', [interpretation || 'No interpretation is available for this assessment.']);
  addSection('Key risk factors', riskFactors.length ? riskFactors.map((item) => `- ${item}`) : ['No major risk factors were identified.']);
  addSection('Early detection alerts', warnings.length ? warnings.map((item) => `- ${item}`) : ['No early warnings recorded.']);
  addSection('Recommendations', recommendations.length ? recommendations.map((item) => `- ${item}`) : ['No recommendations available.']);

  const entries = Object.entries(inputs);
  if (entries.length) {
    startPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.text);
    doc.text('Clinical inputs', MARGIN, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text('Values shown are those submitted for this assessment.', MARGIN, y);
    y += 8;

    const gap = 4;
    const columnWidth = (CONTENT_WIDTH - gap) / 2;
    for (let index = 0; index < entries.length; index += 2) {
      ensureSpace(14);
      const rowEntries = entries.slice(index, index + 2);
      for (let column = 0; column < rowEntries.length; column += 1) {
        const [key, value] = rowEntries[column];
        const x = MARGIN + column * (columnWidth + gap);
        doc.setDrawColor(...COLORS.border);
        doc.setFillColor(...COLORS.light);
        doc.roundedRect(x, y, columnWidth, 12, 2, 2, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(FIELD_LABELS[key] || key, x + 3, y + 4.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.text);
        doc.text(doc.splitTextToSize(displayInputValue(key, value), columnWidth - 6)[0], x + 3, y + 9.5);
      }
      y += 15;
    }
  }

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(MARGIN, PAGE_HEIGHT - 14, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('For educational use only - not a diagnosis or substitute for professional medical advice.', MARGIN, PAGE_HEIGHT - 8);
    doc.text(`${page} / ${doc.getNumberOfPages()}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' });
  }

  doc.save(fileName);
}
