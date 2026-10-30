import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomBrandStrip from "../components/BottomBrandStrip";
import PrescriptionModal from "../components/PrescriptionModal";
import ChatModal from "../components/ChatModal";
import { downloadPrescriptionPDF } from "../lib/prescriptionPdf";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";

interface PatientRequest {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  symptoms: string;
  duration: string;
  severity: "mild" | "moderate" | "severe";
  urgency: "High" | "Medium" | "Low";
  timeAgo: string;
  status: "new" | "pending" | "in_progress" | "completed" | "declined";
  ai_summary?: string;
  source_text?: string;
  patient_id?: string;
}

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  type: string;
  status?: string;
}

export default function DoctorDashboardPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [metrics, setMetrics] = useState({
    pendingRequests: 5,
    activeConsultations: 3,
    todayAppointments: 4,
    unreadMessages: 2,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<PatientRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatPartner, setChatPartner] = useState({
    name: "Rohit Sharma",
    role: "Patient",
    id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
    consultationId: "cons-101",
  });
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [doctorNote, setDoctorNote] = useState("");
  const [clinicalAssessment, setClinicalAssessment] = useState("");

  const initialRequests: PatientRequest[] = [
    {
      id: "req-1",
      name: "Rohit Sharma",
      initials: "RS",
      age: 28,
      gender: "Male",
      symptoms: "Fever, cough, body pain",
      duration: "2 days",
      severity: "severe",
      urgency: "High",
      timeAgo: "2m ago",
      status: "pending",
      source_text: "Mujhe 2 din se tez bukhar aur khansi hai. Poore sharir me bohot dard hai.",
      ai_summary: "Patient presents with acute onset fever, persistent cough, and generalized myalgia lasting 2 days. Requires prompt evaluation.",
      patient_id: "pat-rohit",
    },
    {
      id: "req-2",
      name: "Pooja Kumari",
      initials: "PK",
      age: 34,
      gender: "Female",
      symptoms: "Headache, nausea",
      duration: "1 day",
      severity: "moderate",
      urgency: "Medium",
      timeAgo: "12m ago",
      status: "pending",
      source_text: "Kal se sir me bohot tez dard hai aur ulti jaisa lag raha hai.",
      ai_summary: "Patient reports severe frontal headache associated with nausea for 24 hours. Suggest ruling out migraine or tension headache.",
      patient_id: "pat-pooja",
    },
    {
      id: "req-3",
      name: "Mohit Singh",
      initials: "MS",
      age: 42,
      gender: "Male",
      symptoms: "Stomach pain, acidity",
      duration: "3 days",
      severity: "mild",
      urgency: "Low",
      timeAgo: "25m ago",
      status: "pending",
      source_text: "Pet me upari hisse me jalan aur dard hai, khana khane ke baad zyada lagta hai.",
      ai_summary: "Patient reports epigastric burning pain aggravated postprandially. Likely dyspepsia or acid reflux.",
      patient_id: "pat-mohit",
    },
    {
      id: "req-4",
      name: "Anjali Verma",
      initials: "AS",
      age: 26,
      gender: "Female",
      symptoms: "Skin rash, itching",
      duration: "2 days",
      severity: "moderate",
      urgency: "Medium",
      timeAgo: "40m ago",
      status: "pending",
      source_text: "Dono haathon pe laal daane aur tez khujli ho rahi hai.",
      ai_summary: "Erythematous pruritic maculopapular rash on both upper extremities. Suspected contact dermatitis or allergic reaction.",
      patient_id: "pat-anjali",
    },
    {
      id: "req-5",
      name: "Suresh Patel",
      initials: "SP",
      age: 56,
      gender: "Male",
      symptoms: "Chest pain, shortness of breath",
      duration: "5 hours",
      severity: "severe",
      urgency: "High",
      timeAgo: "1h ago",
      status: "pending",
      source_text: "Seene me baaye taraf dawab aur halka dard hai, saans thodi phool rahi hai.",
      ai_summary: "🚨 RED FLAG: Acute left-sided chest tightness with mild dyspnea in a 56yo male. Requires immediate cardiology evaluation.",
      patient_id: "pat-suresh",
    },
  ];

  const fetchDoctorData = useCallback(async () => {
    try {
      // 1. Fetch consultations from backend
      const res = await fetch("/api/consultations");
      if (res.ok) {
        const data = await res.json();
        if (data?.consultations && data.consultations.length > 0) {
          const mapped: PatientRequest[] = data.consultations.map((c: any) => ({
            id: c.id,
            name: c.patient_name || "Patient",
            initials: (c.patient_name || "Patient")
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase(),
            age: c.patient_age || 28,
            gender: c.patient_gender || "Male",
            symptoms: c.structured_content?.main_complaint || c.source_text?.substring(0, 35) || "Symptoms reported",
            duration: c.structured_content?.duration || "1-3 days",
            severity: c.severity || "moderate",
            urgency: c.is_urgent ? "High" : c.severity === "severe" ? "High" : "Medium",
            timeAgo: "Recent",
            status: c.status || "pending",
            source_text: c.source_text,
            ai_summary: c.ai_summary,
            patient_id: c.patient_id,
          }));

          // Merge backend consultations with default queue
          const combined = [...mapped, ...initialRequests.filter((r) => !mapped.some((m) => m.id === r.id))];
          setRequests(combined);
        } else {
          setRequests(initialRequests);
        }
      } else {
        setRequests(initialRequests);
      }

      // 2. Fetch appointments
      const aptRes = await fetch("/api/doctor/appointments");
      if (aptRes.ok) {
        const aptData = await aptRes.json();
        if (aptData?.appointments) setAppointments(aptData.appointments);
      } else {
        setAppointments([
          { id: "apt-1", time: "09:00 AM", patientName: "Riya Singh", type: "Follow-up" },
          { id: "apt-2", time: "10:30 AM", patientName: "Amit Kumar", type: "Consultation" },
          { id: "apt-3", time: "12:00 PM", patientName: "Neha Gupta", type: "New Patient" },
          { id: "apt-4", time: "02:30 PM", patientName: "Pooja Sharma", type: "Follow-up" },
          { id: "apt-5", time: "04:00 PM", patientName: "Rajesh Yadav", type: "Consultation" },
        ]);
      }

      // 3. Overview metrics
      const mRes = await fetch("/api/doctor/overview");
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData?.metrics) {
          setMetrics({
            pendingRequests: mData.metrics.pendingCount || 5,
            activeConsultations: mData.metrics.inProgressCount || 3,
            todayAppointments: 4,
            unreadMessages: 2,
          });
        }
      }
    } catch (err) {
      console.warn("Doctor data fetch fallback:", err);
      setRequests(initialRequests);
    }
  }, []);

  useEffect(() => {
    fetchDoctorData();

    const unsubscribe = subscribeToRealtimeEvents((event) => {
      setLiveNotice(`⚡ Sync: ${event.event.replace("_", " ")}`);
      fetchDoctorData();
      setTimeout(() => setLiveNotice(null), 3000);
    });

    return () => unsubscribe();
  }, [fetchDoctorData]);

  // Handle Accept
  const handleAcceptRequest = async (req: PatientRequest) => {
    try {
      const res = await fetch(`/api/consultations/${req.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
          doctor_name: "Dr. Priya Sharma",
        }),
      });

      if (res.ok) {
        setLiveNotice(`✓ Accepted ${req.name}'s request.`);
        broadcastRealtimeEvent("consultation_accepted" as any, { consultation_id: req.id });
        setRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: "in_progress" } : r))
        );
        setMetrics((prev) => ({
          ...prev,
          pendingRequests: Math.max(0, prev.pendingRequests - 1),
          activeConsultations: prev.activeConsultations + 1,
        }));
      }
    } catch (e) {
      setLiveNotice(`✓ Accepted ${req.name}'s request.`);
    }
    setTimeout(() => setLiveNotice(null), 3500);
  };

  // Open Chat
  const handleOpenChat = (req: PatientRequest) => {
    setChatPartner({
      name: req.name,
      role: "Patient",
      id: req.patient_id || "pat-" + req.id,
      consultationId: req.id,
    });
    setIsChatModalOpen(true);
  };

  // Open View Details
  const handleViewDetails = (req: PatientRequest) => {
    setSelectedRequest(req);
    setDoctorNote("");
    setClinicalAssessment("");
    setIsViewModalOpen(true);
  };

  const filteredRequests = requests.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.symptoms.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.urgency.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f1f6fc", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar with Doctor Navigation */}
      <Sidebar onOpenChat={() => setIsChatModalOpen(true)} />

      {/* Main Content Area */}
      <main
        style={{
          marginLeft: "269px",
          width: "calc(100% - 269px)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Top Header */}
        <header
          style={{
            minHeight: "76px",
            padding: "16px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #dce7f1",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Search Patients Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#ffffff",
              border: "1.5px solid #dce7f1",
              borderRadius: "24px",
              padding: "9px 18px",
              width: "420px",
              boxShadow: "0 2px 6px rgba(16, 43, 70, 0.04)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search patients, request IDs, or symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "#142B45",
                width: "100%",
              }}
            />
          </div>

          {/* Right Doctor Identity Block */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {liveNotice && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#059669",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "5px 12px",
                  borderRadius: "16px",
                  fontWeight: 600,
                  animation: "fadeIn 0.2s ease-in",
                }}
              >
                {liveNotice}
              </span>
            )}

            {/* Notification Bell */}
            <div
              style={{
                position: "relative",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#ffffff",
                border: "1px solid #dce7f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#102B46" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #ffffff",
                }}
              >
                3
              </span>
            </div>

            {/* Doctor Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563eb, #0d9488)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "15px",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                  border: "2px solid #ffffff",
                }}
              >
                D
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#102B46" }}>
                  Dr. Priya Sharma
                </p>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                  General Physician
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div style={{ padding: "24px 40px 48px", display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Hero Banner matching screenshot */}
          <div
            style={{
              background: "linear-gradient(135deg, #e8f3fc 0%, #dcf1f9 50%, #eff7fe 100%)",
              borderRadius: "24px",
              padding: "28px 36px",
              border: "1px solid #dce7f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(16, 43, 70, 0.05)",
            }}
          >
            <div style={{ maxWidth: "560px", zIndex: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", letterSpacing: "0.02em" }}>
                  Better Care. Healthier Tomorrow.
                </span>
                <span style={{ color: "#93c5fd" }}>——</span>
              </div>
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "#071D35",
                  margin: "0 0 10px",
                  letterSpacing: "-0.6px",
                  lineHeight: 1.2,
                }}
              >
                Manage your patients{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  with AI assistance
                </span>
              </h1>
              <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                View patient requests, review AI analysis, consult with patients, and provide the best care — all in one place.
              </p>
            </div>

            {/* Doctor Hero Illustration */}
            <div
              style={{
                width: "280px",
                height: "170px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                zIndex: 2,
              }}
            >
              <img
                src="/doctor-hero.png"
                alt="Doctor Hero"
                style={{
                  maxHeight: "170px",
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 8px 16px rgba(16, 43, 70, 0.12))",
                }}
              />
            </div>
          </div>

          {/* 4 Metric Cards Strip matching screenshot */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            {/* 1. Pending Requests */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "20px 22px",
                border: "1px solid #dce7f1",
                boxShadow: "0 4px 14px rgba(16, 43, 70, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
                  Pending Requests
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#fef3c7",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  📄
                </div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#071D35" }}>
                {metrics.pendingRequests}
              </div>
            </div>

            {/* 2. Active Consultations */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "20px 22px",
                border: "1px solid #dce7f1",
                boxShadow: "0 4px 14px rgba(16, 43, 70, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
                  Active Consultations
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  🩺
                </div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#071D35" }}>
                {metrics.activeConsultations}
              </div>
            </div>

            {/* 3. Today's Appointments */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "20px 22px",
                border: "1px solid #dce7f1",
                boxShadow: "0 4px 14px rgba(16, 43, 70, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
                  Today's Appointments
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  📅
                </div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#071D35" }}>
                {metrics.todayAppointments}
              </div>
            </div>

            {/* 4. Unread Messages */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                padding: "20px 22px",
                border: "1px solid #dce7f1",
                boxShadow: "0 4px 14px rgba(16, 43, 70, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>
                  Unread Messages
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#f5f3ff",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  💬
                </div>
              </div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "#071D35" }}>
                {metrics.unreadMessages}
              </div>
            </div>
          </div>

          {/* Main 2-Column Split matching screenshot */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
            {/* Left Column: Recent Patient Requests */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid #dce7f1",
                boxShadow: "0 4px 16px rgba(16, 43, 70, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                  Recent Patient Requests
                </h2>
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  View All →
                </button>
              </div>

              {/* Requests List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredRequests.map((req) => {
                  const urgencyBg =
                    req.urgency === "High"
                      ? "#fef2f2"
                      : req.urgency === "Medium"
                        ? "#fffbeb"
                        : "#f0fdf4";
                  const urgencyColor =
                    req.urgency === "High"
                      ? "#dc2626"
                      : req.urgency === "Medium"
                        ? "#d97706"
                        : "#16a34a";
                  const urgencyBorder =
                    req.urgency === "High"
                      ? "#fecaca"
                      : req.urgency === "Medium"
                        ? "#fde68a"
                        : "#bbf7d0";

                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: "16px 18px",
                        borderRadius: "14px",
                        border: "1px solid #eef3f9",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {/* Left: Avatar & Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                            color: "#0369a1",
                            fontWeight: 800,
                            fontSize: "15px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {req.initials}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "#071D35" }}>
                              {req.name}
                            </span>
                            <span
                              style={{
                                background: urgencyBg,
                                color: urgencyColor,
                                border: `1px solid ${urgencyBorder}`,
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              {req.urgency === "High" ? "🚨 High Urgency" : `${req.urgency} Urgency`}
                            </span>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {req.timeAgo}
                            </span>
                          </div>

                          <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 4px" }}>
                            {req.age} yrs • {req.gender}
                          </p>

                          <p
                            style={{
                              fontSize: "12px",
                              color: "#334155",
                              margin: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {req.symptoms} • {req.duration}
                          </p>
                        </div>
                      </div>

                      {/* Right: Working Buttons [View], [Message], [Accept] */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                        <button
                          onClick={() => handleViewDetails(req)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: "18px",
                            border: "1px solid #dce7f1",
                            background: "#ffffff",
                            color: "#102B46",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          View
                        </button>

                        <button
                          onClick={() => handleOpenChat(req)}
                          style={{
                            padding: "7px 14px",
                            borderRadius: "18px",
                            border: "1px solid #dce7f1",
                            background: "#ffffff",
                            color: "#2563eb",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Message
                        </button>

                        <button
                          onClick={() => handleAcceptRequest(req)}
                          disabled={req.status === "in_progress"}
                          style={{
                            padding: "7px 18px",
                            borderRadius: "18px",
                            border: "none",
                            background:
                              req.status === "in_progress"
                                ? "#059669"
                                : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: req.status === "in_progress" ? "default" : "pointer",
                            boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                          }}
                        >
                          {req.status === "in_progress" ? "✓ Accepted" : "Accept"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Today's Schedule & Quick Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Card 1: Today's Schedule */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid #dce7f1",
                  boxShadow: "0 4px 16px rgba(16, 43, 70, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                    Today's Schedule
                  </h2>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", cursor: "pointer" }}>
                    View All →
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background: "#f8fafc",
                        border: "1px solid #eef3f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#0d9488",
                          }}
                        />
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#071D35" }}>
                          {apt.time}
                        </span>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          {apt.patientName}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {apt.type}
                        </span>
                        <span style={{ fontSize: "12px", color: "#cbd5e1" }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Quick Actions */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid #dce7f1",
                  boxShadow: "0 4px 16px rgba(16, 43, 70, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#071D35", margin: 0 }}>
                  Quick Actions
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      padding: "11px 16px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>📄</span> View All Requests
                  </button>

                  <button
                    onClick={() => {
                      if (requests[0]) handleAcceptRequest(requests[0]);
                    }}
                    style={{
                      padding: "11px 16px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>🩺</span> Start Consultation
                  </button>

                  <button
                    onClick={() => setIsChatModalOpen(true)}
                    style={{
                      padding: "11px 16px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#1e293b",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>💬</span> Send Message
                  </button>

                  <button
                    onClick={() => setIsRxModalOpen(true)}
                    style={{
                      padding: "11px 16px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
                      border: "none",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 4px 12px rgba(13, 148, 136, 0.25)",
                    }}
                  >
                    <span>📝</span> Create Prescription
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* View Details Modal */}
        {isViewModalOpen && selectedRequest && (
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
              padding: "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsViewModalOpen(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                maxHeight: "85vh",
                background: "#ffffff",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 24px 60px rgba(7, 29, 53, 0.3)",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #dce7f1",
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #071D35, #102B46)",
                  color: "#ffffff",
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                    {selectedRequest.name}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                    {selectedRequest.age} yrs • {selectedRequest.gender} • Case ID: {selectedRequest.id}
                  </p>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    color: "white",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                {selectedRequest.urgency === "High" && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1.5px solid #fecaca",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      color: "#b91c1c",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    🚨 Urgent Priority Case: Immediate clinical evaluation recommended.
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Patient's Original Statement:
                  </label>
                  <p style={{ margin: "6px 0 0", padding: "12px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#0f172a" }}>
                    "{selectedRequest.source_text || selectedRequest.symptoms}"
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase" }}>
                    AI Clinical Synthesis (Gemini 3.5 Flash Lite):
                  </label>
                  <p style={{ margin: "6px 0 0", padding: "12px", background: "#f0f9ff", borderRadius: "10px", border: "1px solid #bae6fd", fontSize: "12px", color: "#0369a1", lineHeight: 1.5 }}>
                    {selectedRequest.ai_summary || "Symptoms structured for clinical decision support."}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", display: "block", marginBottom: "4px" }}>
                    Clinical Assessment / Notes:
                  </label>
                  <textarea
                    rows={3}
                    value={doctorNote}
                    onChange={(e) => setDoctorNote(e.target.value)}
                    placeholder="Enter clinical remarks or diagnosis notes..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div
                style={{
                  padding: "16px 24px",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    if (!doctorNote.trim()) return;
                    try {
                      await fetch(`/api/consultations/${selectedRequest.id}/notes`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ note: doctorNote.trim() }),
                      });
                      setLiveNotice("✓ Clinical notes saved.");
                      setTimeout(() => setLiveNotice(null), 3000);
                      fetchDoctorData();
                    } catch (e) {}
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#0f172a",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  💾 Save Notes
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => {
                      handleOpenChat(selectedRequest);
                      setIsViewModalOpen(false);
                    }}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      border: "1px solid #dce7f1",
                      background: "white",
                      color: "#2563eb",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    💬 Chat
                  </button>

                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setIsRxModalOpen(true);
                    }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #0d9488, #059669)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    📄 Issue Rx
                  </button>

                  {selectedRequest.status !== "in_progress" && (
                    <button
                      onClick={() => {
                        handleAcceptRequest(selectedRequest);
                        setIsViewModalOpen(false);
                      }}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "10px",
                        border: "none",
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Accept Case
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Modal */}
        {isRxModalOpen && (
          <PrescriptionModal
            consultation={
              selectedRequest || {
                id: "VV-CONS-2026",
                patient_name: "Rohit Sharma",
                patient_age: 28,
                patient_gender: "Male",
                source_text: "Fever and cough",
              }
            }
            onClose={() => setIsRxModalOpen(false)}
            onPrescriptionCreated={(rx) => {
              setLiveNotice(`✓ Prescription #${rx.id} approved and signed.`);
              fetchDoctorData();
            }}
          />
        )}

        {/* Real-Time Chat Modal */}
        <ChatModal
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
          consultationId={chatPartner.consultationId}
          currentUserId="c2e2338c-8bb5-4cb9-93c0-4d425c21492f"
          currentUserName="Dr. Priya Sharma"
          currentUserRole="doctor"
          partnerName={chatPartner.name}
          partnerRole={chatPartner.role}
          partnerId={chatPartner.id}
        />

        <BottomBrandStrip />
      </main>
    </div>
  );
}
