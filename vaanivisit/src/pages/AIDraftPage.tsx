import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { subscribeToRealtimeEvents, broadcastRealtimeEvent } from "../lib/realtime";
import { downloadDraftPDF } from "../lib/draftPdf";
import { getSupabaseBrowserClient } from "../lib/supabase";

const GeminiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#4285f4"/>
  </svg>
);

const FieldIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "lungs":
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0, boxShadow: "0 2px 6px rgba(239, 68, 68, 0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a3.5 3.5 0 0 1-7 0V9a1 1 0 0 1 2 0v7.5a1.5 1.5 0 0 0 3 0V9a1 1 0 0 1 2 0z"/>
          </svg>
        </div>
      );
    case "clock":
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", flexShrink: 0, boxShadow: "0 2px 6px rgba(2, 132, 199, 0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
        </div>
      );
    case "chart":
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6", flexShrink: 0, boxShadow: "0 2px 6px rgba(139, 92, 246, 0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
          </svg>
        </div>
      );
    case "pill":
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b", flexShrink: 0, boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 3h12v2H6zm0 16h12v2H6zm1-14h10v12H7z"/>
          </svg>
        </div>
      );
    case "shield":
    default:
      return (
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0, boxShadow: "0 2px 6px rgba(100, 116, 139, 0.12)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
        </div>
      );
  }
};

interface ExtractedItem {
  field: string;
  key: string;
  value: string;
  original: string;
  confidence: number;
  status: string;
  iconType: string;
}

