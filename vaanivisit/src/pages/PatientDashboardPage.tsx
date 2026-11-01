import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import VoiceConsultationModal from "../components/VoiceConsultationModal";
import { downloadPrescriptionPDF, PrescriptionData } from "../lib/prescriptionPdf";
import { subscribeToRealtimeEvents } from "../lib/realtime";
import ChatModal from "../components/ChatModal";

export default function PatientDashboardPage() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const fetchPatientData = useCallback(async () => {
    try {
      // 1. Fetch consultations
      const consRes = await fetch("/api/consultations?patient_id=ae05e114-5671-45da-ad13-ba1e60de8b7e");
      if (consRes.ok) {
        const cData = await consRes.json();
        if (cData?.consultations) {
          setConsultations(cData.consultations);
          if (!selectedConsultation && cData.consultations.length > 0) {
            setSelectedConsultation(cData.consultations[0]);
          }
        }
      }

      // 2. Fetch prescriptions
      const rxRes = await fetch("/api/prescriptions?patient_id=ae05e114-5671-45da-ad13-ba1e60de8b7e");
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        if (rxData?.prescriptions) {
          setPrescriptions(rxData.prescriptions);
        }
      }

      // 3. Fetch notifications
      const notifRes = await fetch("/api/notifications?user_id=ae05e114-5671-45da-ad13-ba1e60de8b7e");
      if (notifRes.ok) {
        const nData = await notifRes.json();
        if (nData?.notifications) {
          setNotifications(nData.notifications);
        }
      }
    } catch (err) {
      console.warn("Patient dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedConsultation]);

  useEffect(() => {
    fetchPatientData();

    // Subscribe to real-time events
    const unsubscribe = subscribeToRealtimeEvents(() => {
      fetchPatientData();
    });

    return () => unsubscribe();
  }, [fetchPatientData]);

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch("/api/notifications/mark-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const handleDownloadRx = (rx: PrescriptionData) => {
    downloadPrescriptionPDF(rx);
  };

  const handleSendReply = async (consId: string) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`/api/consultations/${consId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: `Patient reply: "${replyText.trim()}"`,
        }),
      });
      setReplySuccess("Your response was sent to Dr. Priya Sharma.");
      setReplyText("");
      setTimeout(() => setReplySuccess(null), 3000);
      fetchPatientData();
    } catch (e) {}
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "urgent":
        return <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>🚨 Urgent / Emergency</span>;
      case "prescription_ready":
      case "completed":
        return <span style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>✓ Prescription Ready</span>;
      case "in_progress":
        return <span style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>⏳ Under Doctor Review</span>;
      case "new":
      case "submitted":
      default:
        return <span style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700 }}>📝 Submitted</span>;
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      <Sidebar onOpenChat={() => setIsChatModalOpen(true)} />

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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "18px" }}>👋</span>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                Welcome, Rohan Kumar
              </h2>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Clario Patient Dashboard • ID: VV-PAT-0928
              </p>
            </div>
          </div>

          {/* Right Header: Notification & Start Consultation */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative" }}>
            {/* Notifications Bell */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  if (!showNotifMenu) handleMarkNotificationsRead();
                }}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
                title="Notifications"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadNotifsCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      background: "#ef4444",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 700,
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                    }}
                  >
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {showNotifMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "44px",
                    width: "320px",
                    background: "white",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                    border: "1px solid #e2e8f0",
                    padding: "12px",
                    zIndex: 50,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>Notifications</span>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Live Sync</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", margin: "12px 0" }}>No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} style={{ padding: "8px", borderRadius: "8px", background: n.read ? "#ffffff" : "#f0f9ff", border: "1px solid #e2e8f0" }}>
                          <p style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", margin: "0 0 2px" }}>{n.title}</p>
                          <p style={{ fontSize: "10px", color: "#64748b", margin: 0 }}>{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Big Action: Start Voice Consultation */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                padding: "9px 20px",
                borderRadius: "24px",
                border: "none",
                background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(13, 148, 136, 0.35)",
              }}
            >
              <span>🎙️</span> Start Voice Consultation
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>
          {/* Hero Banner with Quick Consultation Action */}
          <div
            style={{
              background: "linear-gradient(135deg, #071D35 0%, #102B46 60%, #0d9488 100%)",
              borderRadius: "18px",
              padding: "24px 28px",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 10px 25px rgba(7, 29, 53, 0.25)",
            }}
          >
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(6, 182, 212, 0.2)", padding: "4px 10px", borderRadius: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#22d3ee" }}>⚡ AI Voice Consultation Available 24/7</span>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                Speak Your Symptoms in Hindi, Hinglish or English
              </h1>
              <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0, maxWidth: "580px", lineHeight: 1.5 }}>
                Our Groq AI transcribes your spoken problem, identifies symptoms, checks for red flag warning signs, and presents a clinical summary directly to verified doctor Dr. Priya Sharma.
              </p>
            </div>

            <button
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                background: "white",
                border: "none",
                color: "#071D35",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(255, 255, 255, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <span>🎙️</span> Record Voice Problem
            </button>
          </div>

          {/* 2-Column Grid: Active Consultations & Prescriptions */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
            {/* Left: Previous Consultations & Status Tracking */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🩺</span>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                    My Consultations ({consultations.length})
                  </h3>
                </div>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Live Tracking</span>
              </div>

              {isLoading ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading consultations...</div>
              ) : consultations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#071D35" }}>No Consultations Yet</p>
                  <p style={{ fontSize: "12px" }}>Click "Start Voice Consultation" above to record your first visit.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {consultations.slice(0, 5).map((cons) => (
                    <div
                      key={cons.id}
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1.5px solid",
                        borderColor: cons.is_urgent ? "#fecaca" : "#e2e8f0",
                        background: cons.is_urgent ? "#fffbfb" : "#f8fafc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Status & Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {new Date(cons.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {cons.input_method === "voice" ? "🎙️ Voice Intake" : "⌨️ Text Intake"}
                          </span>
                        </div>
                        {getStatusBadge(cons.status)}
                      </div>

                      {/* Urgent Warning if any */}
                      {cons.is_urgent && (
                        <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", fontWeight: 600 }}>
                          ⚠️ Critical Warning: {cons.urgent_reason || "Immediate clinical attention advised."}
                        </div>
                      )}

                      {/* Problem text */}
                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Symptom Description:
                        </span>
                        <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0", lineHeight: 1.5 }}>
                          "{cons.source_text}"
                        </p>
                      </div>

                      {/* AI Summary */}
                      {cons.ai_summary && (
                        <div style={{ background: "#f0f9ff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e0f2fe" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                            AI Clinical Extraction:
                          </span>
                          <p style={{ fontSize: "12px", color: "#0369a1", margin: "2px 0 0" }}>
                            {cons.ai_summary}
                          </p>
                        </div>
                      )}

                      {/* Doctor Clinical Assessment / Advice */}
                      {cons.doctor_notes && (
                        <div style={{ background: "#ecfdf5", padding: "10px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
                            Doctor's Assessment & Advice (Dr. Priya Sharma):
                          </span>
                          <p style={{ fontSize: "12px", color: "#047857", margin: "2px 0 0" }}>
                            {cons.doctor_notes}
                          </p>
                        </div>
                      )}

                      {/* Doctor Follow-up Questions and Reply Form */}
                      {cons.doctor_questions && cons.doctor_questions.length > 0 && (
                        <div style={{ background: "#fefce8", padding: "10px 12px", borderRadius: "8px", border: "1px solid #fef08a" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#a16207", textTransform: "uppercase" }}>
                            Question from Doctor:
                          </span>
                          <p style={{ fontSize: "12px", color: "#854d0e", margin: "2px 0 8px", fontWeight: 600 }}>
                            {cons.doctor_questions[cons.doctor_questions.length - 1].question}
                          </p>

                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              type="text"
                              placeholder="Type your reply to Dr. Priya Sharma..."
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "11px",
                              }}
                            />
                            <button
                              onClick={() => handleSendReply(cons.id)}
                              style={{
                                background: "#059669",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Send Reply
                            </button>
                          </div>
                          {replySuccess && <span style={{ fontSize: "10px", color: "#059669", marginTop: "4px", display: "block" }}>{replySuccess}</span>}
                        </div>
                      )}

                      {/* Download Prescription CTA if available */}
                      {cons.prescription && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                          <button
                            onClick={() => handleDownloadRx(cons.prescription)}
                            style={{
                              background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 14px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                            }}
                          >
                            <span>📄</span> Download Official PDF Prescription
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Prescriptions History & Quick Downloads */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>📄</span>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                      My Prescriptions ({prescriptions.length})
                    </h3>
                  </div>
                  <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>Verified Digital Rx</span>
                </div>

                {prescriptions.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px 0" }}>
                    No prescriptions issued yet. Consultations reviewed by Dr. Priya Sharma will generate official downloadable prescriptions here.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          background: "#ffffff",
                          border: "1.5px solid #dce7f1",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                          <div>
                            <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                              {rx.id}
                            </span>
                            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#071D35", margin: "4px 0 0" }}>
                              {rx.clinical_assessment || "Consultation Prescription"}
                            </h4>
                          </div>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>{rx.issued_date}</span>
                        </div>

                        <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 10px" }}>
                          Dr. {rx.doctor?.name || "Dr. Priya Sharma"} • {rx.medicines?.length || 3} prescribed items
                        </p>

                        <button
                          onClick={() => handleDownloadRx(rx)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #0d9488",
                            background: "#f0fdfa",
                            color: "#0d9488",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <span>📥</span> Download Printable PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Doctor Details Box */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #e6fffa 100%)",
                  border: "1px solid #bbf7d0",
                  borderRadius: "14px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #10b981, #06b6d4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                      fontWeight: 700,
                    }}
                  >
                    P
                  </div>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#065f46", margin: 0 }}>
                      Dr. Priya Sharma (Assigned Doctor)
                    </h4>
                    <p style={{ fontSize: "11px", color: "#047857", margin: "2px 0 0" }}>
                      MBBS, MD • Medical Reg: DMC/R/2026/8941
                    </p>
                    <p style={{ fontSize: "10px", color: "#059669", margin: "2px 0 0" }}>
                      Online & Available for Teleconsultation Review
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChatModalOpen(true)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "none",
                    background: "#059669",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                  }}
                >
                  <span>💬</span> Message Doctor
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Chat with Assigned Doctor */}
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          consultationId={selectedConsultation?.id || "520d18f8-46bb-49b1-a0b9-4f245acae230"}
          currentUserId="ae05e114-5671-45da-ad13-ba1e60de8b7e"
          currentUserName="Rohan Kumar"
          currentUserRole="patient"
          partnerName="Dr. Priya Sharma"
          partnerRole="General Physician"
          partnerId="c2e2338c-8bb5-4cb9-93c0-4d425c21492f"
        />

        {/* Voice Consultation Recording Modal */}
        <VoiceConsultationModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
        />

        <BottomBrandStrip />
      </main>
    </div>
  );
}

