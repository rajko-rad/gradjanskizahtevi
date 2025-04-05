-- Drop existing policies for comments table
DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Create new policies using auth.jwt()->>'sub'
CREATE POLICY "Users can insert own comments" 
ON public.comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can update own comments" 
ON public.comments FOR UPDATE 
TO authenticated 
USING (auth.jwt()->>'sub' = user_id);

CREATE POLICY "Users can delete own comments" 
ON public.comments FOR DELETE 
TO authenticated 
USING (auth.jwt()->>'sub' = user_id); 