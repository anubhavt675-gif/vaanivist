import dns from "dns";
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) {}
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://wlwlbzrfazwtvsboljzp.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_IqnTtw8qtmdUHCJHFm2ZbA_hu8qRlXF";

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: true, persistSession: false },
});

async function inspect() {
  const { data: authData, error: authError } = await admin.auth.signInWithPassword({
    email: "dr.priya@vaanivisit.demo",
    password: "Password123!",
  });
  console.log("Auth:", authData?.user?.id, authError?.message || "OK");
  const tables = [
    "patient_intakes",
    "clinical_drafts",
    "evidence",
    "audit_events",
    "profiles",
    "chats",
    "notifications",
    "draft_reviews",
    "user_roles"
  ];
  for (const t of tables) {
    const { data, error } = await admin.from(t).select("*").limit(2);
    if (error) {
      console.log(`[TABLE ${t}] ERROR: ${error.message} (code: ${error.code})`);
    } else {
      console.log(`[TABLE ${t}] ROWS: ${data.length}, COLUMNS: ${data[0] ? Object.keys(data[0]).join(", ") : "(table exists, empty)"}`);
      if (data[0]) {
        console.log(`   Sample:`, JSON.stringify(data[0]).slice(0, 160));
      }
    }
  }
}

inspect();
