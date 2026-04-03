-- Run this single SQL query in Supabase to fix the RLS policy issue:

DROP POLICY IF EXISTS "Service role can insert paper versions" ON paper_versions;
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