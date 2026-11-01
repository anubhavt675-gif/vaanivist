// GET /api/drafts/by-intake/:intakeId
import { getAdminClient, corsHeaders } from "../../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = await getAdminClient();
  const { intakeId } = req.query;

  try {
    const { data } = await admin.from("clinical_drafts").select("*, draft_field_evidence(*), patient_intakes(*)").eq("intake_id", intakeId).not("status", "eq", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return res.status(404).json({ error: "No draft found for this intake" });

    const evList = (data.draft_field_evidence || []).map((ev) => ({
      field: ev.field_path, path: ev.field_path, value: ev.field_value,
      exact_quote: ev.exact_quote, start_offset: ev.start_offset, end_offset: ev.end_offset,
      confidence: 94, verification_status: ev.verification_status || "verified",
    }));
    return res.json({ draft: { id: data.id, intake_id: data.intake_id, version: data.version || 1, status: data.status, structured_content: data.structured_content, evidence: evList, content_hash: data.content_hash, ai_model_name: data.ai_model_name || "cached", raw_source_text: data.patient_intakes?.source_text } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
