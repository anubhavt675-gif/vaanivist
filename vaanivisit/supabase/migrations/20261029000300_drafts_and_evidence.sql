-- Migration: 20261029000300_drafts_and_evidence.sql
-- Description: Clinical draft versioning and factual field-level source evidence quotes

-- 1. Clinical Drafts (Versioned)
CREATE TABLE IF NOT EXISTS public.clinical_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_id UUID NOT NULL REFERENCES public.patient_intakes(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    structured_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    status draft_status NOT NULL DEFAULT 'draft',
    generation_source TEXT NOT NULL 
        CHECK (generation_source IN ('ai_gemini', 'reviewer_edit', 'system_fallback', 'manual')),
    ai_model_name TEXT,
    prompt_version TEXT,
    content_hash TEXT NOT NULL,
    superseded_draft_id UUID REFERENCES public.clinical_drafts(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_intake_version UNIQUE (intake_id, version)
);

-- Clinical Drafts Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_drafts_intake_id ON public.clinical_drafts(intake_id);
CREATE INDEX IF NOT EXISTS idx_clinical_drafts_status ON public.clinical_drafts(status);
CREATE INDEX IF NOT EXISTS idx_clinical_drafts_content_hash ON public.clinical_drafts(content_hash);
CREATE INDEX IF NOT EXISTS idx_clinical_drafts_created_by ON public.clinical_drafts(created_by);

-- 2. Draft Field Evidence (Factual Evidence with Exact Source Quotes & Offsets)
CREATE TABLE IF NOT EXISTS public.draft_field_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID NOT NULL REFERENCES public.clinical_drafts(id) ON DELETE CASCADE,
    field_path TEXT NOT NULL,
    field_value TEXT,
    exact_quote TEXT,
    start_offset INTEGER CHECK (start_offset >= 0),
    end_offset INTEGER CHECK (end_offset >= start_offset),
    verification_status evidence_verification_status NOT NULL DEFAULT 'verified',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Draft Field Evidence Indexes
CREATE INDEX IF NOT EXISTS idx_draft_field_evidence_draft_id ON public.draft_field_evidence(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_field_evidence_path ON public.draft_field_evidence(draft_id, field_path);
CREATE INDEX IF NOT EXISTS idx_draft_field_evidence_status ON public.draft_field_evidence(verification_status);

