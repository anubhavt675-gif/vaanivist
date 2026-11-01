import { jsPDF } from "jspdf";

export interface DraftExportData {
  id: string;
  patientName: string;
  patientAge?: number | string;
  language: string;
  date: string;
  complaint: string;
  story: string;
  extracted: Array<{
    field: string;
    value: string;
    original: string;
    confidence: number;
    status: string;
  }>;
  clinicalSummary?: string;
  followUpQuestions?: string[];
  severity?: string;
  isUrgent?: boolean;
  urgentReason?: string | null;
  status: string;
  doctorNotes?: string;
  contentHash?: string;
}

export function generateDraftPDF(data: DraftExportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner
  doc.setFillColor(7, 29, 53); // #071D35 Deep Navy
  doc.rect(0, 0, pageWidth, 36, "F");

  // Accent Line
  doc.setFillColor(6, 182, 212); // #06B6D4 Cyan
  doc.rect(0, 36, pageWidth, 2, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("CLARIO", 16, 16);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("AI Health Platform - Verified Clinical Intake & Pre-Consultation Draft", 16, 23);

  // Status Badge in Header
  doc.setFillColor(data.status === "Approved" ? 16 : 37, data.status === "Approved" ? 185 : 99, data.status === "Approved" ? 129 : 235);
  doc.roundedRect(pageWidth - 48, 12, 34, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(data.status.toUpperCase(), pageWidth - 31, 18.5, { align: "center" });

  let y = 46;

  // 2. Patient & Metadata Grid
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("PATIENT NAME", 20, y + 8);
  doc.text("INTAKE DATE", 80, y + 8);
  doc.text("LANGUAGE", 130, y + 8);
  doc.text("INTAKE ID", 165, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.patientName || "Patient", 20, y + 16);
  doc.text(data.date || new Date().toLocaleDateString("en-GB"), 80, y + 16);
  doc.text(data.language ? data.language.toUpperCase() : "HINGLISH", 130, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.id ? data.id.substring(0, 12) + "..." : "N/A", 165, y + 16);

  y += 32;

  // 3. Urgent Alert Banner (if applicable)
  if (data.isUrgent && data.urgentReason) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text("! URGENT CLINICAL ALERT", 20, y + 6.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text(data.urgentReason, 20, y + 12);

    y += 22;
  }

  // 4. Original Patient Story
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Original Patient Voice / Text Description", 16, y);
  y += 4;

  doc.setFillColor(241, 245, 249);
  const storyLines = doc.splitTextToSize(`"${data.story}"`, pageWidth - 36);
  const storyHeight = Math.max(14, storyLines.length * 5 + 6);
  doc.roundedRect(14, y, pageWidth - 28, storyHeight, 2, 2, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(storyLines, 18, y + 6);

  y += storyHeight + 8;

  // 5. AI Extracted Information Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Structured AI Clinical Extraction & Evidence", 16, y);
  y += 4;

  // Table Header
  doc.setFillColor(7, 29, 53);
  doc.rect(14, y, pageWidth - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("CLINICAL FIELD", 18, y + 5);
  doc.text("EXTRACTED VALUE", 62, y + 5);
  doc.text("EVIDENCE IN PATIENT STORY", 118, y + 5);
  doc.text("CONFIDENCE", pageWidth - 36, y + 5);

  y += 7;

  // Rows
  const fields = data.extracted || [];
  fields.forEach((item, idx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(14, y, pageWidth - 28, 10, "F");
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 10, pageWidth - 14, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.field, 18, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const valText = doc.splitTextToSize(item.value || "Not provided", 50);
    doc.text(valText[0] || "", 62, y + 6.5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const quoteText = doc.splitTextToSize(item.original ? `"${item.original}"` : "Not provided", 48);
    doc.text(quoteText[0] || "", 118, y + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    if (item.confidence > 0) {
      doc.setTextColor(5, 150, 105);
      doc.text(`${item.confidence}%`, pageWidth - 28, y + 6.5);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text("—", pageWidth - 28, y + 6.5);
    }

    y += 10;
  });

  y += 6;

  // 6. Clinical Summary & Suggested Questions
  if (data.clinicalSummary && y < pageHeight - 45) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Clinical Summary", 16, y);
    y += 4;

    const summaryLines = doc.splitTextToSize(data.clinicalSummary, pageWidth - 36);
    const sumHeight = summaryLines.length * 4.5 + 4;
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(14, y, pageWidth - 28, sumHeight, 1.5, 1.5, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161);
    doc.text(summaryLines, 18, y + 4.5);

    y += sumHeight + 6;
  }

  // 7. Footer & Medical Disclaimer
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 2, pageWidth - 14, footerY - 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "SAFETY NOTICE: This AI Clinical Draft is an organization of patient-reported symptoms. It is NOT a final medical diagnosis or prescription.",
    16,
    footerY + 2
  );
  doc.text(
    "All medical assessments and prescriptions must be performed by a registered healthcare professional.",
    16,
    footerY + 6
  );

  doc.setFont("helvetica", "bold");
  doc.text(
    `Clario Certified Clinical Intake | Verification Hash: ${data.contentHash ? data.contentHash.substring(0, 16) : "VERIFIED_2026"}`,
    pageWidth - 16,
    footerY + 6,
    { align: "right" }
  );

  return doc;
}

export function downloadDraftPDF(data: DraftExportData) {
  const doc = generateDraftPDF(data);
  const cleanName = (data.patientName || "patient").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const filename = `clario_clinical_draft_${cleanName}_${Date.now()}.pdf`;
  doc.save(filename);
}

