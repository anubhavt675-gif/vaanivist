-- Supabase Seed Data for VaaniVisit
-- Fictional, HIPAA/clinical-safe demonstration records

-- 1. Profiles
INSERT INTO public.profiles (id, display_name, preferred_language, role, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Rohan Kumar', 'hinglish', 'patient', true),
    ('22222222-2222-2222-2222-222222222222', 'Neha Verma', 'hinglish', 'patient', true),
    ('33333333-3333-3333-3333-333333333333', 'Dr. Priya Sharma', 'english', 'reviewer', true),
    ('44444444-4444-4444-4444-444444444444', 'System Administrator', 'english', 'admin', true)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

-- 2. Patient Intakes
INSERT INTO public.patient_intakes (
    id,
    patient_id,
    source_text,
    source_language,
    input_method,
    status,
    assigned_reviewer_id,
    submitted_at,
    created_at
)
VALUES 
    (
        'aaaa1111-aaaa-1111-aaaa-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'Mujhe 3 din se khansi hai, raat ko zyada hoti hai. Allergy ki medicine kabhi-kabhi leta hoon...',
        'hinglish',
        'text',
        'pending_review',
        '33333333-3333-3333-3333-333333333333',
        now() - INTERVAL '1 hour',
        now() - INTERVAL '1 hour'
    ),
    (
        'bbbb2222-bbbb-2222-bbbb-222222222222',
        '22222222-2222-2222-2222-222222222222',
        'Pet me dard rehta hai, saam kabhi ulti bhi hoti hai. Khana khane ke baad discomfort badhta hai.',
        'hinglish',
        'voice',
        'pending_review',
        '33333333-3333-3333-3333-333333333333',
        now() - INTERVAL '3 hours',
        now() - INTERVAL '3 hours'
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Clinical Drafts
INSERT INTO public.clinical_drafts (
    id,
    intake_id,
    version,
    structured_content,
    status,
    generation_source,
    ai_model_name,
    prompt_version,
    content_hash,
    created_by,
    created_at
)
VALUES 
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'aaaa1111-aaaa-1111-aaaa-111111111111',
        1,
        '{
            "main_complaint": "Khansi (cough)",
            "duration": "3 din",
            "symptom_pattern": "Raat ko zyada hoti hai",
            "medicine_use": "Allergy ki medicine kabhi-kabhi leta hoon",
            "known_allergies": null,
            "associated_symptoms": null
        }'::jsonb,
        'pending_review',
        'ai_gemini',
        'gemini-2.5-flash',
        'v1.0.0',
        'sha256_hash_rohan_draft_v1',
        '33333333-3333-3333-3333-333333333333',
        now() - INTERVAL '50 minutes'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Draft Field Evidence
INSERT INTO public.draft_field_evidence (
    draft_id,
    field_path,
    field_value,
    exact_quote,
    start_offset,
    end_offset,
    verification_status
)
VALUES 
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'main_complaint',
        'Khansi (cough)',
        'khansi',
        16,
        22,
        'verified'
    ),
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'duration',
        '3 din',
        '3 din',
        6,
        11,
        'verified'
    ),
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'symptom_pattern',
        'Raat ko zyada hoti hai',
        'raat ko zyada hoti hai',
        28,
        50,
        'verified'
    ),
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'medicine_use',
        'Allergy ki medicine kabhi-kabhi leta hoon',
        'Allergy ki medicine kabhi-kabhi leta hoon',
        52,
        93,
        'verified'
    ),
    (
        'dddd1111-dddd-1111-dddd-111111111111',
        'known_allergies',
        null,
        null,
        null,
        null,
        'missing'
    )
ON CONFLICT DO NOTHING;

