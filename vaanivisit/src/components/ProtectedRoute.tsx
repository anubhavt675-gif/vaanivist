/**
 * ProtectedRoute components for role-based access control.
 *
 * DoctorRoute  — only allows users whose Supabase profile role is "reviewer" or "doctor".
 *                Redirects patients → /patient   and unauthenticated → /doctor/login
 *
 * PatientRoute — only allows users whose Supabase profile role is "patient" (default).
 *                Redirects doctors  → /doctor    and unauthenticated → /auth/login
 *
 * Both show a branded loading screen while the role is being resolved so there
 * is no flash of unauthorized content.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../lib/useUserRole";

// ─── Shared Loading Screen ────────────────────────────────────────────────────

function RoleLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#031835",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        {/* Vaani Vision logo mark */}
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <ellipse cx="14" cy="23" rx="8" ry="10" transform="rotate(-25 14 23)" fill="#00B8C8" />
          <circle cx="25" cy="16" r="7" fill="#1687F5" />
        </svg>
        <div
          style={{
            width: "22px",
            height: "22px",
            border: "2px solid rgba(34, 211, 238, 0.25)",
            borderTopColor: "#22d3ee",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
          Verifying your access…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ─── Doctor Route ─────────────────────────────────────────────────────────────

/**
 * Wraps routes that should only be accessible to authenticated doctors.
 * Usage: <DoctorRoute><DoctorDashboardPage /></DoctorRoute>
 */
export function DoctorRoute({ children }: { children: React.ReactNode }) {
  const { role } = useUserRole();

  if (role === "loading") return <RoleLoadingScreen />;
  if (role === "unauthenticated") return <Navigate to="/doctor/login" replace />;
  if (role === "patient") return <Navigate to="/patient" replace />;

  // role === "doctor" ✓
  return <>{children}</>;
}

// ─── Patient Route ────────────────────────────────────────────────────────────

/**
 * Wraps routes that should only be accessible to authenticated patients.
 * Usage: <PatientRoute><PatientDashboardPage /></PatientRoute>
 */
export function PatientRoute({ children }: { children: React.ReactNode }) {
  const { role } = useUserRole();

  if (role === "loading") return <RoleLoadingScreen />;
  if (role === "unauthenticated") return <Navigate to="/auth/login" replace />;
  if (role === "doctor") return <Navigate to="/doctor" replace />;

  // role === "patient" ✓
  return <>{children}</>;
}

