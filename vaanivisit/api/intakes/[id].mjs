// GET /api/intakes/:id
// POST /api/intakes/:id/generate-draft
import { getAdminClient, corsHeaders, extractWithGroq, calculateContentHash, DEMO_DOCTOR_ID } from "../../_shared.mjs";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();
  const { id } = req.query;

  // ── POST /api/intakes/:id/generate-draft ──────────────────────────────────
  if (req.method === "POST" && req.url?.includes("/generate-draft")) {
    try {
      let sourceText = req.body.source_text;
      let language = req.body.language || "hinglish";

      if (!sourceText && id !== "latest" && !String(id).startsWith("temp-")) {
        const { data: intake } = await admin.from("patient_intakes").select("source_text, source_language").eq("id", id).maybeSingle();
        if (intake) { sourceText = intake.source_text; language = intake.source_language || language; }
      }
      if (!sourceText) sourceText = "Mujhe 3 din se khansi hai, raat ko zyada hoti hai.";

      let realIntakeId = null;
      if (id && id !== "latest" && !String(id).startsWith("temp-")) {
        const { data: ic } = await admin.from("patient_intakes").select("id, source_text, source_language").eq("id", id).maybeSingle();
        if (ic) { realIntakeId = ic.id; if (!sourceText) { sourceText = ic.source_text; language = ic.source_language || language; } }
      }
      if (!realIntakeId) {
        const { data: li } = await admin.from("patient_intakes").select("id, source_text, source_language").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (li) { realIntakeId = li.id; if (!sourceText) { sourceText = li.source_text; language = li.source_language || language; } }
      }

      // Deduplication check
      if (realIntakeId && !String(realIntakeId).startsWith("temp-") && realIntakeId !== "latest") {
        const { data: existing } = await admin.from("clinical_drafts").select("*, draft_field_evidence(*), patient_intakes(*)").eq("intake_id", realIntakeId).not("status", "eq", "superseded").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (existing) {
          const evList = (existing.draft_field_evidence || []).map((ev) => ({ field: ev.field_path, path: ev.field_path, value: ev.field_value, exact_quote: ev.exact_quote, start_offset: ev.start_offset, end_offset: ev.end_offset, confidence: 94, verification_status: ev.verification_status || "verified" }));
          return res.json({ success: true, cached: true, draft: { id: existing.id, intake_id: existing.intake_id, version: existing.version || 1, status: existing.status, structured_content: existing.structured_content, evidence: evList, content_hash: existing.content_hash, ai_model_name: existing.ai_model_name || "cached", raw_source_text: sourceText || existing.patient_intakes?.source_text } });
        }
      }

      // Extract with Groq / Gemini
      const extraction = await extractWithGroq(sourceText, language);
      const draftId = crypto.randomUUID();

      let reviewerId = DEMO_DOCTOR_ID;
      const { data: rp } = await admin.from("profiles").select("id").eq("role", "reviewer").limit(1).maybeSingle();
      if (rp) reviewerId = rp.id;

      if (realIntakeId && !String(realIntakeId).startsWith("temp-") && realIntakeId !== "latest") {
        const { error: dError } = await admin.from("clinical_drafts").insert({ id: draftId, intake_id: realIntakeId, version: 1, structured_content: extraction.structured_content, status: "pending_review", generation_source: "ai_gemini", ai_model_name: extraction.model_name, prompt_version: "v1.0.0", content_hash: extraction.content_hash, created_by: reviewerId }).select();
        if (!dError && extraction.evidence.length > 0) {
          await admin.from("draft_field_evidence").insert(extraction.evidence.map((ev) => ({ draft_id: draftId, field_path: ev.path || ev.field, field_value: ev.value, exact_quote: ev.exact_quote, start_offset: ev.start_offset, end_offset: ev.end_offset, verification_status: ev.verification_status })));
        }
        await admin.from("patient_intakes").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", realIntakeId);
        await admin.from("audit_events").insert({ action: "ai_generation_succeeded", entity_type: "clinical_draft", entity_id: draftId, intake_id: realIntakeId, metadata: { model: extraction.model_name, content_hash: extraction.content_hash } }).catch(() => {});
      }

      return res.json({ success: true, draft: { id: draftId, intake_id: realIntakeId, version: 1, status: "pending_review", structured_content: extraction.structured_content, evidence: extraction.evidence, content_hash: extraction.content_hash, ai_model_name: extraction.model_name, raw_source_text: sourceText } });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET /api/intakes/:id ──────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const { data } = await admin.from("patient_intakes").select("*, profiles!patient_id(display_name), clinical_drafts(*)").eq("id", id).maybeSingle();
      if (data) return res.json({ intake: data });
      return res.status(404).json({ error: "Intake not found" });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
