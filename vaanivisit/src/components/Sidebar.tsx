import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { useUserRole } from "../lib/useUserRole";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
  onClick?: () => void;
}

export default function Sidebar({ onOpenChat }: { onOpenChat?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isDoctorRoute = pathname.startsWith("/doctor") || pathname.startsWith("/review");

  const { role: authRole, displayName: authDisplayName } = useUserRole();

  // Derive which sidebar to show:
  // If authenticated role resolves, prefer that; fall back to route sniffing during load.
  const isDoctor = authRole === "doctor" || (authRole === "loading" && isDoctorRoute);

  const [currentLang, setCurrentLang] = useState<"hi" | "en">("hi");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<{ displayName: string; role: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, role")
            .eq("id", user.id)
            .maybeSingle();
          if (profile) {
            setProfileData({
              displayName: profile.display_name || user.email?.split("@")[0] || "User",
              role: profile.role === "reviewer" ? "Doctor" : "Patient",
            });
          }
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        const u = session?.user || null;
        setCurrentUser(u);
        if (u) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, role")
            .eq("id", u.id)
            .maybeSingle();
          if (profile) {
            setProfileData({
              displayName: profile.display_name || u.email?.split("@")[0] || "User",
              role: profile.role === "reviewer" ? "Doctor" : "Patient",
            });
          }
        } else {
          setProfileData(null);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      navigate("/auth/login");
    }
  };

  // SVGs for clean UI
  const HomeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );

  const DashboardIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );

  const RequestsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 12h6m-6 4h6" />
    </svg>
  );

  const PatientsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const StethoscopeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
      <path d="M9 12.5V17a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-1.5" />
      <circle cx="18" cy="14" r="2" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const MessagesIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  const PrescriptionsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );

  const RecordsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );

  const NotificationsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );

  const AvailabilityIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  // Navigation Items according to active role / route
  const patientNavItems: NavItem[] = [
    { label: "Home", href: "/", icon: <HomeIcon /> },
    { label: "AI Consultation", href: "/patient", icon: <StethoscopeIcon /> },
    { label: "My Requests", href: "/patient/requests", icon: <RequestsIcon /> },
    { label: "My Doctors", href: "/patient/doctors", icon: <PatientsIcon /> },
    { label: "Messages", href: "/patient/messages", icon: <MessagesIcon />, badge: 3, badgeColor: "#ef4444", onClick: onOpenChat },
    { label: "Appointments", href: "/patient/appointments", icon: <CalendarIcon /> },
    { label: "Medical Records", href: "/patient/records", icon: <RecordsIcon /> },
    { label: "Prescriptions", href: "/patient/prescriptions", icon: <PrescriptionsIcon /> },
    { label: "Notifications", href: "/patient/notifications", icon: <NotificationsIcon />, badge: 2, badgeColor: "#ef4444" },
    { label: "Profile Settings", href: "/patient/profile", icon: <SettingsIcon /> },
  ];

  const doctorNavItems: NavItem[] = [
    { label: "Dashboard", href: "/doctor", icon: <DashboardIcon /> },
    { label: "Incoming Requests", href: "/doctor#requests", icon: <RequestsIcon />, badge: 5, badgeColor: "#3b82f6" },
    { label: "My Patients", href: "/doctor#patients", icon: <PatientsIcon /> },
    { label: "Appointments", href: "/doctor#schedule", icon: <CalendarIcon /> },
    { label: "Messages", href: "/doctor#messages", icon: <MessagesIcon />, badge: 2, badgeColor: "#ef4444", onClick: onOpenChat },
    { label: "Consultations", href: "/review", icon: <StethoscopeIcon /> },
    { label: "Prescriptions", href: "/export", icon: <PrescriptionsIcon /> },
    { label: "Medical Records", href: "/doctor#records", icon: <RecordsIcon /> },
    { label: "Notifications", href: "/doctor#notifications", icon: <NotificationsIcon />, badge: 3, badgeColor: "#ef4444" },
    { label: "Profile", href: "/doctor#profile", icon: <SettingsIcon /> },
    { label: "Availability", href: "/doctor#availability", icon: <AvailabilityIcon /> },
  ];

  const activeNavItems = isDoctor ? doctorNavItems : patientNavItems;

  return (
    <aside className="sidebar">
      {/* Ambient background glow / waves */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "240px",
          background:
            "radial-gradient(circle at 10% 100%, rgba(6, 182, 212, 0.16) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Brand Header */}
      <div style={{ padding: "20px 18px 14px", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #06b6d4, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z"
                fill="#0891b2"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "17px",
                  letterSpacing: "-0.4px",
                }}
              >
                Vaani
              </span>
              <span
                style={{
                  color: "#22d3ee",
                  fontWeight: 800,
                  fontSize: "17px",
                  letterSpacing: "-0.4px",
                  marginLeft: "4px",
                }}
              >
                Vision
              </span>
            </div>
            <p
              style={{
                fontSize: "10px",
                color: "#7288aa",
                margin: 0,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              AI Voice Health Platform
            </p>
          </div>
        </div>

        {/* Portal Badge — shows current role only (no cross-portal switching) */}
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "3px",
          }}
        >
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "5px 0",
              fontSize: "11px",
              fontWeight: 700,
              borderRadius: "6px",
              color: "#ffffff",
              background: isDoctor
                ? "linear-gradient(135deg, #2563eb, #0d9488)"
                : "linear-gradient(135deg, #06b6d4, #2563eb)",
            }}
          >
            {isDoctor ? "Doctor Portal" : "Patient Portal"}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "6px 0",
          zIndex: 1,
          overflowY: "auto",
        }}
      >
        {activeNavItems.map((item) => {
          const currentFull = location.pathname + location.hash;
          const isActive =
            location.pathname === item.href ||
            currentFull === item.href ||
            (item.href === "/" && location.pathname === "/") ||
            (item.href === "/patient" && (location.pathname === "/patient" || location.pathname === "/patient/dashboard") && !location.hash) ||
            (item.href === "/doctor" && (location.pathname === "/doctor" || location.pathname === "/doctor/dashboard") && !location.hash);

          return (
            <Link
              key={item.label}
              to={item.href}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                }
              }}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 18px",
                margin: "2px 8px",
                borderRadius: "10px",
                textDecoration: "none",
                color: isActive ? "#ffffff" : "#94a3b8",
                background: isActive
                  ? "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(37, 99, 235, 0.35))"
                  : "transparent",
                fontWeight: isActive ? 700 : 500,
                fontSize: "13px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  style={{
                    background: item.badgeColor || "#ef4444",
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "10px",
                    lineHeight: "1.2",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        style={{
          padding: "14px 16px",
          zIndex: 1,
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 20, 48, 0.5)",
        }}
      >
        {/* Language selector toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            padding: "2px 4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#738aa8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span style={{ fontSize: "11px", color: "#8ca2c4", fontWeight: 500 }}>
              Language
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "2px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              onClick={() => setCurrentLang("hi")}
              style={{
                background:
                  currentLang === "hi"
                    ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                    : "transparent",
                color: currentLang === "hi" ? "#ffffff" : "#7288aa",
                border: "none",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setCurrentLang("en")}
              style={{
                background:
                  currentLang === "en"
                    ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                    : "transparent",
                color: currentLang === "en" ? "#ffffff" : "#7288aa",
                border: "none",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              EN
            </button>
          </div>
        </div>

        {/* User Card Matching Screenshots */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: isDoctor
                  ? "linear-gradient(135deg, #2563eb, #0d9488)"
                  : "linear-gradient(135deg, #06b6d4, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 800,
                color: "white",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
              }}
            >
              {isDoctor ? "D" : profileData?.displayName ? profileData.displayName[0].toUpperCase() : "A"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#e2eafc",
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isDoctor
                  ? "Dr. Priya Sharma"
                  : profileData?.displayName || authDisplayName || "Patient"}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "#7e95b8",
                  margin: 0,
                }}
              >
                {isDoctor ? "Doctor • General Physician" : "Patient Account"}
              </p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            title="Logout"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
