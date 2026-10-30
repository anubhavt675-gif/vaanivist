import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { calculateContentHash } from "@/app/lib/clinical/hasher";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getSupabaseAdminClient();

    if (admin) {
      const { data: draft, error } = await admin
        .from("clinical_drafts")
        .select("*, draft_field_evidence(*)")
        .eq("id", id)
        .single();

      if (!error && draft) {
        return NextResponse.json({ draft });
      }
    }

    return NextResponse.json({
      draft: {
        id,
        version: 1,
        status: "pending_review",
        structured_content: {
          main_complaint: "Khansi (cough)",
          duration: "3 din",
          symptom_pattern: "Raat ko zyada hoti hai",
          medicine_use: "Allergy ki medicine kabhi-kabhi leta hoon",
          known_allergies: null,
        },
        content_hash: "sha256_mock_hash",
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/drafts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { structured_content, reviewer_notes } = body;

    const admin = getSupabaseAdminClient();

    if (admin) {
      // 1. Fetch current draft to check status
      const { data: currentDraft } = await admin
        .from("clinical_drafts")
        .select("*")
        .eq("id", id)
        .single();

      if (currentDraft && currentDraft.status === "approved") {
        return NextResponse.json(
          { error: "Approved drafts are immutable. New edits must create a new version." },
          { status: 400 }
        );
      }

      // 2. Calculate next version and create new versioned draft
      const newVersion = (currentDraft?.version || 1) + 1;
      const newHash = calculateContentHash(structured_content, "source");
      const newDraftId = crypto.randomUUID();

      let reviewerId = currentDraft?.created_by;
      const { data: reviewerProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "reviewer")
        .limit(1)
        .maybeSingle();
      if (reviewerProfile) {
        reviewerId = reviewerProfile.id;
      }

      await admin.from("clinical_drafts").insert({
        id: newDraftId,
        intake_id: currentDraft?.intake_id,
        version: newVersion,
        structured_content,
        status: "pending_review",
        generation_source: "reviewer_edit",
        content_hash: newHash,
        superseded_draft_id: id,
        created_by: reviewerId,
      });

      // Mark previous draft as superseded
      await admin
        .from("clinical_drafts")
        .update({ status: "superseded" })
        .eq("id", id);

      return NextResponse.json({
        success: true,
        draft: {
          id: newDraftId,
          version: newVersion,
          status: "pending_review",
          structured_content,
          content_hash: newHash,
        },
      });
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: crypto.randomUUID(),
        version: 2,
        status: "pending_review",
        structured_content,
        content_hash: calculateContentHash(structured_content || {}, "source"),
      },
    });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/drafts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

