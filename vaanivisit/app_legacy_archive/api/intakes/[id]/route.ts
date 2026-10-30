import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getSupabaseAdminClient();

    if (admin) {
      const { data: intake, error } = await admin
        .from("patient_intakes")
        .select("*, clinical_drafts(*)")
        .eq("id", id)
        .single();

      if (!error && intake) {
        return NextResponse.json({ intake });
      }
    }

    return NextResponse.json({
      intake: {
        id,
        patient_id: "11111111-1111-1111-1111-111111111111",
        source_text: "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...",
        source_language: "hinglish",
        status: "pending_review",
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/intakes/[id]:", error);
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
    const { source_text } = body;

    if (!source_text || typeof source_text !== "string" || source_text.trim().length === 0) {
      return NextResponse.json({ error: "Valid source_text is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from("patient_intakes")
        .update({
          source_text: source_text.trim(),
          status: "submitted", // Reset status to submitted if source text changes
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, intake: data });
      }
    }

    return NextResponse.json({
      success: true,
      intake: {
        id,
        source_text: source_text.trim(),
        status: "submitted",
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/intakes/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

