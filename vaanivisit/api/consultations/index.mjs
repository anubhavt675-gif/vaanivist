// GET /api/consultations  POST /api/consultations
import { getAdminClient, corsHeaders, DEMO_DOCTOR_ID, DEMO_PATIENT_ID } from "../_shared.mjs";
import crypto from "crypto";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();

  if (req.method === "GET") {
    try {
      const { role = "doctor", status } = req.query;
      let query = admin.from("consultations").select("*").order("created_at", { ascending: false }).limit(100);
      if (status) query = query.eq("status", status);
      const { data = [] } = await query;
      return res.json({ consultations: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      const item = { id: body.id || crypto.randomUUID(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const { data } = await admin.from("consultations").upsert(item, { onConflict: "id" }).select().single();
      return res.status(201).json({ success: true, consultation: data || item });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
