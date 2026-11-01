// GET /api/notifications  POST /api/notifications/mark-read
import { getAdminClient, corsHeaders } from "../_shared.mjs";

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const admin = await getAdminClient();
  const urlPath = req.url || "";

  if (req.method === "POST" && urlPath.includes("/mark-read")) {
    try {
      const { notification_ids } = req.body;
      if (notification_ids?.length) {
        await admin.from("notifications").update({ read: true }).in("id", notification_ids);
      } else {
        await admin.from("notifications").update({ read: true }).eq("read", false);
      }
      return res.json({ success: true });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (req.method === "GET") {
    try {
      const { user_id } = req.query;
      let query = admin.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (user_id) query = query.or(`user_id.eq.${user_id},user_id.is.null`);
      const { data = [] } = await query;
      return res.json({ notifications: data });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
