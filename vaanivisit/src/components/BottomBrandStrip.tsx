export default function BottomBrandStrip() {
  return (
    <footer
      style={{
        background:
          "linear-gradient(90deg, #071530 0%, #0d224d 40%, #091b3e 70%, #051229 100%)",
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        borderTop: "1px solid rgba(34, 211, 238, 0.15)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* Curved flowing glowing wave lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.35,
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1400 80"
          preserveAspectRatio="none"
        >
          <path
            d="M-50,60 C200,80 400,20 700,45 C1000,70 1200,10 1450,40"
            fill="none"
            stroke="url(#stripCyanGrad)"
            strokeWidth="2.5"
          />
          <path
            d="M-50,75 C250,30 500,75 800,30 C1100,-10 1300,50 1450,30"
            fill="none"
            stroke="url(#stripPurpleGrad)"
            strokeWidth="1.5"
            opacity="0.6"
          />
          <defs>
            <linearGradient
              id="stripCyanGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient
              id="stripPurpleGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Left: Brand Identity */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Logo mark */}
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #06b6d4, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.5px",
              }}
            >
              Vaani
            </span>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#22d3ee",
                letterSpacing: "-0.5px",
              }}
            >
              visit
            </span>
          </div>
        </div>

        <div
          style={{
            height: "22px",
            width: "1px",
            background: "rgba(255, 255, 255, 0.15)",
          }}
        />

        <span
          style={{
            fontSize: "12px",
            color: "#94a9c9",
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          Evidence-backed multilingual patient intake AI
        </span>
      </div>

      {/* Middle: Workflow Steps */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          zIndex: 2,
        }}
      >
        {[
          {
            num: "1",
            title: "Patient Intake",
            sub: "(Hindi / Hinglish / English)",
          },
          { num: "2", title: "AI Draft", sub: "(Structured Fields)" },
          { num: "3", title: "Review", sub: "(Human Approval)" },
          { num: "4", title: "Export", sub: "(JSON / Print)" },
        ].map((step, idx) => (
          <div
            key={step.num}
            style={{ display: "flex", alignItems: "center", gap: "14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: 700,
                  boxShadow: "0 0 8px rgba(6, 182, 212, 0.3)",
                }}
              >
                {step.num}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#e2eafc",
                    lineHeight: 1.2,
                  }}
                >
                  {step.title}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#7e95b8",
                    lineHeight: 1.2,
                  }}
                >
                  {step.sub}
                </span>
              </div>
            </div>
            {idx < 3 && (
              <span
                style={{
                  color: "#47618a",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Right: Tagline */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#22d3ee",
            letterSpacing: "0.02em",
          }}
        >
          हर आवाज़ मायने रखती है
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#34d399">
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A9.49 9.49 0 0 0 12 21c7 0 11-8 11-8s-2 1-6 1c1.5-2.5 3-4 3-4s-3.5 1-6 2c1-2 2-4 2-4s-2 1-4 2c.5-1.5 1-3 1-3s-2.5 1.5-4 3.5C8 13.5 7 15 7 15c2-4 6-7 10-7z" />
        </svg>
      </div>
    </footer>
  );
}

