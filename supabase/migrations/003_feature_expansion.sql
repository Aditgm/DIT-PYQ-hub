-- =============================================================================
-- MT8-10 Extended: Feature Expansion Migrations
-- Version: 1.0
-- Date: 2026-03-29
-- =============================================================================

-- =============================================================================
-- Step 1: Add degree type and column to papers table
-- =============================================================================

-- Create degree enum type
DO $$ BEGIN
    CREATE TYPE degree_type AS ENUM ('BTech', 'BArch', 'BCA', 'MCA', 'MTech');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add degree column to papers table
ALTER TABLE papers 
ADD COLUMN IF NOT EXISTS degree degree_type NOT NULL DEFAULT 'BTech';

-- Create indexes for degree filtering
CREATE INDEX IF NOT EXISTS idx_papers_degree ON papers(degree);
CREATE INDEX IF NOT EXISTS idx_papers_status_degree ON papers(status, degree);
CREATE INDEX IF NOT EXISTS idx_papers_branch_degree ON papers(branch, degree);

-- Update default for existing NULL values
UPDATE papers SET degree = 'BTech' WHERE degree IS NULL;

-- Add constraint to prevent NULL
ALTER TABLE papers ALTER COLUMN degree SET NOT NULL;

-- =============================================================================
-- Step 2: Create messages table for complaints/support
-- =============================================================================

-- Create message category enum
DO $$ BEGIN
    CREATE TYPE message_category AS ENUM ('general', 'technical', 'access_issue', 'copyright', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create message status enum
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('open', 'in_progress', 'pending_user', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create priority level enum
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category message_category NOT NULL DEFAULT 'general',
    status message_status NOT NULL DEFAULT 'open',
    priority priority_level NOT NULL DEFAULT 'normal',
    assigned_to UUID NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ NULL,
    resolution_notes TEXT NULL,
    
    CONSTRAINT chk_category CHECK (category IN ('general', 'technical', 'access_issue', 'copyright', 'other')),
    CONSTRAINT chk_status CHECK (status IN ('open', 'in_progress', 'pending_user', 'resolved', 'closed'))
);

-- Create message responses table
CREATE TABLE IF NOT EXISTS message_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    is_admin_response BOOLEAN DEFAULT FALSE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_assigned ON messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_message ON message_responses(message_id);

-- =============================================================================
-- Step 3: Create paper requests table
-- =============================================================================

-- Create request status enum
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'fulfilled', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create paper requests table
CREATE TABLE IF NOT EXISTS paper_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paper_name TEXT NOT NULL,
    paper_type TEXT NOT NULL,
    degree degree_type NOT NULL,
    branch TEXT NULL,
    semester INTEGER NULL,
    year INTEGER NULL,
    description TEXT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ NULL,
    fulfilled_by UUID NULL REFERENCES auth.users(id),
    notes TEXT NULL,
    related_paper_id UUID NULL REFERENCES papers(id),
    
    CONSTRAINT chk_status CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected', 'cancelled')),
    CONSTRAINT chk_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8))
);

-- Create indexes for paper requests
CREATE INDEX IF NOT EXISTS idx_requests_user ON paper_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON paper_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_degree ON paper_requests(degree);
CREATE INDEX IF NOT EXISTS idx_requests_created ON paper_requests(requested_at DESC);

-- =============================================================================
-- Step 4: Create notifications and push subscriptions
-- =============================================================================

-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('message_reply', 'status_change', 'paper_available', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, endpoint)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ NULL,
    
    CONSTRAINT chk_type CHECK (type IN ('message_reply', 'status_change', 'paper_available', 'system'))
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON push_subscriptions(is_active);

-- =============================================================================
-- Step 5: Add role to profiles and create audit log
-- =============================================================================

-- Create user role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user';

-- Create audit action enum
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'assign', 'resolve', 'broadcast');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB NULL,
    new_value JSONB NULL,
    ip_address INET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);

-- =============================================================================
-- Step 6: Row-Level Security Policies
-- =============================================================================

-- Messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Messages policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create messages" ON messages;
CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can update messages" ON messages;
CREATE POLICY "Admins can update messages" ON messages
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

-- Message responses policies
DROP POLICY IF EXISTS "Users can view own message responses" ON message_responses;
CREATE POLICY "Users can view own message responses" ON message_responses
    FOR SELECT USING (
        message_id IN (SELECT id FROM messages WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can create message responses" ON message_responses;
CREATE POLICY "Users can create message responses" ON message_responses
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage responses" ON message_responses;
CREATE POLICY "Admins can manage responses" ON message_responses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

-- Paper requests policies
DROP POLICY IF EXISTS "Users can manage own requests" ON paper_requests;
CREATE POLICY "Users can manage own requests" ON paper_requests
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all requests" ON paper_requests;
CREATE POLICY "Admins can view all requests" ON paper_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can update requests" ON paper_requests;
CREATE POLICY "Admins can update requests" ON paper_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
    );

-- Notifications policies
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service can manage notifications" ON notifications;
CREATE POLICY "Service can manage notifications" ON notifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Push subscriptions policies
DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Audit log policies (admins only)
DROP POLICY IF EXISTS "Admins view audit log" ON admin_audit_log;
CREATE POLICY "Admins view audit log" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Service can insert audit log" ON admin_audit_log;
CREATE POLICY "Service can insert audit log" ON admin_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- Step 7: Update existing papers with degree values (if needed)
-- =============================================================================

-- This is handled by the default value, but we can backfill specific ones
-- UPDATE papers SET degree = 'BTech' WHERE degree IS NULL;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check tables created:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('messages', 'message_responses', 'paper_requests', 'push_subscriptions', 'notifications', 'admin_audit_log');

-- Check indexes:
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE tablename IN ('messages', 'paper_requests', 'notifications');

-- Check RLS policies:
-- SELECT relname, polname, polpermissive FROM pg_policies 
-- WHERE relname IN ('messages', 'paper_requests', 'notifications');

-- =============================================================================
-- Down Migration (Rollback)
-- =============================================================================

/*
-- Drop in reverse order:

-- Audit log
DROP POLICY IF EXISTS "Admins view audit log" ON admin_audit_log;
DROP POLICY IF EXISTS "Service can insert audit log" ON admin_audit_log;
DROP TABLE IF EXISTS admin_audit_log;
DROP TYPE IF EXISTS audit_action;

-- Profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS user_role;

-- Notifications
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service can manage notifications" ON notifications;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS push_subscriptions;
DROP TYPE IF EXISTS notification_type;

-- Paper requests
DROP POLICY IF EXISTS "Users can manage own requests" ON paper_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON paper_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON paper_requests;
DROP TABLE IF EXISTS paper_requests;
DROP TYPE IF EXISTS request_status;

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can update messages" ON messages;
DROP POLICY IF EXISTS "Users can view own message responses" ON message_responses;
DROP POLICY IF EXISTS "Users can create message responses" ON message_responses;
DROP POLICY IF EXISTS "Admins can manage responses" ON message_responses;
DROP TABLE IF EXISTS message_responses;
DROP TABLE IF EXISTS messages;
DROP TYPE IF EXISTS message_category;
DROP TYPE IF EXISTS message_status;
DROP TYPE IF EXISTS priority_level;

-- Papers (keep degree column, just remove constraint if needed)
-- ALTER TABLE papers ALTER COLUMN degree DROP NOT NULL;
-- UPDATE papers SET degree = 'BTech' WHERE degree IS NULL;

-- Drop degree type (careful - check dependencies)
-- DROP TYPE IF EXISTS degree_type;
*/
