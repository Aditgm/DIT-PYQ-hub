-- =============================================
-- CLEAN SUPABASE SQL MIGRATIONS - PAPER METADATA EDITING
-- Run these commands in your Supabase SQL Editor
-- All statements handle existing objects safely
-- =============================================

-- =============================================
-- 1. Create Paper Versions Table (Metadata Versioning)
-- =============================================
CREATE TABLE IF NOT EXISTS paper_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    metadata JSONB NOT NULL,
    edited_by UUID NOT NULL REFERENCES profiles(id),
    edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edit_reason TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('approval_edit', 'post_upload_edit', 'status_change', 'initial')),
    record_version INTEGER NOT NULL DEFAULT 1,
    
    UNIQUE(paper_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_paper_versions_paper_id ON paper_versions(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_versions_edited_by ON paper_versions(edited_by);

-- =============================================
-- 2. Alter Existing Papers Table
-- Only add columns if they don't exist
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='papers' AND column_name='record_version') THEN
        ALTER TABLE papers ADD COLUMN record_version INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='papers' AND column_name='file_sha256') THEN
        ALTER TABLE papers ADD COLUMN file_sha256 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='papers' AND column_name='last_edited_by') THEN
        ALTER TABLE papers ADD COLUMN last_edited_by UUID REFERENCES profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='papers' AND column_name='last_edited_at') THEN
        ALTER TABLE papers ADD COLUMN last_edited_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- =============================================
-- 3. Optimistic Locking Trigger
-- =============================================
CREATE OR REPLACE FUNCTION increment_paper_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.record_version = OLD.record_version + 1;
    NEW.last_edited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_paper_version ON papers;
CREATE TRIGGER trigger_increment_paper_version
BEFORE UPDATE ON papers
FOR EACH ROW EXECUTE FUNCTION increment_paper_version();

-- =============================================
-- 4. File Integrity Protection Trigger
-- Prevents modification of file-related fields after upload
-- =============================================
CREATE OR REPLACE FUNCTION prevent_file_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.file_url IS NOT NULL AND NEW.file_url != OLD.file_url THEN
        RAISE EXCEPTION 'File URL cannot be modified after upload. Use metadata edit instead.';
    END IF;
    IF OLD.cloudinary_public_id IS NOT NULL AND NEW.cloudinary_public_id != OLD.cloudinary_public_id THEN
        RAISE EXCEPTION 'Cloudinary ID cannot be modified after upload.';
    END IF;
    IF OLD.file_sha256 IS NOT NULL AND NEW.file_sha256 != OLD.file_sha256 THEN
        RAISE EXCEPTION 'File hash cannot be modified after upload.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_file_modification ON papers;
CREATE TRIGGER trigger_prevent_file_modification
BEFORE UPDATE ON papers
FOR EACH ROW EXECUTE FUNCTION prevent_file_modification();

-- =============================================
-- 5. RLS Policies for Paper Versions
-- =============================================
ALTER TABLE paper_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all paper versions" ON paper_versions;
CREATE POLICY "Admins can view all paper versions" 
ON paper_versions FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can insert paper versions" ON paper_versions;
CREATE POLICY "Admins can insert paper versions" 
ON paper_versions FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- =============================================
-- 6. Enhance Admin Audit Log
-- Only add columns if they don't exist
-- =============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='paper_id') THEN
        ALTER TABLE admin_audit_log ADD COLUMN paper_id UUID REFERENCES papers(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='change_details') THEN
        ALTER TABLE admin_audit_log ADD COLUMN change_details JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='previous_value') THEN
        ALTER TABLE admin_audit_log ADD COLUMN previous_value JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='new_value') THEN
        ALTER TABLE admin_audit_log ADD COLUMN new_value JSONB;
    END IF;
END $$;

-- =============================================
-- 7. Backfill Initial Versions for Existing Papers
-- Creates version 1 for all existing papers (safe to re-run)
-- =============================================
INSERT INTO paper_versions (paper_id, version_number, metadata, edited_by, edit_reason, change_type)
SELECT 
    id,
    1,
    jsonb_build_object(
        'title', title,
        'subject', subject,
        'degree', degree,
        'branch', branch,
        'semester', semester,
        'year', year,
        'exam_type', exam_type,
        'description', description,
        'status', status
    ),
    uploaded_by,
    'Initial submission',
    'initial'
FROM papers
ON CONFLICT DO NOTHING;

-- =============================================
-- 8. Create Function to Get Paper Version Diffs
-- =============================================
CREATE OR REPLACE FUNCTION get_paper_version_diff(paper_id UUID, version1 INTEGER, version2 INTEGER)
RETURNS JSONB AS $$
DECLARE
    meta1 JSONB;
    meta2 JSONB;
    diff JSONB := '{}'::JSONB;
    key TEXT;
BEGIN
    SELECT metadata INTO meta1 FROM paper_versions WHERE paper_id = $1 AND version_number = $2;
    SELECT metadata INTO meta2 FROM paper_versions WHERE paper_id = $1 AND version_number = $3;
    
    IF meta1 IS NULL OR meta2 IS NULL THEN
        RETURN '{}'::JSONB;
    END IF;
    
    FOR key IN SELECT jsonb_object_keys(meta1) LOOP
        IF meta1->key != meta2->key THEN
            diff := diff || jsonb_build_object(key, jsonb_build_object(
                'old', meta1->key,
                'new', meta2->key
            ));
        END IF;
    END LOOP;
    
    RETURN diff;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Migration Complete!
-- =============================================