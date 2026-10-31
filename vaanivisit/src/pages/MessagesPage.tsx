import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { downloadPrescriptionPDF, PrescriptionData } from "../lib/prescriptionPdf";
import { subscribeToRealtimeEvents, broadcastRealtimeEvent } from "../lib/realtime";

interface MessageAttachment {
  type: string;
  fileName?: string;
  prescriptionId?: string;
  prescriptionData?: PrescriptionData;
}

interface MessageItem {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | "doctor";
  receiver_id: string;
  receiver_name?: string;
  text: string;
  is_initial_complaint?: boolean;
  attachment?: MessageAttachment | null;
  created_at: string;
  read?: boolean;
}

interface ConversationItem {
  id: string;
  consultation_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  doctor_qualification?: string;
  main_complaint?: string;
  source_text?: string;
  status: string;
  messages: MessageItem[];
  unread_count: number;
  last_message?: {
    text: string;
    created_at: string;
  } | null;
  updated_at: string;
  prescription?: PrescriptionData | null;
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConsultationParam = searchParams.get("consultation_id");

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(activeConsultationParam);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations?role=patient");
      if (res.ok) {
        const data = await res.json();
        const list: ConversationItem[] = data.conversations || [];
        setConversations(list);

        // Pick active conversation
        if (list.length > 0) {
          const matched = activeConsultationParam
            ? list.find((c) => c.consultation_id === activeConsultationParam || c.id === activeConsultationParam)
            : list[0];

          const target = matched || list[0];
          setSelectedConsultationId(target.consultation_id || target.id);
          setActiveConversation(target);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeConsultationParam]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (consId: string) => {
    if (!consId) return;
    try {
      const res = await fetch(`/api/messages?consultation_id=${consId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }

      // Mark messages as read for patient
      await fetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consId, role: "patient" }),
      });
    } catch (err) {
      console.warn("Failed to fetch messages:", err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    const unsub = subscribeToRealtimeEvents((event) => {
      fetchConversations();
      if (selectedConsultationId) {
        fetchMessages(selectedConsultationId);
      }
    });

    const interval = setInterval(() => {
      if (selectedConsultationId) {
        fetchMessages(selectedConsultationId);
      }
    }, 3500);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [fetchConversations, fetchMessages, selectedConsultationId]);

  useEffect(() => {
    if (selectedConsultationId) {
      fetchMessages(selectedConsultationId);
      const matched = conversations.find(
        (c) => c.consultation_id === selectedConsultationId || c.id === selectedConsultationId
      );
      if (matched) {
        setActiveConversation(matched);
      }
    }
  }, [selectedConsultationId, conversations, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Select a conversation
  const handleSelectConversation = (consId: string) => {
    setSelectedConsultationId(consId);
    setSearchParams({ consultation_id: consId });
    fetchMessages(consId);
  };

  // Send a message
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isSending || !selectedConsultationId) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: selectedConsultationId,
          sender_id: "ae05e114-5671-45da-ad13-ba1e60de8b7e",
          sender_name: "Anubhav kumar thakur",
          sender_role: "patient",
          receiver_id: activeConversation?.doctor_id || "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
          text: textToSend.trim(),
        }),
      });

      if (res.ok) {
        setInputText("");
        broadcastRealtimeEvent("new_message", { consultation_id: selectedConsultationId });
        await fetchMessages(selectedConsultationId);
        scrollToBottom();
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Speech-to-text dictation
  const handleToggleVoiceDictation = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Quick chips
  const quickChips = [
    "Doctor, dawai kitne din leni hai?",
    "Kya koi khane peene me parhez karna hai?",
    "Kitne din me aaram aane lagega?",
    "Thank you doctor! Main prescription follow karunga.",
  ];

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* 1. Permanent Shared Sidebar (Zero Redesign, Exact Approved Layout) */}
      <Sidebar />

      {/* 2. Main Content Area */}
      <main style={{ marginLeft: "269px", flex: 1, minHeight: "100vh", display: "flex", overflow: "hidden" }}>
        
        {/* Left Sub-Panel: Conversations / Consultations List */}
        <section
          style={{
            width: "320px",
            minWidth: "320px",
            borderRight: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
          }}
        >
          {/* Header */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Doctor Messages
              </h2>
              <span style={{
                background: "#e0f2fe",
                color: "#0369a1",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "12px",
              }}>
                Live Care
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              Direct clinical consultation and digital prescriptions
            </p>
          </div>

          {/* Doctor Card */}
          <div style={{
            margin: "14px 16px 10px",
            padding: "14px",
            background: "linear-gradient(135deg, #031835 0%, #082852 100%)",
            borderRadius: "14px",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(3, 24, 53, 0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22d3ee, #0284c7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "16px",
                  color: "#ffffff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                }}>
                  PS
                </div>
                <span style={{
                  position: "absolute",
                  bottom: "1px",
                  right: "1px",
                  width: "11px",
                  height: "11px",
                  background: "#22c55e",
                  borderRadius: "50%",
                  border: "2px solid #031835"
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                    Dr. Priya Sharma
                  </h4>
                  <span style={{ fontSize: "11px" }}>✓</span>
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", margin: "2px 0 0" }}>
                  MBBS, MD • Medical Reviewer
                </p>
              </div>
            </div>
          </div>

          {/* Consultation Threads List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", padding: "6px 8px 8px" }}>
              Your Consultations ({conversations.length})
            </div>

            {isLoading ? (
              <div style={{ padding: "30px 10px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: "30px 14px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                No consultations yet. Submit your symptoms from the Home or AI Draft page to start a chat.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConsultationId === conv.consultation_id || selectedConsultationId === conv.id;
                return (
                  <div
                    key={conv.id || conv.consultation_id}
                    onClick={() => handleSelectConversation(conv.consultation_id || conv.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: isSelected ? "#f0f9ff" : "transparent",
                      border: isSelected ? "1px solid #bae6fd" : "1px solid transparent",
                      marginBottom: "6px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "13px", fontWeight: isSelected ? 700 : 600, color: isSelected ? "#0369a1" : "#0f172a" }}>
                        Dr. Priya Sharma
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {formatTime(conv.updated_at)}
                      </span>
                    </div>

                    <p style={{
                      fontSize: "12px",
                      color: "#475569",
                      margin: "0 0 6px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {conv.last_message?.text || conv.main_complaint || "Medical consultation"}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "8px",
                        background: conv.prescription ? "#ecfdf5" : "#eff6ff",
                        color: conv.prescription ? "#059669" : "#2563eb",
                      }}>
                        {conv.prescription ? "✓ Prescription Issued" : "In Review"}
                      </span>

                      {conv.unread_count > 0 && (
                        <span style={{
                          background: "#ef4444",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: 700,
                          borderRadius: "10px",
                          padding: "1px 6px"
                        }}>
                          {conv.unread_count} new
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Pane: Active Chat Window */}
        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            background: "#f8fafc",
          }}
        >
          {/* Top Chat Header */}
          <header
            style={{
              padding: "14px 28px",
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #11579A, #06b6d4)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "17px",
                  boxShadow: "0 2px 8px rgba(17, 87, 154, 0.25)"
                }}>
                  PS
                </div>
                <span style={{
                  position: "absolute",
                  bottom: "2px",
                  right: "2px",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  border: "2px solid #ffffff",
                }} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Dr. Priya Sharma
                  </h3>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#0284c7",
                    background: "#e0f2fe",
                    padding: "2px 7px",
                    borderRadius: "6px"
                  }}>
                    Verified Medical Reviewer
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  General Physician • Online • Typically replies within 5–10 minutes
                </p>
              </div>
            </div>

            {/* Quick Actions / Link to Review or Draft */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                to="/ai-draft"
                style={{
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>← Back to AI Draft</span>
              </Link>
            </div>
          </header>

          {/* Pinned Original Medical Concern Banner */}
          {activeConversation?.source_text && (
            <div
              style={{
                margin: "16px 28px 0",
                background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
                border: "1px solid #bfdbfe",
                borderRadius: "14px",
                padding: "14px 20px",
                boxShadow: "0 2px 8px rgba(37, 99, 235, 0.05)",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
              }}
            >
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "16px"
              }}>
                📋
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Original Medical Concern Submitted
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    ID: {activeConversation.consultation_id?.slice(0, 8)}...
                  </span>
                </div>
                <p style={{ fontSize: "13px", color: "#1e293b", margin: 0, fontStyle: "italic", lineHeight: 1.4 }}>
                  "{activeConversation.source_text}"
                </p>
              </div>
            </div>
          )}

          {/* Chat Stream History */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Clinical welcome notice */}
            <div style={{ textAlign: "center", margin: "10px 0" }}>
              <span style={{
                background: "rgba(226, 232, 240, 0.8)",
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: "12px",
              }}>
                🔒 End-to-end encrypted medical consultation with Dr. Priya Sharma
              </span>
            </div>

            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                <p style={{ fontSize: "14px", margin: "0 0 8px" }}>No messages yet in this consultation.</p>
                <p style={{ fontSize: "12px", margin: 0 }}>Dr. Priya Sharma has been notified and will reply shortly.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isPatient = msg.sender_role === "patient";

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isPatient ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "75%" }}>
                      {!isPatient && (
                        <div style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "#0284c7",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginBottom: "4px"
                        }}>
                          PS
                        </div>
                      )}

                      <div
                        style={{
                          background: isPatient ? "linear-gradient(135deg, #11579A 0%, #0f4c85 100%)" : "#ffffff",
                          color: isPatient ? "#ffffff" : "#0f172a",
                          padding: "12px 16px",
                          borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          border: isPatient ? "none" : "1px solid #e2e8f0",
                          boxShadow: isPatient ? "0 2px 10px rgba(17, 87, 154, 0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                      >
                        <p style={{ fontSize: "14px", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </p>

                        {/* Interactive Prescription Attachment Card */}
                        {msg.attachment?.type === "prescription_pdf" && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "14px 16px",
                              background: isPatient ? "rgba(255, 255, 255, 0.12)" : "#f0fdf4",
                              border: isPatient ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid #bbf7d0",
                              borderRadius: "12px",
                              color: isPatient ? "#ffffff" : "#166534",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                              <span style={{ fontSize: "20px" }}>📄</span>
                              <div>
                                <h5 style={{ fontSize: "13px", fontWeight: 800, margin: 0 }}>
                                  Verified Digital Prescription
                                </h5>
                                <span style={{ fontSize: "11px", opacity: 0.85 }}>
                                  ID: {msg.attachment.prescriptionId || "VV-RX-OFFICIAL"}
                                </span>
                              </div>
                            </div>

                            {msg.attachment.prescriptionData?.medicines && (
                              <div style={{ margin: "8px 0", fontSize: "12px", opacity: 0.9 }}>
                                <strong>Prescribed Medications:</strong>
                                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                                  {msg.attachment.prescriptionData.medicines.slice(0, 3).map((m, idx) => (
                                    <li key={idx}>
                                      {m.name} ({m.strength}) – {m.frequency}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                if (msg.attachment?.prescriptionData) {
                                  downloadPrescriptionPDF(msg.attachment.prescriptionData);
                                }
                              }}
                              style={{
                                marginTop: "8px",
                                background: isPatient ? "#ffffff" : "#166534",
                                color: isPatient ? "#11579A" : "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "12px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span>📥 Download Verified PDF</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "3px",
                      marginRight: isPatient ? "6px" : 0,
                      marginLeft: !isPatient ? "36px" : 0
                    }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isPatient && (
                        <span style={{ fontSize: "11px", color: "#2563eb", fontWeight: 700 }}>✓✓</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Clinical Chips */}
          <div style={{ padding: "8px 28px 0", display: "flex", gap: "8px", overflowX: "auto" }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(chip)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  color: "#475569",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.15s",
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Bottom Message Input Bar */}
          <footer
            style={{
              padding: "14px 28px 20px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "16px",
              padding: "6px 10px",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.03)",
            }}>
              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={handleToggleVoiceDictation}
                title={isListening ? "Listening... click to stop" : "Speak your message in Hindi or English"}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: isListening ? "#ef4444" : "#f1f5f9",
                  border: isListening ? "2px solid #b91c1c" : "1px solid #e2e8f0",
                  color: isListening ? "#ffffff" : "#2563eb",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>

              {/* Text Input Area */}
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isListening ? "Listening to your voice... speak now" : "Type a message to Dr. Priya Sharma (Press Enter to send)..."}
                rows={1}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "14px",
                  color: "#0f172a",
                  resize: "none",
                  padding: "8px 4px",
                  fontFamily: "inherit",
                  maxHeight: "100px",
                }}
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: inputText.trim() ? "#11579A" : "#cbd5e1",
                  border: "none",
                  color: "#ffffff",
                  cursor: inputText.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: inputText.trim() ? "0 2px 8px rgba(17, 87, 154, 0.35)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

