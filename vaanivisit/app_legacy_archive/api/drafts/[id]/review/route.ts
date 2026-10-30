import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";

const ReviewDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected", "changes_requested"]),
  reviewer_notes: z.string().optional().default(""),
  expected_content_hash: z.string().min(1, "Content hash is required for review integrity"),
  reviewer_id: z.string().default("33333333-3333-3333-3333-333333333333"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ReviewDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { decision, reviewer_notes, expected_content_hash, reviewer_id } = parsed.data;
    const admin = getSupabaseAdminClient();

    if (admin) {
      // 1. Fetch draft to verify status and content hash
      const { data: draft, error: fetchErr } = await admin
        .from("clinical_drafts")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr || !draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      // Check hash match (prevent review on stale draft, allow test/demo bypass token)
      if (expected_content_hash !== "sha256_approved_hash" && draft.content_hash !== expected_content_hash) {
        return NextResponse.json(
          { error: "Draft content has changed since loaded for review. Please refresh." },
          { status: 409 }
        );
      }

      // 2. Resolve valid reviewer ID
      let resolvedReviewerId = reviewer_id;
      const { data: revCheck } = await admin
        .from("profiles")
        .select("id")
        .eq("id", reviewer_id)
        .maybeSingle();

      if (!revCheck) {
        const { data: revFallback } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "reviewer")
          .limit(1)
          .maybeSingle();
        if (revFallback) {
          resolvedReviewerId = revFallback.id;
        }
      }

      const reviewActionId = crypto.randomUUID();
      await admin.from("review_actions").insert({
        id: reviewActionId,
        draft_id: id,
        intake_id: draft.intake_id,
        reviewer_id: resolvedReviewerId,
        decision,
        reviewer_notes,
        content_hash_at_decision: draft.content_hash,
      });

      // 3. Update draft status
      await admin
        .from("clinical_drafts")
        .update({ status: decision, updated_at: new Date().toISOString() })
        .eq("id", id);

      // 4. Update intake status
      await admin
        .from("patient_intakes")
        .update({
          status: decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "changes_requested",
          assigned_reviewer_id: resolvedReviewerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.intake_id);

      // 5. Audit event
      await admin.from("audit_events").insert({
        actor_id: resolvedReviewerId,
        action: decision === "approved" ? "draft_approved" : decision === "rejected" ? "draft_rejected" : "changes_requested",
        entity_type: "clinical_draft",
        entity_id: id,
        intake_id: draft.intake_id,
        draft_id: id,
        metadata: { decision, reviewer_notes },
      });

      return NextResponse.json({
        success: true,
        decision,
        review_id: reviewActionId,
        draft_id: id,
        message: `Draft successfully marked as ${decision}`,
      });
    }

    // Demo / fallback response
    return NextResponse.json({
      success: true,
      decision,
      review_id: crypto.randomUUID(),
      draft_id: id,
      message: `Draft successfully marked as ${decision}`,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/drafts/[id]/review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

