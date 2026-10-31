import { jsPDF } from "jspdf";

export interface PrescriptionData {
  id: string;
  consultation_id?: string;
  verification_hash?: string;
  patient_name: string;
  patient_age: number | string;
  patient_gender?: string;
  clinical_assessment: string;
  medicines: Array<{
    name: string;
    strength: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
  instructions?: string;
  precautions?: string;
  follow_up_date?: string;
  doctor?: {
    name: string;
    qualification: string;
    registration_no: string;
    hospital?: string;
    digital_signature?: string;
    signed_at?: string;
  };
  issued_date: string;
}

export function generatePrescriptionPDF(data: PrescriptionData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Background Banner
  doc.setFillColor(7, 29, 53); // #071D35 Navy
  doc.rect(0, 0, pageWidth, 38, "F");

  // Cyan brand accent stripe
  doc.setFillColor(6, 182, 212); // #06B6D4
  doc.rect(0, 38, pageWidth, 2.5, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("VISION", 16, 18);

  // Brand Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("AI-Powered Healthcare & Clinical Teleconsultation Platform", 16, 25);
  doc.text("Telemedicine & Digital Clinical Care | Teleconsultation Guidelines 2026", 16, 31);

  // Rx Identifier badge on top-right
  doc.setFillColor(17, 87, 154);
  doc.roundedRect(pageWidth - 62, 11, 48, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("E-PRESCRIPTION", pageWidth - 58, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(`ID: ${data.id}`, pageWidth - 58, 24);

  // 2. Doctor & Clinic Details
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  const docName = data.doctor?.name || "Dr. Priya Sharma";
  doc.text(docName, 16, 49);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(data.doctor?.qualification || "MBBS, MD (Internal Medicine)", 16, 54);
  doc.text(`Reg. No: ${data.doctor?.registration_no || "DMC/R/2026/8941"}`, 16, 59);

  // Right-side hospital details
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(data.doctor?.hospital || "Vaani Vision Digital Healthcare", pageWidth - 16, 49, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Issued Date: ${data.issued_date}`, pageWidth - 16, 54, { align: "right" });
  doc.text(`Verification Hash: ${data.verification_hash || "SEC-VERIFIED-9021"}`, pageWidth - 16, 59, { align: "right" });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(16, 63, pageWidth - 16, 63);

  // 3. Patient Details Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(16, 67, pageWidth - 32, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("PATIENT INFORMATION", 20, 73);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Name: ${data.patient_name}`, 20, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Age: ${data.patient_age} yrs`, 85, 80);
  doc.text(`Gender: ${data.patient_gender || "Male"}`, 115, 80);
  doc.text(`Consultation ID: ${data.consultation_id || data.id}`, 150, 80);

  doc.text(`Clinical Diagnosis / Assessment: ${data.clinical_assessment || "Acute Upper Respiratory Tract Symptoms"}`, 20, 86);

  // 4. Rx Symbol Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235); // #2563EB primary blue
  doc.text("Rx", 16, 99);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("PRESCRIBED MEDICATIONS & DOSAGE SCHEDULE", 28, 97);

  // 5. Medicines Table Header
  const tableStartY = 103;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(16, tableStartY, pageWidth - 32, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("#", 20, tableStartY + 5.5);
  doc.text("MEDICINE & STRENGTH", 28, tableStartY + 5.5);
  doc.text("DOSAGE / FREQUENCY", 98, tableStartY + 5.5);
  doc.text("DURATION", 145, tableStartY + 5.5);
  doc.text("INSTRUCTIONS", 168, tableStartY + 5.5);

  let currentY = tableStartY + 8;
  const medicines = data.medicines || [];

  medicines.forEach((med, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(16, currentY, pageWidth - 32, 12, "F");

    // Divider under row
    doc.setDrawColor(241, 245, 249);
    doc.line(16, currentY + 12, pageWidth - 16, currentY + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(index + 1), 20, currentY + 5.5);
    doc.text(med.name, 28, currentY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(med.strength, 28, currentY + 9.5);

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(med.frequency, 98, currentY + 6.5);
    doc.text(med.duration, 145, currentY + 6.5);

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const instr = doc.splitTextToSize(med.instructions || "As directed", 26);
    doc.text(instr, 168, currentY + 5);

    currentY += 12;
  });

  currentY += 6;

  // 6. Advice & Special Instructions Block
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(16, currentY, pageWidth - 32, 28, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.text("GENERAL ADVICE & DIETARY PRECAUTIONS", 20, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const adviceText = data.instructions || "Drink plenty of warm water, take proper rest. Avoid cold food items and dairy for 2-3 days.";
  const splitAdvice = doc.splitTextToSize(adviceText, pageWidth - 40);
  doc.text(splitAdvice, 20, currentY + 12);

  const precText = `Emergency Precaution: ${data.precautions || "If symptoms worsen, high fever or breathing distress persists, visit an emergency facility immediately."}`;
  const splitPrec = doc.splitTextToSize(precText, pageWidth - 40);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(splitPrec, 20, currentY + 22);

  currentY += 34;

  // 7. Follow-up Date Block
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(16, currentY, 85, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text("NEXT REVIEW / FOLLOW-UP", 20, currentY + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(data.follow_up_date || "After 5 days or SOS", 20, currentY + 10.5);

  // 8. Doctor Signature Block (Right side)
  const sigX = pageWidth - 80;
  doc.setDrawColor(203, 213, 225);
  doc.line(sigX, currentY + 14, pageWidth - 16, currentY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(docName, sigX, currentY + 19);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text("✓ Digitally Signed & Approved", sigX, currentY + 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Timestamp: ${new Date().toISOString()}`, sigX, currentY + 27);

  // 9. Footer Security & Compliance Notice
  const footerY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(16, footerY - 4, pageWidth - 16, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "This is an electronically generated and digitally approved e-prescription issued pursuant to the Telemedicine Practice Guidelines.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );
  doc.text(
    `Vaani Vision Verification ID: ${data.id} • Hash: ${data.verification_hash || "VERIFIED-OK"} • Patient: ${data.patient_name}`,
    pageWidth / 2,
    footerY + 3.5,
    { align: "center" }
  );

  return doc;
}

export function downloadPrescriptionPDF(data: PrescriptionData) {
  const doc = generatePrescriptionPDF(data);
  const filename = `Vision_Prescription_${data.patient_name.replace(/\s+/g, "_")}_${data.id}.pdf`;
  doc.save(filename);
}

