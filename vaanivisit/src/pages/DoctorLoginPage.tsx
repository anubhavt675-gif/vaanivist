import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function DoctorLoginPage() {
  const navigate = useNavigate();

  // Credentials & UI States
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google OAuth specific guide / demo modal
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const [googleStatusText, setGoogleStatusText] = useState("");

  // Password Recovery States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // New Password Reset State (when opened from recovery email)
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    if (oauthError) {
      setErrorMsg(`Google Authentication notice: ${oauthError}`);
    }

    if (searchParams.get("reset") === "true" || hash.includes("type=recovery")) {
      setIsResetMode(true);
    }

    // Check existing doctor session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !isResetMode) {
        handleDoctorRedirection(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsResetMode(true);
        } else if (event === "SIGNED_IN" && session?.user && !isResetMode) {
          handleDoctorRedirection(session.user);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate, isResetMode]);

  const handleDoctorRedirection = async (user: any) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "patient") {
        setErrorMsg(
          "Notice: This account is registered as a Patient. Redirecting to Patient Login..."
        );
        setTimeout(() => navigate("/auth/login"), 1500);
      } else {
        // Upgrade or verify doctor role in profile
        if (!profile) {
          await supabase.from("profiles").upsert({
            id: user.id,
            display_name:
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "Dr. Specialist",
            role: "reviewer",
            preferred_language: "english",
            is_active: true,
          });
        }
        navigate("/doctor");
      }
    } catch (e) {
      navigate("/doctor");
    }
  };

  // 1. Doctor Email / Phone Login via Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Authentication service unavailable. Please check credentials.");
      setLoading(false);
      return;
    }

    const trimmedInput = identifier.trim();
    const isPhoneNumber = /^[0-9+\s-]{8,15}$/.test(trimmedInput);
    let emailToUse = trimmedInput;

    if (isPhoneNumber) {
      const cleanDigits = trimmedInput.replace(/[^0-9]/g, "");
      emailToUse = `phone_${cleanDigits}@vaanivisit.demo`;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        setErrorMsg(
          error.message === "Invalid login credentials"
            ? "Invalid email or password. Please verify your details or use demo doctor access."
            : error.message
        );
        setLoading(false);
        return;
      }

      if (data?.user) {
        setSuccessMsg("✓ Logged in successfully. Redirecting to Doctor Dashboard...");
        await handleDoctorRedirection(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during doctor login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Doctor Google OAuth Login via Supabase
  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Authentication service unavailable.");
      setLoading(false);
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        if (
          error.message.includes("provider is not enabled") ||
          error.message.includes("provider_disabled") ||
          error.message.includes("validation_failed")
        ) {
          setShowGoogleGuide(true);
          setGoogleStatusText(
            "Google provider needs to be toggled ON in your Supabase Dashboard."
          );
        } else {
          setErrorMsg(`Google sign-in error: ${error.message}`);
        }
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate Google authentication.");
      setLoading(false);
    }
  };

  // Quick One-Click Demo Doctor Sign-In
  const handleDemoDoctorLogin = async () => {
    setIdentifier("dr.priya@vaanivisit.demo");
    setPassword("Password123!");
    setShowGoogleGuide(false);
    setLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "dr.priya@vaanivisit.demo",
        password: "Password123!",
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data?.user) {
        setSuccessMsg("✓ Logged in as Dr. Priya Sharma. Redirecting...");
        await handleDoctorRedirection(data.user);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Recovery Request
  const handleSendPasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim() || recoveryLoading) return;

    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setRecoveryError("Authentication service unavailable.");
      setRecoveryLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        recoveryEmail.trim(),
        {
          redirectTo: `${window.location.origin}/doctor/login?reset=true`,
        }
      );

      if (error) {
        setRecoveryError(error.message);
      } else {
        setRecoverySuccess(
          "✓ Password reset link sent to your email. Please check your inbox and spam folder."
        );
      }
    } catch (err: any) {
      setRecoveryError(err.message || "Failed to send reset email.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // 4. Update Password after Recovery Callback
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || resetLoading) return;

    setResetLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Authentication service unavailable.");
      setResetLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("✓ Password updated successfully! Redirecting to doctor login...");
        setTimeout(() => {
          setIsResetMode(false);
          setSuccessMsg(null);
          navigate("/doctor/login");
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        maxHeight: "100vh",
        background: "#f1f8fe",
        display: "flex",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top-Right Tagline matching Reference Image */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          right: "42px",
          fontSize: "12px",
          color: "#64748B",
          fontWeight: 500,
          letterSpacing: "0.02em",
          zIndex: 20,
        }}
      >
        Better Health • Smarter Care • Together
      </div>

      {/* ========================================================= */}
      {/* LEFT SECTION (~53.5% width) — High Quality Artwork        */}
      {/* ========================================================= */}
      <div
        style={{
          flex: "1 1 53.5%",
          width: "53.5%",
          height: "100%",
          position: "relative",
          background: "#f1f8fe",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          overflow: "hidden",
        }}
      >
        <img
          src="/doctor-login-left-2x.png"
          alt="Vaani Vision - Make a bigger impact with AI-powered care"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "left top",
            display: "block",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* RIGHT SECTION (~46.5% width) — Centered Doctor Login Card */}
      {/* ========================================================= */}
      <div
        style={{
          flex: "1 1 46.5%",
          width: "46.5%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 32px",
          boxSizing: "border-box",
          position: "relative",
          background: "#f1f8fe",
          overflowY: "auto",
        }}
      >
        {/* The White Doctor Login Card matching Reference Design */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "30px 36px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 15px 50px rgba(16, 43, 70, 0.08), 0 2px 6px rgba(16, 43, 70, 0.04)",
            border: "1px solid rgba(226, 234, 244, 0.85)",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* 1. Back to Home Link */}
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "none",
              marginBottom: "4px",
              width: "fit-content",
            }}
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>

          {/* 2. Centered Logo Emblem & Brand Heading */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "0 0 10px",
            }}
          >
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <ellipse
                cx="14"
                cy="23"
                rx="8"
                ry="10"
                transform="rotate(-25 14 23)"
                fill="#00B8C8"
              />
              <circle cx="25" cy="16" r="7" fill="#1687F5" />
            </svg>
            <h3
              style={{
                fontSize: "19px",
                fontWeight: 800,
                color: "#071D35",
                margin: "4px 0 1px",
                letterSpacing: "-0.3px",
              }}
            >
              Vaani Vision
            </h3>
            <span
              style={{
                fontSize: "11px",
                color: "#64748B",
                fontWeight: 500,
              }}
            >
              AI Voice Health Platform
            </span>
          </div>

          {/* 3. Doctor Login Heading & Subtitle */}
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <h2
              style={{
                fontSize: "25px",
                fontWeight: 800,
                color: "#071D35",
                margin: "0 0 4px",
                letterSpacing: "-0.4px",
              }}
            >
              {isResetMode ? "Reset Doctor Password" : "Doctor Login"}
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#64748B",
                margin: 0,
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {isResetMode
                ? "Enter your new doctor account password"
                : "Access your doctor dashboard and manage your patients"}
            </p>
          </div>

          {/* Error & Success Feedback Banners */}
          {errorMsg && (
            <div
              style={{
                padding: "9px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#b91c1c",
                fontSize: "11.5px",
                marginBottom: "12px",
                lineHeight: 1.4,
              }}
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: "9px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                color: "#15803d",
                fontSize: "11.5px",
                marginBottom: "12px",
                lineHeight: 1.4,
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Doctor Login Form OR Reset Password Form */}
          {isResetMode ? (
            <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#102B46", marginBottom: "5px" }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new secure doctor password"
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #dce7f1",
                    fontSize: "13px",
                    color: "#142B45",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                style={{
                  height: "46px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(90deg, #00B4D8 0%, #1A73E8 50%, #7C3AED 100%)",
                  color: "#ffffff",
                  fontSize: "14.5px",
                  fontWeight: 700,
                  cursor: resetLoading ? "not-allowed" : "pointer",
                }}
              >
                {resetLoading ? "Updating..." : "Save New Password"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Email or Phone Number Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#102B46",
                    marginBottom: "6px",
                  }}
                >
                  Email or Phone Number
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #dce7f1",
                    background: "#ffffff",
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or mobile number"
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: "13.5px",
                      color: "#142B45",
                      width: "100%",
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    color: "#102B46",
                    marginBottom: "6px",
                  }}
                >
                  Password
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    height: "46px",
                    padding: "0 14px",
                    borderRadius: "12px",
                    border: "1.5px solid #dce7f1",
                    background: "#ffffff",
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      border: "none",
                      background: "transparent",
                      outline: "none",
                      fontSize: "13.5px",
                      color: "#142B45",
                      width: "100%",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: "right", marginTop: "-2px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setRecoveryEmail(identifier.includes("@") ? identifier : "");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Log In Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: "48px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(90deg, #00B4D8 0%, #1A73E8 50%, #7C3AED 100%)",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 20px rgba(26, 115, 232, 0.32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{loading ? "Verifying..." : "Log In"}</span>
                {!loading && <span style={{ fontSize: "16px" }}>→</span>}
              </button>
            </form>
          )}

          {/* OR Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "14px 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
            <span
              style={{
                padding: "0 12px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          </div>

          {/* Continue with Google Button (Full Width matching Doctor Reference Image) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            title="Sign in with your Google account via Supabase"
            style={{
              width: "100%",
              height: "44px",
              borderRadius: "12px",
              border: "1.5px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#1e293b",
              fontSize: "12.5px",
              fontWeight: 600,
              marginBottom: "14px",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Don't have an account? Sign Up */}
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "12.5px", color: "#64748B" }}>
              Don't have an account?{" "}
            </span>
            <Link
              to="/doctor/register"
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#2563eb",
                textDecoration: "none",
              }}
            >
              Sign Up
            </Link>
          </div>

          {/* Bottom Patient Banner matching Doctor Reference */}
          <Link
            to="/auth/login"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "14px",
              padding: "12px 16px",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#e0f2fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0284c7",
                  flexShrink: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                  <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                  <circle cx="20" cy="10" r="2" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "12.5px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                  Are you a patient?
                </h4>
                <p style={{ margin: 0, fontSize: "11px", color: "#64748B", lineHeight: 1.2 }}>
                  Login to your patient portal
                </p>
              </div>
            </div>

            <span style={{ fontSize: "15px", color: "#0284c7", fontWeight: 700 }}>
              →
            </span>
          </Link>
        </div>
      </div>

      {/* Google Provider Activation Guide / Demo Doctor Modal */}
      {showGoogleGuide && (
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
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGoogleGuide(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                  Doctor Google OAuth Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleGuide(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "10px",
                padding: "12px",
                fontSize: "12px",
                color: "#0369a1",
                marginBottom: "14px",
                lineHeight: 1.45,
              }}
            >
              <strong>{googleStatusText}</strong>
              <p style={{ margin: "6px 0 0" }}>
                To enable live Google login with verified physician accounts:
              </p>
              <ol style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "11.5px" }}>
                <li>Open your <strong>Supabase Dashboard</strong> → <strong>Authentication</strong> → <strong>Providers</strong>.</li>
                <li>Click <strong>Google</strong> and toggle it <strong>Enabled</strong>.</li>
                <li>Paste your Google OAuth Client ID & Secret from Google Cloud Console.</li>
                <li>Ensure redirect URI is: <code>https://wlwlbzrfazwtvsboljzp.supabase.co/auth/v1/callback</code></li>
              </ol>
            </div>

            <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 14px", textAlign: "center" }}>
              Want to access the Doctor Dashboard immediately using Supabase?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                onClick={handleDemoDoctorLogin}
                style={{
                  height: "42px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(90deg, #00B4D8 0%, #1A73E8 100%)",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span>Continue as Dr. Priya Sharma (Verified MD)</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleGuide(false)}
                style={{
                  height: "36px",
                  borderRadius: "10px",
                  border: "1.5px solid #dce7f1",
                  background: "#ffffff",
                  color: "#64748B",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
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
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotPassword(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#071D35", margin: 0 }}>
                Reset Doctor Password
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#64748B", marginTop: 0, marginBottom: "14px", lineHeight: 1.5 }}>
              Enter your registered clinical email address and we'll send you a secure link to reset your doctor password.
            </p>

            {recoveryError && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#b91c1c",
                  fontSize: "11px",
                  marginBottom: "12px",
                }}
              >
                {recoveryError}
              </div>
            )}

            {recoverySuccess ? (
              <div
                style={{
                  padding: "12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "10px",
                  color: "#15803d",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                {recoverySuccess}
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  style={{
                    display: "block",
                    margin: "12px auto 0",
                    padding: "6px 14px",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordRecovery} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 600, color: "#102B46", marginBottom: "5px" }}>
                    Registered Doctor Email
                  </label>
                  <input
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="dr.priya@vaanivisit.demo"
                    style={{
                      width: "100%",
                      height: "40px",
                      padding: "0 12px",
                      borderRadius: "10px",
                      border: "1.5px solid #dce7f1",
                      fontSize: "12px",
                      color: "#142B45",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    style={{
                      flex: 1,
                      height: "40px",
                      borderRadius: "10px",
                      border: "1.5px solid #dce7f1",
                      background: "#ffffff",
                      color: "#64748B",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    style={{
                      flex: 1,
                      height: "40px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(90deg, #00B4D8 0%, #1A73E8 100%)",
                      color: "#ffffff",
                      fontSize: "12.5px",
                      fontWeight: 700,
                      cursor: recoveryLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {recoveryLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
