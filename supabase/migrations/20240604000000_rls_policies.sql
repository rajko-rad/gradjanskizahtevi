-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" 
ON public.categories FOR SELECT 
USING (true);

-- Resources policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view resources" ON public.resources;
CREATE POLICY "Anyone can view resources" 
ON public.resources FOR SELECT 
USING (true);

-- Requests policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view requests" ON public.requests;
CREATE POLICY "Anyone can view requests" 
ON public.requests FOR SELECT 
USING (true);

-- Options policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view options" ON public.options;
CREATE POLICY "Anyone can view options" 
ON public.options FOR SELECT 
USING (true);

-- Votes policies (personal data)
DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;
CREATE POLICY "Anyone can view votes" 
ON public.votes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;
CREATE POLICY "Users can insert own votes" 
ON public.votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
CREATE POLICY "Users can update own votes" 
ON public.votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;
CREATE POLICY "Users can delete own votes" 
ON public.votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Comments policies (public read, authenticated write)
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" 
ON public.comments FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments" 
ON public.comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" 
ON public.comments FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" 
ON public.comments FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Comment votes policies (personal data)
DROP POLICY IF EXISTS "Anyone can view comment votes" ON public.comment_votes;
CREATE POLICY "Anyone can view comment votes" 
ON public.comment_votes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own comment votes" ON public.comment_votes;
CREATE POLICY "Users can insert own comment votes" 
ON public.comment_votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own comment votes" ON public.comment_votes;
CREATE POLICY "Users can update own comment votes" 
ON public.comment_votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own comment votes" ON public.comment_votes;
CREATE POLICY "Users can delete own comment votes" 
ON public.comment_votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Suggested requests policies
DROP POLICY IF EXISTS "Anyone can view suggested requests" ON public.suggested_requests;
CREATE POLICY "Anyone can view suggested requests" 
ON public.suggested_requests FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own suggested requests" ON public.suggested_requests;
CREATE POLICY "Users can insert own suggested requests" 
ON public.suggested_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own suggested requests" ON public.suggested_requests;
CREATE POLICY "Users can update own suggested requests" 
ON public.suggested_requests FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete own suggested requests" ON public.suggested_requests;
CREATE POLICY "Users can delete own suggested requests" 
ON public.suggested_requests FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id AND status = 'pending');

-- Suggested request votes policies
DROP POLICY IF EXISTS "Anyone can view suggested request votes" ON public.suggested_request_votes;
CREATE POLICY "Anyone can view suggested request votes" 
ON public.suggested_request_votes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own suggested request votes" ON public.suggested_request_votes;
CREATE POLICY "Users can insert own suggested request votes" 
ON public.suggested_request_votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own suggested request votes" ON public.suggested_request_votes;
CREATE POLICY "Users can update own suggested request votes" 
ON public.suggested_request_votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own suggested request votes" ON public.suggested_request_votes;
CREATE POLICY "Users can delete own suggested request votes" 
ON public.suggested_request_votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Timeline events policies (public read, admin write)
CREATE POLICY "Anyone can view timeline events" 
ON public.timeline_events FOR SELECT 
USING (true);

-- Users table policies
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
CREATE POLICY "Anyone can view users" 
ON public.users FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profiles" ON public.users;
CREATE POLICY "Users can update own profiles" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id);

-- Allow anonymous user creation (for Clerk sync)
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
CREATE POLICY "Allow user creation" 
ON public.users FOR INSERT 
WITH CHECK (true); 