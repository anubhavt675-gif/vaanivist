-- Supabase Migration: Create missing tables for Vision app
-- Run this in Supabase Dashboard > SQL Editor

-- 1. consultations table
CREATE TABLE IF NOT EXISTS public.consultations (
  id TEXT PRIMARY KEY,
  intake_id TEXT REFERENCES public.patient_intakes(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_name TEXT,
  assigned_doctor_id UUID,
  assigned_doctor_name TEXT,
  source_text TEXT,
  source_language TEXT DEFAULT 'hinglish',
  main_complaint TEXT,
  duration TEXT,
  severity TEXT DEFAULT 'moderate',
  is_urgent BOOLEAN DEFAULT FALSE,
  urgent_reason TEXT,
  status TEXT DEFAULT 'in_review',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  decline_reason TEXT,
  doctor_notes TEXT,
  doctor_questions JSONB DEFAULT '[]',
  structured_content JSONB DEFAULT '{}',
  has_prescription BOOLEAN DEFAULT FALSE,
  prescription_id TEXT,
  prescription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.consultations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read" ON public.consultations FOR SELECT TO anon USING (true);

-- 2. messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  consultation_id TEXT REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_name TEXT,
  sender_role TEXT DEFAULT 'patient',
  receiver_id UUID,
  receiver_name TEXT,
  text TEXT NOT NULL,
  attachment JSONB,
  is_initial_complaint BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read" ON public.messages FOR SELECT TO anon USING (true);

-- 3. notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read" ON public.notifications FOR SELECT TO anon USING (true);

-- 4. prescriptions table
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id TEXT PRIMARY KEY,
  consultation_id TEXT REFERENCES public.consultations(id) ON DELETE CASCADE,
  medications JSONB DEFAULT '[]',
  instructions TEXT,
  diagnosis TEXT,
  next_appointment TEXT,
  issued_by_doctor_id UUID,
  issued_by_doctor_name TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.prescriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read" ON public.prescriptions FOR SELECT TO anon USING (true);
