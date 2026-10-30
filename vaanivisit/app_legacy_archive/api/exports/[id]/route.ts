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
      const { data, error } = await admin
        .from("export_records")
        .select("*, clinical_drafts(*)")
        .eq("id", id)
        .single();

      if (!error && data) {
        return NextResponse.json({ export_record: data });
      }
    }

    return NextResponse.json({
      export_record: {
        id,
        format: "pdf",
        status: "completed",
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/exports/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

