"use client";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import { mockPatients, PatientRecord } from "../lib/mockData";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";

type FilterType = "all" | "Pending" | "In Review" | "Approved" | "Rejected";

const StatusBadge = ({ status }: { status: string }) => {
  const cls = {
    "Pending": "badge-pending",
    "In Review": "badge-inreview",
    "Approved": "badge-approved",
    "Rejected": "badge-rejected"
  }[status] || "badge-pending";
  return <span className={cls}>{status}</span>;
};

const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase();

export default function ReviewPage() {
  const [filter, setFilter] = useState<FilterType>("Pending");
  const [patients, setPatients] = useState<any[]>(mockPatients);
  const [selectedPatient, setSelectedPatient] = useState<any>(mockPatients[0]);
  const [activeTab, setActiveTab] = useState<"patient" | "structured" | "evidence">("patient");
  const [reviewerNotes, setReviewerNotes] = useState(mockPatients[0].reviewerNotes || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  const fetchLiveQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/reviewer/queue");
      if (res.ok) {
        const data = await res.json();
        if (data?.queue && data.queue.length > 0) {
          setPatients(data.queue);
          setSelectedPatient((prev: any) => {
            const found = data.queue.find((p: any) => p.id === prev?.id);
            return found || data.queue[0];
          });
        }
      }
    } catch (err) {
      console.warn("Error fetching live reviewer queue:", err);
    }
  }, []);

  useEffect(() => {
    fetchLiveQueue();

    // Subscribe to real-time events across tabs & websocket
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      setLiveNotice(`⚡ Live update: ${event.event.replace("_", " ")} synced`);
      fetchLiveQueue();
      setTimeout(() => setLiveNotice(null), 3000);
    });

    return () => unsubscribe();
  }, [fetchLiveQueue]);

  const filteredPatients = patients.filter((p: any) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.complaint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSaveDraft = async () => {
    const draftId = selectedPatient?.draft_id || selectedPatient?.id;
    setSavedStatus("Saving draft version to database...");
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structured_content: { ...editedFields },
          reviewer_notes: reviewerNotes,
        }),
      });
      if (res.ok) {
        setSavedStatus("Draft version saved & content hash updated!");
        broadcastRealtimeEvent("draft_updated", { draftId });
        fetchLiveQueue();
      }
    } catch (err) {
      console.warn("Save draft API:", err);
    }
    setTimeout(() => setSavedStatus(null), 3500);
  };

  const handleApprove = async () => {
    const draftId = selectedPatient?.draft_id || selectedPatient?.id;
    setSavedStatus("Submitting clinical approval to database...");
    try {
      const res = await fetch(`/api/drafts/${draftId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "approved",
          reviewer_notes: reviewerNotes,
          expected_content_hash: selectedPatient?.content_hash || "sha256_approved_hash",
        }),
      });
      if (res.ok) {
        setSelectedPatient((prev: any) => ({ ...prev, status: "Approved" }));
        setSavedStatus("Record approved! Ready for verified export.");
        broadcastRealtimeEvent("draft_reviewed", { draftId, decision: "approved" });
        fetchLiveQueue();
      }
    } catch (err) {
      console.warn("Approve API:", err);
    }
    setTimeout(() => setSavedStatus(null), 3500);
  };

  const getFieldValue = (field: string, defaultVal: string) => {
    return editedFields[`${selectedPatient.id}_${field}`] ?? defaultVal;
  };

  const setFieldValue = (field: string, val: string) => {
    setEditedFields(prev => ({ ...prev, [`${selectedPatient.id}_${field}`]: val }));
  };

  const filterTabs: { key: FilterType; label: string; count: number }[] = [
    { key: "Pending", label: "Pending", count: patients.filter((p: any) => p.status === "Pending").length },
    { key: "In Review", label: "In Review", count: patients.filter((p: any) => p.status === "In Review").length },
    { key: "Approved", label: "Approved", count: patients.filter((p: any) => p.status === "Approved").length },
    { key: "Rejected", label: "Rejected", count: patients.filter((p: any) => p.status === "Rejected").length },
  ];

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
          {/* Left search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f4f8fc",
            borderRadius: "20px",
            padding: "6px 14px",
            border: "1px solid #e1e9f4",
            width: "260px"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#889bb5">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search Visit"
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

          {/* Right Doctor Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                Dr. Priya Sharma
              </p>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Medical Reviewer
              </p>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "white",
              boxShadow: "0 2px 8px rgba(236, 72, 153, 0.25)"
            }}>
              P
            </div>
          </div>
        </header>

        {/* Dashboard Subheader */}
        <div style={{
          padding: "16px 32px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#0f1535", margin: "0 0 2px" }}>
              Professional Dashboard
            </h1>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Verify, edit and approve before export
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {liveNotice && (
              <div style={{
                padding: "4px 10px",
                borderRadius: "16px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#059669",
                fontSize: "11px",
                fontWeight: 600
              }}>
                {liveNotice}
              </div>
            )}
            {savedStatus && (
              <div style={{
                padding: "4px 10px",
                borderRadius: "16px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                color: "#0284c7",
                fontSize: "11px",
                fontWeight: 600
              }}>
                {savedStatus}
              </div>
            )}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "16px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              color: "#059669",
              fontSize: "11px",
              fontWeight: 600
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
              Live Sync Active
            </div>
            {/* Search patients */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              borderRadius: "8px",
              padding: "6px 12px",
              border: "1px solid #dbe4f0",
              width: "200px"
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#94a3b8">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                placeholder="Search patients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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

            {/* Date filter dropdown */}
            <button style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "white",
              border: "1px solid #dbe4f0",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              cursor: "pointer"
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
              </svg>
              Today ▾
            </button>
          </div>
        </div>

        {/* 2-Column Main Content */}
        <div style={{
          padding: "8px 32px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          flex: 1
        }}>
          {/* Left Column: Patient Review Queue */}
          <div className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #eef3f9" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f1535", margin: "0 0 12px" }}>
                Patient Review Queue
              </h2>

              {/* Status pills matching reference */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "16px",
                      border: "none",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: filter === tab.key ? "#2563eb" : "#f1f5f9",
                      color: filter === tab.key ? "white" : "#64748b",
                      transition: "all 0.15s ease",
                      boxShadow: filter === tab.key ? "0 2px 6px rgba(37, 99, 235, 0.25)" : "none"
                    }}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Patients list */}
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
              {mockPatients.map((patient) => {
                const isSelected = selectedPatient.id === patient.id;
                return (
                  <div
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setReviewerNotes(patient.reviewerNotes || "");
                    }}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: isSelected ? "rgba(6, 182, 212, 0.05)" : "white",
                      borderLeft: isSelected ? "4px solid #06b6d4" : "4px solid transparent",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: patient.avatarColor || "linear-gradient(135deg, #06b6d4, #2563eb)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {initials(patient.name)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535", margin: 0 }}>
                            {patient.name}
                          </h4>
                          <StatusBadge status={patient.status} />
                        </div>

                        <p style={{ fontSize: "11px", color: "#889bb5", margin: "0 0 6px" }}>
                          ID: {patient.id} • {patient.date} • {patient.language}
                        </p>

                        <p style={{
                          fontSize: "12px",
                          color: "#475569",
                          margin: 0,
                          lineHeight: 1.4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          "{patient.story}"
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Patient Details */}
          <div className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Patient Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #eef3f9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#0f1535", margin: "0 0 4px" }}>
                  Patient Details
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: selectedPatient.avatarColor || "#06b6d4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 700
                  }}>
                    {initials(selectedPatient.name)}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f1535" }}>
                    {selectedPatient.name}
                  </span>
                  <span style={{ fontSize: "11px", color: "#889bb5" }}>
                    ID: {selectedPatient.id} • {selectedPatient.date} • {selectedPatient.language}
                  </span>
                </div>
              </div>

              <StatusBadge status={selectedPatient.status} />
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid #eef3f9",
              padding: "0 20px"
            }}>
              {[
                { key: "patient" as const, label: "Patient Info" },
                { key: "structured" as const, label: "Structured Data" },
                { key: "evidence" as const, label: "Evidence" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    borderBottom: activeTab === tab.key ? "2px solid #0284c7" : "2px solid transparent",
                    color: activeTab === tab.key ? "#0284c7" : "#64748b",
                    fontSize: "12px",
                    fontWeight: activeTab === tab.key ? 700 : 500,
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div style={{ padding: "18px 20px", flex: 1, overflowY: "auto" }}>
              {activeTab === "patient" && (
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", margin: "0 0 14px", letterSpacing: "0.04em" }}>
                    Patient Information
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Main Complaint</span>
                      <span style={{ fontSize: "13px", color: "#0f1535", fontWeight: 600 }}>{selectedPatient.complaint}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Duration</span>
                      <span style={{ fontSize: "13px", color: "#0f1535" }}>3 din</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Symptom Pattern</span>
                      <span style={{ fontSize: "13px", color: "#0f1535" }}>Raat ko zyada hoti hai</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Medicine Use</span>
                      <span style={{ fontSize: "13px", color: "#0f1535" }}>Allergy ki medicine kabhi-kabhi</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Known Allergies</span>
                      <span style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>Not provided</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "structured" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedPatient.extracted.map((field, idx) => (
                    <div key={idx} style={{ padding: "10px 14px", background: "#f8fafd", borderRadius: "8px", border: "1px solid #e1ebf7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f1535" }}>{field.field}</span>
                        <span className={`badge-${field.status.toLowerCase()}`}>{field.status}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#0284c7", margin: "0 0 2px" }}>{field.value}</p>
                      <p style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", margin: 0 }}>"{field.original}"</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "evidence" && (
                <div>
                  <div style={{ padding: "12px 16px", background: "#f8fafd", borderRadius: "8px", border: "1px solid #e1ebf7", marginBottom: "14px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", margin: "0 0 4px" }}>ORIGINAL PATIENT TRANSCRIPT</p>
                    <p style={{ fontSize: "13px", color: "#334155", fontStyle: "italic", margin: 0, lineHeight: 1.6 }}>
                      "{selectedPatient.story}"
                    </p>
                  </div>
                </div>
              )}

              {/* Reviewer Notes Field */}
              <div style={{ marginTop: "20px" }}>
                <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#0f1535", margin: "0 0 6px" }}>
                  Reviewer Notes
                </h4>
                <textarea
                  value={reviewerNotes}
                  onChange={e => setReviewerNotes(e.target.value)}
                  placeholder="Add notes..."
                  style={{
                    width: "100%",
                    minHeight: "70px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #dbe4f0",
                    fontSize: "12px",
                    color: "#0f1535",
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                    background: "white"
                  }}
                />
              </div>

              {savedStatus && (
                <div style={{
                  marginTop: "8px",
                  padding: "8px 12px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  color: "#059669",
                  fontSize: "12px",
                  fontWeight: 600
                }}>
                  {savedStatus}
                </div>
              )}
            </div>

            {/* Bottom Actions matching screenshot */}
            <div style={{
              padding: "14px 20px",
              borderTop: "1px solid #eef3f9",
              background: "#fafcff",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              <button
                onClick={handleSaveDraft}
                style={{
                  padding: "9px 18px",
                  background: "white",
                  border: "1px solid #dbe4f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Save Draft
              </button>

              <button
                onClick={handleApprove}
                style={{
                  padding: "9px 20px",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
                }}
              >
                Approve ✓
              </button>
            </div>
          </div>
        </div>

        {/* Bottom persistent Brand strip */}
        <BottomBrandStrip />
      </main>
    </div>
  );
}
