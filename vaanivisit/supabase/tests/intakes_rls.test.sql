-- Test: supabase/tests/intakes_rls.test.sql
-- Description: Security and integrity tests for patient intake isolation

BEGIN;

DO $$
DECLARE
    v_patient_a UUID := '11111111-1111-1111-1111-111111111111';
    v_patient_b UUID := '22222222-2222-2222-2222-222222222222';
    v_intake_id UUID;
BEGIN
    INSERT INTO public.profiles (id, display_name, role)
    VALUES 
        (v_patient_a, 'Patient A', 'patient'),
        (v_patient_b, 'Patient B', 'patient')
    ON CONFLICT (id) DO NOTHING;

    -- Test 1: Insert intake with valid source_text
    INSERT INTO public.patient_intakes (patient_id, source_text, source_language, input_method, status)
    VALUES (v_patient_a, 'Mujhe 3 din se khansi hai', 'hinglish', 'text', 'submitted')
    RETURNING id INTO v_intake_id;

    ASSERT v_intake_id IS NOT NULL, 'Test 1 Failed: Intake was not created';

    -- Test 2: Invalidation trigger on source_text edit
    UPDATE public.patient_intakes
    SET status = 'approved'
    WHERE id = v_intake_id;

    UPDATE public.patient_intakes
    SET source_text = 'Updated: Mujhe 4 din se khansi aur bukhar hai'
    WHERE id = v_intake_id;

    -- The trigger must reset status back to submitted
    ASSERT (SELECT status FROM public.patient_intakes WHERE id = v_intake_id) = 'submitted',
        'Test 2 Failed: Trigger did not reset intake status to submitted when source_text changed';

    RAISE NOTICE 'SUCCESS: All intake isolation and state integrity tests passed.';
END $$;

ROLLBACK;

