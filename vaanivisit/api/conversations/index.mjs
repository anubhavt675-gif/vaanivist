// GET /api/conversations - works even without consultations/messages tables
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID, DEMO_PATIENT_ID } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const admin = await getAdminClient();
  const { role = "patient" } = req.query;

  try {
    const convMap = new Map();

    // Try consultations table first
    const { data: consultations = [], error: consErr } = await admin.from("consultations").select("*").order("created_at", { ascending: false }).limit(50);
    if (!consErr) {
      for (const c of consultations) {
        convMap.set(c.id, {
          id: c.id, consultation_id: c.id,
          patient_id: c.patient_id || DEMO_PATIENT_ID,
          patient_name: c.patient_name || "Patient",
          doctor_id: c.assigned_doctor_id || DEMO_DOCTOR_ID,
          doctor_name: c.assigned_doctor_name || "Dr. Priya Sharma",
          doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
          main_complaint: c.main_complaint || c.source_text || "General Consultation",
          status: c.status || "in_review",
          messages: [], unread_count: 0, last_message: null,
          updated_at: c.submitted_at || c.created_at || new Date().toISOString(),
          prescription: c.prescription || null,
          source_text: c.source_text || "",
        });
      }
    } else {
      // Fallback: derive conversations from patient_intakes + clinical_drafts
      const { data: intakes = [] } = await admin
        .from("patient_intakes")
        .select("*, clinical_drafts(id, status, structured_content)")
        .in("status", ["in_review", "submitted", "pending_review"])
        .order("created_at", { ascending: false })
        .limit(20);

      for (const intake of intakes) {
        const draft = (intake.clinical_drafts || [])[0];
        const structured = draft?.structured_content || {};
        convMap.set(intake.id, {
          id: intake.id, consultation_id: intake.id,
          patient_id: intake.patient_id || DEMO_PATIENT_ID,
          patient_name: "Patient",
          doctor_id: intake.assigned_reviewer_id || DEMO_DOCTOR_ID,
          doctor_name: "Dr. Priya Sharma",
          doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
          main_complaint: structured.main_complaint || intake.source_text?.substring(0, 50) || "General Consultation",
          status: intake.status || "in_review",
          messages: [{ id: "msg-init-" + intake.id, consultation_id: intake.id, sender_id: intake.patient_id, sender_name: "Patient", sender_role: "patient", receiver_id: DEMO_DOCTOR_ID, receiver_name: "Dr. Priya Sharma", text: intake.source_text || "Medical concern submitted", is_initial_complaint: true, created_at: intake.created_at, read: true }],
          unread_count: 0, last_message: { text: intake.source_text?.substring(0, 60) || "Medical concern submitted", created_at: intake.created_at },
          updated_at: intake.updated_at || intake.created_at || new Date().toISOString(),
          prescription: null,
          source_text: intake.source_text || "",
        });
      }
    }

    // Try messages table and layer on top
    const { data: allMessages = [], error: msgErr } = await admin.from("messages").select("*").order("created_at", { ascending: true }).limit(500);
    if (!msgErr) {
      for (const msg of allMessages) {
        const cId = msg.consultation_id || "general";
        if (!convMap.has(cId)) {
          convMap.set(cId, {
            id: cId, consultation_id: cId,
            patient_id: msg.sender_role === "patient" ? msg.sender_id : msg.receiver_id,
            patient_name: msg.sender_role === "patient" ? msg.sender_name : "Patient",
            doctor_id: msg.sender_role === "doctor" ? msg.sender_id : msg.receiver_id,
            doctor_name: msg.sender_role === "doctor" ? msg.sender_name : "Dr. Priya Sharma",
            doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
            main_complaint: "Medical Consultation", status: "in_review",
            messages: [], unread_count: 0, last_message: null,
            updated_at: msg.created_at, prescription: null,
            source_text: msg.is_initial_complaint ? msg.text : "",
          });
        }
        const conv = convMap.get(cId);
        conv.messages.push(msg);
        if (msg.is_initial_complaint && !conv.source_text) conv.source_text = msg.text;
        if (role === "patient" && msg.sender_role === "doctor" && !msg.read) conv.unread_count++;
        else if (role === "doctor" && msg.sender_role === "patient" && !msg.read) conv.unread_count++;
        if (!conv.last_message || new Date(msg.created_at) > new Date(conv.last_message.created_at)) {
          conv.last_message = msg; conv.updated_at = msg.created_at;
        }
      }
    }

    // Provide default welcome conversation if nothing
    if (convMap.size === 0) {
      const defaultId = "cons-welcome";
      convMap.set(defaultId, {
        id: defaultId, consultation_id: defaultId,
        patient_id: DEMO_PATIENT_ID, patient_name: "Patient",
        doctor_id: DEMO_DOCTOR_ID, doctor_name: "Dr. Priya Sharma",
        doctor_qualification: "MBBS, MD • Verified Medical Reviewer",
        main_complaint: "Welcome to Vision Consultation", status: "in_review",
        messages: [{ id: "msg-welcome-1", consultation_id: defaultId, sender_id: DEMO_DOCTOR_ID, sender_name: "Dr. Priya Sharma", sender_role: "doctor", receiver_id: DEMO_PATIENT_ID, text: "Namaste! I am Dr. Priya Sharma. How can I help you today?", created_at: new Date().toISOString(), read: true }],
        unread_count: 0, last_message: { text: "Namaste! How can I help you today?", created_at: new Date().toISOString() },
        updated_at: new Date().toISOString(), prescription: null, source_text: "",
      });
    }

    const list = Array.from(convMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return res.json({ conversations: list, total_unread: list.reduce((s, c) => s + (c.unread_count || 0), 0) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
