import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { useUserRole } from "../lib/useUserRole";

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

export default function AIDraftPage() {
  const navigate = useNavigate();
  const { role: userRole } = useUserRole();
  const [draft, setDraft] = useState({
    id: "draft-pending",
    name: "Patient",
    age: 28,
    language: "Hinglish",
    status: "Pending",
    date: "Today",
    complaint: "Processing symptoms...",
    story: typeof window !== "undefined" ? sessionStorage.getItem("vani_symptom_text") || "Describe how you feel..." : "Describe how you feel...",
    extracted: [] as any[],
  });
  const [showFull, setShowFull] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const handleSubmitConsultation = async () => {
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      let patientId = "ae05e114-5671-45da-ad13-ba1e60de8b7e";
      let patientName = "Rohan Kumar";

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          patientId = user.id;
          patientName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Patient";
        }
      }

      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: draft.story,
          source_language: sessionStorage.getItem("vani_symptom_lang") || "hinglish",
          input_method: "voice_or_text",
          patient_name: patientName,
          patient_id: patientId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionSuccess("✓ Consultation request successfully submitted to Dr. Priya Sharma! Redirecting to dashboard...");
        broadcastRealtimeEvent("consultation_submitted" as any, { consultation: data?.consultation });
        setTimeout(() => {
          navigate("/patient");
        }, 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to submit consultation request.");
      }
    } catch (e: any) {
      alert("Error submitting consultation: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const queryIntakeId = urlParams.get("intakeId");
    const intakeId = queryIntakeId || sessionStorage.getItem("vani_intake_id");
    const savedText = sessionStorage.getItem("vani_symptom_text");
    const savedLang = sessionStorage.getItem("vani_symptom_lang") || "hinglish";

    setIsAiLoading(true);

    const targetId = intakeId || "latest";
    fetch(`/api/intakes/${targetId}/generate-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_text: savedText || "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...",
        language: savedLang,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsAiLoading(false);
        if (data?.draft) {
          if (data.draft.id) sessionStorage.setItem("vani_draft_id", data.draft.id);
          if (data.draft.content_hash) sessionStorage.setItem("vani_draft_hash", data.draft.content_hash);

          const evidenceList = data.draft.evidence || [];
          const newExtracted = evidenceList.map((ev: any) => ({
            field: ev.field,
            value: ev.value || "Not provided",
            original: ev.exact_quote || "No clear mention in text",
            confidence: ev.confidence || 0,
            status: ev.verification_status === "verified" ? "High" : "Unknown",
            iconType: ev.iconType || "shield",
          }));

          setDraft((prev) => ({
            ...prev,
            id: data.draft.id || prev.id,
            story: savedText || data.draft.raw_source_text || prev.story,
            status: data.draft.status === "approved" ? "Approved" : "Pending",
            extracted: newExtracted,
          }));
        }
      })
      .catch((err) => {
        console.warn("AI Draft generation client catch:", err);
        setIsAiLoading(false);
      });

    // Realtime subscription on draft review decisions!
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.event === "draft_reviewed") {
        setDraft((prev) => ({
          ...prev,
          status: event.data?.decision === "approved" || event.status === "approved" ? "Approved" : "Pending",
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar />
      
      <main className="main-content">
        {/* Top Header */}
        <header style={{
          background: "white",
          borderBottom: "1px solid #e2eaf6",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 30,
          boxShadow: "0 1px 4px rgba(15,21,53,0.03)"
        }}>
          {/* Search Visit Input */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f4f8fc",
            borderRadius: "20px",
            padding: "6px 14px",
            border: "1px solid #e1e9f4",
            width: "280px"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#889bb5">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search anything..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12px",
                color: "#0f1535",
                width: "100%"
              }}
            />
          </div>

          {/* Right profile / notification */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#889bb5",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              position: "relative"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <div style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#ef4444",
                position: "absolute",
                top: "4px",
                right: "4px"
              }}/>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                color: "white"
              }}>
                R
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{ padding: "24px 32px", flex: 1 }}>
          {/* Page Title & Powered by Gemini */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "18px"
          }}>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f1535", margin: "0 0 4px" }}>
                AI Generated Draft
              </h1>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Structured fields with evidence & source quotes
              </p>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(66, 133, 244, 0.08), rgba(139, 92, 246, 0.08))",
              border: "1px solid rgba(66, 133, 244, 0.2)"
            }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#2563eb" }}>
                {isAiLoading ? "Extracting facts with Gemini..." : "Powered by Gemini"}
              </span>
              <span style={{ color: "#3b82f6", fontSize: "12px", animation: isAiLoading ? "spin 1s linear infinite" : "none" }}>✦</span>
            </div>
          </div>

          {/* Stepper Bar matching reference */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            marginBottom: "24px",
            background: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            border: "1px solid #e1e9f4"
          }}>
            {[
              { num: "1", label: "Input", status: "done" },
              { num: "2", label: "AI Draft", status: "active" },
              { num: "3", label: "Review", status: "todo" },
              { num: "4", label: "Export", status: "todo" },
            ].map((step, idx) => (
              <div key={step.num} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: step.status === "active"
                      ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                      : step.status === "done"
                        ? "#10b981"
                        : "#e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: step.status === "todo" ? "#64748b" : "white",
                    fontSize: "11px",
                    fontWeight: 700
                  }}>
                    {step.status === "done" ? "✓" : step.num}
                  </div>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: step.status === "active" ? 700 : 500,
                    color: step.status === "active" ? "#0284c7" : step.status === "done" ? "#0f1535" : "#64748b"
                  }}>
                    {step.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div style={{
                    width: "40px",
                    height: "2px",
                    background: idx === 0 ? "#10b981" : "#e2e8f0"
                  }}/>
                )}
              </div>
            ))}
          </div>

          {/* Card 1: Original Patient Story */}
          <div className="card" style={{ padding: "20px 24px", marginBottom: "18px" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "#eff6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#2563eb"
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                  Original Patient Story
                </h3>
              </div>

              <button
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
                  gap: "4px"
                }}
              >
                {showFull ? "View Less ▲" : "View Full Text ▾"}
              </button>
            </div>

            <div style={{
              background: "#f8fafd",
              border: "1px solid #e1ebf7",
              borderRadius: "10px",
              padding: "14px 18px",
              fontSize: "13px",
              color: "#334155",
              lineHeight: 1.6
            }}>
              "{draft.story}"
            </div>
          </div>

          {/* Card 2: Extracted Information */}
          <div className="card" style={{ padding: "22px 24px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f1535", margin: "0 0 16px" }}>
              Extracted Information
            </h3>

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
                    Analyzing speech & text with Google Gemini AI...
                  </div>
                </div>
              ) : (
                draft.extracted.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "260px 1fr 100px 90px",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: item.status === "Unknown" ? "#fbfcfd" : "#f8fbfe",
                    border: "1px solid",
                    borderColor: item.status === "Unknown" ? "#e5e7eb" : "#e0eaf6"
                  }}
                >
                  {/* Field Icon & Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FieldIcon type={item.iconType} />
                    <div>
                      <p style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#64748b",
                        margin: "0 0 2px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}>
                        {item.field}
                      </p>
                      <p style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0f1535",
                        margin: 0
                      }}>
                        {item.value}
                      </p>
                    </div>
                  </div>

                  {/* Quote / Source */}
                  <div style={{
                    fontSize: "12px",
                    color: item.status === "Unknown" ? "#94a3b8" : "#475569",
                    fontStyle: "italic",
                    background: "white",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #e5edf7"
                  }}>
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
                          <div className="confidence-fill" style={{ width: `${item.confidence}%` }}/>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Badge */}
                  <div style={{ textAlign: "right" }}>
                    <span className={`badge-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
              )}
            </div>

            {/* Success feedback notice if submitted */}
            {submissionSuccess && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "10px",
                  color: "#065f46",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>✓</span> {submissionSuccess}
              </div>
            )}

            {/* Bottom Action Button — Role-specific */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "24px",
              gap: "12px"
            }}>
              <Link to="/" style={{ textDecoration: "none", color: "#64748b", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>←</span>
                <span>Back to Home</span>
              </Link>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {userRole === "doctor" && (
                  <Link to="/review" style={{ textDecoration: "none" }}>
                    <button
                      type="button"
                      style={{
                        padding: "11px 22px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 700,
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
                      Open in Doctor Reviewer
                    </button>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSubmitConsultation}
                  disabled={isSubmitting || isAiLoading}
                  className="btn-gradient"
                  style={{
                    padding: "12px 28px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.35)",
                    cursor: isSubmitting || isAiLoading ? "not-allowed" : "pointer",
                    opacity: isSubmitting || isAiLoading ? 0.7 : 1,
                  }}
                >
                  <span>{isSubmitting ? "Submitting to Doctor..." : "Submit Consultation Request to Doctor"}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>
    </div>
  );
}
