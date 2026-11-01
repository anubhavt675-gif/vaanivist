// GET /api/doctor/overview
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = await getAdminClient();
  try {
    const { count: pendingCount } = await admin.from("patient_intakes").select("id", { count: "exact", head: true }).in("status", ["submitted", "pending_review"]);
    const { count: inReviewCount } = await admin.from("patient_intakes").select("id", { count: "exact", head: true }).eq("status", "in_review");
    const { count: totalCount } = await admin.from("patient_intakes").select("id", { count: "exact", head: true });
    return res.json({ overview: { pending_reviews: pendingCount || 0, in_review: inReviewCount || 0, total_patients: totalCount || 0 } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
