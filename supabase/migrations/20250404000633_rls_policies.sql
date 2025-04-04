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
CREATE POLICY "Anyone can view categories" 
ON public.categories FOR SELECT 
USING (true);

-- Resources policies (public read, admin write)
CREATE POLICY "Anyone can view resources" 
ON public.resources FOR SELECT 
USING (true);

-- Requests policies (public read, admin write)
CREATE POLICY "Anyone can view requests" 
ON public.requests FOR SELECT 
USING (true);

-- Options policies (public read, admin write)
CREATE POLICY "Anyone can view options" 
ON public.options FOR SELECT 
USING (true);

-- Votes policies (personal data)
CREATE POLICY "Users can see all votes" 
ON public.votes FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own votes" 
ON public.votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own votes" 
ON public.votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Comments policies (public read, authenticated write)
CREATE POLICY "Anyone can view comments" 
ON public.comments FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add comments" 
ON public.comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Comment votes policies (personal data)
CREATE POLICY "Anyone can view comment votes" 
ON public.comment_votes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add comment votes" 
ON public.comment_votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comment votes" 
ON public.comment_votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comment votes" 
ON public.comment_votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Suggested requests policies
CREATE POLICY "Anyone can view suggested requests" 
ON public.suggested_requests FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add suggested requests" 
ON public.suggested_requests FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own suggested requests" 
ON public.suggested_requests FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own suggested requests" 
ON public.suggested_requests FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id AND status = 'pending');

-- Suggested request votes policies
CREATE POLICY "Anyone can view suggested request votes" 
ON public.suggested_request_votes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add suggested request votes" 
ON public.suggested_request_votes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own suggested request votes" 
ON public.suggested_request_votes FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own suggested request votes" 
ON public.suggested_request_votes FOR DELETE 
TO authenticated 
USING (auth.uid()::text = user_id);

-- Timeline events policies (public read, admin write)
CREATE POLICY "Anyone can view timeline events" 
ON public.timeline_events FOR SELECT 
USING (true);

-- Users table policies
CREATE POLICY "Users can view all profiles" 
ON public.users FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id); 