# VaaniVisit Environment & Database Setup Guide

## 1. Prerequisites

- Node.js 18+ (tested with Node 20)
- npm or pnpm
- Supabase project (`https://wlwlbzrfazwtvsboljzp.supabase.co`)
- Google Gemini API key

---

## 2. Environment Variables Configuration

Create `.env.local` inside the `vaanivisit` root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required credentials:

```env
# Public Supabase Client (safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://wlwlbzrfazwtvsboljzp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Private Supabase Service Key (SERVER ONLY - NEVER EXPOSE TO CLIENT)
SUPABASE_SECRET_KEY=your_supabase_service_role_key

# Google Gemini API Key (SERVER ONLY - NEVER EXPOSE TO CLIENT)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

> **Security Rule:** Never prefix `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY` with `NEXT_PUBLIC_`. Keep them strictly within server-side route handlers and services.

---

## 3. Local Development

```bash
cd vaanivisit
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Database Migrations

Apply the migration scripts in `supabase/migrations/` to your Supabase project in numerical order:
1. `20261029000100_core_types.sql`
2. `20261029000200_profiles_and_intakes.sql`
3. `20261029000300_drafts_and_evidence.sql`
4. `20261029000400_review_and_exports.sql`
5. `20261029000500_functions_and_triggers.sql`
6. `20261029000600_rls_and_grants.sql`
7. `20261029000700_storage_policies.sql`

Refer to `supabase/SQL_EDITOR_SETUP.md` for SQL Editor copy-paste instructions and test execution.

---

## 5. Running Automated Tests

Run the test suite:

```bash
npm run test
```

This validates:
- Fictional patient stories (Hindi, Hinglish, English)
- Evidence quote and character offset extraction
- Deterministic quote substring matching
- Missing field handling (`null` retention without fabrication)
- Approved draft immutability
- Reviewer approval workflow and content hash verification
- Export restrictions on unapproved drafts

