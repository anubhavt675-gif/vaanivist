// GET /api/consultations/:id  PATCH /api/consultations/:id
// POST /api/consultations/:id/notes
// POST /api/consultations/:id/prescriptions
// GET /api/consultations/:id/prescription
// POST /api/consultations/:id/accept
// POST /api/consultations/:id/decline
// POST /api/consultations/:id/request-info
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID, DEMO_PATIENT_ID } from "../../_shared.mjs";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();
  const { id } = req.query;
  const urlPath = req.url || "";

  // POST /api/consultations/:id/accept
  if (req.method === "POST" && urlPath.includes("/accept")) {
    try {
      const { doctor_id = DEMO_DOCTOR_ID, doctor_name = "Dr. Priya Sharma" } = req.body;
      const { data } = await admin.from("consultations").update({ status: "in_progress", accepted_at: new Date().toISOString(), assigned_doctor_id: doctor_id, assigned_doctor_name: doctor_name, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      await admin.from("patient_intakes").update({ status: "in_review", assigned_reviewer_id: doctor_id, updated_at: new Date().toISOString() }).eq("id", id).catch(() => {});
      return res.json({ success: true, consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // POST /api/consultations/:id/decline
  if (req.method === "POST" && urlPath.includes("/decline")) {
    try {
      const { reason = "Doctor queue full" } = req.body;
      const { data } = await admin.from("consultations").update({ status: "declined", decline_reason: reason, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      return res.json({ success: true, consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // POST /api/consultations/:id/request-info
  if (req.method === "POST" && urlPath.includes("/request-info")) {
    try {
      const { question } = req.body;
      if (!question?.trim()) return res.status(400).json({ error: "Question cannot be empty" });
      const { data: existing } = await admin.from("consultations").select("doctor_questions, patient_id").eq("id", id).maybeSingle();
      const prevQ = existing?.doctor_questions || [];
      prevQ.push({ id: "q-" + Date.now(), question: question.trim(), asked_at: new Date().toISOString() });
      const { data } = await admin.from("consultations").update({ doctor_questions: prevQ, status: "info_requested", updated_at: new Date().toISOString() }).eq("id", id).select().single();
      return res.json({ success: true, consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // POST /api/consultations/:id/prescriptions
  if (req.method === "POST" && urlPath.includes("/prescriptions")) {
    try {
      const { medications, instructions, diagnosis, next_appointment, doctor_name = "Dr. Priya Sharma", doctor_id = DEMO_DOCTOR_ID } = req.body;
      const pId = crypto.randomUUID();
      const pRecord = { id: pId, consultation_id: id, medications, instructions, diagnosis, next_appointment, issued_by_doctor_id: doctor_id, issued_by_doctor_name: doctor_name, issued_at: new Date().toISOString(), pdf_url: null };
      const { data } = await admin.from("prescriptions").insert(pRecord).select().single();
      await admin.from("consultations").update({ has_prescription: true, prescription_id: pId, updated_at: new Date().toISOString() }).eq("id", id).catch(() => {});
      return res.status(201).json({ success: true, prescription: data || pRecord });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // GET /api/consultations/:id/prescription
  if (req.method === "GET" && urlPath.includes("/prescription")) {
    try {
      const { data } = await admin.from("prescriptions").select("*").eq("consultation_id", id).order("issued_at", { ascending: false }).limit(1).maybeSingle();
      return res.json({ prescription: data || null });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // POST /api/consultations/:id/notes
  if (req.method === "POST" && urlPath.includes("/notes")) {
    try {
      const { notes, doctor_id = DEMO_DOCTOR_ID } = req.body;
      const { data } = await admin.from("consultations").update({ doctor_notes: notes, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      return res.json({ success: true, consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // PATCH /api/consultations/:id
  if (req.method === "PATCH") {
    try {
      const { data } = await admin.from("consultations").update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      return res.json({ success: true, consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // GET /api/consultations/:id
  if (req.method === "GET") {
    try {
      const { data } = await admin.from("consultations").select("*").eq("id", id).maybeSingle();
      if (!data) return res.status(404).json({ error: "Consultation not found" });
      return res.json({ consultation: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
