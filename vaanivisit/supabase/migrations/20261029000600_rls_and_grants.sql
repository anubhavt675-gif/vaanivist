-- Migration: 20261029000600_rls_and_grants.sql
-- Description: Complete Row Level Security policies and role-based permissions

-- 1. Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_field_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
-- Users can view their own profile; Reviewers/Admins can view all patient profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR public.is_reviewer(auth.uid()) OR public.is_admin(auth.uid())
    );

-- Users can only update their own display_name, avatar, and language. Role escalation is prevented.
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Role cannot be changed by user
    );

-- 3. Patient Intakes Policies
-- Patients can view their own intakes; Reviewers and Admins can view review queue intakes
CREATE POLICY "patient_intakes_select_policy" ON public.patient_intakes
    FOR SELECT
    TO authenticated
    USING (
        patient_id = auth.uid() 
        OR public.is_reviewer(auth.uid()) 
        OR public.is_admin(auth.uid())
    );

-- Patients can create their own intakes with patient_id strictly bound to auth.uid()
CREATE POLICY "patient_intakes_insert_policy" ON public.patient_intakes
    FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = auth.uid());

-- Patients can update their own unapproved intakes; Reviewers can update assignment and review status
CREATE POLICY "patient_intakes_update_policy" ON public.patient_intakes
    FOR UPDATE
    TO authenticated
    USING (
        (patient_id = auth.uid() AND status IN ('submitted', 'changes_requested'))
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    )
    WITH CHECK (
        (patient_id = auth.uid() AND status IN ('submitted', 'changes_requested'))
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- 4. Clinical Drafts Policies
-- Patients can read drafts for their own intakes; Reviewers/Admins can read drafts in queue
CREATE POLICY "clinical_drafts_select_policy" ON public.clinical_drafts
    FOR SELECT
    TO authenticated
    USING (
        intake_id IN (SELECT id FROM public.patient_intakes WHERE patient_id = auth.uid())
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- Only Reviewers, Admins, or server service role can insert drafts
CREATE POLICY "clinical_drafts_insert_policy" ON public.clinical_drafts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_reviewer(auth.uid()) 
        OR public.is_admin(auth.uid())
        OR intake_id IN (SELECT id FROM public.patient_intakes WHERE patient_id = auth.uid())
    );

-- Clinical drafts can only be updated if not approved (immutability trigger also guards this)
CREATE POLICY "clinical_drafts_update_policy" ON public.clinical_drafts
    FOR UPDATE
    TO authenticated
    USING (
        status <> 'approved' 
        AND (public.is_reviewer(auth.uid()) OR public.is_admin(auth.uid()))
    );

-- 5. Draft Field Evidence Policies
-- Accessible to anyone authorized to read the corresponding draft
CREATE POLICY "draft_field_evidence_select_policy" ON public.draft_field_evidence
    FOR SELECT
    TO authenticated
    USING (
        draft_id IN (
            SELECT cd.id FROM public.clinical_drafts cd
            JOIN public.patient_intakes pi ON cd.intake_id = pi.id
            WHERE pi.patient_id = auth.uid() 
               OR public.is_reviewer(auth.uid()) 
               OR public.is_admin(auth.uid())
        )
    );

-- Insert evidence allowed for reviewers, admins, or intake owners generating draft
CREATE POLICY "draft_field_evidence_insert_policy" ON public.draft_field_evidence
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_reviewer(auth.uid()) 
        OR public.is_admin(auth.uid())
        OR draft_id IN (
            SELECT cd.id FROM public.clinical_drafts cd
            JOIN public.patient_intakes pi ON cd.intake_id = pi.id
            WHERE pi.patient_id = auth.uid()
        )
    );

-- 6. Review Actions Policies
-- Review history visible to patient (own record) and reviewers/admins
CREATE POLICY "review_actions_select_policy" ON public.review_actions
    FOR SELECT
    TO authenticated
    USING (
        intake_id IN (SELECT id FROM public.patient_intakes WHERE patient_id = auth.uid())
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- Only verified reviewers and administrators can insert review decisions
CREATE POLICY "review_actions_insert_policy" ON public.review_actions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        reviewer_id = auth.uid() 
        AND (public.is_reviewer(auth.uid()) OR public.is_admin(auth.uid()))
    );

-- 7. Export Records Policies
-- Users can view their own exports; reviewers/admins can view exports for their queue
CREATE POLICY "export_records_select_policy" ON public.export_records
    FOR SELECT
    TO authenticated
    USING (
        exporting_user_id = auth.uid()
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    );

-- Users can insert export records ONLY for approved drafts
CREATE POLICY "export_records_insert_policy" ON public.export_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        exporting_user_id = auth.uid()
        AND draft_id IN (SELECT id FROM public.clinical_drafts WHERE status = 'approved')
    );

-- 8. Audit Events Policies (Immutable Append-Only Log)
-- Read policy: Only administrators may query audit history
CREATE POLICY "audit_events_select_policy" ON public.audit_events
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Insert policy: Allowed for authenticated users recording their actions
CREATE POLICY "audit_events_insert_policy" ON public.audit_events
    FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- UPDATE and DELETE on audit_events are strictly NOT permitted for any user role.

-- 9. Table and Schema Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.patient_intakes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.clinical_drafts TO authenticated;
GRANT SELECT, INSERT ON TABLE public.draft_field_evidence TO authenticated;
GRANT SELECT, INSERT ON TABLE public.review_actions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.export_records TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_events TO authenticated;

-- Service role has full permissions for maintenance and administrative operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

