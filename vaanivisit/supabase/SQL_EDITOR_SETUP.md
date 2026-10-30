# Supabase SQL Editor Setup & Migration Guide

This guide provides instructions for deploying and verifying the complete VaaniVisit PostgreSQL schema on Supabase (`https://wlwlbzrfazwtvsboljzp.supabase.co`).

---

## 1. Migration Files & Execution Order

All migrations are located in `supabase/migrations/` and must be applied sequentially:

| Step | Migration File | Description |
|:---:|:---|:---|
| 1 | `20261029000100_core_types.sql` | PostgreSQL extensions (`uuid-ossp`, `pgcrypto`) and ENUM types |
| 2 | `20261029000200_profiles_and_intakes.sql` | `profiles` (linked to `auth.users`) and `patient_intakes` tables + indexes |
| 3 | `20261029000300_drafts_and_evidence.sql` | `clinical_drafts` (versioned) and `draft_field_evidence` (source quotes & offsets) |
| 4 | `20261029000400_review_and_exports.sql` | `review_actions`, `export_records`, and `audit_events` |
| 5 | `20261029000500_functions_and_triggers.sql` | Security definer functions, atomic versioning, review actions, and immutability triggers |
| 6 | `20261029000600_rls_and_grants.sql` | Row Level Security (RLS) policies and role-based permissions |
| 7 | `20261029000700_storage_policies.sql` | Private `medical-reports` bucket and storage policies |

Optional:
- `seed.sql`: Fictional demonstration records for testing review, drafts, and evidence workflows.

---

## 2. Applying via Supabase Dashboard SQL Editor

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard/project/wlwlbzrfazwtvsboljzp).
2. Open the **SQL Editor** from the left navigation.
3. Open `supabase/migrations/20261029000100_core_types.sql`, copy its content, paste into the query editor, and click **Run**.
4. Repeat in order for steps 2 through 7.
5. If running on an existing database, each migration uses `CREATE ... IF NOT EXISTS` and `DO $$ BEGIN ... END $$` blocks to ensure idempotency without dropping existing production data.

---

## 3. Schema Verification Queries

After applying the migrations, run these verification queries in the SQL Editor:

### A. Verify All 7 Application Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'profiles', 'patient_intakes', 'clinical_drafts', 
    'draft_field_evidence', 'review_actions', 'export_records', 'audit_events'
  )
ORDER BY table_name;
```

### B. Verify Row Level Security is Enabled on All Tables
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'patient_intakes', 'clinical_drafts', 
    'draft_field_evidence', 'review_actions', 'export_records', 'audit_events'
  );
-- All rowsecurity values should return true.
```

### C. Verify Triggers and Security Functions
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname IN (
    'get_user_role', 'is_reviewer', 'is_admin', 
    'atomic_create_draft_version', 'atomic_submit_review', 
    'record_audit_event', 'handle_new_user'
);
-- prosecdef should be true for all SECURITY DEFINER functions.
```

---

## 4. Running Database Tests

The test suite in `supabase/tests/` verifies RLS and transactional integrity using atomic rollbacks:

1. In the SQL Editor, paste the contents of `supabase/tests/profiles_rls.test.sql` and run. Expected output:
   `NOTICE: SUCCESS: All profile security and role isolation tests passed.`
2. Run `supabase/tests/intakes_rls.test.sql`. Expected output:
   `NOTICE: SUCCESS: All intake isolation and state integrity tests passed.`
3. Run `supabase/tests/drafts_rls.test.sql`. Expected output:
   `NOTICE: SUCCESS: Draft versioning and approved draft immutability tests passed.`
4. Run `supabase/tests/reviews_rls.test.sql`. Expected output:
   `NOTICE: SUCCESS: All review workflow and reviewer authorization tests passed.`
5. Run `supabase/tests/exports_rls.test.sql`. Expected output:
   `NOTICE: SUCCESS: Export eligibility verification tests passed.`

All tests execute inside a `BEGIN; ... ROLLBACK;` block, leaving zero test data in the database.

