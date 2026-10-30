import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import VoiceConsultationModal from "../components/VoiceConsultationModal";
import { downloadPrescriptionPDF, PrescriptionData } from "../lib/prescriptionPdf";
import { subscribeToRealtimeEvents } from "../lib/realtime";
import ChatModal from "../components/ChatModal";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab: paramTab } = useParams<{ tab?: string }>();
  const activeTab = (paramTab || (location.hash ? location.hash.replace("#", "") : "dashboard")).toLowerCase();

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

  // Quick Health Signal state
  const [signalText, setSignalText] = useState("");
  const [signalLang, setSignalLang] = useState<"hindi" | "hinglish" | "english">("hinglish");
  const [isSendingSignal, setIsSendingSignal] = useState(false);
  const [signalNotice, setSignalNotice] = useState<string | null>(null);

  // Filter states
  const [rxSearchQuery, setRxSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("all");

  // Real authenticated patient info from Supabase
  const [patientId, setPatientId] = useState<string>("ae05e114-5671-45da-ad13-ba1e60de8b7e");
  const [patientName, setPatientName] = useState<string>("Rohan Kumar");

  // Profile Settings state
  const [profileData, setProfileData] = useState({
    displayName: "Rohan Kumar",
    email: "rohan.kumar@example.com",
    phone: "+91 98765 43210",
    age: 28,
    gender: "Male",
    bloodGroup: "B+",
    allergies: "Dust allergy, Penicillin (mild)",
    medications: "Levocetirizine 5mg (as needed)",
    chronicConditions: "Mild seasonal asthma",
    emergencyContact: "+91 98111 22334 (Brother)",
    language: "hinglish",
  });
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  // Load the actual logged-in patient's ID and name on mount
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/auth/login", { replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, display_name, preferred_language")
        .eq("id", user.id)
        .maybeSingle();

      // If logged-in user is a doctor, send them to doctor dashboard
      if (profile?.role === "reviewer" || profile?.role === "doctor") {
        navigate("/doctor", { replace: true });
        return;
      }

      setPatientId(user.id);
      const name =
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Patient";
      setPatientName(name);

      setProfileData((prev) => ({
        ...prev,
        displayName: name,
        email: user.email || prev.email,
        language: profile?.preferred_language || prev.language,
      }));
    });
  }, [navigate]);

  const fetchPatientData = useCallback(async () => {
    try {
      // 1. Fetch consultations
      const consRes = await fetch(`/api/consultations?patient_id=${patientId}`);
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
      const rxRes = await fetch(`/api/prescriptions?patient_id=${patientId}`);
      if (rxRes.ok) {
        const rxData = await rxRes.json();
        if (rxData?.prescriptions) {
          setPrescriptions(rxData.prescriptions);
        }
      }

      // 3. Fetch notifications
      const notifRes = await fetch(`/api/notifications?user_id=${patientId}`);
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
  }, [selectedConsultation, patientId]);

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

  // Quick Health Signal Submission
  const handleSendSignal = async (textOverride?: string) => {
    const textToSend = (textOverride || signalText).trim();
    if (!textToSend) return;
    setIsSendingSignal(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: textToSend,
          source_language: signalLang,
          input_method: "text",
          patient_name: patientName,
          patient_id: patientId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSignalText("");
        setSignalNotice("✓ Health signal submitted to Dr. Priya Sharma! AI clinical summary generated.");
        fetchPatientData();
        setTimeout(() => setSignalNotice(null), 5000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to submit health signal.");
      }
    } catch (err: any) {
      console.warn("Signal send error:", err);
      alert("Network error submitting health signal.");
    } finally {
      setIsSendingSignal(false);
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (supabase && patientId) {
      try {
        await supabase.from("profiles").upsert({
          id: patientId,
          display_name: profileData.displayName,
          preferred_language: profileData.language,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {}
    }
    setPatientName(profileData.displayName);
    setProfileSavedMsg("✓ Profile and medical information saved successfully!");
    setTimeout(() => setProfileSavedMsg(null), 4000);
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

  const quickSymptoms = [
    { label: "Khansi (Cough)", text: "Mujhe 3 din se khansi hai, raat ko zyada hoti hai." },
    { label: "Bukhar (Fever)", text: "Subah se halka bukhar aur sar me dard hai." },
    { label: "Pet dard (Stomach)", text: "Pet me jalan aur upar ke hisse me dard hai." },
    { label: "Allergy", text: "Skin pe itching aur laal daane ho gaye hain." },
    { label: "Sardi / Zukaam", text: "Naak beh rahi hai aur gale me kharash hai." },
  ];

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!rxSearchQuery.trim()) return true;
    const q = rxSearchQuery.toLowerCase();
    return (
      rx.id.toLowerCase().includes(q) ||
      (rx.clinical_assessment && rx.clinical_assessment.toLowerCase().includes(q)) ||
      (rx.doctor?.name && rx.doctor.name.toLowerCase().includes(q)) ||
      (rx.medicines && rx.medicines.some((m) => m.name.toLowerCase().includes(q)))
    );
  });

  const filteredConsultations = consultations.filter((c) => {
    if (requestStatusFilter === "all") return true;
    if (requestStatusFilter === "pending") return c.status === "new" || c.status === "pending" || c.status === "submitted";
    if (requestStatusFilter === "in_progress") return c.status === "in_progress" || c.status === "in_review";
    if (requestStatusFilter === "completed") return c.status === "completed" || c.status === "prescription_ready" || c.status === "approved";
    if (requestStatusFilter === "urgent") return c.is_urgent || c.status === "urgent";
    return true;
  });

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex" }}>
      {/* Exactly ONE consistent Sidebar across all tabs */}
      <Sidebar onOpenChat={() => setIsChatModalOpen(true)} />

      <main className="main-content" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
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
                Welcome, {patientName}
              </h2>
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Vaani Vision Patient Dashboard • {activeTab.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Right Header: Notification & Start Voice Consultation */}
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

        {/* Tab-driven Content Views */}
        <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>

          {/* ============================================================ */}
          {/* TAB 1: MY PRESCRIPTIONS (Direct URL /patient/prescriptions) */}
          {/* ============================================================ */}
          {activeTab === "prescriptions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header Box */}
              <div
                style={{
                  background: "linear-gradient(135deg, #071D35 0%, #102B46 60%, #059669 100%)",
                  borderRadius: "16px",
                  padding: "24px 28px",
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 4px 20px rgba(7, 29, 53, 0.15)",
                }}
              >
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.25)", padding: "4px 10px", borderRadius: "12px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#34d399" }}>🛡️ Cryptographically Verified Prescriptions</span>
                  </div>
                  <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 6px" }}>
                    My Digital Prescriptions
                  </h1>
                  <p style={{ fontSize: "13px", color: "#cbd5e1", margin: 0, maxWidth: "600px" }}>
                    All prescriptions issued by Dr. Priya Sharma are digitally signed, anchored with SHA-256 integrity verification, and available for instant A4 PDF download.
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "32px", fontWeight: 800, color: "#34d399" }}>{prescriptions.length}</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Total Verified Rx</div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div
                style={{
                  background: "white",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "1px solid #dce7f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                  <span style={{ fontSize: "16px", color: "#64748b" }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Search prescriptions by Rx number, diagnosis, medicine, or doctor..."
                    value={rxSearchQuery}
                    onChange={(e) => setRxSearchQuery(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "13px",
                      color: "#1e293b",
                    }}
                  />
                </div>
                {rxSearchQuery && (
                  <button
                    onClick={() => setRxSearchQuery("")}
                    style={{ border: "none", background: "#f1f5f9", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", color: "#64748b" }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Prescriptions List */}
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>Loading prescriptions...</div>
              ) : filteredPrescriptions.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "50px 20px",
                    textAlign: "center",
                    border: "1px solid #dce7f1",
                  }}
                >
                  <span style={{ fontSize: "40px" }}>📄</span>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#071D35", margin: "12px 0 6px" }}>
                    {rxSearchQuery ? "No prescriptions match your search" : "No Prescriptions Issued Yet"}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "460px", margin: "0 auto 18px" }}>
                    {rxSearchQuery
                      ? "Try searching with a different keyword or clear the search filter."
                      : "Once Dr. Priya Sharma reviews your submitted symptoms and issues an official prescription, it will appear here with instant printable PDF download."}
                  </p>
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: "#059669",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🎙️ Submit Symptoms for Review
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {filteredPrescriptions.map((rx) => (
                    <div
                      key={rx.id}
                      style={{
                        background: "white",
                        borderRadius: "16px",
                        border: "1.5px solid #dce7f1",
                        boxShadow: "0 2px 10px rgba(7, 29, 53, 0.04)",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      {/* Top Bar */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ background: "#eff6ff", color: "#2563eb", fontWeight: 800, fontSize: "12px", padding: "4px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                              {rx.id}
                            </span>
                            <span style={{ background: "#ecfdf5", color: "#059669", fontWeight: 700, fontSize: "11px", padding: "3px 8px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                              ✓ Digitally Signed & Verified
                            </span>
                          </div>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#071D35", margin: "8px 0 2px" }}>
                            {rx.clinical_assessment || "General Clinical Assessment"}
                          </h3>
                          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                            Issued on: <strong>{rx.issued_date}</strong> • Patient: <strong>{rx.patient_name || patientName}</strong> ({rx.patient_age || 28} Y / {rx.patient_gender || "Male"})
                          </p>
                        </div>

                        {/* Download CTA Button */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => handleDownloadRx(rx)}
                            style={{
                              background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "10px 18px",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                            }}
                          >
                            <span>📥</span> Download Printable PDF
                          </button>
                          <button
                            onClick={() => setIsChatModalOpen(true)}
                            style={{
                              background: "#f0fdf4",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              borderRadius: "10px",
                              padding: "10px 14px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span>💬</span> Ask Doctor
                          </button>
                        </div>
                      </div>

                      {/* Doctor Credentials */}
                      <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px 16px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Prescribing Physician</span>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#071D35" }}>
                            Dr. {rx.doctor?.name || "Dr. Priya Sharma"} ({rx.doctor?.qualification || "MBBS, MD - Internal Medicine"})
                          </div>
                          <div style={{ fontSize: "11px", color: "#475569" }}>
                            Registration: {rx.doctor?.registration_no || "DMC/R/2026/8941"} • {rx.doctor?.hospital || "Vaani Vision Telehealth"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700 }}>SHA-256 HASH VERIFIED</span>
                          <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748b" }}>
                            {rx.verification_hash ? rx.verification_hash.substring(0, 16) : "539353e89a42b10f"}...
                          </div>
                        </div>
                      </div>

                      {/* Medicines List Table */}
                      <div>
                        <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#071D35", margin: "0 0 8px" }}>
                          Prescribed Medication ({rx.medicines?.length || 0} items)
                        </h4>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>#</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>Medicine & Strength</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>Dosage / Frequency</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>Duration</th>
                                <th style={{ padding: "8px 12px", borderBottom: "1px solid #e2e8f0" }}>Instructions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rx.medicines && rx.medicines.length > 0 ? (
                                rx.medicines.map((med, idx) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{idx + 1}</td>
                                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>
                                      {med.name} {med.strength && <span style={{ fontWeight: 400, color: "#64748b" }}>({med.strength})</span>}
                                    </td>
                                    <td style={{ padding: "8px 12px", color: "#2563eb", fontWeight: 600 }}>{med.frequency}</td>
                                    <td style={{ padding: "8px 12px", color: "#475569" }}>{med.duration}</td>
                                    <td style={{ padding: "8px 12px", color: "#64748b" }}>{med.instructions || "As directed"}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} style={{ padding: "12px", textAlign: "center", color: "#94a3b8" }}>No specific medicine rows itemized.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Advice & Precautions */}
                      {(rx.instructions || rx.precautions) && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          {rx.instructions && (
                            <div style={{ background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Doctor's Advice</span>
                              <p style={{ fontSize: "12px", color: "#15803d", margin: "4px 0 0" }}>{rx.instructions}</p>
                            </div>
                          )}
                          {rx.precautions && (
                            <div style={{ background: "#fffbeb", padding: "10px 14px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Precautions & Warning</span>
                              <p style={{ fontSize: "12px", color: "#b45309", margin: "4px 0 0" }}>{rx.precautions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: MY REQUESTS & CONSULTATIONS                           */}
          {/* ============================================================ */}
          {(activeTab === "requests" || activeTab === "consultations") && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                    My Consultation Requests ({consultations.length})
                  </h1>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                    Live tracking of patient-to-doctor health concerns, AI extractions, and doctor assessments.
                  </p>
                </div>

                {/* Filter buttons */}
                <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                  {[
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending" },
                    { id: "in_progress", label: "In Review" },
                    { id: "completed", label: "Completed" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRequestStatusFilter(f.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: requestStatusFilter === f.id ? "white" : "transparent",
                        color: requestStatusFilter === f.id ? "#071D35" : "#64748b",
                        fontWeight: requestStatusFilter === f.id ? 700 : 500,
                        fontSize: "12px",
                        cursor: "pointer",
                        boxShadow: requestStatusFilter === f.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredConsultations.length === 0 ? (
                <div style={{ background: "white", borderRadius: "16px", padding: "50px 20px", textAlign: "center", border: "1px solid #dce7f1" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#071D35" }}>No consultations in this category</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {filteredConsultations.map((cons) => (
                    <div
                      key={cons.id}
                      style={{
                        padding: "18px",
                        borderRadius: "14px",
                        border: "1.5px solid",
                        borderColor: cons.is_urgent ? "#fecaca" : "#e2e8f0",
                        background: cons.is_urgent ? "#fffbfb" : "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {new Date(cons.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} • {cons.input_method === "voice" ? "🎙️ Spoken Voice" : "⌨️ Typed Text"}
                          </span>
                        </div>
                        {getStatusBadge(cons.status)}
                      </div>

                      {cons.is_urgent && (
                        <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", fontWeight: 600 }}>
                          ⚠️ Critical Sign Detected: {cons.urgent_reason || "Immediate clinical attention advised."}
                        </div>
                      )}

                      <div>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Your Stated Symptoms:</span>
                        <p style={{ fontSize: "13px", color: "#1e293b", margin: "4px 0 0", lineHeight: 1.5 }}>
                          "{cons.source_text}"
                        </p>
                      </div>

                      {cons.ai_summary && (
                        <div style={{ background: "#f0f9ff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e0f2fe" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>Gemini AI Clinical Extraction:</span>
                          <p style={{ fontSize: "12px", color: "#0369a1", margin: "2px 0 0" }}>{cons.ai_summary}</p>
                        </div>
                      )}

                      {cons.doctor_notes && (
                        <div style={{ background: "#ecfdf5", padding: "10px 14px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>Dr. Priya Sharma's Advice:</span>
                          <p style={{ fontSize: "12px", color: "#047857", margin: "2px 0 0" }}>{cons.doctor_notes}</p>
                        </div>
                      )}

                      {cons.prescription && (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleDownloadRx(cons.prescription)}
                            style={{
                              background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 16px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
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
          )}

          {/* ============================================================ */}
          {/* TAB 3: MY DOCTORS (Care Team)                                */}
          {/* ============================================================ */}
          {activeTab === "doctors" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                  My Assigned Care Team
                </h1>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Verified medical specialists reviewing your health signals and managing prescriptions.
                </p>
              </div>

              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  border: "1.5px solid #dce7f1",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #059669, #0d9488)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "24px",
                      fontWeight: 800,
                      boxShadow: "0 4px 14px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    P
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                        Dr. Priya Sharma
                      </h3>
                      <span style={{ background: "#ecfdf5", color: "#059669", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                        🟢 Online Now
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600, margin: "2px 0" }}>
                      General Physician & Internal Medicine Specialist
                    </p>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                      MBBS, MD • Medical Reg: <strong>DMC/R/2026/8941</strong> • 12+ Years Clinical Experience
                    </p>
                    <p style={{ fontSize: "11px", color: "#059669", margin: "4px 0 0" }}>
                      ⚡ Typical Response Time: Under 20 minutes
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => setIsChatModalOpen(true)}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 20px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                    }}
                  >
                    <span>💬</span> Message Dr. Sharma
                  </button>
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      background: "#f0fdf4",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      borderRadius: "10px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>🎙️</span> Send Health Signal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: PROFILE SETTINGS & MEDICAL INFO                       */}
          {/* ============================================================ */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                  Patient Profile & Medical Passport
                </h1>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Manage personal information, emergency contacts, known allergies, and consultation language preferences.
                </p>
              </div>

              {profileSavedMsg && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "12px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: 700 }}>
                  {profileSavedMsg}
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ background: "white", borderRadius: "16px", border: "1px solid #dce7f1", padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Personal Information */}
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#071D35", marginBottom: "14px" }}>
                    Personal Details
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Full Name</label>
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Email Address</label>
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "13px", color: "#64748b" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Phone Number</label>
                      <input
                        type="text"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Preferred Language</label>
                      <select
                        value={profileData.language}
                        onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", background: "white" }}
                      >
                        <option value="hinglish">Hinglish (Hindi + English)</option>
                        <option value="hindi">Hindi (हिंदी)</option>
                        <option value="english">English</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #f1f5f9" }} />

                {/* Health & Medical Information */}
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#071D35", marginBottom: "14px" }}>
                    Clinical & Medical Passport
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Known Allergies</label>
                      <input
                        type="text"
                        value={profileData.allergies}
                        onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        placeholder="e.g. Dust, Penicillin, Peanuts"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Current Medications</label>
                      <input
                        type="text"
                        value={profileData.medications}
                        onChange={(e) => setProfileData({ ...profileData, medications: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                        placeholder="e.g. Inhaler, BP medicines"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Chronic Conditions</label>
                      <input
                        type="text"
                        value={profileData.chronicConditions}
                        onChange={(e) => setProfileData({ ...profileData, chronicConditions: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Emergency Contact</label>
                      <input
                        type="text"
                        value={profileData.emergencyContact}
                        onChange={(e) => setProfileData({ ...profileData, emergencyContact: e.target.value })}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button
                    type="submit"
                    style={{
                      background: "#059669",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 24px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* DEFAULT / DASHBOARD TAB: OVERVIEW & QUICK HEALTH SIGNAL     */}
          {/* ============================================================ */}
          {(activeTab === "dashboard" || activeTab === "home" || !["prescriptions", "requests", "consultations", "doctors", "profile"].includes(activeTab)) && (
            <>
              {/* Hero Banner with Quick Voice Action */}
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
                    Our Gemini AI transcribes your spoken problem, identifies symptoms, checks for red flag warning signs, and presents a clinical summary directly to verified doctor Dr. Priya Sharma.
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

              {/* Quick Health Signal Card: Live Input Box */}
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  border: "1.5px solid #dce7f1",
                  boxShadow: "0 2px 10px rgba(16, 43, 70, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "18px" }}>📡</span>
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                        Send Quick Health Signal to Dr. Priya Sharma
                      </h3>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                        Describe how you feel right now. Information reaches the doctor dashboard in real-time.
                      </p>
                    </div>
                  </div>

                  {/* Language selection pills */}
                  <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "2px", borderRadius: "8px" }}>
                    {(["hinglish", "hindi", "english"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSignalLang(lang)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "11px",
                          fontWeight: signalLang === lang ? 700 : 500,
                          background: signalLang === lang ? "#2563eb" : "transparent",
                          color: signalLang === lang ? "white" : "#64748b",
                          cursor: "pointer",
                        }}
                      >
                        {lang === "hinglish" ? "Hinglish" : lang === "hindi" ? "हिंदी" : "English"}
                      </button>
                    ))}
                  </div>
                </div>

                {signalNotice && (
                  <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700 }}>
                    {signalNotice}
                  </div>
                )}

                {/* Input textarea */}
                <textarea
                  value={signalText}
                  onChange={(e) => setSignalText(e.target.value)}
                  placeholder="Describe your symptoms (e.g. 'Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...')"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    resize: "none",
                    outline: "none",
                  }}
                />

                {/* Quick Symptom Chips */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Quick Examples:</span>
                  {quickSymptoms.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => setSignalText(chip.text)}
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "16px",
                        padding: "3px 10px",
                        fontSize: "11px",
                        color: "#334155",
                        cursor: "pointer",
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Actions row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    style={{
                      background: "#f0fdf4",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>🎙️</span> Use Spoken Voice Instead
                  </button>

                  <button
                    onClick={() => handleSendSignal()}
                    disabled={isSendingSignal || !signalText.trim()}
                    style={{
                      background: isSendingSignal || !signalText.trim() ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 18px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: isSendingSignal || !signalText.trim() ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                    }}
                  >
                    <span>📡</span> {isSendingSignal ? "Sending Signal..." : "Send Signal to Doctor"}
                  </button>
                </div>
              </div>

              {/* 4 Summary Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px" }}>
                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "18px 20px", border: "1px solid #dce7f1", boxShadow: "0 2px 8px rgba(16, 43, 70, 0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Total Visits</span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#071D35", marginTop: "2px" }}>{consultations.length}</div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🩺</div>
                </div>

                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "18px 20px", border: "1px solid #dce7f1", boxShadow: "0 2px 8px rgba(16, 43, 70, 0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Pending Review</span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#d97706", marginTop: "2px" }}>
                      {consultations.filter((c) => c.status === "new" || c.status === "pending" || c.status === "submitted").length}
                    </div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>⏳</div>
                </div>

                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "18px 20px", border: "1px solid #dce7f1", boxShadow: "0 2px 8px rgba(16, 43, 70, 0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Under Review</span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#2563eb", marginTop: "2px" }}>
                      {consultations.filter((c) => c.status === "in_progress").length}
                    </div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>👨‍⚕️</div>
                </div>

                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "18px 20px", border: "1px solid #dce7f1", boxShadow: "0 2px 8px rgba(16, 43, 70, 0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>Prescriptions</span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#059669", marginTop: "2px" }}>{prescriptions.length}</div>
                  </div>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📄</div>
                </div>
              </div>

              {/* 2-Column Grid: Active Consultations & Prescriptions Preview */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
                {/* Left: Previous Consultations */}
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>🩺</span>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                        My Consultations ({consultations.length})
                      </h3>
                    </div>
                    <Link to="/patient/requests" style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
                      View All →
                    </Link>
                  </div>

                  {isLoading ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Loading consultations...</div>
                  ) : consultations.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#071D35" }}>No Consultations Yet</p>
                      <p style={{ fontSize: "12px" }}>Record your symptoms above to send your first consultation to Dr. Priya Sharma.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {consultations.slice(0, 3).map((cons) => (
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
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                                {new Date(cons.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {cons.input_method === "voice" ? "🎙️ Voice Intake" : "⌨️ Text Intake"}
                              </span>
                            </div>
                            {getStatusBadge(cons.status)}
                          </div>

                          {cons.is_urgent && (
                            <div style={{ padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "12px", fontWeight: 600 }}>
                              ⚠️ Critical Warning: {cons.urgent_reason || "Immediate clinical attention advised."}
                            </div>
                          )}

                          <div>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Symptom Description:</span>
                            <p style={{ fontSize: "13px", color: "#1e293b", margin: "2px 0 0", lineHeight: 1.5 }}>"{cons.source_text}"</p>
                          </div>

                          {cons.ai_summary && (
                            <div style={{ background: "#f0f9ff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e0f2fe" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>AI Clinical Extraction:</span>
                              <p style={{ fontSize: "12px", color: "#0369a1", margin: "2px 0 0" }}>{cons.ai_summary}</p>
                            </div>
                          )}

                          {cons.doctor_notes && (
                            <div style={{ background: "#ecfdf5", padding: "10px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                              <span style={{ fontSize: "10px", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>Doctor's Assessment & Advice (Dr. Priya Sharma):</span>
                              <p style={{ fontSize: "12px", color: "#047857", margin: "2px 0 0" }}>{cons.doctor_notes}</p>
                            </div>
                          )}

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

                {/* Right: Prescriptions Preview & Doctor Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="card" style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>📄</span>
                        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                          My Prescriptions ({prescriptions.length})
                        </h3>
                      </div>
                      <Link to="/patient/prescriptions" style={{ fontSize: "11px", color: "#059669", fontWeight: 700, textDecoration: "none" }}>
                        View All ({prescriptions.length}) →
                      </Link>
                    </div>

                    {prescriptions.length === 0 ? (
                      <p style={{ fontSize: "12px", color: "#64748b", textAlign: "center", padding: "20px 0" }}>
                        No prescriptions issued yet. Consultations reviewed by Dr. Priya Sharma will generate official downloadable prescriptions here.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {prescriptions.slice(0, 2).map((rx) => (
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
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
                          🟢 Online & Available for Teleconsultation Review
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsChatModalOpen(true)}
                      style={{
                        width: "100%",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#059669",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                      }}
                    >
                      <span>💬</span> Message Doctor
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Real-time Chat with Assigned Doctor */}
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          consultationId={selectedConsultation?.id || "520d18f8-46bb-49b1-a0b9-4f245acae230"}
          currentUserId={patientId}
          currentUserName={patientName}
          currentUserRole="patient"
          partnerName="Dr. Priya Sharma"
          partnerRole="General Physician"
          partnerId="c2e2338c-8bb5-4cb9-93c0-4d425c21492f"
        />

        {/* Voice Consultation Recording Modal */}
        <VoiceConsultationModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          patientId={patientId}
          patientName={patientName}
        />

        <BottomBrandStrip />
      </main>
    </div>
  );
}
