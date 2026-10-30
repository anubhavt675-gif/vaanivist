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
      // Find intake_id of this draft
      const { data: current } = await admin
        .from("clinical_drafts")
        .select("intake_id")
        .eq("id", id)
        .single();

      if (current?.intake_id) {
        const { data: history } = await admin
          .from("clinical_drafts")
          .select("id, version, status, generation_source, created_at, content_hash")
          .eq("intake_id", current.intake_id)
          .order("version", { ascending: false });

        return NextResponse.json({ history: history || [] });
      }
    }

    return NextResponse.json({
      history: [
        {
          id,
          version: 1,
          status: "pending_review",
          generation_source: "ai_gemini",
          created_at: new Date().toISOString(),
          content_hash: "sha256_mock_v1",
        },
      ],
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/drafts/[id]/history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

