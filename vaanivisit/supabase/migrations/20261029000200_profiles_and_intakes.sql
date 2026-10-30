-- Migration: 20261029000200_profiles_and_intakes.sql
-- Description: User profiles linked to auth.users and patient intake submissions

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'hinglish' 
        CHECK (preferred_language IN ('hindi', 'hinglish', 'english')),
    role user_role NOT NULL DEFAULT 'patient',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 2. Patient Intakes Table
CREATE TABLE IF NOT EXISTS public.patient_intakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_text TEXT NOT NULL 
        CHECK (char_length(trim(source_text)) > 0 AND char_length(source_text) <= 5000),
    source_language TEXT NOT NULL DEFAULT 'hinglish' 
        CHECK (source_language IN ('hindi', 'hinglish', 'english')),
    input_method TEXT NOT NULL DEFAULT 'text' 
        CHECK (input_method IN ('text', 'voice', 'quick_example')),
    status intake_status NOT NULL DEFAULT 'submitted',
    assigned_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

-- Patient Intakes Indexes
CREATE INDEX IF NOT EXISTS idx_patient_intakes_patient_id ON public.patient_intakes(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_status ON public.patient_intakes(status);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_assigned_reviewer ON public.patient_intakes(assigned_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_created_at ON public.patient_intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_active_queue ON public.patient_intakes(status, created_at DESC) 
    WHERE archived_at IS NULL;

