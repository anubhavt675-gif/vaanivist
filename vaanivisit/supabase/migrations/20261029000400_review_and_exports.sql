-- Migration: 20261029000400_review_and_exports.sql
-- Description: Reviewer actions, export records, and immutable security audit log

-- 1. Review Actions (Decisions on Draft Versions)
CREATE TABLE IF NOT EXISTS public.review_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.clinical_drafts(id) ON DELETE CASCADE,
    intake_id UUID NOT NULL REFERENCES public.patient_intakes(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decision review_decision NOT NULL,
    reviewer_notes TEXT,
    content_hash_at_decision TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review Actions Indexes
CREATE INDEX IF NOT EXISTS idx_review_actions_draft_id ON public.review_actions(draft_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_intake_id ON public.review_actions(intake_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_reviewer_id ON public.review_actions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_decision ON public.review_actions(decision);

-- 2. Export Records (Authorized, Hash-Verified Exports)
CREATE TABLE IF NOT EXISTS public.export_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.clinical_drafts(id) ON DELETE CASCADE,
    intake_id UUID NOT NULL REFERENCES public.patient_intakes(id) ON DELETE CASCADE,
    exporting_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    format export_format NOT NULL,
    approved_content_hash TEXT NOT NULL,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Export Records Indexes
CREATE INDEX IF NOT EXISTS idx_export_records_draft_id ON public.export_records(draft_id);
CREATE INDEX IF NOT EXISTS idx_export_records_user_id ON public.export_records(exporting_user_id);
CREATE INDEX IF NOT EXISTS idx_export_records_format ON public.export_records(format);

-- 3. Security & Operational Audit Events (Immutable Append-Only Log)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    intake_id UUID REFERENCES public.patient_intakes(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES public.clinical_drafts(id) ON DELETE SET NULL,
    request_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Events Indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_intake ON public.audit_events(intake_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at DESC);

