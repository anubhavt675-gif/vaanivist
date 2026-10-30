import React, { useState, useEffect, useRef } from "react";
import { broadcastRealtimeEvent, subscribeToRealtimeEvents } from "../lib/realtime";

export interface ChatMessage {
  id: string;
  consultation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "patient" | "doctor";
  receiver_id: string;
  text: string;
  created_at: string;
  read?: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: "patient" | "doctor";
  partnerName?: string;
  partnerRole?: string;
  partnerId?: string;
}

export default function ChatModal({
  isOpen,
  onClose,
  consultationId = "520d18f8-46bb-49b1-a0b9-4f245acae230",
  currentUserId = "ae05e114-5671-45da-ad13-ba1e60de8b7e",
  currentUserName = "Rohan Kumar",
  currentUserRole = "patient",
  partnerName = "Dr. Priya Sharma",
  partnerRole = "General Physician",
  partnerId = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f",
}: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const url = consultationId
        ? `/api/messages?consultation_id=${consultationId}`
        : `/api/messages`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.messages) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch messages:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Listen for realtime chat broadcast
      const unsubscribe = subscribeToRealtimeEvents((event) => {
        if (event.event === "new_message") {
          fetchMessages();
        }
      });
      const interval = setInterval(fetchMessages, 3000);
      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [isOpen, consultationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const messageText = inputText.trim();
    setInputText("");
    setIsSending(true);

    const optimisticMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      consultation_id: consultationId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      sender_role: currentUserRole,
      receiver_id: partnerId,
      text: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultation_id: consultationId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          sender_role: currentUserRole,
          receiver_id: partnerId,
          text: messageText,
        }),
      });

      if (res.ok) {
        broadcastRealtimeEvent("new_message" as any, {
          consultation_id: consultationId,
          sender_id: currentUserId,
        });
        fetchMessages();
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts =
    currentUserRole === "doctor"
      ? [
          "Kya aapko bukhar ya thand lag rahi hai?",
          "Dawai khane ke baad kitna aaram mila?",
          "Kripya 2 din baad dobara follow-up lein.",
        ]
      : [
          "Dawai kab aur kitni baar leni hai?",
          "Mujhe thoda saans lene me takleef hai.",
          "Kya main normal khana kha sakta hoon?",
        ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(7, 29, 53, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          height: "620px",
          background: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 24px 60px rgba(7, 29, 53, 0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #dce7f1",
          animation: "modalSlideUp 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #071D35 0%, #102B46 100%)",
            color: "#ffffff",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background:
                  currentUserRole === "patient"
                    ? "linear-gradient(135deg, #06b6d4, #2563eb)"
                    : "linear-gradient(135deg, #10b981, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {partnerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                  {partnerName}
                </h3>
                <span
                  style={{
                    background: "rgba(34, 211, 238, 0.2)",
                    color: "#22d3ee",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  {partnerRole}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "2px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Active now • Supabase Realtime
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
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

        {/* Clinical Note Banner */}
        <div
          style={{
            background: "#eff6ff",
            borderBottom: "1px solid #dbeafe",
            padding: "8px 16px",
            fontSize: "11px",
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Encrypted clinical communication. Messages are saved to patient consultation record.
          </span>
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            background: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                margin: "auto",
                color: "#94a3b8",
                fontSize: "13px",
              }}
            >
              <p style={{ margin: "0 0 4px", fontWeight: 600 }}>No messages yet.</p>
              <p style={{ margin: 0, fontSize: "11px" }}>
                Send a message to initiate your consultation conversation.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_role === currentUserRole || m.sender_id === currentUserId;
              const timeStr = m.created_at
                ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now";

              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#64748b",
                      marginBottom: "3px",
                      marginLeft: isMine ? 0 : "8px",
                      marginRight: isMine ? "8px" : 0,
                    }}
                  >
                    {isMine ? "You" : m.sender_name} • {timeStr}
                  </span>
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isMine
                        ? "linear-gradient(135deg, #2563eb 0%, #0d9488 100%)"
                        : "#ffffff",
                      color: isMine ? "#ffffff" : "#142B45",
                      fontSize: "13px",
                      lineHeight: "1.45",
                      border: isMine ? "none" : "1px solid #e2e8f0",
                      boxShadow: isMine
                        ? "0 4px 12px rgba(37, 99, 235, 0.25)"
                        : "0 2px 6px rgba(0, 0, 0, 0.04)",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            padding: "8px 16px",
            background: "#ffffff",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prompt)}
              style={{
                flexShrink: 0,
                background: "#f1edff",
                border: "1px solid #e0e7ff",
                color: "#4338ca",
                padding: "4px 10px",
                borderRadius: "14px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: "12px 16px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${partnerName}... (Hindi, Hinglish or English)`}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "24px",
              border: "1.5px solid #dce7f1",
              fontSize: "13px",
              color: "#0f172a",
              outline: "none",
              backgroundColor: "#f8fafc",
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            style={{
              padding: "10px 18px",
              borderRadius: "24px",
              border: "none",
              background: inputText.trim()
                ? "linear-gradient(135deg, #2563eb, #0d9488)"
                : "#cbd5e1",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: inputText.trim() ? "pointer" : "not-allowed",
              boxShadow: inputText.trim() ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Send</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

