-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Users can insert own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON public.votes;

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

DROP POLICY IF EXISTS "Users can insert own comment votes" ON public.comment_votes;
DROP POLICY IF EXISTS "Users can update own comment votes" ON public.comment_votes;
DROP POLICY IF EXISTS "Users can delete own comment votes" ON public.comment_votes;

DROP POLICY IF EXISTS "Users can insert own suggested requests" ON public.suggested_requests;
DROP POLICY IF EXISTS "Users can update own suggested requests" ON public.suggested_requests;
DROP POLICY IF EXISTS "Users can delete own suggested requests" ON public.suggested_requests;

DROP POLICY IF EXISTS "Users can insert own suggested request votes" ON public.suggested_request_votes;
DROP POLICY IF EXISTS "Users can update own suggested request votes" ON public.suggested_request_votes;
DROP POLICY IF EXISTS "Users can delete own suggested request votes" ON public.suggested_request_votes;

DROP POLICY IF EXISTS "Users can update own profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create policies using auth.jwt()->>'sub' instead of auth.uid()
-- Votes table policies
CREATE POLICY "Users can insert own votes" 
  ON public.votes FOR INSERT 
  WITH CHECK (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can update own votes" 
  ON public.votes FOR UPDATE 
  USING (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can delete own votes" 
  ON public.votes FOR DELETE 
  USING (auth.jwt()->>'sub' = user_id);

-- Comments table policies
CREATE POLICY "Users can insert own comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own comments" 
  ON public.comments FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Comment votes table policies
CREATE POLICY "Users can insert own comment votes" 
  ON public.comment_votes FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own comment votes" 
  ON public.comment_votes FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own comment votes" 
  ON public.comment_votes FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Suggested requests table policies
CREATE POLICY "Users can insert own suggested requests" 
  ON public.suggested_requests FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own suggested requests" 
  ON public.suggested_requests FOR UPDATE 
  USING (auth.uid()::text = user_id AND status = 'pending');

CREATE POLICY "Users can delete own suggested requests" 
  ON public.suggested_requests FOR DELETE 
  USING (auth.uid()::text = user_id AND status = 'pending');

-- Suggested request votes table policies
CREATE POLICY "Users can insert own suggested request votes" 
  ON public.suggested_request_votes FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own suggested request votes" 
  ON public.suggested_request_votes FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own suggested request votes" 
  ON public.suggested_request_votes FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Users table policies
CREATE POLICY "Users can update own profiles" 
  ON public.users FOR UPDATE 
  USING (auth.uid()::text = id);

-- Create a helper function for debugging JWT claims
CREATE OR REPLACE FUNCTION auth.debug_jwt() 
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE WHEN current_setting('request.jwt.claims', true) IS NULL 
      THEN jsonb_build_object('error', 'no JWT claims found')
      ELSE current_setting('request.jwt.claims', true)::jsonb
    END;
$$; 