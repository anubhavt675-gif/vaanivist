import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { broadcastRealtimeEvent } from "../lib/realtime";

interface VoiceConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage?: "hindi" | "hinglish" | "english";
}

export default function VoiceConsultationModal({
  isOpen,
  onClose,
  defaultLanguage = "hinglish",
}: VoiceConsultationModalProps) {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState<"hindi" | "hinglish" | "english">(defaultLanguage);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [audioBars, setAudioBars] = useState<number[]>([15, 25, 40, 20, 50, 30, 60, 25, 15]);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Audio waveform animation
  useEffect(() => {
    let interval: any;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setAudioBars([
          Math.floor(Math.random() * 50) + 10,
          Math.floor(Math.random() * 80) + 15,
          Math.floor(Math.random() * 95) + 20,
          Math.floor(Math.random() * 65) + 15,
          Math.floor(Math.random() * 100) + 25,
          Math.floor(Math.random() * 75) + 20,
          Math.floor(Math.random() * 90) + 25,
          Math.floor(Math.random() * 60) + 15,
          Math.floor(Math.random() * 40) + 10,
        ]);
      }, 120);
    } else {
      setAudioBars([12, 12, 12, 12, 12, 12, 12, 12, 12]);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setStatusMsg("");
    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermission("granted");

      // 2. Setup Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setStatusMsg("Browser speech recognition not available. Please type symptoms in the text box.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;

      if (selectedLanguage === "hindi" || selectedLanguage === "hinglish") {
        recognition.lang = "hi-IN";
      } else {
        recognition.lang = "en-IN";
      }

      recognition.onstart = () => {
        setIsRecording(true);
        setIsPaused(false);
        setStatusMsg("🎙️ Listening... Please speak your symptoms clearly.");
      };

      recognition.onresult = (event: any) => {
        let finalStr = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          finalStr += event.results[i][0].transcript;
        }
        if (finalStr) {
          setTranscript((prev) => (prev ? prev + " " + finalStr : finalStr));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setStatusMsg(`Mic note: ${event.error}. You can continue speaking or edit the text.`);
        }
      };

      recognition.onend = () => {
        // If still flagged as recording and not explicitly stopped/paused, restart
        if (isRecording && !isPaused && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore
          }
        }
      };

      recognition.start();
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setMicPermission("denied");
      setStatusMsg("Microphone permission was denied. Please allow microphone access or type your symptoms.");
    }
  };

  const pauseRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsPaused(true);
    setStatusMsg("⏸️ Recording paused.");
  };

  const resumeRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
    setIsPaused(false);
    setStatusMsg("🎙️ Resumed recording...");
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setStatusMsg("✅ Recording finished. Please review and edit the transcribed symptoms below before submitting.");
  };

  const resetRecording = () => {
    stopRecording();
    setSeconds(0);
    setTranscript("");
    setStatusMsg("");
  };

  const handleSubmit = async () => {
    const textToSubmit = transcript.trim();
    if (!textToSubmit) {
      setStatusMsg("Please record your voice or type your symptoms before submitting.");
      return;
    }

    setIsSubmitting(true);
    setStatusMsg("Submitting symptoms & generating AI clinical analysis with Groq...");

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_text: textToSubmit,
          source_language: selectedLanguage,
          input_method: "voice",
          patient_name: "Rohan Kumar",
          patient_age: 28,
          patient_gender: "Male",
          audio_duration: seconds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const cons = data?.consultation;
        broadcastRealtimeEvent("intake_submitted", { consultation_id: cons?.id });

        if (typeof window !== "undefined") {
          sessionStorage.setItem("vani_symptom_text", textToSubmit);
          sessionStorage.setItem("vani_intake_id", cons?.id || "");
        }

        onClose();
        navigate(`/ai-draft?intakeId=${cons?.id || "latest"}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(err.error || "Failed to submit consultation.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.warn("Submit consultation error:", err);
      setStatusMsg("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 24, 53, 0.78)",
        backdropFilter: "blur(6px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #071D35 0%, #0d2948 100%)",
            padding: "18px 24px",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #06B6D4",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #06b6d4, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🎙️
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                Voice Consultation Recording Studio
              </h2>
              <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
                Speak your symptoms naturally in Hindi, Hinglish or English
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopRecording();
              onClose();
            }}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "white",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {/* Language Selection Pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
              Spoken Language:
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["hindi", "hinglish", "english"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLanguage(lang)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: selectedLanguage === lang ? "#2563eb" : "#cbd5e1",
                    background: selectedLanguage === lang ? "#eff6ff" : "white",
                    color: selectedLanguage === lang ? "#2563eb" : "#64748b",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {lang === "hindi" ? "हिन्दी (Hindi)" : lang === "hinglish" ? "Hinglish ✓" : "English"}
                </button>
              ))}
            </div>
          </div>

          {/* Waveform & Timer Studio Card */}
          <div
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "1.5px solid #e2e8f0",
              borderRadius: "14px",
              padding: "24px",
              textAlign: "center",
              marginBottom: "18px",
            }}
          >
            {/* Timer */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: 800,
                color: isRecording ? "#dc2626" : "#0f172a",
                fontVariantNumeric: "tabular-nums",
                marginBottom: "14px",
                letterSpacing: "1px",
              }}
            >
              {formatTimer(seconds)}
            </div>

            {/* Visualizer Waveform Bars */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                height: "60px",
                marginBottom: "18px",
              }}
            >
              {audioBars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: `${h}%`,
                    borderRadius: "4px",
                    background: isRecording
                      ? isPaused
                        ? "#94a3b8"
                        : "linear-gradient(180deg, #06b6d4 0%, #2563eb 100%)"
                      : "#cbd5e1",
                    transition: "height 0.1s ease",
                  }}
                />
              ))}
            </div>

            {/* Recording Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px" }}>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "24px",
                    border: "none",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>⏺</span> Start Voice Recording
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeRecording}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "20px",
                        border: "1px solid #0284c7",
                        background: "#0284c7",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ▶ Resume
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseRecording}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "20px",
                        border: "1px solid #f59e0b",
                        background: "#fef3c7",
                        color: "#b45309",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ⏸ Pause
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      padding: "8px 20px",
                      borderRadius: "20px",
                      border: "none",
                      background: "#10b981",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    ⏹ Stop & Review
                  </button>

                  <button
                    type="button"
                    onClick={resetRecording}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "20px",
                      border: "1px solid #cbd5e1",
                      background: "white",
                      color: "#64748b",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    🗑 Reset
                  </button>
                </>
              )}
            </div>

            {statusMsg && (
              <p style={{ fontSize: "11px", color: isRecording ? "#0284c7" : "#475569", marginTop: "12px", margin: "12px 0 0" }}>
                {statusMsg}
              </p>
            )}
          </div>

          {/* Transcribed Symptoms Review & Edit Box */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                Transcribed Symptoms (Review & Edit before submitting)
              </label>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {transcript.length} characters
              </span>
            </div>

            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your spoken words will appear here automatically. You can also edit or type directly if preferred..."
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1.5px solid #dbe4f0",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "#1e293b",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
                boxSizing: "border-box",
                background: "#ffffff",
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            background: "#fafcff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#0284c7", fontSize: "13px" }}>🤖</span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              Structured with Groq AI for Dr. Priya Sharma
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => {
                stopRecording();
                onClose();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !transcript.trim()}
              style={{
                padding: "8px 22px",
                borderRadius: "8px",
                border: "none",
                background: !transcript.trim()
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                color: "white",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isSubmitting || !transcript.trim() ? "not-allowed" : "pointer",
                boxShadow: !transcript.trim() ? "none" : "0 2px 8px rgba(37, 99, 235, 0.35)",
              }}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Send Consultation →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

