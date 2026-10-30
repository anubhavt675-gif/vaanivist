import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/app/lib/supabase/server";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";

const CreateIntakeSchema = z.object({
  source_text: z.string().min(1, "Source text cannot be empty").max(5000, "Source text exceeds maximum limit"),
  source_language: z.enum(["hindi", "hinglish", "english"]).default("hinglish"),
  input_method: z.enum(["text", "voice", "quick_example"]).default("text"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateIntakeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { source_text, source_language, input_method } = parsed.data;

    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();

    let userId = "ae05e114-5671-45da-ad13-ba1e60de8b7e"; // Default demo patient ID (Rohan Kumar)

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      } else if (admin) {
        const { data: defaultPatient } = await admin
          .from("profiles")
          .select("id")
          .eq("role", "patient")
          .limit(1)
          .maybeSingle();
        if (defaultPatient) {
          userId = defaultPatient.id;
        }
      }
    }

    const intakeRecord = {
      id: crypto.randomUUID(),
      patient_id: userId,
      source_text,
      source_language,
      input_method,
      status: "submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (admin) {
      const { data, error } = await admin
        .from("patient_intakes")
        .insert(intakeRecord)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({ success: true, intake: data }, { status: 201 });
      }
    }

    // In local demo mode or unconfigured DB, return the intake record
    return NextResponse.json({ success: true, intake: intakeRecord }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/intakes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();

    if (admin) {
      const { data, error } = await admin
        .from("patient_intakes")
        .select("*, profiles!patient_id(display_name)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return NextResponse.json({ intakes: data });
      }
    }

    return NextResponse.json({
      intakes: [
        {
          id: "aaaa1111-aaaa-1111-aaaa-111111111111",
          patient_id: "11111111-1111-1111-1111-111111111111",
          source_text: "Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...",
          source_language: "hinglish",
          status: "pending_review",
          created_at: new Date().toISOString(),
        },
      ],
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/intakes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

