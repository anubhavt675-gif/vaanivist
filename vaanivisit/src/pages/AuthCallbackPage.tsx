import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing authentication with Google...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setError("Supabase authentication service unavailable.");
        return;
      }

      try {
        // 1. Check for authorization code (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const errorParam = params.get("error_description") || params.get("error");

        if (errorParam) {
          setError(errorParam);
          return;
        }

        if (code) {
          setStatus("Exchanging authorization code with Supabase...");
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            setError(exchangeError.message);
            return;
          }
        }

        // 2. Retrieve active session (handles both PKCE and hash token callbacks)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          // If no immediate session, give onAuthStateChange a moment to process the hash
          const { data: authSub } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.user) {
              authSub.subscription.unsubscribe();
              await processUserProfileAndRedirect(currentSession.user, supabase);
            }
          });
          return;
        }

        await processUserProfileAndRedirect(session.user, supabase);
      } catch (err: any) {
        console.error("Callback exception:", err);
        setError(err.message || "Authentication callback encountered an error.");
      }
    };

    const processUserProfileAndRedirect = async (user: any, supabase: any) => {
      setStatus("Verifying your patient profile...");
      try {
        // Check if user has an existing profile in profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role === "reviewer" || profile?.role === "doctor") {
          setStatus("Welcome Doctor! Redirecting to Doctor Portal...");
          setTimeout(() => navigate("/doctor"), 800);
          return;
        }

        // If new Google user without a profile row, create one
        if (!profile) {
          const displayName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Patient";

          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;

          await supabase.from("profiles").upsert({
            id: user.id,
            display_name: displayName,
            role: "patient",
            avatar_url: avatarUrl,
            preferred_language: "hindi",
            is_active: true,
          });
        }

        setStatus("Logged in successfully! Loading Home Page...");
        setTimeout(() => navigate("/"), 800);
      } catch (err) {
        // Default safe fallback to home page
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f8fe",
        fontFamily: "'Inter', sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "36px 40px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(16, 43, 70, 0.08)",
          border: "1px solid rgba(226, 234, 244, 0.9)",
        }}
      >
        {/* Emblem */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <ellipse cx="14" cy="23" rx="8" ry="10" transform="rotate(-25 14 23)" fill="#00B8C8" />
            <circle cx="25" cy="16" r="7" fill="#1687F5" />
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#071D35", margin: "0 0 8px" }}>
          Vision Authentication
        </h2>

        {error ? (
          <div>
            <div
              style={{
                padding: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#b91c1c",
                fontSize: "12.5px",
                margin: "16px 0",
                lineHeight: 1.4,
              }}
            >
              <strong>Authentication Failed:</strong>
              <div style={{ marginTop: "4px" }}>{error}</div>
            </div>
            <button
              onClick={() => navigate("/auth/login")}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ← Back to Login
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", marginTop: "12px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid #e2e8f0",
                borderTopColor: "#00B8C8",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: "13px", color: "#64748B", margin: 0, fontWeight: 500 }}>
              {status}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

