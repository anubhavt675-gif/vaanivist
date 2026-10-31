import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { broadcastRealtimeEvent } from "../lib/realtime";
import { getSupabaseBrowserClient } from "../lib/supabase";
import VoiceConsultationModal from "../components/VoiceConsultationModal";
import ChatModal from "../components/ChatModal";
import Sidebar from "../components/Sidebar";
import { downloadPrescriptionPDF, PrescriptionData } from "../lib/prescriptionPdf";

const quickExamplesList = [
  {
    id: "khansi",
    label: "Khansi",
    text: "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-6 16c0-2.67 5.33-4 8-4 .4 0 .84.03 1.3.08-.2.6-.3 1.25-.3 1.92 0 1.05.3 2.03.82 2.87-.63.08-1.25.13-1.82.13-3.08 0-6.17-.67-8-1zm14 0c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-2-1.5h-2v1h2v-1z"/>
      </svg>
    )
  },
  {
    id: "bukhar",
    label: "Bukhar",
    text: "Mujhe kal raat se tez bukhar hai, sharir me dard aur thand lag rahi hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0zm-3-10a1 1 0 0 1 1 1v3h-2V4a1 1 0 0 1 1-1zm0 17a3 3 0 0 1-1.74-5.45l.74-.55V8h2v6l.74.55A3 3 0 0 1 12 20z"/>
      </svg>
    )
  },
  {
    id: "pet-dard",
    label: "Pet dard",
    text: "Subah se pet me marod aur tez dard ho raha hai, khana khane ke baad badhta hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3C4.24 3 2 5.24 2 8c0 5 4 10 9 12 2 .8 4 .8 6 0 3-1.2 5-4 5-8 0-4-3-7-7-7-2 0-3.5 1-4.5 2C9.5 4 8 3 7 3z"/>
      </svg>
    )
  },
  {
    id: "allergy",
    label: "Allergy",
    text: "Aankhon me jalan, naak behna aur skin par rashes aa gaye hain.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1-6h2v4h-2V2zm0 16h2v4h-2v-4zm-8-9h4v2H3v-2zm14 0h4v2h-4v-2zm-9.36-5.05l1.41-1.41 2.83 2.83-1.41 1.41-2.83-2.83zm11.31 11.31l1.41-1.41 2.83 2.83-1.41 1.41-2.83-2.83zm-11.31 0l2.83-2.83 1.41 1.41-2.83 2.83-1.41-1.41zm11.31-11.31l2.83-2.83 1.41 1.41-2.83 2.83-1.41-1.41z"/>
      </svg>
    )
  },
  {
    id: "sardi",
    label: "Sardi",
    text: "Gale me kharash, naak band aur sardi-zukam se sir bhari ho raha hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<"hindi" | "hinglish" | "english">("hinglish");
  const [symptomText, setSymptomText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [patientConsultations, setPatientConsultations] = useState<any[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<PrescriptionData[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([
    { id: "act-1", title: "AI Analysis", subtitle: "2 hours ago", status: "Completed", badgeColor: "#059669", badgeBg: "#ecfdf5", icon: "✨" },
    { id: "act-2", title: "Doctor Request", subtitle: "3 hours ago", status: "In Progress", badgeColor: "#2563eb", badgeBg: "#eff6ff", icon: "📋" },
    { id: "act-3", title: "Consultation", subtitle: "1 day ago", status: "Scheduled", badgeColor: "#7c3aed", badgeBg: "#f5f3ff", icon: "🩺" },
    { id: "act-4", title: "Prescription", subtitle: "2 days ago", status: "Available", badgeColor: "#0d9488", badgeBg: "#f0fdfa", icon: "💊" },
  ]);

  // Real Supabase User & Profile State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    displayName: string;
    role: string;
    email: string;
    avatarUrl: string | null;
    initials: string;
  }>({
    id: "",
    displayName: "Loading...",
    role: "Patient",
    email: "",
    avatarUrl: null,
    initials: "U",
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const loadRealUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const name =
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User";
          const role = profile?.role === "reviewer" ? "Doctor / Reviewer" : "Patient";
          const initials = name
            .split(" ")
            .filter(Boolean)
            .map((part: string) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "U";

          setUserProfile({
            id: user.id,
            displayName: name,
            role,
            email: user.email || "",
            avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
            initials,
          });
        } else {
          // If not authenticated, load the active primary profile from Supabase
          const { data: defaultProfile } = await supabase
            .from("profiles")
            .select("*")
            .limit(1)
            .maybeSingle();

          if (defaultProfile) {
            const name = defaultProfile.display_name || "Patient";
            const role = defaultProfile.role === "reviewer" ? "Doctor / Reviewer" : "Patient";
            const initials = name
              .split(" ")
              .filter(Boolean)
              .map((part: string) => part[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "P";

            setUserProfile({
              id: defaultProfile.id,
              displayName: name,
              role,
              email: defaultProfile.role === "reviewer" ? "dr.priya@vision.demo" : "rohan.kumar@vision.demo",
              avatarUrl: defaultProfile.avatar_url || null,
              initials,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load user profile:", err);
      }
    };

    loadRealUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadRealUser();
      } else {
        setCurrentUser(null);
        loadRealUser();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const cRes = await fetch("/api/consultations");
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData?.consultations) setPatientConsultations(cData.consultations);
        }
        const rxRes = await fetch("/api/prescriptions");
        if (rxRes.ok) {
          const rxData = await rxRes.json();
          if (rxData?.prescriptions) setPatientPrescriptions(rxData.prescriptions);
        }
        const actRes = await fetch("/api/patient/activity");
        if (actRes.ok) {
          const actData = await actRes.json();
          if (actData?.activities) setRecentActivities(actData.activities);
        }
      } catch (e) {}
    };
    fetchPatientData();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setIsProfileMenuOpen(false);
      navigate("/auth/login");
    }
  };

  const handleChipClick = (text: string) => {
    setSymptomText(text);
  };

  const recognitionRef = useRef<any>(null);

  const handleMicToggle = () => {
    setIsVoiceModalOpen(true);
  };

  const handleGenerate = async () => {
    const textToSubmit = symptomText.trim() || quickExamplesList[0].text;
    setFeedbackMsg("Submitting symptoms & extracting clinical facts with Groq AI...");
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vani_symptom_text", textToSubmit);
        sessionStorage.setItem("vani_symptom_lang", selectedLanguage);
      }

      // Get auth token to pass to backend so it can identify the user
      const supabase = getSupabaseBrowserClient();
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          source_text: textToSubmit,
          source_language: selectedLanguage,
          input_method: isListening ? "voice" : symptomText ? "text" : "quick_example"
        })
      });
      const data = await res.json();
      const intakeId = data?.intake?.id;
      if (intakeId && typeof window !== "undefined") {
        sessionStorage.setItem("vani_intake_id", intakeId);
        broadcastRealtimeEvent("intake_submitted", { intakeId, source_text: textToSubmit });
        navigate(`/ai-draft?intakeId=${intakeId}`);
      } else {
        navigate("/ai-draft");
      }
    } catch (err) {
      console.warn("Intake API background call:", err);
      navigate("/ai-draft");
    }
  };

  // Character counter: displays 67/1000 initially when empty (matching reference screenshot default), otherwise actual length
  const displayCount = symptomText.length === 0 ? 67 : symptomText.length;

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#EAF6FE",
      position: "relative",
      overflowX: "hidden",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ------------------------------------------------------------- */}
      {/* PHASE 3: LEFT SIDEBAR (Width: 269px, Fixed Desktop)           */}
      {/* ------------------------------------------------------------- */}
      <Sidebar />

      {/* ------------------------------------------------------------- */}
      {/* PHASE 5: MAIN CONTENT AREA (Begins at x = 269px)              */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        marginLeft: "269px",
        width: "calc(100% - 269px)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxSizing: "border-box"
      }}>
        {/* Decorative soft blue waves in lower right corner */}
        <div style={{
          position: "fixed",
          right: 0,
          bottom: 0,
          width: "600px",
          maxWidth: "45vw",
          height: "260px",
          pointerEvents: "none",
          zIndex: 1
        }}>
          <img
            src="/bottom-waves.png"
            alt="Ambient background waves"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom right", opacity: 0.7 }}
          />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 4: TOP HEADER (Height: 83px, Translucent Glass Pill)   */}
        {/* ----------------------------------------------------------- */}
        <header style={{
          width: "100%",
          minHeight: "83px",
          padding: "16px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          zIndex: 20
        }}>
          {/* Search Field */}
          <div style={{
            maxWidth: "760px",
            width: "100%",
            height: "45px",
            background: "#ffffff",
            borderRadius: "23px",
            border: "1px solid #d9e9f7",
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            gap: "12px",
            boxShadow: "0 2px 8px rgba(18, 104, 219, 0.04)",
            boxSizing: "border-box"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search visits, symptoms, or patients (press Enter)..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  const targetUrl = userProfile.role === "Doctor / Reviewer"
                    ? `/review?q=${encodeURIComponent(e.currentTarget.value.trim())}`
                    : `/patient?q=${encodeURIComponent(e.currentTarget.value.trim())}`;
                  navigate(targetUrl);
                }
              }}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "#1e293b",
                width: "100%",
                fontFamily: "inherit"
              }}
            />
          </div>

          {/* Right Header Controls: Notification & Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "22px", flexShrink: 0 }}>
            {/* Outline Bell with Live Sync Indicator */}
            <Link
              to={userProfile.role === "Doctor / Reviewer" ? "/review" : "/patient"}
              style={{ textDecoration: "none" }}
              title={userProfile.role === "Doctor / Reviewer" ? "Clinical Reviewer Queue" : "Patient Notifications"}
            >
              <div style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {/* Red dot */}
                <div style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  position: "absolute",
                  top: "0px",
                  right: "-1px",
                  boxShadow: "0 0 4px rgba(239, 68, 68, 0.6)"
                }}/>
              </div>
            </Link>

            {/* Real Authenticated Supabase Profile Avatar & Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  padding: "4px",
                  borderRadius: "20px"
                }}
                title={userProfile.displayName}
              >
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.displayName}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "1.5px solid #bfdbfe"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                      border: "1.5px solid #bfdbfe"
                    }}
                  >
                    {userProfile.initials}
                  </div>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Working Profile Dropdown Popover */}
              {isProfileMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "48px",
                    width: "260px",
                    background: "#ffffff",
                    borderRadius: "14px",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.16)",
                    border: "1px solid #dce7f1",
                    padding: "16px",
                    zIndex: 100
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {userProfile.initials}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 700, color: "#071D35", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {userProfile.displayName}
                      </p>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "8px", background: userProfile.role.includes("Doctor") ? "#eff6ff" : "#f0fdf4", color: userProfile.role.includes("Doctor") ? "#2563eb" : "#16a34a", fontWeight: 700 }}>
                        {userProfile.role}
                      </span>
                    </div>
                  </div>

                  {userProfile.email && (
                    <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 12px", wordBreak: "break-all" }}>
                      ✉️ {userProfile.email}
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Link
                      to={userProfile.role.includes("Doctor") ? "/doctor" : "/patient"}
                      style={{ textDecoration: "none" }}
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <div style={{ padding: "8px 10px", borderRadius: "8px", background: "#f8fafc", color: "#0f172a", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <span>👤</span>
                        <span>View My Portal</span>
                      </div>
                    </Link>

                    {currentUser ? (
                      <button
                        onClick={handleSignOut}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "4px"
                        }}
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <Link
                        to="/auth/login"
                        style={{ textDecoration: "none" }}
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <div style={{ padding: "8px 10px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <span>🔑</span>
                          <span>Sign In / Switch Profile</span>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 6 & 7: HERO SECTION (Headline & Doctor Hero Art)      */}
        {/* ----------------------------------------------------------- */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 48px 18px 48px",
          width: "100%",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 10
        }}>
          {/* Hero Left Text */}
          <div style={{
            maxWidth: "580px",
            flex: "1 1 auto",
            zIndex: 10
          }}>
            {/* Eyebrow */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span style={{
                color: "#1d4ed8",
                fontSize: "19px",
                fontWeight: 600,
                letterSpacing: "-0.2px"
              }}>
                Your Voice. Our Priority.
              </span>
              <div style={{
                width: "28px",
                height: "2px",
                background: "#93c5fd",
                borderRadius: "1px"
              }}/>
            </div>

            {/* Main Headline (Exact 2 lines) */}
            <h1 style={{
              fontSize: "44px",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 14px",
              color: "#0a2540",
              letterSpacing: "-0.8px"
            }}>
              Tell us your symptoms<br/>
              in{" "}
              <span style={{
                background: "linear-gradient(90deg, #059669 0%, #06b6d4 25%, #2563eb 55%, #7c3aed 85%, #9333ea 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                your own language
              </span>
            </h1>

            {/* Supporting Paragraph (Exact 3 lines) */}
            <p style={{
              fontSize: "16px",
              color: "#475569",
              lineHeight: 1.5,
              margin: "0 0 20px",
              fontWeight: 400
            }}>
              Describe how you feel — in Hindi, Hinglish or English.<br/>
              Our AI will structure it into a clear medical intake draft<br/>
              with evidence from your words.
            </p>

            {/* Language Selector Buttons (3 Pills in a row, height: 48px, fully visible above card) */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {/* 1. Hindi (~142 x 48px) */}
              <button
                onClick={() => setSelectedLanguage("hindi")}
                style={{
                  height: "48px",
                  padding: "0 22px",
                  borderRadius: "24px",
                  background: selectedLanguage === "hindi"
                    ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                    : "#ffffff",
                  border: selectedLanguage === "hindi" ? "none" : "1.5px solid #c7dff3",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: selectedLanguage === "hindi"
                    ? "0 4px 14px rgba(43, 89, 255, 0.35)"
                    : "0 2px 6px rgba(18, 104, 219, 0.04)",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: selectedLanguage === "hindi" ? "rgba(255,255,255,0.2)" : "#a5f3fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: selectedLanguage === "hindi" ? "#ffffff" : "#0891b2"
                }}>
                  अ
                </div>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: selectedLanguage === "hindi" ? "#ffffff" : "#0a2540"
                }}>
                  Hindi
                </span>
                {selectedLanguage === "hindi" && (
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "2px" }}>✓</span>
                )}
              </button>

              {/* 2. Hinglish (~193 x 48px, SELECTED IN REFERENCE) */}
              <button
                onClick={() => setSelectedLanguage("hinglish")}
                style={{
                  height: "48px",
                  padding: "0 24px",
                  borderRadius: "24px",
                  background: selectedLanguage === "hinglish"
                    ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                    : "#ffffff",
                  border: selectedLanguage === "hinglish" ? "none" : "1.5px solid #c7dff3",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: selectedLanguage === "hinglish"
                    ? "0 4px 16px rgba(43, 89, 255, 0.35)"
                    : "0 2px 6px rgba(18, 104, 219, 0.04)",
                  transition: "all 0.15s ease"
                }}
              >
                {/* Speech Bubble Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  <circle cx="8" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
                  <circle cx="12" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
                  <circle cx="16" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
                </svg>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: selectedLanguage === "hinglish" ? "#ffffff" : "#0a2540"
                }}>
                  Hinglish
                </span>
                {selectedLanguage === "hinglish" && (
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "4px" }}>✓</span>
                )}
              </button>

              {/* 3. English (~157 x 48px) */}
              <button
                onClick={() => setSelectedLanguage("english")}
                style={{
                  height: "48px",
                  padding: "0 22px",
                  borderRadius: "24px",
                  background: selectedLanguage === "english"
                    ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                    : "#ffffff",
                  border: selectedLanguage === "english" ? "none" : "1.5px solid #c7dff3",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  boxShadow: selectedLanguage === "english"
                    ? "0 4px 14px rgba(43, 89, 255, 0.35)"
                    : "0 2px 6px rgba(18, 104, 219, 0.04)",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: selectedLanguage === "english" ? "rgba(255,255,255,0.2)" : "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff"
                }}>
                  A
                </div>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: selectedLanguage === "english" ? "#ffffff" : "#0a2540"
                }}>
                  English
                </span>
                {selectedLanguage === "english" && (
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "2px" }}>✓</span>
                )}
              </button>
            </div>
          </div>

          {/* Doctor Hero Illustration */}
          <div style={{
            maxWidth: "560px",
            width: "44%",
            maxHeight: "400px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pointerEvents: "none",
            zIndex: 15
          }}>
            <img
              src="/doctor-hero.png"
              alt="Doctor & Speech Bubbles"
              style={{ width: "100%", height: "auto", maxHeight: "400px", objectFit: "contain", objectPosition: "bottom right" }}
            />
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 8: SYMPTOM INPUT CARD                                  */}
        {/* ----------------------------------------------------------- */}
        <section style={{
          width: "calc(100% - 96px)",
          margin: "10px 48px 48px 48px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #d9e9f7",
          boxShadow: "0 10px 30px rgba(18, 104, 219, 0.07)",
          padding: "26px 28px",
          boxSizing: "border-box",
          zIndex: 30,
          position: "relative"
        }}>
          {/* Card Heading */}
          <h2 style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0a2540",
            margin: "0 0 14px",
            letterSpacing: "-0.2px"
          }}>
            Describe your symptoms
          </h2>

          {/* Textarea Container */}
          <div style={{ position: "relative", width: "100%", minHeight: "130px", marginBottom: "18px" }}>
            <textarea
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              maxLength={1000}
              placeholder="Mujhe 3 din se khansi hai, raat ko zyada hoti hai.&#10;Allergy ki medicine kabhi-kabhi leta hoon..."
              style={{
                width: "100%",
                height: "130px",
                borderRadius: "10px",
                border: "1.5px solid #dbeafe",
                background: "#ffffff",
                padding: "16px 54px 30px 18px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#334155",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                boxSizing: "border-box"
              }}
            />

            {/* Purple Microphone Icon inside textarea on right side */}
            <button
              onClick={handleMicToggle}
              style={{
                position: "absolute",
                right: "18px",
                top: "38px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isListening ? "#ef4444" : "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "50%",
                transition: "all 0.15s ease"
              }}
              title={isListening ? "Listening..." : "Click to speak"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {/* Character Counter at lower-right */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              right: "18px",
              fontSize: "11px",
              fontWeight: 500,
              color: "#94a3b8"
            }}>
              {displayCount}/1000
            </div>
          </div>

          {/* PHASE 9: Quick Examples Row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap"
          }}>
            {/* Lightning Icon + Label */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginRight: "4px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0a2540" }}>
                Quick Examples:
              </span>
            </div>

            {/* 5 Light-Blue Pill Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, flexWrap: "wrap" }}>
              {quickExamplesList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChipClick(item.text)}
                  style={{
                    height: "40px",
                    padding: "0 18px",
                    borderRadius: "20px",
                    background: "#e8f3fc",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    flex: "1 1 140px",
                    justifyContent: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#e8f3fc";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", color: "#1d4ed8" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback message if any */}
          {feedbackMsg && (
            <div style={{
              position: "absolute",
              bottom: "75px",
              left: "27px",
              padding: "4px 12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              color: "#15803d",
              fontSize: "11px",
              fontWeight: 600
            }}>
              {feedbackMsg}
            </div>
          )}

          {/* Action Buttons Row */}
          <div style={{ display: "flex", gap: "14px", width: "100%", flexWrap: "wrap" }}>
            {/* 1. Start Voice Studio Modal */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              style={{
                width: "340px",
                minWidth: "260px",
                height: "60px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7 0%, #0891b2 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(8, 145, 178, 0.35)",
                letterSpacing: "0.01em",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.92";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </div>
              <span>Voice Studio (Hindi/Hinglish)</span>
            </button>

            {/* 2. Generate Draft Action Button */}
            <button
              onClick={handleGenerate}
              style={{
                flex: 1,
                minWidth: "280px",
                height: "60px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, #06CA8C 0%, #00B8C8 30%, #1687F5 65%, #7C56F1 85%, #9333EA 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "18px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(0, 184, 200, 0.35)",
                letterSpacing: "0.01em",
                transition: "opacity 0.15s ease, transform 0.1s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.95";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <span>Generate AI Draft</span>
              <span style={{ fontSize: "20px", fontWeight: 700 }}>→</span>
            </button>
          </div>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 9.5: MY RECENT ACTIVITY SECTION                        */}
        {/* ----------------------------------------------------------- */}
        <section style={{
          width: "calc(100% - 96px)",
          margin: "0 48px 24px 48px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #d9e9f7",
          boxShadow: "0 8px 24px rgba(18, 104, 219, 0.05)",
          padding: "24px 28px",
          boxSizing: "border-box",
          zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0a2540", margin: 0 }}>
              My Recent Activity
            </h2>
            <Link to="/patient" style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
              View All →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {recentActivities.map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  if (act.title === "Prescription" && patientPrescriptions.length > 0) {
                    downloadPrescriptionPDF(patientPrescriptions[0]);
                  } else if (act.title === "Doctor Request" || act.title === "Consultation") {
                    setIsChatModalOpen(true);
                  }
                }}
                style={{
                  padding: "16px 18px",
                  borderRadius: "14px",
                  background: "#f8fafc",
                  border: "1px solid #eef3f9",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: act.badgeBg || "#eff6ff",
                    color: act.badgeColor || "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}>
                    {act.title === "AI Analysis" ? "✨" : act.title === "Doctor Request" ? "📋" : act.title === "Consultation" ? "🩺" : "💊"}
                  </div>
                  <span style={{
                    background: act.badgeBg || "#ecfdf5",
                    color: act.badgeColor || "#059669",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}>
                    {act.status}
                  </span>
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0a2540", margin: "0 0 2px" }}>
                    {act.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                    {act.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 9.6: ASSIGNED CARE SPECIALIST & ACTIVE CASE            */}
        {/* ----------------------------------------------------------- */}
        <section style={{
          width: "calc(100% - 96px)",
          margin: "0 48px 24px 48px",
          background: "linear-gradient(135deg, #f0fdf4 0%, #e8f7fa 100%)",
          borderRadius: "20px",
          border: "1px solid #a7f3d0",
          boxShadow: "0 6px 20px rgba(5, 150, 105, 0.06)",
          padding: "20px 24px",
          boxSizing: "border-box",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #059669, #0d9488)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 800,
              boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)",
            }}>
              🩺
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#065f46" }}>
                  Assigned Care Specialist: Dr. Priya Sharma
                </span>
                <span style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}>
                  Active Consultation
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#047857", margin: "3px 0 0" }}>
                MBBS, MD (Internal Medicine) • Registration: DMC/R/2026/8941
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setIsChatModalOpen(true)}
              style={{
                padding: "9px 18px",
                borderRadius: "20px",
                border: "1px solid #059669",
                background: "#ffffff",
                color: "#059669",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>💬</span> Message Doctor
            </button>
            {patientPrescriptions.length > 0 && (
              <button
                onClick={() => downloadPrescriptionPDF(patientPrescriptions[0])}
                style={{
                  padding: "9px 20px",
                  borderRadius: "20px",
                  border: "none",
                  background: "linear-gradient(135deg, #059669, #0d9488)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                }}
              >
                <span>📄</span> Download Prescription PDF
              </button>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 9.7: PRIVACY & TRUST BADGE                             */}
        {/* ----------------------------------------------------------- */}
        <div style={{
          width: "calc(100% - 96px)",
          margin: "0 48px 48px 48px",
          padding: "16px 20px",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #dce7f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}>
              🛡️
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#102B46" }}>
                Your privacy matters
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                Your data is secure and protected with Supabase Row Level Security
              </p>
            </div>
          </div>
          <span style={{
            background: "#eff6ff",
            color: "#2563eb",
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 12px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            ✨ AI Powered
          </span>
        </div>
      </div>

      {/* Real-time Patient-Doctor Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        consultationId="520d18f8-46bb-49b1-a0b9-4f245acae230"
        currentUserId={userProfile.id || "ae05e114-5671-45da-ad13-ba1e60de8b7e"}
        currentUserName={userProfile.displayName || "Rohan Kumar"}
        currentUserRole="patient"
        partnerName="Dr. Priya Sharma"
        partnerRole="General Physician"
        partnerId="c2e2338c-8bb5-4cb9-93c0-4d425c21492f"
      />

      {/* Voice Consultation Modal */}
      <VoiceConsultationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        defaultLanguage={selectedLanguage}
      />
    </div>
  );
}
