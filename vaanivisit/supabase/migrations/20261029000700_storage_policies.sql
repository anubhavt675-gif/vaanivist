-- Migration: 20261029000700_storage_policies.sql
-- Description: Private Supabase Storage bucket and access policies for exported medical reports

-- 1. Create the private bucket for medical reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-reports',
    'medical-reports',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'application/json', 'text/html']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'application/json', 'text/html'];

-- 2. Storage RLS Policies
-- Download / Read: User can access reports within their own user folder (folder named after user_id or intake_id)
-- Path format: "{user_id}/{intake_id}/{draft_id}.pdf"
CREATE POLICY "medical_reports_select_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'medical-reports'
    AND (
        -- User owns the file folder
        (storage.foldername(name))[1] = auth.uid()::text
        -- Or user is an authorized reviewer / admin
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    )
);

-- Upload / Write: User can upload reports only into their own folder
CREATE POLICY "medical_reports_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'medical-reports'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_reviewer(auth.uid())
        OR public.is_admin(auth.uid())
    )
);

-- Delete: Only admins or service role can delete exported files
CREATE POLICY "medical_reports_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'medical-reports'
    AND public.is_admin(auth.uid())
);

