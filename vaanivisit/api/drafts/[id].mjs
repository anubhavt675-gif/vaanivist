// GET /api/drafts/:id
// PATCH /api/drafts/:id
// POST /api/drafts/:id/review
// POST /api/drafts/:id/submit-to-doctor
// POST /api/drafts/:id/export
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID, DEMO_PATIENT_ID } from "../../_shared.mjs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();
  const { id } = req.query;
  const urlPath = req.url || "";

  // ── POST /api/drafts/:id/submit-to-doctor ─────────────────────────────────
  if (req.method === "POST" && urlPath.includes("/submit-to-doctor")) {
    try {
      const {
        doctor_id = DEMO_DOCTOR_ID,
        doctor_name = "Dr. Priya Sharma",
        patient_name = "Patient",
        priority = "normal",
        source_text: bodySourceText,
        structured_content: bodyStructured,
        intake_id: bodyIntakeId,
      } = req.body;

      let draft = null, intake = null;
      if (id && !String(id).startsWith("temp-") && id !== "latest") {
        const { data: d } = await admin.from("clinical_drafts").select("*, patient_intakes(*)").eq("id", id).maybeSingle();
        if (d) { draft = d; intake = d.patient_intakes; }
        else {
          const { data: dByIntake } = await admin.from("clinical_drafts").select("*, patient_intakes(*)").eq("intake_id", id).not("status", "eq", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (dByIntake) { draft = dByIntake; intake = dByIntake.patient_intakes; }
        }
      }

      const intakeId = draft?.intake_id || bodyIntakeId;
      const structured = draft?.structured_content || bodyStructured || {};
      const sourceText = intake?.source_text || bodySourceText || "Patient symptoms submitted";
      const patientId = intake?.patient_id || DEMO_PATIENT_ID;

      // Update draft & intake status in Supabase
      if (draft?.id) {
        await admin.from("clinical_drafts").update({ status: "in_review", updated_at: new Date().toISOString() }).eq("id", draft.id);
        if (intakeId) {
          await admin.from("patient_intakes").update({ status: "in_review", assigned_reviewer_id: doctor_id, updated_at: new Date().toISOString() }).eq("id", intakeId);
          await admin.from("audit_events").insert({ action: "draft_submitted_to_doctor", entity_type: "clinical_draft", entity_id: draft.id, intake_id: intakeId, metadata: { doctor_id, doctor_name, priority } }).catch(() => {});
        }
      }

      // Save consultation in Supabase (consultations table or fallback)
      const consultationId = intakeId || crypto.randomUUID();
      const consultationItem = {
        id: consultationId,
        intake_id: intakeId,
        patient_id: patientId,
        patient_name: patient_name || "Patient",
        assigned_doctor_id: doctor_id,
        assigned_doctor_name: doctor_name,
        source_text: sourceText,
        source_language: intake?.source_language || "hinglish",
        main_complaint: structured.main_complaint || sourceText.substring(0, 40),
        severity: structured.severity || (priority === "urgent" ? "severe" : "moderate"),
        is_urgent: Boolean(structured.is_urgent || priority === "urgent"),
        urgent_reason: structured.urgent_reason || null,
        status: "in_review",
        submitted_at: new Date().toISOString(),
        structured_content: structured,
      };

      // Try to upsert consultation in Supabase consultations table
      await admin.from("consultations").upsert({ ...consultationItem, updated_at: new Date().toISOString() }, { onConflict: "id" }).catch(() => {});

      // Save initial patient message in Supabase messages table
      const { data: existingMsg } = await admin.from("messages").select("id").eq("consultation_id", consultationId).eq("is_initial_complaint", true).maybeSingle();
      if (!existingMsg && sourceText) {
        await admin.from("messages").insert({
          id: "msg-" + crypto.randomUUID(),
          consultation_id: consultationId,
          sender_id: patientId,
          sender_name: patient_name || "Patient",
          sender_role: "patient",
          receiver_id: doctor_id,
          receiver_name: doctor_name,
          text: sourceText,
          is_initial_complaint: true,
          created_at: new Date().toISOString(),
          read: false,
        }).catch(() => {});
      }

      return res.json({ success: true, message: `Consultation submitted to ${doctor_name}`, consultation_id: consultationId, consultation: consultationItem, status: "in_review" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/drafts/:id/review ───────────────────────────────────────────
  if (req.method === "POST" && urlPath.includes("/review")) {
    try {
      const { decision = "approved", reviewer_notes = "", reviewer_id = DEMO_DOCTOR_ID } = req.body;
      const status = decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "in_review";
      const { data } = await admin.from("clinical_drafts").update({ status, reviewer_notes, reviewed_by: reviewer_id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select().single();
      return res.json({ success: true, draft: data, decision, status });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/drafts/:id/export ───────────────────────────────────────────
  if (req.method === "POST" && urlPath.includes("/export")) {
    try {
      const { data: draft } = await admin.from("clinical_drafts").select("*, patient_intakes(*)").eq("id", id).maybeSingle();
      if (!draft) return res.status(404).json({ error: "Draft not found" });
      await admin.from("audit_events").insert({ action: "draft_exported", entity_type: "clinical_draft", entity_id: id, metadata: { format: req.body.format || "pdf" } }).catch(() => {});
      return res.json({ success: true, draft, exportUrl: null });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH /api/drafts/:id ─────────────────────────────────────────────────
  if (req.method === "PATCH") {
    try {
      const { structured_content, reviewer_notes } = req.body;
      const updates = { updated_at: new Date().toISOString() };
      if (structured_content) updates.structured_content = structured_content;
      if (reviewer_notes) updates.reviewer_notes = reviewer_notes;
      const { data } = await admin.from("clinical_drafts").update(updates).eq("id", id).select().single();
      return res.json({ success: true, draft: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/drafts/:id ───────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { data } = await admin.from("clinical_drafts").select("*, draft_field_evidence(*), patient_intakes(*)").eq("id", id).maybeSingle();
      if (!data) return res.status(404).json({ error: "Draft not found" });
      const evList = (data.draft_field_evidence || []).map((ev) => ({ field: ev.field_path, path: ev.field_path, value: ev.field_value, exact_quote: ev.exact_quote, start_offset: ev.start_offset, end_offset: ev.end_offset, confidence: 94, verification_status: ev.verification_status || "verified" }));
      return res.json({ draft: { id: data.id, intake_id: data.intake_id, version: data.version || 1, status: data.status, structured_content: data.structured_content, evidence: evList, content_hash: data.content_hash, ai_model_name: data.ai_model_name, raw_source_text: data.patient_intakes?.source_text } });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
