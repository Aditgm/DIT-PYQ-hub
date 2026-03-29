-- MT9: Add download_count column with DB trigger
-- Migration: Add download_count to papers table with auto-increment trigger
-- Created: 2026-03-29

-- ============================================
-- STEP 1: Add download_count column to papers
-- ============================================

-- Add column if it doesn't exist
ALTER TABLE papers 
ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;

-- Initialize existing rows with actual count from downloads table
UPDATE papers p
SET download_count = COALESCE(
    (SELECT COUNT(*) FROM downloads d WHERE d.paper_id = p.id),
    0
);

-- ============================================
-- STEP 2: Create trigger function
-- ============================================

-- Drop existing function if exists
CREATE OR REPLACE FUNCTION increment_paper_download_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment the download_count for the paper
    UPDATE papers
    SET download_count = download_count + 1
    WHERE id = NEW.paper_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Create trigger
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_increment_download_count ON downloads;

-- Create trigger that fires after insert on downloads table
CREATE TRIGGER trigger_increment_download_count
    AFTER INSERT ON downloads
    FOR EACH ROW
    EXECUTE FUNCTION increment_paper_download_count();

-- ============================================
-- Verification queries
-- ============================================

-- 1. Check column exists and has correct type
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'papers' AND column_name = 'download_count';

-- 2. Check trigger exists
-- SELECT trigger_name, event_object_table, action_statement 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'trigger_increment_download_count';

-- 3. Test the trigger manually:
-- INSERT INTO downloads (paper_id, user_id) VALUES ('YOUR_PAPER_ID', 'YOUR_USER_ID');
-- SELECT download_count FROM papers WHERE id = 'YOUR_PAPER_ID';

-- ============================================
-- Down Migration (Rollback)
-- ============================================

-- To rollback this change:
/*
DROP TRIGGER IF EXISTS trigger_increment_download_count ON downloads;
DROP FUNCTION IF EXISTS increment_paper_download_count();
ALTER TABLE papers DROP COLUMN IF EXISTS download_count;
*/
