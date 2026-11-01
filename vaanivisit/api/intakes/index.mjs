// GET /api/intakes  POST /api/intakes
import { getAdminClient, getUserFromRequest, getTokenClient, corsHeaders, DEMO_PATIENT_ID, SUPABASE_URL, SUPABASE_KEY } from "../_shared.mjs";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();

  if (req.method === "GET") {
    try {
      const { data } = await admin.from("patient_intakes").select("*, profiles!patient_id(display_name)").order("created_at", { ascending: false });
      return res.json({ intakes: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { source_text, source_language = "hinglish", input_method = "text" } = req.body;
      if (!source_text?.trim()) return res.status(400).json({ error: "Source text cannot be empty" });

      let userId = null, client = null;
      const { user, token } = await getUserFromRequest(req);
      if (user?.id) { userId = user.id; client = getTokenClient(token); }
      if (!userId) {
        userId = DEMO_PATIENT_ID;
        client = createClient(SUPABASE_URL, SUPABASE_KEY);
        await client.auth.signInWithPassword({ email: "rohan.kumar@vaanivisit.demo", password: "Password123!" }).catch(() => {});
      }

      const intakeRecord = { id: crypto.randomUUID(), patient_id: userId, source_text, source_language, input_method, status: "submitted", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data, error } = await client.from("patient_intakes").insert(intakeRecord).select().single();

      if (!error && data) return res.status(201).json({ success: true, intake: data });
      return res.status(201).json({ success: true, intake: intakeRecord });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
