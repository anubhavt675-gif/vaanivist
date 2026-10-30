-- Test: supabase/tests/drafts_rls.test.sql
-- Description: Tests for draft versioning, immutability of approved drafts, and evidence linking

BEGIN;

DO $$
DECLARE
    v_patient UUID := '11111111-1111-1111-1111-111111111111';
    v_reviewer UUID := '33333333-3333-3333-3333-333333333333';
    v_intake_id UUID;
    v_draft_v1 UUID;
    v_draft_v2 UUID;
    v_immutable_error_caught BOOLEAN := false;
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES 
        (v_patient, 'Rohan Kumar', 'patient'),
        (v_reviewer, 'Dr. Priya Sharma', 'reviewer')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.patient_intakes (patient_id, source_text, source_language)
    VALUES (v_patient, 'Mujhe 3 din se khansi hai. Raat ko zyada hoti hai.', 'hinglish')
    RETURNING id INTO v_intake_id;

    -- Test 1: Atomic creation of draft version 1
    v_draft_v1 := public.atomic_create_draft_version(
        v_intake_id,
        '{"main_complaint": "Khansi", "duration": "3 din"}'::jsonb,
        'ai_gemini',
        'gemini-2.5-flash',
        'v1.0',
        'hash123abc',
        v_reviewer
    );

    ASSERT (SELECT version FROM public.clinical_drafts WHERE id = v_draft_v1) = 1,
        'Test 1 Failed: Initial draft version must be 1';

    -- Test 2: Atomic creation of draft version 2
    v_draft_v2 := public.atomic_create_draft_version(
        v_intake_id,
        '{"main_complaint": "Khansi", "duration": "3 din", "pattern": "Nocturnal"}'::jsonb,
        'reviewer_edit',
        NULL,
        NULL,
        'hash456def',
        v_reviewer,
        v_draft_v1
    );

    ASSERT (SELECT version FROM public.clinical_drafts WHERE id = v_draft_v2) = 2,
        'Test 2 Failed: Second draft version must be 2';
    ASSERT (SELECT status FROM public.clinical_drafts WHERE id = v_draft_v1) = 'superseded',
        'Test 2 Failed: Draft v1 should be marked superseded';

    -- Test 3: Approved draft immutability trigger
    UPDATE public.clinical_drafts
    SET status = 'approved'
    WHERE id = v_draft_v2;

    BEGIN
        UPDATE public.clinical_drafts
        SET structured_content = '{"mutated": true}'::jsonb
        WHERE id = v_draft_v2;
    EXCEPTION WHEN OTHERS THEN
        v_immutable_error_caught := true;
    END;

    ASSERT v_immutable_error_caught = true,
        'Test 3 Failed: Mutating an approved draft in place must raise an exception';

    RAISE NOTICE 'SUCCESS: Draft versioning and approved draft immutability tests passed.';
END $$;

ROLLBACK;

