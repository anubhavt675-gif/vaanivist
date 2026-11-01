import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSupabaseBrowserClient } from "../lib/supabase";

export default function DoctorRegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [specialization, setSpecialization] = useState("General Physician");
  const [qualification, setQualification] = useState("MBBS, MD");
  const [hospital, setHospital] = useState("Clario Digital Healthcare");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Authentication service unavailable.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.startsWith("Dr.") ? fullName : `Dr. ${fullName}`,
          role: "reviewer",
          registration_number: regNumber,
          specialization,
          qualification,
          hospital,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      if (data.user) {
        // Upsert profile in Supabase profiles table
        await supabase.from("profiles").upsert({
          id: data.user.id,
          display_name: fullName.startsWith("Dr.") ? fullName : `Dr. ${fullName}`,
          role: "reviewer",
          preferred_language: "hindi",
          is_active: true,
        });
      }
      navigate("/doctor");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #071D35 0%, #102B46 50%, #031835 100%)",
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
          borderRadius: "20px",
          padding: "40px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(220, 231, 241, 0.6)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #2563eb, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            }}
          >
            <span style={{ fontSize: "22px" }}>🩺</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#071D35", margin: "4px 0" }}>
            Doctor Registration
          </h1>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Join the verified medical specialist network on Clario
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
              Full Name (with Title)
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Priya Sharma"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1.5px solid #dce7f1",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
                Medical Reg. Number
              </label>
              <input
                type="text"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. DMC/R/2026/8941"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #dce7f1",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
                Specialization
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #dce7f1",
                  fontSize: "13px",
                  boxSizing: "border-box",
                  background: "white",
                }}
              >
                <option value="General Physician">General Physician</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dermatology">Dermatology</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
                Qualifications
              </label>
              <input
                type="text"
                required
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="MBBS, MD"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #dce7f1",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
                Hospital / Clinic
              </label>
              <input
                type="text"
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                placeholder="Hospital name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #dce7f1",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
              Official Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@hospital.org"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1.5px solid #dce7f1",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#102B46", marginBottom: "4px" }}>
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
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1.5px solid #dce7f1",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #0d9488)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            }}
          >
            {loading ? "Registering Doctor Profile..." : "Register & Start Consultations →"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Already registered?{" "}
            <Link to="/doctor/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
              Doctor Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

