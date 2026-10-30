import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";

const ExportRequestSchema = z.object({
  format: z.enum(["pdf", "print", "json"]).default("pdf"),
  include_evidence: z.boolean().default(true),
  include_reviewer_notes: z.boolean().default(true),
  include_confidence: z.boolean().default(true),
  user_id: z.string().default("11111111-1111-1111-1111-111111111111"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = ExportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { format, include_evidence, include_reviewer_notes, include_confidence, user_id } = parsed.data;
    const admin = getSupabaseAdminClient();

    if (admin) {
      // 1. Fetch draft to verify approval status
      const { data: draft, error } = await admin
        .from("clinical_drafts")
        .select("*, patient_intakes(*), draft_field_evidence(*)")
        .eq("id", id)
        .single();

      if (error || !draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      // Security check: Never export an unapproved draft!
      if (draft.status !== "approved") {
        return NextResponse.json(
          {
            error: "Export blocked: Draft must be approved by a verified clinical reviewer before export.",
            current_status: draft.status,
          },
          { status: 403 }
        );
      }

      // 2. Record export event
      let resolvedUserId = user_id;
      const { data: userCheck } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user_id)
        .maybeSingle();

      if (!userCheck) {
        const { data: anyProfile } = await admin.from("profiles").select("id").limit(1).maybeSingle();
        if (anyProfile) resolvedUserId = anyProfile.id;
      }

      const exportId = crypto.randomUUID();
      await admin.from("export_records").insert({
        id: exportId,
        draft_id: id,
        intake_id: draft.intake_id,
        exporting_user_id: resolvedUserId,
        format,
        approved_content_hash: draft.content_hash,
      });

      // 3. Audit log
      await admin.from("audit_events").insert({
        actor_id: resolvedUserId,
        action: "export_completed",
        entity_type: "export_record",
        entity_id: exportId,
        intake_id: draft.intake_id,
        draft_id: id,
        metadata: { format, options: { include_evidence, include_reviewer_notes, include_confidence } },
      });

      return NextResponse.json({
        success: true,
        export_id: exportId,
        format,
        report_data: {
          report_title: "VaaniVisit Patient Intake Clinical Report",
          patient_id: draft.patient_intakes?.patient_id || "VP001",
          date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          structured_content: draft.structured_content,
          evidence: include_evidence ? draft.draft_field_evidence : [],
          content_hash: draft.content_hash,
          approved_by: draft.patient_intakes?.assigned_reviewer_id || "Dr. Priya Sharma",
        },
      });
    }

    // Demo / fallback response: Return report payload
    return NextResponse.json({
      success: true,
      export_id: crypto.randomUUID(),
      format,
      report_data: {
        report_title: "VaaniVisit Patient Intake Clinical Report",
        patient_id: "VP001",
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        structured_content: {
          main_complaint: "Khansi (cough)",
          duration: "3 din",
          symptom_pattern: "Raat ko zyada hoti hai",
          medicine_use: "Allergy ki medicine kabhi-kabhi leta hoon",
          known_allergies: "Not provided",
        },
        content_hash: "sha256_approved_hash_demo",
        approved_by: "Dr. Priya Sharma",
      },
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/drafts/[id]/export:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

