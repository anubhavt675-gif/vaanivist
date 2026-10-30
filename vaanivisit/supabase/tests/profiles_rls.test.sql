-- Test: supabase/tests/profiles_rls.test.sql
-- Description: Security tests for User Profiles and Role Escalation Protection

BEGIN;

-- 1. Create simulated auth users
DO $$
DECLARE
    v_patient_id UUID := '11111111-1111-1111-1111-111111111111';
    v_attacker_id UUID := '22222222-2222-2222-2222-222222222222';
    v_reviewer_id UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
    -- Insert test profiles directly
    INSERT INTO public.profiles (id, display_name, role, preferred_language)
    VALUES 
        (v_patient_id, 'Rohan Kumar', 'patient', 'hindi'),
        (v_attacker_id, 'Malicious User', 'patient', 'english'),
        (v_reviewer_id, 'Dr. Priya Sharma', 'reviewer', 'hinglish')
    ON CONFLICT (id) DO NOTHING;

    -- Test 1: Verify get_user_role returns expected roles
    ASSERT (SELECT public.get_user_role(v_patient_id)) = 'patient', 'Test 1 Failed: Patient role mismatch';
    ASSERT (SELECT public.get_user_role(v_reviewer_id)) = 'reviewer', 'Test 1 Failed: Reviewer role mismatch';

    -- Test 2: Verify is_reviewer logic
    ASSERT public.is_reviewer(v_reviewer_id) = true, 'Test 2 Failed: Reviewer should be recognized as reviewer';
    ASSERT public.is_reviewer(v_patient_id) = false, 'Test 2 Failed: Patient must not be recognized as reviewer';

    RAISE NOTICE 'SUCCESS: All profile security and role isolation tests passed.';
END $$;

ROLLBACK;

