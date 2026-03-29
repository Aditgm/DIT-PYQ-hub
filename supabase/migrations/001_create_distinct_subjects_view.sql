-- MT8: Create DISTINCT subjects view in Supabase
-- Migration: Create a read-only view for distinct subjects
-- Created: 2026-03-29

-- Drop view if exists (for re-runs)
DROP VIEW IF EXISTS distinct_subjects;

-- Create the view returning one row per distinct subject
-- This assumes the 'subjects' table or the 'papers' table has a 'subject' column
-- We'll use the papers table as that's where subject data exists
CREATE VIEW distinct_subjects AS
SELECT DISTINCT 
    subject
FROM 
    papers
WHERE 
    subject IS NOT NULL
    AND subject != ''
ORDER BY 
    subject ASC;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON distinct_subjects TO authenticated;
GRANT SELECT ON distinct_subjects TO anon;

-- Grant SELECT to service role if needed
GRANT SELECT ON distinct_subjects TO service_role;

-- Verification queries (run these to confirm)

-- 1. Check for duplicates in underlying data
-- SELECT subject, COUNT(*) as count FROM papers WHERE subject IS NOT NULL AND subject != '' GROUP BY subject HAVING COUNT(*) > 1;

-- 2. Check row count on the view
-- SELECT COUNT(*) FROM distinct_subjects;

-- 3. Sample data from view
-- SELECT * FROM distinct_subjects LIMIT 10;
