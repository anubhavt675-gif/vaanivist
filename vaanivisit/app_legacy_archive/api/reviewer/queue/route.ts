import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { mockPatients } from "@/app/lib/mockData";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const query = (searchParams.get("q") || "").toLowerCase();

    const admin = getSupabaseAdminClient();

    if (admin) {
      let dbQuery = admin
        .from("patient_intakes")
        .select(`
          id,
          patient_id,
          source_text,
          source_language,
          status,
          created_at,
          profiles!patient_id(display_name, preferred_language),
          clinical_drafts(id, version, structured_content, status, content_hash)
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        dbQuery = dbQuery.eq("status", filter);
      }

      const { data, error } = await dbQuery;

      if (!error && data && data.length > 0) {
        const formattedQueue = data.map((item: any) => {
          const drafts = Array.isArray(item.clinical_drafts) ? item.clinical_drafts : [];
          const latestDraft = drafts[0] || null;
          const structured = latestDraft?.structured_content || {};

          // Map database status to UI status label
          let uiStatus = "Pending";
          if (item.status === "in_review" || item.status === "changes_requested") uiStatus = "In Review";
          else if (item.status === "approved") uiStatus = "Approved";
          else if (item.status === "rejected") uiStatus = "Rejected";

          // Format date cleanly
          const createdDate = new Date(item.created_at);
          const dateStr = createdDate.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });

          // Build extracted fields array
          const extracted = [
            {
              field: "Main Complaint",
              value: structured.main_complaint || item.source_text.substring(0, 35),
              original: structured.main_complaint || item.source_text.substring(0, 35),
              confidence: structured.main_complaint ? 96 : 70,
              status: structured.main_complaint ? "High" : "Medium",
              iconType: "lungs"
            },
            {
              field: "Duration",
              value: structured.duration || "Not provided",
              original: structured.duration || "No clear duration in text",
              confidence: structured.duration ? 94 : 0,
              status: structured.duration ? "High" : "Unknown",
              iconType: "clock"
            },
            {
              field: "Symptom Pattern",
              value: structured.symptom_pattern || "Not provided",
              original: structured.symptom_pattern || "No clear pattern in text",
              confidence: structured.symptom_pattern ? 90 : 0,
              status: structured.symptom_pattern ? "High" : "Unknown",
              iconType: "chart"
            },
            {
              field: "Medicine Use",
              value: structured.medicine_use || "Not provided",
              original: structured.medicine_use || "No medicine mentioned",
              confidence: structured.medicine_use ? 88 : 0,
              status: structured.medicine_use ? "High" : "Unknown",
              iconType: "pill"
            },
            {
              field: "Known Allergies",
              value: structured.known_allergies || "Not provided",
              original: "No clear mention in text",
              confidence: 0,
              status: "Unknown",
              iconType: "shield"
            }
          ];

          return {
            id: item.id,
            intake_id: item.id,
            draft_id: latestDraft?.id || null,
            name: item.profiles?.display_name || "Patient",
            age: 28,
            language: (item.source_language ? item.source_language.charAt(0).toUpperCase() + item.source_language.slice(1) : "Hinglish"),
            status: uiStatus,
            date: dateStr,
            complaint: structured.main_complaint || item.source_text.substring(0, 38) + (item.source_text.length > 38 ? "..." : ""),
            story: item.source_text,
            extracted,
            content_hash: latestDraft?.content_hash || "",
            reviewerNotes: "",
            avatarColor: "linear-gradient(135deg, #ec4899, #8b5cf6)"
          };
        });

        // Filter and search
        let finalQueue = formattedQueue;
        if (filter !== "all") {
          finalQueue = finalQueue.filter((p: any) => p.status.toLowerCase().replace(" ", "_") === filter.toLowerCase());
        }
        if (query) {
          finalQueue = finalQueue.filter(
            (p: any) =>
              p.name.toLowerCase().includes(query) ||
              p.complaint.toLowerCase().includes(query) ||
              p.id.toLowerCase().includes(query)
          );
        }

        return NextResponse.json({ queue: finalQueue });
      }
    }

    // In demo / fallback mode, return filtered mock data matching UI
    let filtered = mockPatients;
    if (filter !== "all") {
      filtered = filtered.filter((p) => p.status.toLowerCase().replace(" ", "_") === filter.toLowerCase());
    }
    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.complaint.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ queue: filtered });
  } catch (error: unknown) {
    console.error("Error in GET /api/reviewer/queue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

