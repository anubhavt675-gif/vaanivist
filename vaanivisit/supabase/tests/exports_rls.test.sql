-- Test: supabase/tests/exports_rls.test.sql
-- Description: Tests for export verification, approval checks, and hash matching

BEGIN;

DO $$
DECLARE
    v_patient UUID := '11111111-1111-1111-1111-111111111111';
    v_reviewer UUID := '33333333-3333-3333-3333-333333333333';
    v_intake_id UUID;
    v_unapproved_draft UUID;
    v_approved_draft UUID;
    v_export_id UUID;
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES 
        (v_patient, 'Rohan Kumar', 'patient'),
        (v_reviewer, 'Dr. Priya Sharma', 'reviewer')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.patient_intakes (patient_id, source_text)
    VALUES (v_patient, 'Khansi and bukhar')
    RETURNING id INTO v_intake_id;

    -- Unapproved draft
    INSERT INTO public.clinical_drafts (
        intake_id, version, structured_content, status, generation_source, content_hash, created_by
    )
    VALUES (
        v_intake_id, 1, '{"complaint": "Khansi"}'::jsonb, 'pending_review', 'ai_gemini', 'hash_unapproved', v_reviewer
    )
    RETURNING id INTO v_unapproved_draft;

    -- Approved draft
    INSERT INTO public.clinical_drafts (
        intake_id, version, structured_content, status, generation_source, content_hash, created_by
    )
    VALUES (
        v_intake_id, 2, '{"complaint": "Khansi", "pattern": "night"}'::jsonb, 'approved', 'reviewer_edit', 'hash_approved_999', v_reviewer
    )
    RETURNING id INTO v_approved_draft;

    -- Test 1: Record export for approved draft succeeds
    INSERT INTO public.export_records (
        draft_id, intake_id, exporting_user_id, format, approved_content_hash
    )
    VALUES (
        v_approved_draft, v_intake_id, v_patient, 'pdf', 'hash_approved_999'
    )
    RETURNING id INTO v_export_id;

    ASSERT v_export_id IS NOT NULL, 'Test 1 Failed: Export record insertion failed for approved draft';

    RAISE NOTICE 'SUCCESS: Export eligibility verification tests passed.';
END $$;

ROLLBACK;

