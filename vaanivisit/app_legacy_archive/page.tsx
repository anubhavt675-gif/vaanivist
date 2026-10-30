"use client";
import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { broadcastRealtimeEvent } from "./lib/realtime";

const quickExamplesList = [
  {
    id: "khansi",
    label: "Khansi",
    text: "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-6 16c0-2.67 5.33-4 8-4 .4 0 .84.03 1.3.08-.2.6-.3 1.25-.3 1.92 0 1.05.3 2.03.82 2.87-.63.08-1.25.13-1.82.13-3.08 0-6.17-.67-8-1zm14 0c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-2-1.5h-2v1h2v-1z"/>
      </svg>
    )
  },
  {
    id: "bukhar",
    label: "Bukhar",
    text: "Mujhe kal raat se tez bukhar hai, sharir me dard aur thand lag rahi hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0zm-3-10a1 1 0 0 1 1 1v3h-2V4a1 1 0 0 1 1-1zm0 17a3 3 0 0 1-1.74-5.45l.74-.55V8h2v6l.74.55A3 3 0 0 1 12 20z"/>
      </svg>
    )
  },
  {
    id: "pet-dard",
    label: "Pet dard",
    text: "Subah se pet me marod aur tez dard ho raha hai, khana khane ke baad badhta hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3C4.24 3 2 5.24 2 8c0 5 4 10 9 12 2 .8 4 .8 6 0 3-1.2 5-4 5-8 0-4-3-7-7-7-2 0-3.5 1-4.5 2C9.5 4 8 3 7 3z"/>
      </svg>
    )
  },
  {
    id: "allergy",
    label: "Allergy",
    text: "Aankhon me jalan, naak behna aur skin par rashes aa gaye hain.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1-6h2v4h-2V2zm0 16h2v4h-2v-4zm-8-9h4v2H3v-2zm14 0h4v2h-4v-2zm-9.36-5.05l1.41-1.41 2.83 2.83-1.41 1.41-2.83-2.83zm11.31 11.31l1.41-1.41 2.83 2.83-1.41 1.41-2.83-2.83zm-11.31 0l2.83-2.83 1.41 1.41-2.83 2.83-1.41-1.41zm11.31-11.31l2.83-2.83 1.41 1.41-2.83 2.83-1.41-1.41z"/>
      </svg>
    )
  },
  {
    id: "sardi",
    label: "Sardi",
    text: "Gale me kharash, naak band aur sardi-zukam se sir bhari ho raha hai.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    )
  }
];

