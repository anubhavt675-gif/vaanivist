import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { useUserRole } from "../lib/useUserRole";
import { subscribeToRealtimeEvents } from "../lib/realtime";

export default function Sidebar({ onOpenChat }: { onOpenChat?: () => void }) {
  const location = useLocation();
  const pathname = location.pathname;
  const { role: authRole } = useUserRole();

  const [userProfile, setUserProfile] = useState<{
    id: string;
    displayName: string;
    role: string;
    email: string;
    avatarUrl: string | null;
    initials: string;
  }>({
    id: "",
    displayName: "Anubhav kumar thakur",
    role: "Patient",
    email: "",
    avatarUrl: null,
    initials: "A",
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const loadRealUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const name =
            profile?.display_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Anubhav kumar thakur";
          const role = profile?.role === "reviewer" ? "Doctor / Reviewer" : "Patient";
          const initials = name
            .split(" ")
            .filter(Boolean)
            .map((part: string) => part[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "A";

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
            const name = defaultProfile.display_name || "Anubhav kumar thakur";
            const role = defaultProfile.role === "reviewer" ? "Doctor / Reviewer" : "Patient";
            const initials = name
              .split(" ")
              .filter(Boolean)
              .map((part: string) => part[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "A";

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
        console.warn("Failed to load user profile in Sidebar:", err);
      }
    };

    loadRealUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadRealUser();
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/conversations?role=patient");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(data.total_unread || 0);
          }
        }
      } catch (e) {
        // ignore
      }
    };

    fetchUnread();
    const unsub = subscribeToRealtimeEvents(() => {
      fetchUnread();
    });

    const interval = setInterval(fetchUnread, 4000);

    return () => {
      isMounted = false;
      unsub();
      clearInterval(interval);
    };
  }, []);

  const isHomeActive = pathname === "/" || pathname === "";
  const isPatientActive = pathname.startsWith("/patient");
  const isDoctorActive = pathname.startsWith("/doctor");
  const isAIDraftActive = pathname.startsWith("/ai-draft");
  const isMessagesActive = pathname.startsWith("/messages");
  const isReviewActive = pathname.startsWith("/review");
  const isExportActive = pathname.startsWith("/export");
  const isUGCActive = pathname.startsWith("/ugc");
  const isProfessionalActive = pathname.startsWith("/professional") || pathname.startsWith("/professinal");

  // Role-based navigation: Review option is ONLY shown for authenticated doctors / medical reviewers
  // or when explicitly active in doctor/professional workflow. It is strictly hidden for patient accounts.
  const isDoctorOrReviewer =
    (authRole === "doctor" ||
      userProfile.role === "Doctor / Reviewer" ||
      userProfile.role === "Doctor" ||
      ((pathname.startsWith("/doctor") || pathname.startsWith("/professional") || pathname.startsWith("/review")) &&
        authRole !== "patient" &&
        userProfile.role !== "Patient")) &&
    authRole !== "patient" &&
    userProfile.role !== "Patient";

  return (
    <aside style={{
      width: "269px",
      minWidth: "269px",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      background: "linear-gradient(180deg, #031835 0%, #041B38 45%, #051A36 80%, #021227 100%)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      zIndex: 50,
      boxShadow: "4px 0 20px rgba(2, 18, 39, 0.4)",
      overflowY: "auto",
      overflowX: "hidden"
    }}>
      {/* Subtle luminous turquoise-blue wave artwork at the bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "269px",
        height: "380px",
        pointerEvents: "none",
        zIndex: 1,
        opacity: 0.85
      }}>
        <img
          src="/sidebar-waves.png"
          alt="Sidebar waves"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "bottom left", opacity: 0.9 }}
        />
      </div>

      {/* Top Section: Logo & Nav items */}
      <div style={{ position: "relative", zIndex: 10 }}>
        {/* Logo Brand Block */}
        <div style={{ padding: "26px 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* 3-Part Leaf Icon */}
            <div style={{ width: "36px", height: "36px", flexShrink: 0, position: "relative" }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                {/* Left leaf: turquoise/cyan */}
                <path
                  d="M18 18 C14 10 7 9 4 13 C2 16 3 23 8 25 C13 26 16 22 18 18 Z"
                  fill="#06b6d4"
                />
                {/* Middle leaf: bright cyan/blue */}
                <path
                  d="M18 18 C18 9 14 3 18 2 C22 3 24 9 21 18 Z"
                  fill="#22d3ee"
                />
                {/* Right leaf: fresh mint green */}
                <path
                  d="M18 18 C22 10 29 9 32 13 C34 16 33 23 28 25 C23 26 20 22 18 18 Z"
                  fill="#34d399"
                />
              </svg>
            </div>

            {/* Brand Typography */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <span style={{
                  background: "linear-gradient(135deg, #ffffff 40%, #22d3ee 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: "23px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.15,
                  fontFamily: "'Inter', sans-serif"
                }}>
                  Clario
                </span>
                <span style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#22d3ee",
                  marginLeft: "2px",
                  boxShadow: "0 0 8px #22d3ee"
                }} />
              </div>
              <span style={{
                color: "#94a3b8",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.03em",
                marginTop: "2px"
              }}>
                AI Health Platform
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: "8px 14px 0", display: "flex", flexDirection: "column", gap: "5px" }}>
          {/* 1. Home */}
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{
              height: "46px",
              borderRadius: "12px",
              background: isHomeActive ? "#11579A" : "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: "14px",
              boxShadow: isHomeActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
              cursor: "pointer"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isHomeActive ? 600 : 500 }}>Home</span>
            </div>
          </Link>

          {/* 3. Doctor Portal (Shown ONLY for Authorized Doctors & Medical Reviewers - Hidden for Patients) */}
          {isDoctorOrReviewer && (
            <Link to="/doctor" style={{ textDecoration: "none" }}>
              <div style={{
                height: "46px",
                borderRadius: "12px",
                background: isDoctorActive ? "#11579A" : "rgba(59, 130, 246, 0.1)",
                border: isDoctorActive ? "none" : "1px solid rgba(59, 130, 246, 0.25)",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                boxShadow: isDoctorActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isDoctorActive ? "#ffffff" : "#60a5fa"}>
                  <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" />
                </svg>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isDoctorActive ? 600 : 500 }}>Doctor Portal</span>
                  <span style={{ fontSize: "9px", padding: "1px 5px", background: "#3b82f6", color: "#fff", fontWeight: 700, borderRadius: "4px" }}>MD</span>
                </div>
              </div>
            </Link>
          )}

          {/* 4. AI Draft */}
          <Link to="/ai-draft" style={{ textDecoration: "none" }}>
            <div style={{
              height: "46px",
              borderRadius: "12px",
              background: isAIDraftActive ? "#11579A" : "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: "14px",
              boxShadow: isAIDraftActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
              cursor: "pointer"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isAIDraftActive ? 600 : 500 }}>AI Draft</span>
            </div>
          </Link>

          {/* 5. Messages */}
          <Link to="/messages" style={{ textDecoration: "none" }}>
            <div style={{
              height: "46px",
              borderRadius: "12px",
              background: isMessagesActive ? "#11579A" : "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: "14px",
              boxShadow: isMessagesActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
              cursor: "pointer",
              position: "relative"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isMessagesActive ? 600 : 500 }}>Messages</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: "auto",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  minWidth: "18px",
                  height: "18px",
                  borderRadius: "9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                  boxShadow: "0 1px 4px rgba(239, 68, 68, 0.4)"
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
          </Link>

          {/* 5. Review (Shown ONLY for Authorized Doctors & Medical Reviewers - Hidden for Patients) */}
          {isDoctorOrReviewer && (
            <Link to="/review" style={{ textDecoration: "none" }}>
              <div style={{
                height: "46px",
                borderRadius: "12px",
                background: isReviewActive ? "#11579A" : "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                boxShadow: isReviewActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isReviewActive ? 600 : 500 }}>Review</span>
              </div>
            </Link>
          )}

          {/* 6. Export */}
          <Link to="/export" style={{ textDecoration: "none" }}>
            <div style={{
              height: "46px",
              borderRadius: "12px",
              background: isExportActive ? "#11579A" : "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: "14px",
              boxShadow: isExportActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
              cursor: "pointer"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isExportActive ? 600 : 500 }}>Export</span>
            </div>
          </Link>

          {/* 7. UGC */}
          <Link to="/ugc" style={{ textDecoration: "none" }}>
            <div style={{
              height: "46px",
              borderRadius: "12px",
              background: isUGCActive ? "#11579A" : "transparent",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: "14px",
              boxShadow: isUGCActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
              cursor: "pointer"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isUGCActive ? 600 : 500 }}>UGC</span>
            </div>
          </Link>

          {/* 8. Professional (Shown ONLY for Authorized Doctors & Medical Reviewers - Hidden for Patients) */}
          {isDoctorOrReviewer && (
            <Link to="/professional" style={{ textDecoration: "none" }}>
              <div style={{
                height: "46px",
                borderRadius: "12px",
                background: isProfessionalActive ? "#11579A" : "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                boxShadow: isProfessionalActive ? "0 2px 10px rgba(17, 87, 154, 0.45)" : "none",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: isProfessionalActive ? 600 : 500 }}>Professional</span>
              </div>
            </Link>
          )}
        </nav>
      </div>

      {/* Bottom Section: Language & User Profile */}
      <div style={{
        padding: "20px 22px 28px",
        position: "relative",
        zIndex: 10
      }}>
        {/* Language Selector */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 2px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 400 }}>Language</span>
              <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: 600 }}>Hindi</span>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        {/* Real Supabase User Profile */}
        <Link
          to="/auth/login"
          style={{ textDecoration: "none" }}
          title="Switch Account / Sign In"
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 2px",
            cursor: "pointer"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.displayName}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    boxShadow: "0 2px 8px rgba(13, 148, 136, 0.4)",
                    flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(13, 148, 136, 0.4)",
                  flexShrink: 0
                }}>
                  <span style={{
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: 700,
                    lineHeight: 1,
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {userProfile.initials}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  {userProfile.displayName}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 400 }}>
                  {userProfile.role}
                </span>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </Link>
      </div>
    </aside>
  );
}
