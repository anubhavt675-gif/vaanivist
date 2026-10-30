"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: "Password123!",
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
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
        maxWidth: "440px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px"
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
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f1535", margin: "0 0 6px" }}>
            Sign In to Your Account
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Multilingual patient intake & clinical review portal
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
            marginBottom: "18px"
          }}>
            {errorMsg}
          </div>
        )}

        {/* Demo Fast Login Buttons */}
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Demo 1-Click Sign In
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleQuickLogin("rohan.kumar@vaanivisit.demo")}
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
                fontSize: "11px",
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ fontWeight: 700, color: "#0284c7" }}>Rohan Kumar</div>
              <div style={{ color: "#64748b", fontSize: "10px" }}>Patient Role</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("dr.priya@vaanivisit.demo")}
              style={{
                padding: "8px 12px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#f8fafc",
                fontSize: "11px",
                fontWeight: 600,
                color: "#1e293b",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ fontWeight: 700, color: "#8b5cf6" }}>Dr. Priya Sharma</div>
              <div style={{ color: "#64748b", fontSize: "10px" }}>Reviewer Role</div>
            </button>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "18px 0",
          color: "#94a3b8",
          fontSize: "11px"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
          <span>or sign in with email</span>
          <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
          Don't have an account?{" "}
          <Link href="/auth/signup" style={{ color: "#0284c7", fontWeight: 600, textDecoration: "none" }}>
            Sign up
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