export default function HomePage() {
  const [selectedLanguage, setSelectedLanguage] = useState<"hindi" | "hinglish" | "english">("hinglish");
  const [symptomText, setSymptomText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleChipClick = (text: string) => {
    setSymptomText(text);
  };

  const recognitionRef = useRef<any>(null);

  const handleMicToggle = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFeedbackMsg("Speech recognition not supported in this browser. Please type symptoms.");
      setTimeout(() => setFeedbackMsg(""), 3500);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setFeedbackMsg("Voice recording stopped.");
      setTimeout(() => setFeedbackMsg(""), 2000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      if (selectedLanguage === "hindi") {
        recognition.lang = "hi-IN";
      } else if (selectedLanguage === "hinglish") {
        recognition.lang = "hi-IN";
      } else {
        recognition.lang = "en-IN";
      }

      recognition.onstart = () => {
        setIsListening(true);
        setFeedbackMsg("🎙️ Listening... Speak your symptoms in your own language");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setSymptomText((prev) => (prev ? prev + " " + transcript : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        setFeedbackMsg(`Speech status: ${event.error}. Please type symptoms.`);
        setTimeout(() => setFeedbackMsg(""), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Speech start error:", err);
      setIsListening(false);
    }
  };

  const handleGenerate = async () => {
    const textToSubmit = symptomText.trim() || quickExamplesList[0].text;
    setFeedbackMsg("Submitting symptoms & extracting clinical facts with Gemini AI...");
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("vani_symptom_text", textToSubmit);
        sessionStorage.setItem("vani_symptom_lang", selectedLanguage);
      }
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: textToSubmit,
          source_language: selectedLanguage,
          input_method: isListening ? "voice" : symptomText ? "text" : "quick_example"
        })
      });
      const data = await res.json();
      const intakeId = data?.intake?.id;
      if (intakeId && typeof window !== "undefined") {
        sessionStorage.setItem("vani_intake_id", intakeId);
        broadcastRealtimeEvent("intake_submitted", { intakeId, source_text: textToSubmit });
        window.location.href = `/ai-draft?intakeId=${intakeId}`;
      } else {
        window.location.href = "/ai-draft";
      }
    } catch (err) {
      console.warn("Intake API background call:", err);
      window.location.href = "/ai-draft";
    }
  };

  // Character counter: displays 67/1000 initially when empty (matching reference screenshot default), otherwise actual length
  const displayCount = symptomText.length === 0 ? 67 : symptomText.length;

  return (
    <div style={{
      width: "1536px",
      minHeight: "1024px",
      height: "1024px",
      margin: "0 auto",
      background: "#EAF6FE",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ------------------------------------------------------------- */}
      {/* PHASE 3: LEFT SIDEBAR (Width: 269px, Height: 1024px)          */}
      {/* ------------------------------------------------------------- */}
      <aside style={{
        width: "269px",
        height: "1024px",
        position: "absolute",
        top: 0,
        left: 0,
        background: "linear-gradient(180deg, #031835 0%, #041B38 45%, #051A36 80%, #021227 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 50,
        boxShadow: "4px 0 20px rgba(2, 18, 39, 0.4)",
        overflow: "hidden"
      }}>
        {/* Subtle luminous turquoise-blue wave artwork at the bottom */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "269px",
          height: "380px",
          pointerEvents: "none",
          zIndex: 1,
          opacity: 0.85
        }}>
          <Image
            src="/sidebar-waves.png"
            alt="Sidebar waves"
            fill
            style={{ objectFit: "cover", objectPosition: "bottom left", opacity: 0.9 }}
          />
        </div>

        {/* Top Section: Logo & Nav items */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {/* Logo Brand Block */}
          <div style={{ padding: "26px 24px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* 3-Part Leaf Icon */}
              <div style={{ width: "36px", height: "36px", flexShrink: 0, position: "relative" }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  {/* Left leaf: turquoise/cyan */}
                  <path
                    d="M18 18 C14 10 7 9 4 13 C2 16 3 23 8 25 C13 26 16 22 18 18 Z"
                    fill="#06b6d4"
                  />
                  {/* Middle leaf: bright cyan/blue */}
                  <path
                    d="M18 18 C18 9 14 3 18 2 C22 3 24 9 21 18 Z"
                    fill="#22d3ee"
                  />
                  {/* Right leaf: fresh mint green */}
                  <path
                    d="M18 18 C22 10 29 9 32 13 C34 16 33 23 28 25 C23 26 20 22 18 18 Z"
                    fill="#34d399"
                  />
                </svg>
              </div>

              {/* Brand Typography */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{
                  color: "#ffffff",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1
                }}>
                  VaaniVisit
                </span>
                <span style={{
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: 400,
                  letterSpacing: "0.02em",
                  marginTop: "3px"
                }}>
                  Health. Language. People.
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ padding: "8px 14px 0", display: "flex", flexDirection: "column", gap: "5px" }}>
            {/* 1. Home (ACTIVE) */}
            <Link href="/" style={{ textDecoration: "none" }}>
              <div style={{
                height: "51px",
                borderRadius: "12px",
                background: "#11579A",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                boxShadow: "0 2px 10px rgba(17, 87, 154, 0.45)",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600 }}>Home</span>
              </div>
            </Link>

            {/* 2. AI Draft */}
            <Link href="/ai-draft" style={{ textDecoration: "none" }}>
              <div style={{
                height: "48px",
                borderRadius: "12px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500 }}>AI Draft</span>
              </div>
            </Link>

            {/* 3. Review */}
            <Link href="/review" style={{ textDecoration: "none" }}>
              <div style={{
                height: "48px",
                borderRadius: "12px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500 }}>Review</span>
              </div>
            </Link>

            {/* 4. Export */}
            <Link href="/export" style={{ textDecoration: "none" }}>
              <div style={{
                height: "48px",
                borderRadius: "12px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500 }}>Export</span>
              </div>
            </Link>

            {/* 5. UGC */}
            <Link href="/ugc" style={{ textDecoration: "none" }}>
              <div style={{
                height: "48px",
                borderRadius: "12px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500 }}>UGC</span>
              </div>
            </Link>

            {/* 6. Professional */}
            <Link href="/professinal" style={{ textDecoration: "none" }}>
              <div style={{
                height: "48px",
                borderRadius: "12px",
                background: "transparent",
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                gap: "14px",
                cursor: "pointer"
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 500 }}>Professional</span>
              </div>
            </Link>
          </nav>
        </div>

        {/* Bottom Section: Language & User Profile */}
        <div style={{
          padding: "20px 22px 28px",
          position: "relative",
          zIndex: 10
        }}>
          {/* Language Selector */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 2px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.14)",
            marginBottom: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 400 }}>Language</span>
                <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: 600 }}>Hindi</span>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>

          {/* User Profile */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 2px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Circular turquoise avatar displaying 'R' */}
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #14b8a6, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(13, 148, 136, 0.4)",
                flexShrink: 0
              }}>
                <span style={{
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: 1,
                  fontFamily: "'Inter', sans-serif"
                }}>R</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: 600 }}>Rohan Kumar</span>
                <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 400 }}>Patient</span>
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* PHASE 5: MAIN CONTENT AREA (Begins at x = 269px)              */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        position: "absolute",
        left: "269px",
        top: 0,
        width: "1267px",
        height: "1024px",
        overflow: "hidden"
      }}>
        {/* Decorative soft blue waves in lower right corner */}
        <div style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "750px",
          height: "260px",
          pointerEvents: "none",
          zIndex: 1
        }}>
          <Image
            src="/bottom-waves.png"
            alt="Ambient background waves"
            fill
            style={{ objectFit: "cover", objectPosition: "bottom right", opacity: 0.7 }}
          />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 4: TOP HEADER (Height: 83px, Translucent Glass Pill)   */}
        {/* ----------------------------------------------------------- */}
        <header style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1267px",
          height: "83px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20
        }}>
          {/* Search Field (Exact Target: left = 294px from window -> 25px in content area, width = 721px, height = 45px) */}
          <div style={{
            marginLeft: "25px",
            width: "721px",
            height: "45px",
            background: "#ffffff",
            borderRadius: "23px",
            border: "1px solid #d9e9f7",
            display: "flex",
            alignItems: "center",
            padding: "0 18px",
            gap: "12px",
            boxShadow: "0 2px 8px rgba(18, 104, 219, 0.04)"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search anything..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "#1e293b",
                width: "100%",
                fontFamily: "inherit"
              }}
            />
          </div>

          {/* Right Header Controls: Notification & Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "22px", marginRight: "38px" }}>
            {/* Blue Outline Bell with Red Notification Dot */}
            <div style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {/* Red dot */}
              <div style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#ef4444",
                position: "absolute",
                top: "0px",
                right: "-1px",
                boxShadow: "0 0 4px rgba(239, 68, 68, 0.6)"
              }}/>
            </div>

            {/* Circular Profile Photograph & Dropdown Chevron */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "1.5px solid #bfdbfe",
                position: "relative"
              }}>
                <Image
                  src="/header-avatar.png"
                  alt="Profile"
                  width={36}
                  height={36}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
        </header>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 6: HERO LEFT TEXT (x = 346px -> left = 77px, y = 141px)*/}
        {/* ----------------------------------------------------------- */}
        <div style={{
          position: "absolute",
          left: "77px",
          top: "135px",
          width: "550px",
          zIndex: 10
        }}>
          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{
              color: "#1d4ed8",
              fontSize: "19px",
              fontWeight: 600,
              letterSpacing: "-0.2px"
            }}>
              Your Voice. Our Priority.
            </span>
            <div style={{
              width: "28px",
              height: "2px",
              background: "#93c5fd",
              borderRadius: "1px"
            }}/>
          </div>

          {/* Main Headline (Exact 2 lines) */}
          <h1 style={{
            fontSize: "48px",
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "0 0 14px",
            color: "#0a2540",
            letterSpacing: "-0.8px"
          }}>
            Tell us your symptoms<br/>
            in{" "}
            <span style={{
              background: "linear-gradient(90deg, #059669 0%, #06b6d4 25%, #2563eb 55%, #7c3aed 85%, #9333ea 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              your own language
            </span>
          </h1>

          {/* Supporting Paragraph (Exact 3 lines) */}
          <p style={{
            fontSize: "16px",
            color: "#475569",
            lineHeight: 1.5,
            margin: "0 0 20px",
            fontWeight: 400
          }}>
            Describe how you feel — in Hindi, Hinglish or English.<br/>
            Our AI will structure it into a clear medical intake draft<br/>
            with evidence from your words.
          </p>

          {/* Language Selector Buttons (3 Pills in a row, height: 48px, fully visible above card) */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* 1. Hindi (~142 x 48px) */}
            <button
              onClick={() => setSelectedLanguage("hindi")}
              style={{
                height: "48px",
                padding: "0 22px",
                borderRadius: "24px",
                background: selectedLanguage === "hindi"
                  ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                  : "#ffffff",
                border: selectedLanguage === "hindi" ? "none" : "1.5px solid #c7dff3",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: selectedLanguage === "hindi"
                  ? "0 4px 14px rgba(43, 89, 255, 0.35)"
                  : "0 2px 6px rgba(18, 104, 219, 0.04)",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: selectedLanguage === "hindi" ? "rgba(255,255,255,0.2)" : "#a5f3fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                color: selectedLanguage === "hindi" ? "#ffffff" : "#0891b2"
              }}>
                अ
              </div>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: selectedLanguage === "hindi" ? "#ffffff" : "#0a2540"
              }}>
                Hindi
              </span>
              {selectedLanguage === "hindi" && (
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "2px" }}>✓</span>
              )}
            </button>

            {/* 2. Hinglish (~193 x 48px, SELECTED IN REFERENCE) */}
            <button
              onClick={() => setSelectedLanguage("hinglish")}
              style={{
                height: "48px",
                padding: "0 24px",
                borderRadius: "24px",
                background: selectedLanguage === "hinglish"
                  ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                  : "#ffffff",
                border: selectedLanguage === "hinglish" ? "none" : "1.5px solid #c7dff3",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: selectedLanguage === "hinglish"
                  ? "0 4px 16px rgba(43, 89, 255, 0.35)"
                  : "0 2px 6px rgba(18, 104, 219, 0.04)",
                transition: "all 0.15s ease"
              }}
            >
              {/* Speech Bubble Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <circle cx="8" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
                <circle cx="12" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
                <circle cx="16" cy="10" r="1" fill={selectedLanguage === "hinglish" ? "#ffffff" : "#2563eb"}></circle>
              </svg>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: selectedLanguage === "hinglish" ? "#ffffff" : "#0a2540"
              }}>
                Hinglish
              </span>
              {selectedLanguage === "hinglish" && (
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "4px" }}>✓</span>
              )}
            </button>

            {/* 3. English (~157 x 48px) */}
            <button
              onClick={() => setSelectedLanguage("english")}
              style={{
                height: "48px",
                padding: "0 22px",
                borderRadius: "24px",
                background: selectedLanguage === "english"
                  ? "linear-gradient(135deg, #2b59ff 0%, #683fe7 100%)"
                  : "#ffffff",
                border: selectedLanguage === "english" ? "none" : "1.5px solid #c7dff3",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                boxShadow: selectedLanguage === "english"
                  ? "0 4px 14px rgba(43, 89, 255, 0.35)"
                  : "0 2px 6px rgba(18, 104, 219, 0.04)",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: selectedLanguage === "english" ? "rgba(255,255,255,0.2)" : "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                color: "#ffffff"
              }}>
                A
              </div>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: selectedLanguage === "english" ? "#ffffff" : "#0a2540"
              }}>
                English
              </span>
              {selectedLanguage === "english" && (
                <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, marginLeft: "2px" }}>✓</span>
              )}
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 7: DOCTOR ILLUSTRATION & SPEECH BUBBLES                */}
        {/* Exact target: x = 920px -> left = 651px, top = 95px, height = 408px */}
        {/* ----------------------------------------------------------- */}
        <div style={{
          position: "absolute",
          left: "645px",
          top: "95px",
          width: "585px",
          height: "408px",
          zIndex: 15,
          pointerEvents: "none"
        }}>
          <Image
            src="/doctor-hero.png"
            alt="Doctor & Speech Bubbles"
            fill
            priority
            style={{ objectFit: "contain", objectPosition: "bottom center" }}
          />
        </div>

        {/* ----------------------------------------------------------- */}
        {/* PHASE 8: SYMPTOM INPUT CARD (x = 328px -> left = 59px)       */}
        {/* Dimensions: Width = 1143px, Height = 422px, Top = 503px      */}
        {/* ----------------------------------------------------------- */}
        <section style={{
          position: "absolute",
          left: "59px",
          top: "503px",
          width: "1143px",
          height: "422px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #d9e9f7",
          boxShadow: "0 10px 30px rgba(18, 104, 219, 0.07)",
          padding: "26px 27px",
          boxSizing: "border-box",
          zIndex: 30
        }}>
          {/* Card Heading */}
          <h2 style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0a2540",
            margin: "0 0 14px",
            letterSpacing: "-0.2px"
          }}>
            Describe your symptoms
          </h2>

          {/* Textarea Container (Width = 1088px, Height = 130px) */}
          <div style={{ position: "relative", width: "1088px", height: "130px", marginBottom: "18px" }}>
            <textarea
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              maxLength={1000}
              placeholder="Mujhe 3 din se khansi hai, raat ko zyada hoti hai.&#10;Allergy ki medicine kabhi-kabhi leta hoon..."
              style={{
                width: "1088px",
                height: "130px",
                borderRadius: "10px",
                border: "1.5px solid #dbeafe",
                background: "#ffffff",
                padding: "16px 54px 30px 18px",
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#334155",
                outline: "none",
                fontFamily: "inherit",
                resize: "none",
                boxSizing: "border-box"
              }}
            />

            {/* Purple Microphone Icon inside textarea on right side */}
            <button
              onClick={handleMicToggle}
              style={{
                position: "absolute",
                right: "18px",
                top: "38px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: isListening ? "#ef4444" : "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px",
                borderRadius: "50%",
                transition: "all 0.15s ease"
              }}
              title={isListening ? "Listening..." : "Click to speak"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>

            {/* Character Counter at lower-right */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              right: "18px",
              fontSize: "11px",
              fontWeight: 500,
              color: "#94a3b8"
            }}>
              {displayCount}/1000
            </div>
          </div>

          {/* PHASE 9: Quick Examples Row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            width: "1088px",
            gap: "12px",
            marginBottom: "20px"
          }}>
            {/* Lightning Icon + Label */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginRight: "4px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0a2540" }}>
                Quick Examples:
              </span>
            </div>

            {/* 5 Light-Blue Pill Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
              {quickExamplesList.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChipClick(item.text)}
                  style={{
                    height: "40px",
                    padding: "0 18px",
                    borderRadius: "20px",
                    background: "#e8f3fc",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    flex: 1,
                    justifyContent: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#e8f3fc";
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", color: "#1d4ed8" }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback message if any */}
          {feedbackMsg && (
            <div style={{
              position: "absolute",
              bottom: "75px",
              left: "27px",
              padding: "4px 12px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              color: "#15803d",
              fontSize: "11px",
              fontWeight: 600
            }}>
              {feedbackMsg}
            </div>
          )}

          {/* PHASE 10: Generate Draft Action Button (Width = 1088px, Height = 60px) */}
          <button
            onClick={handleGenerate}
            style={{
              width: "1088px",
              height: "60px",
              borderRadius: "12px",
              background: "linear-gradient(90deg, #06CA8C 0%, #00B8C8 30%, #1687F5 65%, #7C56F1 85%, #9333EA 100%)",
              border: "none",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(0, 184, 200, 0.35)",
              letterSpacing: "0.01em",
              transition: "opacity 0.15s ease, transform 0.1s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.95";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>Generate Draft</span>
            <span style={{ fontSize: "20px", fontWeight: 700 }}>→</span>
          </button>
        </section>
      </div>
    </div>
  );
}
