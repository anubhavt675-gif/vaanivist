-- Migration: 20261029000100_core_types.sql
-- Description: Core schema extensions and PostgreSQL ENUM types for VaaniVisit

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core User Roles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'patient',
            'reviewer',
            'admin'
        );
    END IF;
END $$;

-- 3. Patient Intake Lifecycle Statuses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intake_status') THEN
        CREATE TYPE intake_status AS ENUM (
            'submitted',
            'processing',
            'pending_review',
            'in_review',
            'changes_requested',
            'approved',
            'rejected',
            'failed'
        );
    END IF;
END $$;

-- 4. Clinical Draft Lifecycle Statuses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'draft_status') THEN
        CREATE TYPE draft_status AS ENUM (
            'draft',
            'pending_review',
            'changes_requested',
            'approved',
            'rejected',
            'superseded'
        );
    END IF;
END $$;

-- 5. Field Evidence Verification Statuses
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evidence_verification_status') THEN
        CREATE TYPE evidence_verification_status AS ENUM (
            'verified',
            'missing',
            'ambiguous',
            'invalid'
        );
    END IF;
END $$;

-- 6. Reviewer Decision Outcomes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_decision') THEN
        CREATE TYPE review_decision AS ENUM (
            'approved',
            'rejected',
            'changes_requested'
        );
    END IF;
END $$;

-- 7. Export Formats Supported
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_format') THEN
        CREATE TYPE export_format AS ENUM (
            'pdf',
            'print',
            'json'
        );
    END IF;
END $$;

-- 8. Audit Event Action Categories
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM (
            'intake_created',
            'intake_updated',
            'ai_generation_started',
            'ai_generation_succeeded',
            'ai_generation_failed',
            'draft_created',
            'draft_updated',
            'draft_versioned',
            'review_started',
            'review_submitted',
            'draft_approved',
            'draft_rejected',
            'changes_requested',
            'export_requested',
            'export_completed',
            'auth_failure',
            'role_changed',
            'reviewer_assigned'
        );
    END IF;
END $$;

