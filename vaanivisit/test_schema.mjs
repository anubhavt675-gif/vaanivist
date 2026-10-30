import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function check() {
  const tables = [
    'profiles',
    'patient_intakes',
    'clinical_drafts',
    'draft_field_evidence',
    'export_records',
    'review_actions',
    'audit_events',
    'consultations',
    'prescriptions',
    'notifications',
    'messages',
    'conversations',
    'doctor_requests',
    'doctor_profiles'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`${t}: ${error ? 'ERROR: ' + error.message : 'EXISTS (' + (data ? data.length : 0) + ')'}`);
  }
}
check();
