// GET /api/prescriptions
import { getAdminClient, corsHeaders } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const admin = await getAdminClient();
  try {
    const { data = [] } = await admin.from("prescriptions").select("*").order("issued_at", { ascending: false }).limit(50);
    return res.json({ prescriptions: data });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
