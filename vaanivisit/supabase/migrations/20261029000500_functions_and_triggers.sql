-- Migration: 20261029000500_functions_and_triggers.sql
-- Description: Database functions, security helpers, triggers, and atomic workflow transactions

-- 1. Helper function: Get user role with pinned search_path
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = p_user_id;
$$;

-- 2. Helper function: Check if user is a reviewer or admin
CREATE OR REPLACE FUNCTION public.is_reviewer(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id 
          AND role IN ('reviewer', 'admin') 
          AND is_active = true
    );
$$;

-- 3. Helper function: Check if user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = p_user_id 
          AND role = 'admin' 
          AND is_active = true
    );
$$;

-- 4. Automatic Profile Creation on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_display_name TEXT;
    v_avatar_url TEXT;
BEGIN
    -- Extract safe display name, never trust client-supplied role
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Patient'
    );
    v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

    INSERT INTO public.profiles (
        id,
        display_name,
        avatar_url,
        preferred_language,
        role,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_display_name,
        v_avatar_url,
        'hinglish',
        'patient', -- Always default to patient. Roles must be granted administratively.
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        display_name = EXCLUDED.display_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = now();

    RETURN NEW;
END;
$$;

-- Trigger on auth.users for signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Updated_at maintenance trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_patient_intakes_updated_at ON public.patient_intakes;
CREATE TRIGGER set_patient_intakes_updated_at
    BEFORE UPDATE ON public.patient_intakes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clinical_drafts_updated_at ON public.clinical_drafts;
CREATE TRIGGER set_clinical_drafts_updated_at
    BEFORE UPDATE ON public.clinical_drafts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Enforce Approved Draft Immutability
-- An approved draft cannot be updated in place! Any edit must generate a new version.
CREATE OR REPLACE FUNCTION public.prevent_approved_draft_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'approved' THEN
        -- Allow only status transition if needed by system or disallow in-place content modifications
        IF NEW.structured_content <> OLD.structured_content 
           OR NEW.content_hash <> OLD.content_hash 
           OR NEW.version <> OLD.version THEN
            RAISE EXCEPTION 'Approved clinical drafts are immutable. Edits must be submitted as a new version.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_approved_draft_immutability ON public.clinical_drafts;
CREATE TRIGGER enforce_approved_draft_immutability
    BEFORE UPDATE ON public.clinical_drafts
    FOR EACH ROW EXECUTE FUNCTION public.prevent_approved_draft_mutation();

-- 7. Invalidate Dependent Approvals on Intake Source Modification
CREATE OR REPLACE FUNCTION public.handle_intake_source_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If the underlying clinical source text changed, invalidate pending or in-review status
    IF NEW.source_text <> OLD.source_text THEN
        NEW.status := 'submitted';
        NEW.updated_at := now();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_intake_source_change ON public.patient_intakes;
CREATE TRIGGER on_intake_source_change
    BEFORE UPDATE ON public.patient_intakes
    FOR EACH ROW EXECUTE FUNCTION public.handle_intake_source_change();

-- 8. Atomic Draft Version Creation Function
CREATE OR REPLACE FUNCTION public.atomic_create_draft_version(
    p_intake_id UUID,
    p_structured_content JSONB,
    p_generation_source TEXT,
    p_ai_model_name TEXT,
    p_prompt_version TEXT,
    p_content_hash TEXT,
    p_creator_id UUID,
    p_superseded_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_version INTEGER;
    v_new_draft_id UUID;
BEGIN
    -- Lock the intake row to prevent concurrent version numbering collisions
    PERFORM 1 FROM public.patient_intakes WHERE id = p_intake_id FOR UPDATE;

    -- Calculate the next sequential version number for this intake
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.clinical_drafts
    WHERE intake_id = p_intake_id;

    -- If a previous draft is being superseded, update its status
    IF p_superseded_id IS NOT NULL THEN
        UPDATE public.clinical_drafts
        SET status = 'superseded', updated_at = now()
        WHERE id = p_superseded_id;
    END IF;

    -- Insert the new draft version
    INSERT INTO public.clinical_drafts (
        intake_id,
        version,
        structured_content,
        status,
        generation_source,
        ai_model_name,
        prompt_version,
        content_hash,
        superseded_draft_id,
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        p_intake_id,
        v_next_version,
        p_structured_content,
        'pending_review',
        p_generation_source,
        p_ai_model_name,
        p_prompt_version,
        p_content_hash,
        p_superseded_id,
        p_creator_id,
        now(),
        now()
    )
    RETURNING id INTO v_new_draft_id;

    -- Update intake status to pending_review
    UPDATE public.patient_intakes
    SET status = 'pending_review', updated_at = now()
    WHERE id = p_intake_id;

    RETURN v_new_draft_id;
END;
$$;

-- 9. Atomic Review Submission Function
CREATE OR REPLACE FUNCTION public.atomic_submit_review(
    p_draft_id UUID,
    p_reviewer_id UUID,
    p_decision review_decision,
    p_reviewer_notes TEXT,
    p_expected_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_draft RECORD;
    v_review_action_id UUID;
    v_new_draft_status draft_status;
    v_new_intake_status intake_status;
BEGIN
    -- Verify reviewer authorization
    IF NOT public.is_reviewer(p_reviewer_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not an active reviewer or administrator.';
    END IF;

    -- Fetch and lock the draft
    SELECT * INTO v_draft
    FROM public.clinical_drafts
    WHERE id = p_draft_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clinical draft % not found.', p_draft_id;
    END IF;

    -- Verify content hash at decision time
    IF v_draft.content_hash <> p_expected_hash THEN
        RAISE EXCEPTION 'Content hash mismatch: Draft has been modified since it was loaded for review.';
    END IF;

    -- Determine target statuses based on decision
    IF p_decision = 'approved' THEN
        v_new_draft_status := 'approved';
        v_new_intake_status := 'approved';
    ELSIF p_decision = 'rejected' THEN
        v_new_draft_status := 'rejected';
        v_new_intake_status := 'rejected';
    ELSE
        v_new_draft_status := 'changes_requested';
        v_new_intake_status := 'changes_requested';
    END IF;

    -- Insert the review action record
    INSERT INTO public.review_actions (
        draft_id,
        intake_id,
        reviewer_id,
        decision,
        reviewer_notes,
        content_hash_at_decision,
        created_at
    )
    VALUES (
        p_draft_id,
        v_draft.intake_id,
        p_reviewer_id,
        p_decision,
        p_reviewer_notes,
        v_draft.content_hash,
        now()
    )
    RETURNING id INTO v_review_action_id;

    -- Update draft status
    UPDATE public.clinical_drafts
    SET status = v_new_draft_status, updated_at = now()
    WHERE id = p_draft_id;

    -- Update intake status and assign reviewer
    UPDATE public.patient_intakes
    SET 
        status = v_new_intake_status,
        assigned_reviewer_id = p_reviewer_id,
        updated_at = now()
    WHERE id = v_draft.intake_id;

    RETURN v_review_action_id;
END;
$$;

-- 10. Audit Logging Function
CREATE OR REPLACE FUNCTION public.record_audit_event(
    p_actor_id UUID,
    p_action audit_action,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_intake_id UUID DEFAULT NULL,
    p_draft_id UUID DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.audit_events (
        actor_id,
        action,
        entity_type,
        entity_id,
        intake_id,
        draft_id,
        request_id,
        metadata,
        created_at
    )
    VALUES (
        p_actor_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_intake_id,
        p_draft_id,
        p_request_id,
        p_metadata,
        now()
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

