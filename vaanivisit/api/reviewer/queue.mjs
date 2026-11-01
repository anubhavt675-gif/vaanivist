// GET /api/reviewer/queue
import { getAdminClient, corsHeaders } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = await getAdminClient();
  try {
    const { data: intakes = [] } = await admin
      .from("patient_intakes")
      .select("*, profiles!patient_id(display_name, avatar_url), clinical_drafts(id, status, structured_content, ai_model_name, created_at)")
      .in("status", ["submitted", "pending_review", "in_review"])
      .order("created_at", { ascending: false })
      .limit(50);

    const queue = intakes.map((intake) => {
      const draft = (intake.clinical_drafts || [])[0];
      const structured = draft?.structured_content || {};
      return {
        id: intake.id,
        patient_name: intake.profiles?.display_name || "Patient",
        patient_id: intake.patient_id,
        main_complaint: structured.main_complaint || intake.source_text?.substring(0, 50) || "General symptoms",
        duration: structured.duration || "Not specified",
        severity: structured.severity || "moderate",
        is_urgent: Boolean(structured.is_urgent),
        urgent_reason: structured.urgent_reason || null,
        source_text: intake.source_text,
        source_language: intake.source_language || "hinglish",
        status: intake.status,
        created_at: intake.created_at,
        draft_id: draft?.id || null,
        ai_model: draft?.ai_model_name || null,
        structured_content: structured,
      };
    });

    return res.json({ queue });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
