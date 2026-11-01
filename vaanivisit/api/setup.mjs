// One-time Supabase table setup - call GET /api/setup to create missing tables
// This uses the Supabase Management API which requires a personal access token
import { corsHeaders } from "./_shared.mjs";
import { createClient } from "@supabase/supabase-js";

const SQL = `
CREATE TABLE IF NOT EXISTS public.consultations (
  id TEXT PRIMARY KEY,
  intake_id TEXT,
  patient_id UUID,
  patient_name TEXT,
  assigned_doctor_id UUID,
  assigned_doctor_name TEXT,
  source_text TEXT,
  source_language TEXT DEFAULT 'hinglish',
  main_complaint TEXT,
  duration TEXT,
  severity TEXT DEFAULT 'moderate',
  is_urgent BOOLEAN DEFAULT FALSE,
  urgent_reason TEXT,
  status TEXT DEFAULT 'in_review',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  decline_reason TEXT,
  doctor_notes TEXT,
  doctor_questions JSONB DEFAULT '[]',
  structured_content JSONB DEFAULT '{}',
  has_prescription BOOLEAN DEFAULT FALSE,
  prescription_id TEXT,
  prescription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  consultation_id TEXT,
  sender_id UUID,
  sender_name TEXT,
  sender_role TEXT DEFAULT 'patient',
  receiver_id UUID,
  receiver_name TEXT,
  text TEXT NOT NULL,
  attachment JSONB,
  is_initial_complaint BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id TEXT PRIMARY KEY,
  consultation_id TEXT,
  medications JSONB DEFAULT '[]',
  instructions TEXT,
  diagnosis TEXT,
  next_appointment TEXT,
  issued_by_doctor_id UUID,
  issued_by_doctor_name TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "All authenticated" ON public.consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "All authenticated" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "All authenticated" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "All authenticated" ON public.prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  // Only allow GET/POST
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const pat = process.env.SUPABASE_PAT; // Personal Access Token - set this in Vercel env vars

  if (!pat) {
    return res.json({
      status: "manual_required",
      message: "Set SUPABASE_PAT env var in Vercel, OR run this SQL in Supabase Dashboard > SQL Editor:",
      sql: SQL,
      supabase_url: `https://supabase.com/dashboard/project/${projectRef || "wlwlbzrfazwtvsboljzp"}/sql/new`,
    });
  }

  try {
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${pat}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: SQL }),
    });
    const result = await sqlRes.json();
    if (!sqlRes.ok) return res.status(400).json({ error: "SQL failed", details: result });
    return res.json({ success: true, message: "Tables created successfully!", result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
