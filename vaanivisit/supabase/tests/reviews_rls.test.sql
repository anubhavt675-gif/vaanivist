-- Test: supabase/tests/reviews_rls.test.sql
-- Description: Tests for review workflow, atomic decision making, and role enforcement

BEGIN;

DO $$
DECLARE
    v_patient UUID := '11111111-1111-1111-1111-111111111111';
    v_reviewer UUID := '33333333-3333-3333-3333-333333333333';
    v_intake_id UUID;
    v_draft_id UUID;
    v_review_id UUID;
    v_unauthorized_caught BOOLEAN := false;
    v_hash_mismatch_caught BOOLEAN := false;
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES 
        (v_patient, 'Rohan Kumar', 'patient'),
        (v_reviewer, 'Dr. Priya Sharma', 'reviewer')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.patient_intakes (patient_id, source_text, source_language)
    VALUES (v_patient, 'Pet dard subah se', 'hinglish')
    RETURNING id INTO v_intake_id;

    v_draft_id := public.atomic_create_draft_version(
        v_intake_id,
        '{"main_complaint": "Pet dard"}'::jsonb,
        'ai_gemini',
        'gemini-2.5-flash',
        'v1.0',
        'hash_valid_789',
        v_reviewer
    );

    -- Test 1: Patient attempting to review/approve own draft must be rejected
    BEGIN
        PERFORM public.atomic_submit_review(
            v_draft_id,
            v_patient, -- Unauthorized actor
            'approved',
            'I approve my own record',
            'hash_valid_789'
        );
    EXCEPTION WHEN OTHERS THEN
        v_unauthorized_caught := true;
    END;

    ASSERT v_unauthorized_caught = true,
        'Test 1 Failed: Patient must NOT be permitted to submit reviews or approve drafts';

    -- Test 2: Content hash mismatch protection
    BEGIN
        PERFORM public.atomic_submit_review(
            v_draft_id,
            v_reviewer,
            'approved',
            'Verified clinical evidence',
            'stale_hash_mismatch'
        );
    EXCEPTION WHEN OTHERS THEN
        v_hash_mismatch_caught := true;
    END;

    ASSERT v_hash_mismatch_caught = true,
        'Test 2 Failed: Review submission must reject stale/mismatched content hash';

    -- Test 3: Authorized reviewer approval
    v_review_id := public.atomic_submit_review(
        v_draft_id,
        v_reviewer,
        'approved',
        'Verified clinical evidence',
        'hash_valid_789'
    );

    ASSERT v_review_id IS NOT NULL, 'Test 3 Failed: Review submission failed for authorized reviewer';
    ASSERT (SELECT status FROM public.clinical_drafts WHERE id = v_draft_id) = 'approved',
        'Test 3 Failed: Draft status was not updated to approved';
    ASSERT (SELECT status FROM public.patient_intakes WHERE id = v_intake_id) = 'approved',
        'Test 3 Failed: Intake status was not updated to approved';

    RAISE NOTICE 'SUCCESS: All review workflow and reviewer authorization tests passed.';
END $$;

ROLLBACK;

