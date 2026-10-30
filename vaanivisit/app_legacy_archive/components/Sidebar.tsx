"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
);
const DraftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
  </svg>
);
const ReviewIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);
const ExportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
  </svg>
);
const UGCIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
  </svg>
);
const ProfessionalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
  </svg>
);

const ShowcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: <HomeIcon /> },
  { label: "AI Draft", href: "/ai-draft", icon: <DraftIcon /> },
  { label: "Review", href: "/review", icon: <ReviewIcon /> },
  { label: "Export", href: "/export", icon: <ExportIcon /> },
  { label: "UGC", href: "/ugc", icon: <UGCIcon /> },
  { label: "Professional", href: "/professinal", icon: <ProfessionalIcon /> },
  { label: "Showcase", href: "/showcase", icon: <ShowcaseIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [currentLang, setCurrentLang] = useState<"hi" | "en">("hi");

  return (
    <aside className="sidebar">
      {/* Ambient background glow / waves */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "240px",
        background: "radial-gradient(circle at 10% 100%, rgba(6, 182, 212, 0.16) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 0
      }}/>

      {/* Brand Header */}
      <div style={{ padding: "20px 18px 16px", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          {/* Logo mark */}
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #06b6d4, #2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 10px rgba(6, 182, 212, 0.35)",
            flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" fill="#0891b2"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "17px", letterSpacing: "-0.4px" }}>Vaani</span>
              <span style={{ color: "#22d3ee", fontWeight: 800, fontSize: "17px", letterSpacing: "-0.4px" }}>Visit</span>
            </div>
          </div>
        </div>
        <p style={{
          fontSize: "10px",
          color: "#7288aa",
          margin: "0 0 0 42px",
          fontWeight: 500,
          letterSpacing: "0.02em"
        }}>
          Health. Language. People.
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "8px 0", zIndex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/professinal" && (pathname === "/review" || pathname.startsWith("/professional") || pathname.startsWith("/professinal"))) ||
            (item.href === "/review" && pathname === "/review") ||
            (item.href !== "/" && item.href !== "/review" && item.href !== "/professinal" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? "active" : ""}`}
            >
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{ fontSize: "13px" }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: "16px",
        zIndex: 1,
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        background: "rgba(10, 20, 48, 0.4)"
      }}>
        {/* Language selector toggle */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          padding: "4px 8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#738aa8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span style={{ fontSize: "12px", color: "#8ca2c4", fontWeight: 500 }}>Language</span>
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "2px",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <button
              onClick={() => setCurrentLang("hi")}
              style={{
                background: currentLang === "hi" ? "linear-gradient(135deg, #06b6d4, #2563eb)" : "transparent",
                color: currentLang === "hi" ? "#ffffff" : "#7288aa",
                border: "none",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setCurrentLang("en")}
              style={{
                background: currentLang === "en" ? "linear-gradient(135deg, #06b6d4, #2563eb)" : "transparent",
                color: currentLang === "en" ? "#ffffff" : "#7288aa",
                border: "none",
                borderRadius: "12px",
                padding: "2px 8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              EN
            </button>
          </div>
        </div>

        {/* User Card */}
        <Link href="/auth/login" style={{ textDecoration: "none" }} title="Switch Account / Sign In">
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            cursor: "pointer"
          }}>
            {/* Avatar circle matching reference pink/purple */}
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(236, 72, 153, 0.3)"
            }}>
              R
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#e2eafc",
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                Rohan Kumar
              </p>
              <p style={{
                fontSize: "10px",
                color: "#7e95b8",
                margin: 0
              }}>
                Patient (Click to switch)
              </p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
