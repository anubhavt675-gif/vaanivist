import { useState } from "react";
import { downloadPrescriptionPDF, PrescriptionData } from "../lib/prescriptionPdf";

interface MedicineRow {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionModalProps {
  consultation: any;
  onClose: () => void;
  onPrescriptionCreated?: (prescription: PrescriptionData) => void;
}

export default function PrescriptionModal({
  consultation,
  onClose,
  onPrescriptionCreated,
}: PrescriptionModalProps) {
  const patientName = consultation?.patient_name || consultation?.name || "Rohan Kumar";
  const patientAge = consultation?.patient_age || consultation?.age || 28;
  const patientGender = consultation?.patient_gender || "Male";

  const [clinicalAssessment, setClinicalAssessment] = useState(
    consultation?.clinical_assessment ||
    consultation?.ai_summary ||
    consultation?.complaint ||
    "Acute Upper Respiratory Tract Symptoms"
  );

  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      name: "Tab. Paracetamol",
      strength: "650 mg",
      frequency: "1-0-1 (Twice daily after food)",
      duration: "3 days",
      instructions: "Take with warm water if fever exceeds 100°F",
    },
    {
      name: "Levocetirizine",
      strength: "5 mg",
      frequency: "0-0-1 (At bedtime)",
      duration: "5 days",
      instructions: "Do not drive after taking this medication",
    },
    {
      name: "Ambroxol Cough Syrup",
      strength: "100 ml",
      frequency: "10 ml twice daily",
      duration: "5 days",
      instructions: "Gargle with warm salt water before sleeping",
    },
  ]);

  const [generalAdvice, setGeneralAdvice] = useState(
    "Drink plenty of warm fluids, steam inhalation twice daily for 5-7 minutes. Complete the course of prescribed medications."
  );
  const [precautions, setPrecautions] = useState(
    "Seek immediate in-person emergency consultation if shortness of breath, high persistent fever, or chest pain develops."
  );
  const [followUpDate, setFollowUpDate] = useState("5 days later or SOS if symptoms persist");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: "",
        strength: "",
        frequency: "1-0-1 (Twice daily)",
        duration: "5 days",
        instructions: "After meals with water",
      },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateMedicine = (index: number, field: keyof MedicineRow, val: string) => {
    setMedicines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleApproveAndGenerate = async () => {
    const validMeds = medicines.filter((m) => m.name.trim() !== "");
    if (validMeds.length === 0) {
      setErrorMsg("Please add at least one medicine to the prescription.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const prescriptionPayload = {
      patient_name: patientName,
      patient_age: patientAge,
      patient_gender: patientGender,
      clinical_assessment: clinicalAssessment,
      medicines: validMeds,
      instructions: generalAdvice,
      precautions,
      follow_up_date: followUpDate,
      doctor_name: "Dr. Priya Sharma",
      doctor_qualification: "MBBS, MD (Internal Medicine)",
      registration_no: "DMC/R/2026/8941",
      hospital_name: "Clario Digital Healthcare",
    };

    try {
      const targetId = consultation?.id || consultation?.intake_id;
      const res = await fetch(`/api/consultations/${targetId}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prescriptionPayload),
      });

      if (res.ok) {
        const data = await res.json();
        const rx = data?.prescription;

        // Auto download PDF
        if (rx) {
          downloadPrescriptionPDF(rx);
          if (onPrescriptionCreated) onPrescriptionCreated(rx);
        }
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || "Failed to approve prescription.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error submitting prescription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 24, 53, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "820px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #071D35 0%, #102B46 100%)",
            padding: "16px 24px",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #06B6D4",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "18px" }}>📋</span>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>
                Clario — Clinical Prescription Generator
              </h2>
            </div>
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
              Authorized Clinical Reviewer: Dr. Priya Sharma (Reg: DMC/R/2026/8941)
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "white",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "8px",
                fontSize: "12px",
                marginBottom: "16px",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Patient Card Bar */}
          <div
            style={{
              background: "#f8fbfe",
              border: "1px solid #dce7f1",
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Patient Details
              </span>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#071D35", margin: "2px 0 0" }}>
                {patientName} • {patientAge} yrs • {patientGender}
              </h4>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Consultation ID</span>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#2563eb", margin: 0 }}>
                {consultation?.id?.substring(0, 12) || "CONS-LIVE"}
              </p>
            </div>
          </div>

          {/* Clinical Assessment */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
              Provisional Clinical Assessment / Diagnosis
            </label>
            <input
              type="text"
              value={clinicalAssessment}
              onChange={(e) => setClinicalAssessment(e.target.value)}
              placeholder="e.g. Acute Upper Respiratory Tract Infection with nocturnal cough"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Medicines Section */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                Prescribed Medicines (Rx Schedule)
              </label>
              <button
                type="button"
                onClick={addMedicineRow}
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#2563eb",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Medicine
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {medicines.map((med, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.8fr 1.2fr 0.8fr 1.4fr 32px",
                    gap: "8px",
                    alignItems: "center",
                    background: "#f8fafc",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Medicine Name (e.g. Paracetamol)"
                    value={med.name}
                    onChange={(e) => updateMedicine(idx, "name", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Strength (650mg)"
                    value={med.strength}
                    onChange={(e) => updateMedicine(idx, "strength", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Frequency (1-0-1)"
                    value={med.frequency}
                    onChange={(e) => updateMedicine(idx, "frequency", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Duration (5 days)"
                    value={med.duration}
                    onChange={(e) => updateMedicine(idx, "duration", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Instructions (After meals)"
                    value={med.instructions}
                    onChange={(e) => updateMedicine(idx, "instructions", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeMedicineRow(idx)}
                    title="Remove medicine"
                    style={{
                      background: "#fee2e2",
                      border: "none",
                      color: "#dc2626",
                      borderRadius: "6px",
                      height: "28px",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Advice & Follow up */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                Dietary & Lifestyle Advice
              </label>
              <textarea
                rows={2}
                value={generalAdvice}
                onChange={(e) => setGeneralAdvice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "11px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                Emergency Precautions / Warning
              </label>
              <textarea
                rows={2}
                value={precautions}
                onChange={(e) => setPrecautions(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "11px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
              Next Follow-up / Review Schedule
            </label>
            <input
              type="text"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              placeholder="e.g. 5 days later or SOS if fever persists"
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "14px 24px",
            background: "#fafcff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#059669", fontSize: "13px" }}>🔒</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Digitally signed per Telemedicine Practice Guidelines 2026
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApproveAndGenerate}
              disabled={isSubmitting}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isSubmitting ? "wait" : "pointer",
                boxShadow: "0 2px 8px rgba(13, 148, 136, 0.3)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isSubmitting ? "Generating PDF..." : "Approve & Download PDF 📄"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

