"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          preferred_language: language,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setSuccessMsg("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #031835 0%, #0a254c 50%, #021227 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "24px"
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "36px 40px",
        width: "100%",
        maxWidth: "460px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "10px"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            </div>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#0f1535" }}>
              <span style={{ color: "#06b6d4" }}>Vaani</span>Visit
            </span>
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f1535", margin: "0 0 4px" }}>
            Create Patient Account
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Submit symptom intake in Hindi, Hinglish, or English
          </p>
        </div>

        {errorMsg && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            marginBottom: "16px"
          }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#15803d",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            marginBottom: "16px"
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rohan Kumar"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Preferred Language
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { id: "hinglish", label: "Hinglish" },
                { id: "hindi", label: "हिंदी" },
                { id: "english", label: "English" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id as any)}
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: language === lang.id ? "#06b6d4" : "#e2e8f0",
                    background: language === lang.id ? "#eff6ff" : "white",
                    color: language === lang.id ? "#0284c7" : "#475569",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #06b6d4, #2563eb)",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "#0284c7", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
          <div style={{ marginTop: "12px" }}>
            <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "11px" }}>
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

