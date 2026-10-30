import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DoctorRoute, PatientRoute } from "./components/ProtectedRoute";

const HomePage = lazy(() => import("./pages/HomePage"));
const AIDraftPage = lazy(() => import("./pages/AIDraftPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const DoctorDashboardPage = lazy(() => import("./pages/DoctorDashboardPage"));
const PatientDashboardPage = lazy(() => import("./pages/PatientDashboardPage"));
const ExportPage = lazy(() => import("./pages/ExportPage"));
const UGCPage = lazy(() => import("./pages/UGCPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const DoctorLoginPage = lazy(() => import("./pages/DoctorLoginPage"));
const DoctorRegisterPage = lazy(() => import("./pages/DoctorRegisterPage"));

const RouteFallback = () => (
  <div style={{
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#031835",
    color: "#22d3ee",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: 600
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "16px",
        height: "16px",
        border: "2px solid rgba(34, 211, 238, 0.2)",
        borderTopColor: "#22d3ee",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }} />
      <span>Loading Vaani Vision...</span>
    </div>
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Public / Home ─────────────────────────────────────────── */}
        <Route path="/" element={<HomePage />} />
        <Route path="/showcase" element={<ShowcasePage />} />
        <Route path="/ugc" element={<UGCPage />} />
        <Route path="/ugc/:id" element={<PostDetailPage />} />

        {/* ── Auth (public) ──────────────────────────────────────────── */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/doctor/login" element={<DoctorLoginPage />} />
        <Route path="/doctor/register" element={<DoctorRegisterPage />} />

        {/* ── Doctor-only (role-guarded) ─────────────────────────────── */}
        <Route
          path="/doctor"
          element={
            <DoctorRoute>
              <DoctorDashboardPage />
            </DoctorRoute>
          }
        />
        <Route
          path="/doctor/dashboard"
          element={
            <DoctorRoute>
              <DoctorDashboardPage />
            </DoctorRoute>
          }
        />
        <Route
          path="/review"
          element={
            <DoctorRoute>
              <ReviewPage />
            </DoctorRoute>
          }
        />
        {/* ── Patient AI Draft Intake Review ────────────────────────── */}
        <Route path="/ai-draft" element={<AIDraftPage />} />
        <Route
          path="/export"
          element={
            <DoctorRoute>
              <ExportPage />
            </DoctorRoute>
          }
        />
        <Route
          path="/professional"
          element={
            <DoctorRoute>
              <DoctorDashboardPage />
            </DoctorRoute>
          }
        />
        <Route
          path="/professinal"
          element={
            <DoctorRoute>
              <DoctorDashboardPage />
            </DoctorRoute>
          }
        />

        {/* ── Patient-only (role-guarded) ────────────────────────────── */}
        <Route
          path="/patient"
          element={
            <PatientRoute>
              <PatientDashboardPage />
            </PatientRoute>
          }
        />
        <Route
          path="/patient/dashboard"
          element={
            <PatientRoute>
              <PatientDashboardPage />
            </PatientRoute>
          }
        />
        <Route
          path="/patient/:tab"
          element={
            <PatientRoute>
              <PatientDashboardPage />
            </PatientRoute>
          }
        />

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
