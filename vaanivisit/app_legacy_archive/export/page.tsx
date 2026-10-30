"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { mockCurrentDraft } from "../lib/mockData";
import { subscribeToRealtimeEvents } from "../lib/realtime";

type FormatType = "pdf" | "print" | "json";

export default function ExportPage() {
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("pdf");
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeReviewer, setIncludeReviewer] = useState(false);
  const [includeConfidence, setIncludeConfidence] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [exportNotice, setExportNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [draft, setDraft] = useState<any>(mockCurrentDraft);
  const [isApproved, setIsApproved] = useState(false);

  const fetchActiveDraft = useCallback(async () => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get("draftId") || sessionStorage.getItem("vani_draft_id");

    if (draftId) {
      try {
        const res = await fetch(`/api/drafts/${draftId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.draft) {
            const d = data.draft;
            const approved = d.status === "approved";
            setIsApproved(approved);

            const structured = d.structured_content || {};
            setDraft((prev: any) => ({
              ...prev,
              id: d.id,
              status: approved ? "Approved" : "Pending",
              complaint: structured.main_complaint || prev.complaint,
              extracted: [
                { field: "Main Complaint", value: structured.main_complaint || "Khansi", confidence: 96, status: "High" },
                { field: "Duration", value: structured.duration || "3 din", confidence: 94, status: "High" },
                { field: "Symptom Pattern", value: structured.symptom_pattern || "Raat ko zyada", confidence: 90, status: "High" },
                { field: "Medicine Use", value: structured.medicine_use || "Allergy ki medicine", confidence: 88, status: "High" },
                { field: "Known Allergies", value: structured.known_allergies || "Not provided", confidence: 0, status: "Unknown" },
              ]
            }));
          }
        }
      } catch (err) {
        console.warn("Fetch active draft error:", err);
      }
    }
  }, []);

  useEffect(() => {
    fetchActiveDraft();

    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.event === "draft_reviewed") {
        setExportNotice({
          type: "success",
          msg: "⚡ Live Update: Clinical reviewer approved this draft! Ready for export.",
        });
        fetchActiveDraft();
      }
    });

    return () => unsubscribe();
  }, [fetchActiveDraft]);

  const formats = [
    {
      id: "pdf" as const,
      label: "PDF Report",
      desc: "Formatted for printing",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
        </svg>
      )
    },
    {
      id: "print" as const,
      label: "Print View",
      desc: "Optimized for printing",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
        </svg>
      )
    },
    {
      id: "json" as const,
      label: "JSON Export",
      desc: "For app integration",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3h2v2H5v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5h2v2H5c-1.07-.27-2-.9-2-2v-4a2 2 0 0 0-2-2H0v-2h1a2 2 0 0 0 2-2V5a2 2 0 0 1 2-2m14 0a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1v2h-1a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2v-2h2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5h-2V3h2M12 15a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m-4 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1m8 0a1 1 0 0 1 1 1 1 1 0 0 1-1 1 1 1 0 0 1-1-1 1 1 0 0 1 1-1z"/>
        </svg>
      )
    }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setExportNotice(null);

    const savedDraftId = typeof window !== "undefined" ? sessionStorage.getItem("vani_draft_id") : null;

    if (savedDraftId) {
      try {
        const res = await fetch(`/api/drafts/${savedDraftId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: selectedFormat,
            include_evidence: includeEvidence,
            include_reviewer_notes: includeReviewer,
            include_confidence: includeConfidence,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setExportNotice({
              type: "error",
              msg: "Export Gated: Draft must be approved by a verified clinical reviewer before export.",
            });
            setIsGenerating(false);
            return;
          }
        } else {
          setExportNotice({
            type: "success",
            msg: "Export record verified & logged to Supabase audit log!",
          });
        }
      } catch (err) {
        console.warn("Export record log API:", err);
      }
    }

    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      if (selectedFormat === "json") {
        const data = {
          patientId: draft.id,
          name: draft.name,
          age: draft.age,
          language: draft.language,
          date: draft.date,
          complaint: draft.complaint,
          extractedFields: (draft.extracted || []).map((f: any) => ({
            field: f.field,
            value: f.value,
            confidence: f.confidence,
            status: f.status,
            sourceText: f.original
          })),
          reviewStatus: draft.status,
          generatedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vaanivisit_${draft.id}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        window.print();
      }
    }, 1200);
  };

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar />
      
      <main className="main-content">
        {/* Header */}
        <header style={{
          background: "white",
          borderBottom: "1px solid #e2eaf6",
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 30,
          boxShadow: "0 1px 4px rgba(15,21,53,0.05)"
        }}>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 700, color: "#0f1535", margin: 0 }}>Export / Print Report</h1>
            <p style={{ fontSize: "11px", color: "#8896a8", margin: 0 }}>Clear, professional and shareable output</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px",
                border: "1px solid #e2eaf6",
                borderRadius: "8px",
                background: "white",
                fontSize: "12px", fontWeight: 600, color: "#4a5568",
                cursor: "pointer"
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 20H3v-8h2V6h14v6h2v6h-2v2h-2v-2H7v2H5v-2zm2 0v-4h10v4H7zm0-10h10v-2H7v2zm-4 4h18v-2H3v2z"/>
              </svg>
              Download Preview
            </button>
            <button style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px",
              border: "1px solid #e2eaf6",
              borderRadius: "8px",
              background: "white",
              fontSize: "12px", fontWeight: 600, color: "#4a5568",
              cursor: "pointer"
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </header>

        <div style={{ padding: "20px 28px", display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px" }}>
          
          {/* Left — Format Selection */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Format options */}
            <div className="card" style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 12px" }}>Report Format</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {formats.map(fmt => (
                  <div
                    key={fmt.id}
                    onClick={() => setSelectedFormat(fmt.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid",
                      borderColor: selectedFormat === fmt.id ? "#06b6d4" : "#e2eaf6",
                      background: selectedFormat === fmt.id
                        ? "linear-gradient(135deg, rgba(6,182,212,0.06), rgba(59,130,246,0.04))"
                        : "white",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    <div style={{
                      color: selectedFormat === fmt.id ? "#06b6d4" : "#9ca3af",
                      transition: "color 0.15s", flexShrink: 0
                    }}>{fmt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: selectedFormat === fmt.id ? "#0891b2" : "#0f1535", margin: 0 }}>
                        {fmt.label}
                      </p>
                      <p style={{ fontSize: "11px", color: "#8896a8", margin: 0 }}>{fmt.desc}</p>
                    </div>
                    {selectedFormat === fmt.id && (
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="card" style={{ padding: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 12px" }}>Additional Options</h3>
              {[
                { label: "Include evidence sources", state: includeEvidence, setter: setIncludeEvidence },
                { label: "Include reviewer notes", state: includeReviewer, setter: setIncludeReviewer },
                { label: "Show confidence scores", state: includeConfidence, setter: setIncludeConfidence },
              ].map((opt, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", cursor: "pointer" }}>
                  <div
                    onClick={() => opt.setter(!opt.state)}
                    style={{
                      width: "16px", height: "16px", borderRadius: "4px",
                      border: "1.5px solid",
                      borderColor: opt.state ? "#06b6d4" : "#d1d5db",
                      background: opt.state ? "linear-gradient(135deg, #06b6d4, #3b82f6)" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, cursor: "pointer", transition: "all 0.15s"
                    }}
                  >
                    {opt.state && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: "12px", color: "#4a5568" }}>{opt.label}</span>
                </label>
              ))}
            </div>

            {/* Export Notification / Gating Warning */}
            {exportNotice && (
              <div style={{
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                background: exportNotice.type === "error" ? "#fef2f2" : "#f0fdf4",
                border: "1px solid",
                borderColor: exportNotice.type === "error" ? "#fecaca" : "#bbf7d0",
                color: exportNotice.type === "error" ? "#b91c1c" : "#15803d",
              }}>
                {exportNotice.msg}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-gradient"
              style={{
                width: "100%", padding: "13px",
                borderRadius: "10px",
                fontSize: "14px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                opacity: isGenerating ? 0.8 : 1
              }}
            >
              {isGenerating ? (
                <>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white",
                    animation: "spin 0.8s linear infinite"
                  }}/>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Right — Report Preview */}
          <div className="card" style={{ padding: "0", overflow: "hidden" }}>
            {/* Preview header */}
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid #e2eaf6",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#fafbff"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#10b981"
                }}/>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#0f1535" }}>Live Preview</span>
              </div>
              <span style={{ fontSize: "11px", color: "#8896a8" }}>
                {selectedFormat === "pdf" ? "PDF" : selectedFormat === "print" ? "Print" : "JSON"} Format
              </span>
            </div>

            {/* Report content */}
            <div style={{ padding: "28px 32px", overflowY: "auto", maxHeight: "calc(100vh - 220px)", background: "white" }}>
              {selectedFormat !== "json" ? (
                <>
                  {/* VaaniVisit header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    marginBottom: "20px", paddingBottom: "16px",
                    borderBottom: "2px solid #e2eaf6"
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <div style={{
                          width: "28px", height: "28px", borderRadius: "6px",
                          background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: "18px", fontWeight: 800, color: "#0f1535" }}>
                          <span style={{ color: "#06b6d4" }}>Vaani</span>Visit
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "#8896a8", margin: 0 }}>Health Language Portal</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#0f1535", margin: "0 0 4px" }}>Patient Intake Report</h2>
                      <p style={{ fontSize: "11px", color: "#8896a8", margin: 0 }}>Generated on 28 Oct 2026 • VaaniVisit</p>
                    </div>
                  </div>

                  {/* Patient info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ padding: "14px", background: "#f8faff", borderRadius: "8px", border: "1px solid #e8f0fa" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <p style={{ fontSize: "10px", color: "#8896a8", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Name</p>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f1535", margin: 0 }}>{draft.name}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: "10px", color: "#8896a8", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Age</p>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f1535", margin: 0 }}>{draft.age} years (approx)</p>
                        </div>
                        <div>
                          <p style={{ fontSize: "10px", color: "#8896a8", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Language</p>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f1535", margin: 0 }}>{draft.language}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: "10px", color: "#8896a8", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Date</p>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f1535", margin: 0 }}>{draft.date}</p>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: "14px", background: "linear-gradient(135deg, #f0f9ff, #f5f0ff)",
                      borderRadius: "8px", border: "1px solid #e8f0fa",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "11px", color: "#8896a8", margin: "0 0 4px" }}>Report Status</p>
                        <span className="badge-pending" style={{ fontSize: "13px", padding: "4px 12px" }}>{draft.status}</span>
                        <p style={{ fontSize: "10px", color: "#9ca3af", margin: "6px 0 0" }}>Awaiting human approval</p>
                      </div>
                    </div>
                  </div>

                  {/* Structured Medical Information */}
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 10px" }}>Structured Medical Information</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                    <thead>
                      <tr style={{ background: "#f8faff" }}>
                        <th style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e2eaf6" }}>Field</th>
                        <th style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textAlign: "left", padding: "8px 12px", borderBottom: "1px solid #e2eaf6" }}>Value</th>
                        {includeConfidence && <th style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e2eaf6" }}>Confidence</th>}
                        <th style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textAlign: "center", padding: "8px 12px", borderBottom: "1px solid #e2eaf6" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(draft.extracted || []).map((field: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f5f7fa" }}>
                          <td style={{ fontSize: "12px", fontWeight: 600, color: "#4a5568", padding: "8px 12px" }}>{field.field}</td>
                          <td style={{ fontSize: "12px", color: "#0f1535", padding: "8px 12px" }}>{field.value}</td>
                          {includeConfidence && (
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              {field.status !== "Unknown" ? (
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>{field.confidence}%</span>
                              ) : <span style={{ color: "#9ca3af" }}>—</span>}
                            </td>
                          )}
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`badge-${field.status.toLowerCase()}`}>{field.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Evidence Sources */}
                  {includeEvidence && (
                    <>
                      <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: "0 0 10px" }}>Evidence Sources</h3>
                      <div style={{ background: "#f8faff", borderRadius: "8px", padding: "14px", border: "1px solid #e8f0fa", marginBottom: "16px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "#8896a8", margin: "0 0 6px" }}>ORIGINAL PATIENT STATEMENT</p>
                        <p style={{ fontSize: "12px", color: "#374151", margin: 0, fontStyle: "italic", lineHeight: 1.7 }}>
                          "{draft.story}"
                        </p>
                      </div>
                    </>
                  )}

                  {/* Disclaimer */}
                  <div style={{
                    padding: "10px 14px",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    fontSize: "10px",
                    color: "#92400e",
                    lineHeight: 1.5,
                    marginTop: "10px"
                  }}>
                    <strong>Important Disclaimer:</strong> This report is generated from a patient-reported symptom narrative using AI-assisted extraction. It is a draft for review purposes only and does not constitute a medical diagnosis. All clinical decisions must be made by qualified healthcare professionals.
                  </div>

                  <div style={{ marginTop: "16px", paddingTop: "10px", borderTop: "1px solid #e2eaf6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>VaaniVisit — Evidence-backed multilingual patient intake AI</p>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>Report ID: {draft.id}-20261028</p>
                  </div>
                </>
              ) : (
                /* JSON Preview */
                <div style={{ fontFamily: "monospace" }}>
                  <pre style={{
                    background: "#1e293b",
                    color: "#e2e8f0",
                    padding: "20px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    lineHeight: 1.6,
                    overflow: "auto",
                    whiteSpace: "pre-wrap"
                  }}>
{JSON.stringify({
  patientId: draft.id,
  name: draft.name,
  age: draft.age,
  language: draft.language,
  date: draft.date,
  complaint: draft.complaint,
  extractedFields: draft.extracted.map(f => ({
    field: f.field,
    value: f.value,
    confidence: f.confidence,
    status: f.status,
    sourceText: f.original
  })),
  reviewStatus: draft.status,
  generatedAt: "2026-10-28T10:30:00Z"
}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

