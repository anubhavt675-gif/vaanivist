// GET /api/messages  POST /api/messages  POST /api/messages/mark-read
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID, DEMO_PATIENT_ID } from "../_shared.mjs";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();
  const urlPath = req.url || "";

  // ── POST /api/messages/mark-read ──────────────────────────────────────────
  if (req.method === "POST" && urlPath.includes("/mark-read")) {
    try {
      const { consultation_id, role = "patient" } = req.body;
      let query = admin.from("messages").update({ read: true });
      if (consultation_id) query = query.eq("consultation_id", consultation_id);
      if (role === "patient") query = query.eq("sender_role", "doctor").eq("read", false);
      else query = query.eq("sender_role", "patient").eq("read", false);
      await query;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/messages ─────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { consultation_id } = req.query;
      let query = admin.from("messages").select("*").order("created_at", { ascending: true });
      if (consultation_id) query = query.eq("consultation_id", consultation_id);
      const { data = [] } = await query;
      return res.json({ messages: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/messages ────────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const { consultation_id, sender_id, sender_name, sender_role = "patient", receiver_id, receiver_name, text, attachment } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "Message text cannot be empty" });

      const newMsg = {
        id: "msg-" + crypto.randomUUID(),
        consultation_id: consultation_id || "general",
        sender_id: sender_id || DEMO_PATIENT_ID,
        sender_name,
        sender_role,
        receiver_id: receiver_id || (sender_role === "patient" ? DEMO_DOCTOR_ID : DEMO_PATIENT_ID),
        receiver_name,
        text: text.trim(),
        attachment: attachment || null,
        created_at: new Date().toISOString(),
        read: false,
      };

      const { data, error } = await admin.from("messages").insert(newMsg).select().single();
      return res.status(201).json({ success: true, message: data || newMsg });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
