import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<"hindi" | "hinglish" | "english">("hinglish");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Authentication service unavailable. Please check credentials.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_language: language,
            role: "patient",
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        if (data?.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            display_name: fullName,
            role: "patient",
            preferred_language: language,
            is_active: true,
          });
        }
        setSuccessMsg("✓ Account created successfully! Redirecting to Patient Portal...");
        setTimeout(() => {
          navigate("/patient");
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create account.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f7fe 0%, #e8f4fc 40%, #edf9f7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          padding: "36px 42px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 50px rgba(16, 43, 70, 0.08)",
          border: "1px solid #e2eaf4",
        }}
      >
        {/* Back Link */}
        <Link
          to="/auth/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "#2563eb",
            textDecoration: "none",
            marginBottom: "12px",
          }}
        >
          <span>←</span>
          <span>Back to Login</span>
        </Link>

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <ellipse cx="14" cy="23" rx="8" ry="10" transform="rotate(-25 14 23)" fill="#00B8C8" />
              <circle cx="25" cy="16" r="7" fill="#1687F5" />
            </svg>
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#071D35", margin: "0 0 6px" }}>
            Create Patient Account
          </h2>
          <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
            Start AI consultations and connect with verified doctors
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#102B46", marginBottom: "6px" }}>
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rohan Kumar"
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

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#102B46", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
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

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#102B46", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
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

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, color: "#102B46", marginBottom: "6px" }}>
              Preferred Consultation Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
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
                background: "white",
              }}
            >
              <option value="hinglish">Hinglish (Hindi + English)</option>
              <option value="hindi">हिन्दी (Hindi)</option>
              <option value="english">English</option>
            </select>
          </div>

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
              boxShadow: "0 6px 20px rgba(26, 115, 232, 0.35)",
              marginTop: "8px",
            }}
          >
            {loading ? "Creating Account..." : "Create Patient Account →"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "12.5px", color: "#64748B", margin: 0 }}>
            Already have an account?{" "}
            <Link to="/auth/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