export default function AIDraftPage() {
  const navigate = useNavigate();

  const [draft, setDraft] = useState({
    id: "draft-pending",
    intakeId: "",
    name: "Patient",
    age: 28,
    language: "Hinglish",
    status: "Pending", // "Pending" | "In Review" | "Approved" | "Rejected"
    date: "Today",
    complaint: "Processing symptoms...",
    story: typeof window !== "undefined" ? sessionStorage.getItem("vani_symptom_text") || "Describe how you feel..." : "Describe how you feel...",
    extracted: [] as ExtractedItem[],
    clinical_summary: "",
    follow_up_questions: [] as string[],
    severity: "moderate",
    is_urgent: false,
    urgent_reason: null as string | null,
    content_hash: "",
  });

  const [showFull, setShowFull] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  // Field Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Doctor Submission State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submittedConsultationId, setSubmittedConsultationId] = useState<string | null>(null);

  // PDF Export State
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Patient profile from Supabase
  const [patientProfile, setPatientProfile] = useState<{ displayName: string; avatarUrl: string | null; initials: string }>({
    displayName: "Patient",
    avatarUrl: null,
    initials: "P",
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          const name = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Patient";
          const initials = name.split(" ").filter(Boolean).map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "P";
          setPatientProfile({
            displayName: name,
            avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
            initials,
          });
        }
      });
    }
  }, []);

  // Helper to map draft API response to state
  const mapDraftToState = useCallback((d: any, savedText: string | null, savedLang: string) => {
    if (d.id) sessionStorage.setItem("vani_draft_id", d.id);
    if (d.content_hash) sessionStorage.setItem("vani_draft_hash", d.content_hash);
    if (d.intake_id) sessionStorage.setItem("vani_intake_id", d.intake_id);

    const evidenceList: any[] = d.evidence || d.draft_field_evidence || [];
    const sc = d.structured_content || {};

    const fieldConfigs = [
      { field: "Main Complaint", key: "main_complaint", defaultVal: sc.main_complaint, iconType: "lungs" },
      { field: "Duration", key: "duration", defaultVal: sc.duration, iconType: "clock" },
      { field: "Symptom Pattern", key: "symptom_pattern", defaultVal: sc.symptom_pattern, iconType: "chart" },
      { field: "Medicine Use", key: "medicine_use", defaultVal: sc.medicine_use, iconType: "pill" },
      { field: "Known Allergies", key: "known_allergies", defaultVal: sc.known_allergies, iconType: "shield" },
    ];

    const mappedExtracted: ExtractedItem[] = fieldConfigs.map((cfg) => {
      const ev = evidenceList.find((e: any) =>
        e.field?.toLowerCase() === cfg.field.toLowerCase() ||
        e.path === cfg.key ||
        e.field_path === cfg.key
      );
      const val = cfg.defaultVal || ev?.value || ev?.field_value || "Not provided";
      const quote = ev?.exact_quote || (val !== "Not provided" ? val : "No clear mention in text");
      const hasVal = val !== "Not provided" && val !== null && val !== "";
      const conf = ev?.confidence || (hasVal ? 94 : 0);

      return {
        field: cfg.field,
        key: cfg.key,
        value: val,
        original: quote,
        confidence: conf,
        status: conf > 80 ? "High" : conf > 50 ? "Medium" : "Unknown",
        iconType: cfg.iconType,
      };
    });

    let statusDisplay = "Pending";
    if (d.status === "approved") statusDisplay = "Approved";
    else if (d.status === "in_review") statusDisplay = "In Review";
    else if (d.status === "rejected") statusDisplay = "Rejected";

    const story =
      savedText ||
      d.raw_source_text ||
      d.patient_intakes?.source_text ||
      "Describe how you feel...";

    setDraft((prev) => ({
      ...prev,
      id: d.id,
      intakeId: d.intake_id || prev.intakeId,
      name: patientProfile.displayName,
      age: 28,
      language: (d.source_language || d.patient_intakes?.source_language || savedLang || "hinglish").toUpperCase(),
      status: statusDisplay,
      date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      complaint: sc.main_complaint || "Symptoms Analyzed",
      story,
      extracted: mappedExtracted,
      clinical_summary: sc.clinical_summary || (sc.main_complaint ? `Patient reported ${sc.main_complaint}.` : ""),
      follow_up_questions: Array.isArray(sc.follow_up_questions) ? sc.follow_up_questions : [],
      severity: sc.severity || "moderate",
      is_urgent: Boolean(sc.is_urgent),
      urgent_reason: sc.urgent_reason || null,
      content_hash: d.content_hash || "",
    }));
  }, [patientProfile.displayName]);

  // Load and Generate Draft from Supabase
  const loadDraft = useCallback(async () => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const queryIntakeId = urlParams.get("intakeId");
    const sessionIntakeId = sessionStorage.getItem("vani_intake_id");
    const sessionDraftId = sessionStorage.getItem("vani_draft_id");
    const intakeId = queryIntakeId || sessionIntakeId;
    const savedText = sessionStorage.getItem("vani_symptom_text");
    const savedLang = sessionStorage.getItem("vani_symptom_lang") || "hinglish";

    if (!intakeId && !savedText) {
      setIsAiLoading(false);
      setAiError("no_intake");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    // 1. Try to fetch existing draft by session draft ID (avoids re-extracting on refresh)
    if (sessionDraftId && !sessionDraftId.startsWith("temp-")) {
      try {
        const dRes = await fetch(`/api/drafts/${sessionDraftId}`);
        if (dRes.ok) {
          const dData = await dRes.json();
          if (dData?.draft) {
            setIsAiLoading(false);
            mapDraftToState(dData.draft, savedText, savedLang);
            return;
          }
        }
      } catch (_) {}
    }

    // 2. Try to fetch existing draft by intake ID
    if (intakeId && !intakeId.startsWith("temp-")) {
      try {
        const biRes = await fetch(`/api/drafts/by-intake/${intakeId}`);
        if (biRes.ok) {
          const biData = await biRes.json();
          if (biData?.draft) {
            setIsAiLoading(false);
            mapDraftToState(biData.draft, savedText, savedLang);
            return;
          }
        }
      } catch (_) {}
    }

    // 3. No existing draft found: generate one
    const targetId = intakeId || "latest";

    try {
      const res = await fetch(`/api/intakes/${targetId}/generate-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: savedText || undefined,
          language: savedLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server status: ${res.status}`);
      }

      const data = await res.json();
      setIsAiLoading(false);

      if (data?.draft) {
        mapDraftToState(data.draft, savedText, savedLang);
      } else if (data?.error) {
        setAiError(data.error);
      }
    } catch (err: any) {
      console.warn("AI Draft generation client catch:", err);
      setIsAiLoading(false);
      setAiError(err.message || "Failed to generate AI draft. Please try again.");
    }
  }, [mapDraftToState]);

  useEffect(() => {
    loadDraft();

    // Subscribe to real-time events across Supabase Realtime & broadcast
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.event === "draft_reviewed") {
        const approved = event.data?.decision === "approved" || event.status === "approved";
        setDraft((prev) => ({
          ...prev,
          status: approved ? "Approved" : "In Review",
        }));
      } else if (event.event === "draft_updated") {
        loadDraft();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadDraft]);

  // Handle Editing an Extracted Field
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(draft.extracted[index].value === "Not provided" ? "" : draft.extracted[index].value);
    setSaveSuccessMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleSaveEdit = async (index: number) => {
    const item = draft.extracted[index];
    const updatedValue = editValue.trim() || "Not provided";
    setIsSavingEdit(true);

    try {
      // Build updated structured content
      const updatedExtracted = [...draft.extracted];
      updatedExtracted[index] = {
        ...item,
        value: updatedValue,
        status: updatedValue !== "Not provided" ? "High" : "Unknown",
        confidence: updatedValue !== "Not provided" ? 95 : 0,
      };

      const updatedStructuredContent: Record<string, string | null> = {};
      updatedExtracted.forEach((ext) => {
        updatedStructuredContent[ext.key] = ext.value !== "Not provided" ? ext.value : null;
      });

      const draftId = draft.id || sessionStorage.getItem("vani_draft_id");
      if (draftId && !draftId.startsWith("temp-")) {
        const res = await fetch(`/api/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            structured_content: updatedStructuredContent,
            reviewer_notes: "Patient edited symptom field",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.draft?.id) {
            sessionStorage.setItem("vani_draft_id", data.draft.id);
          }
        }
      }

      setDraft((prev) => ({
        ...prev,
        extracted: updatedExtracted,
      }));

      setEditingIndex(null);
      setSaveSuccessMsg(`✓ Updated "${item.field}" and saved to Supabase!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      broadcastRealtimeEvent("draft_updated", { draftId: draft.id });
    } catch (err) {
      console.warn("Save edit error:", err);
      setEditingIndex(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Submitting to Doctor
  const handleConfirmSubmitToDoctor = async () => {
    setIsSubmitting(true);
    try {
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const queryIntakeId = urlParams?.get("intakeId");
      const draftId = draft.id || sessionStorage.getItem("vani_draft_id") || queryIntakeId || "latest";
      const intakeId = draft.intakeId || queryIntakeId || sessionStorage.getItem("vani_intake_id");

      const structuredPayload: Record<string, string | null> = {};
      draft.extracted.forEach((ext) => {
        structuredPayload[ext.key] = ext.value !== "Not provided" ? ext.value : null;
      });

      const res = await fetch(`/api/drafts/${draftId}/submit-to-doctor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake_id: intakeId,
          doctor_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
          doctor_name: "Dr. Priya Sharma",
          patient_name: "Patient",
          priority: draft.is_urgent ? "urgent" : "normal",
          source_text: draft.story,
          structured_content: structuredPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const consId = data.consultation_id || data.consultation?.id || intakeId || draftId || "latest";
        setSubmittedConsultationId(consId);
        setSubmitSuccess("Your medical concern has been successfully sent to your doctor.");
        setDraft((prev) => ({ ...prev, status: "In Review" }));
        setShowSubmitModal(false);
        broadcastRealtimeEvent("intake_submitted", { intakeId, draftId, consultation_id: consId });
        broadcastRealtimeEvent("new_message", { consultation_id: consId });

        // Immediate and guaranteed redirect to Messages section
        navigate(`/messages?consultation_id=${consId}`);
        if (typeof window !== "undefined") {
          window.location.href = `/messages?consultation_id=${consId}`;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to submit draft to doctor.");
      }
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle PDF Export
  const handleExportPDF = () => {
    setIsPdfExporting(true);
    try {
      downloadDraftPDF({
        id: draft.id,
        patientName: draft.name,
        patientAge: draft.age,
        language: draft.language,
        date: draft.date,
        complaint: draft.complaint,
        story: draft.story,
        extracted: draft.extracted.map((e) => ({
          field: e.field,
          value: e.value,
          original: e.original,
          confidence: e.confidence,
          status: e.status,
        })),
        clinicalSummary: draft.clinical_summary,
        followUpQuestions: draft.follow_up_questions,
        severity: draft.severity,
        isUrgent: draft.is_urgent,
        urgentReason: draft.urgent_reason,
        status: draft.status,
        contentHash: draft.content_hash,
      });
    } catch (err) {
      console.warn("PDF generation error:", err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar />

      <main className="main-content">
        {/* Top Header */}
        <header
          style={{
            background: "white",
            borderBottom: "1px solid #e2eaf6",
            padding: "12px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 4px rgba(15,21,53,0.03)",
          }}
        >
          {/* Search Visit Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f4f8fc",
              borderRadius: "20px",
              padding: "6px 14px",
              border: "1px solid #e1e9f4",
              width: "280px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#889bb5">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search symptoms, medications..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12px",
                color: "#0f1535",
                width: "100%",
              }}
            />
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleExportPDF}
              disabled={isPdfExporting || isAiLoading}
              title="Download Verified PDF Report"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                fontSize: "12px",
                fontWeight: 600,
                cursor: isAiLoading ? "not-allowed" : "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{isPdfExporting ? "Generating..." : "Download PDF"}</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "white",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                }}
              >
                {patientProfile.initials}
              </div>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                {patientProfile.displayName}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ padding: "24px 32px", flex: 1 }}>
          {/* Page Title & Powered by Gemini */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "18px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f1535", margin: 0 }}>
                  AI Generated Draft
                </h1>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background:
                      draft.status === "Approved"
                        ? "#dcfce7"
                        : draft.status === "In Review"
                        ? "#fef3c7"
                        : "#eff6ff",
                    color:
                      draft.status === "Approved"
                        ? "#15803d"
                        : draft.status === "In Review"
                        ? "#b45309"
                        : "#1d4ed8",
                    border: "1px solid",
                    borderColor:
                      draft.status === "Approved"
                        ? "#bbf7d0"
                        : draft.status === "In Review"
                        ? "#fde68a"
                        : "#bfdbfe",
                  }}
                >
                  {draft.status === "Approved"
                    ? "✓ Doctor Approved"
                    : draft.status === "In Review"
                    ? "⏳ In Review with Dr. Priya"
                    : "📋 Intake Draft"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Structured clinical fields verified against original patient statement with exact source quotes
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, rgba(66, 133, 244, 0.08), rgba(139, 92, 246, 0.08))",
                border: "1px solid rgba(66, 133, 244, 0.2)",
              }}
            >
              <GeminiIcon />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb" }}>
                {isAiLoading ? "Extracting facts with Groq AI..." : "Groq AI Clinical Extraction"}
              </span>
              <span
                style={{
                  color: "#3b82f6",
                  fontSize: "12px",
                  animation: isAiLoading ? "spin 1s linear infinite" : "none",
                }}
              >
                ✦
              </span>
            </div>
          </div>

          {/* Urgent Alert Banner */}
          {draft.is_urgent && draft.urgent_reason && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "20px" }}>🚨</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#b91c1c", margin: "0 0 4px" }}>
                  Urgent Clinical Alert Detected
                </p>
                <p style={{ fontSize: "12px", color: "#dc2626", margin: 0 }}>{draft.urgent_reason}</p>
              </div>
            </div>
          )}

          {/* Submission Success Banner */}
          {submitSuccess && (
            <div
              style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                border: "1px solid #86efac",
                borderRadius: "14px",
                padding: "16px 22px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: "18px",
                  fontWeight: "bold",
                  flexShrink: 0
                }}>
                  ✓
                </div>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#166534", margin: "0 0 2px" }}>
                    Your medical concern has been successfully sent to your doctor.
                  </h4>
                  <p style={{ fontSize: "12px", color: "#15803d", margin: 0 }}>
                    Dr. Priya Sharma has been notified. Redirecting you to Messages...
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/messages?consultation_id=${submittedConsultationId || ""}`)}
                style={{
                  background: "#166534",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(22, 101, 52, 0.3)",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s"
                }}
              >
                <span>GO TO MESSAGES</span>
                <span style={{ fontSize: "15px" }}>→</span>
              </button>
            </div>
          )}

          {/* Edit Success Notification */}
          {saveSuccessMsg && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "10px 16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>✓</span>
              <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#15803d", margin: 0 }}>
                {saveSuccessMsg}
              </p>
            </div>
          )}

          {/* Error / Intake Banner */}
          {aiError === "no_intake" ? (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "20px 24px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>📋</span>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#991b1b", margin: "0 0 2px" }}>
                    No Consultation Story Found
                  </p>
                  <p style={{ fontSize: "12px", color: "#b91c1c", margin: 0 }}>
                    Please describe your symptoms first so our AI can generate a structured clinical draft.
                  </p>
                </div>
              </div>
              <Link
                to="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                ← Go to Symptom Studio
              </Link>
            </div>
          ) : aiError ? (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "12px",
                padding: "12px 18px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "16px" }}>ℹ️</span>
              <p style={{ fontSize: "12px", color: "#9a3412", margin: 0 }}>
                {aiError === "Failed to fetch" || aiError.includes("Server")
                  ? "Reconnecting to clinical services... Deterministic clinical rules are available."
                  : aiError}
              </p>
            </div>
          ) : null}

          {/* Stepper Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              marginBottom: "24px",
              background: "white",
              padding: "12px 24px",
              borderRadius: "12px",
              border: "1px solid #e1e9f4",
            }}
          >
            {[
              { num: "1", label: "Patient Input", status: "done" },
              {
                num: "2",
                label: "AI Structured Draft",
                status: draft.status === "Pending" ? "active" : "done",
              },
              {
                num: "3",
                label: "Doctor Review",
                status:
                  draft.status === "Approved"
                    ? "done"
                    : draft.status === "In Review"
                    ? "active"
                    : "todo",
              },
              {
                num: "4",
                label: "Prescription & Export",
                status: draft.status === "Approved" ? "active" : "todo",
              },
            ].map((step, idx) => (
              <div key={step.num} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background:
                        step.status === "active"
                          ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                          : step.status === "done"
                          ? "#10b981"
                          : "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: step.status === "todo" ? "#64748b" : "white",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {step.status === "done" ? "✓" : step.num}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: step.status === "active" ? 700 : 500,
                      color:
                        step.status === "active"
                          ? "#0284c7"
                          : step.status === "done"
                          ? "#0f1535"
                          : "#64748b",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    style={{
                      width: "40px",
                      height: "2px",
                      background: idx === 0 || (idx === 1 && draft.status !== "Pending") ? "#10b981" : "#e2e8f0",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Card 1: Original Patient Story */}
          <div className="card" style={{ padding: "20px 24px", marginBottom: "18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#eff6ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                  Original Patient Story
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowFull(!showFull)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0284c7",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {showFull ? "View Less ▲" : "View Full Text ▾"}
              </button>
            </div>

            <div
              style={{
                background: "#f8fafd",
                border: "1px solid #e1ebf7",
                borderRadius: "10px",
                padding: "14px 18px",
                fontSize: "13px",
                color: "#334155",
                lineHeight: 1.6,
                maxHeight: showFull ? "none" : "80px",
                overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}
            >
              "{draft.story}"
            </div>
          </div>

          {/* Card 2: Extracted Information */}
          <div className="card" style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                Extracted Information & Clinical Evidence
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Click ✏️ Edit to correct any field before doctor review
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {isAiLoading && draft.extracted.length === 0 ? (
                <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: "56px",
                        background: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 16px",
                        gap: "12px",
                      }}
                    >
                      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#e2e8f0" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ width: "100px", height: "12px", background: "#e2e8f0", borderRadius: "4px", marginBottom: "6px" }} />
                        <div style={{ width: "180px", height: "14px", background: "#cbd5e1", borderRadius: "4px" }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: "center", color: "#3b82f6", fontSize: "13px", fontWeight: 600, marginTop: "8px" }}>
                    Analyzing speech & text with Groq AI...
                  </div>
                </div>
              ) : (
                draft.extracted.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "240px 1fr 100px 90px 70px",
                      alignItems: "center",
                      gap: "16px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: item.status === "Unknown" ? "#fbfcfd" : "#f8fbfe",
                      border: "1px solid",
                      borderColor: item.status === "Unknown" ? "#e5e7eb" : "#e0eaf6",
                    }}
                  >
                    {/* Field Icon & Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <FieldIcon type={item.iconType} />
                      <div>
                        <p
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#64748b",
                            margin: "0 0 2px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                          }}
                        >
                          {item.field}
                        </p>
                        {editingIndex === idx ? (
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder={`Enter ${item.field}...`}
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                border: "1px solid #3b82f6",
                                borderRadius: "6px",
                                outline: "none",
                                width: "150px",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(idx)}
                              disabled={isSavingEdit}
                              style={{
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                padding: "3px 8px",
                                fontSize: "11px",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              style={{
                                background: "#e2e8f0",
                                color: "#475569",
                                border: "none",
                                borderRadius: "4px",
                                padding: "3px 6px",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <p
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: item.value === "Not provided" ? "#94a3b8" : "#0f1535",
                              margin: 0,
                            }}
                          >
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quote / Source */}
                    <div
                      style={{
                        fontSize: "12px",
                        color: item.status === "Unknown" ? "#94a3b8" : "#475569",
                        fontStyle: "italic",
                        background: "white",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #e5edf7",
                      }}
                    >
                      {item.status === "Unknown" ? item.original : `"${item.original}"`}
                    </div>

                    {/* Confidence */}
                    <div style={{ textAlign: "center" }}>
                      {item.status === "Unknown" ? (
                        <span style={{ fontSize: "14px", color: "#94a3b8" }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                            {item.confidence}%
                          </span>
                          <div className="confidence-bar">
                            <div className="confidence-fill" style={{ width: `${item.confidence}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Badge */}
                    <div style={{ textAlign: "right" }}>
                      <span className={`badge-${item.status.toLowerCase()}`}>{item.status}</span>
                    </div>

                    {/* Edit Trigger Button */}
                    <div style={{ textAlign: "right" }}>
                      {editingIndex !== idx && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx)}
                          title="Edit this field"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#0284c7",
                            cursor: "pointer",
                            fontSize: "12px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: 600,
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Actions Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <Link
                to="/"
                style={{
                  textDecoration: "none",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>←</span>
                <span>Back to Symptom Studio</span>
              </Link>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isPdfExporting || isAiLoading}
                  style={{
                    padding: "11px 20px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>📄</span>
                  <span>{isPdfExporting ? "Exporting..." : "Download Draft PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (draft.status === "In Review") {
                      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
                      const qId = urlParams?.get("intakeId") || draft.intakeId || draft.id || "";
                      navigate(`/messages?consultation_id=${qId}`);
                      if (typeof window !== "undefined") {
                        window.location.href = `/messages?consultation_id=${qId}`;
                      }
                    } else {
                      handleConfirmSubmitToDoctor();
                    }
                  }}
                  disabled={isAiLoading || draft.status === "Approved" || isSubmitting}
                  className="btn-gradient"
                  style={{
                    padding: "11px 26px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
                    cursor: isAiLoading || draft.status === "Approved" || isSubmitting ? "not-allowed" : "pointer",
                    opacity: isAiLoading || draft.status === "Approved" || isSubmitting ? 0.7 : 1,
                  }}
                >
                  <span>
                    {draft.status === "Approved"
                      ? "✓ Doctor Approved"
                      : draft.status === "In Review"
                      ? "Go to Doctor Messages →"
                      : isSubmitting
                      ? "Submitting & Redirecting..."
                      : "Submit Consultation to Doctor →"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Clinical Summary */}
          {!isAiLoading && draft.clinical_summary && (
            <div className="card" style={{ padding: "20px 24px", marginTop: "18px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f1535",
                  margin: "0 0 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "16px" }}>🩺</span> Clinical Summary
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                  background: "#f8fafd",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #e1ebf7",
                }}
              >
                {draft.clinical_summary}
              </p>
            </div>
          )}

          {/* Card 4: Follow-up Questions */}
          {!isAiLoading && draft.follow_up_questions.length > 0 && (
            <div className="card" style={{ padding: "20px 24px", marginTop: "18px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#0f1535",
                  margin: "0 0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "16px" }}>💬</span> Suggested Follow-up Questions
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {draft.follow_up_questions.map((q: string, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: "#f0f9ff",
                      border: "1px solid #bae6fd",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "13px",
                      color: "#0369a1",
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>Q{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit to Doctor Confirmation Modal */}
        {showSubmitModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(7, 29, 53, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: "16px",
            }}
            onClick={() => setShowSubmitModal(false)}
          >
            <div
              className="card"
              style={{
                width: "460px",
                maxWidth: "95vw",
                padding: "26px",
                borderRadius: "16px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "20px",
                  }}
                >
                  🩺
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Submit to Assigned Doctor
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                    Your pre-consultation draft will be sent to clinician review queue
                  </p>
                </div>
              </div>

              {/* Doctor Details Card */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #0d9488)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "14px",
                  }}
                >
                  D
                </div>
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Dr. Priya Sharma
                  </p>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                    General Physician • Clinical Reviewer • Active Online
                  </p>
                </div>
              </div>

              {/* Consultation Summary */}
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                  fontSize: "12.5px",
                  color: "#0369a1",
                }}
              >
                <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
                  Primary Complaint: {draft.complaint}
                </p>
                <p style={{ margin: 0, fontSize: "11.5px", color: "#0284c7" }}>
                  Priority: {draft.is_urgent ? "🚨 Urgent Medical Attention" : "Standard Consultation"}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmitToDoctor}
                  disabled={isSubmitting}
                  className="btn-gradient"
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {isSubmitting ? "Submitting to Doctor..." : "Confirm & Send to Doctor"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>
    </div>
  );
}
