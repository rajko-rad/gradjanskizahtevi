-- This script adds a robust user sync function and fixes common issues with Clerk-Supabase integration

-- First, let's check if there are any ID-related issues in the users table
-- This will update any users with same email but different IDs to use the same ID
WITH email_dupes AS (
  SELECT email, array_agg(id) as ids
  FROM public.users
  GROUP BY email
  HAVING COUNT(*) > 1
)
UPDATE public.users u
SET id = (SELECT ids[1] FROM email_dupes e WHERE e.email = u.email)
WHERE email IN (SELECT email FROM email_dupes);

-- Create or replace the sync_clerk_user function for easier user management
CREATE OR REPLACE FUNCTION sync_clerk_user(
  p_id TEXT,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS SETOF public.users AS $$
DECLARE
  existing_user RECORD;
  result_user RECORD;
BEGIN
  -- First check if the user exists by ID
  SELECT * INTO existing_user FROM public.users WHERE id = p_id;
  
  IF FOUND THEN
    -- Update the existing user
    UPDATE public.users
    SET
      email = p_email,
      full_name = COALESCE(p_full_name, full_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO result_user;
    
    RETURN NEXT result_user;
    RETURN;
  END IF;
  
  -- If not found by ID, check by email
  SELECT * INTO existing_user FROM public.users WHERE email = p_email;
  
  IF FOUND THEN
    -- User exists with this email but different ID - update the ID
    UPDATE public.users
    SET
      id = p_id,
      full_name = COALESCE(p_full_name, full_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = NOW()
    WHERE email = p_email
    RETURNING * INTO result_user;
    
    RETURN NEXT result_user;
    RETURN;
  END IF;
  
  -- User doesn't exist at all, create a new one
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (p_id, p_email, p_full_name, p_avatar_url)
  RETURNING * INTO result_user;
  
  RETURN NEXT result_user;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Fix common RLS issues with Clerk integration
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
CREATE POLICY "Allow user creation" ON public.users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
CREATE POLICY "Anyone can view user profiles" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- Add a few utility functions

-- Check if the current user is authenticated through Clerk
CREATE OR REPLACE FUNCTION is_clerk_authenticated() RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get the current user's ID
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 