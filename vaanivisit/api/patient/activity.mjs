// GET /api/patient/activity
import { corsHeaders } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  return res.json({
    activities: [
      { id: "act-1", type: "ai_analysis", title: "AI Analysis", subtitle: "2 hours ago", status: "Completed", badgeColor: "#059669", badgeBg: "#ecfdf5", iconType: "sparkles" },
      { id: "act-2", type: "doctor_request", title: "Doctor Request", subtitle: "3 hours ago", status: "In Progress", badgeColor: "#2563eb", badgeBg: "#eff6ff", iconType: "stethoscope" },
      { id: "act-3", type: "consultation", title: "Consultation", subtitle: "1 day ago", status: "Scheduled", badgeColor: "#7c3aed", badgeBg: "#f5f3ff", iconType: "calendar" },
      { id: "act-4", type: "prescription", title: "Prescription", subtitle: "2 days ago", status: "Available", badgeColor: "#0d9488", badgeBg: "#f0fdfa", iconType: "rx" },
    ],
  });
}
