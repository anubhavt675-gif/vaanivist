import { NextRequest, NextResponse } from "next/server";
import { extractClinicalDraft } from "@/app/lib/gemini/client";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const sourceText = body.source_text || "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...";
    const language = body.language || "hinglish";

    // Call server-side clinical extraction
    const extractionResult = await extractClinicalDraft(sourceText, language);

    const admin = getSupabaseAdminClient();
    const draftId = crypto.randomUUID();

    if (admin) {
      let createdBy = "c2e2338c-8bb5-4cb9-93c0-4d425c21492f";
      const { data: reviewerProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "reviewer")
        .limit(1)
        .maybeSingle();
      if (reviewerProfile) {
        createdBy = reviewerProfile.id;
      } else {
        const { data: anyProfile } = await admin.from("profiles").select("id").limit(1).maybeSingle();
        if (anyProfile) createdBy = anyProfile.id;
      }

      // 1. Insert clinical draft version
      const { data: draftRecord } = await admin
        .from("clinical_drafts")
        .insert({
          id: draftId,
          intake_id: id,
          version: 1,
          structured_content: extractionResult.structured_content,
          status: "pending_review",
          generation_source: "ai_gemini",
          ai_model_name: extractionResult.model_name,
          prompt_version: "v1.0.0",
          content_hash: extractionResult.content_hash,
          created_by: createdBy,
        })
        .select()
        .single();

      // 2. Insert field evidence
      if (extractionResult.evidence.length > 0) {
        const evidenceRows = extractionResult.evidence.map((ev) => ({
          id: crypto.randomUUID(),
          draft_id: draftId,
          field_path: ev.path,
          field_value: ev.value,
          exact_quote: ev.exact_quote,
          start_offset: ev.start_offset,
          end_offset: ev.end_offset,
          verification_status: ev.verification_status,
        }));

        await admin.from("draft_field_evidence").insert(evidenceRows);
      }

      // 3. Update intake status
      await admin
        .from("patient_intakes")
        .update({ status: "pending_review", updated_at: new Date().toISOString() })
        .eq("id", id);

      // 4. Log audit event
      await admin.from("audit_events").insert({
        action: "ai_generation_succeeded",
        entity_type: "clinical_draft",
        entity_id: draftId,
        intake_id: id,
        metadata: {
          model: extractionResult.model_name,
          evidence_count: extractionResult.evidence.length,
          content_hash: extractionResult.content_hash,
        },
      });

      if (draftRecord) {
        return NextResponse.json({
          success: true,
          draft: {
            ...draftRecord,
            evidence: extractionResult.evidence,
          },
        });
      }
    }

    // Response in demo / offline mode
    return NextResponse.json({
      success: true,
      draft: {
        id: draftId,
        intake_id: id,
        version: 1,
        status: "pending_review",
        structured_content: extractionResult.structured_content,
        evidence: extractionResult.evidence,
        content_hash: extractionResult.content_hash,
        ai_model_name: extractionResult.model_name,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/intakes/[id]/generate-draft:", error);
    return NextResponse.json({ error: "Draft generation failed" }, { status: 500 });
  }
}

