-- Drop foreign key constraints that reference users.id
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.suggested_requests DROP CONSTRAINT IF EXISTS suggested_requests_user_id_fkey;
ALTER TABLE public.suggested_request_votes DROP CONSTRAINT IF EXISTS suggested_request_votes_user_id_fkey;
ALTER TABLE public.comment_votes DROP CONSTRAINT IF EXISTS comment_votes_user_id_fkey;

-- Change users.id to TEXT type
ALTER TABLE public.users 
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Update all user_id columns in related tables
ALTER TABLE public.votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.comments
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.suggested_requests
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.suggested_request_votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE public.comment_votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Recreate the foreign key constraints
ALTER TABLE public.votes
  ADD CONSTRAINT votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.comments
  ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.suggested_requests
  ADD CONSTRAINT suggested_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.suggested_request_votes
  ADD CONSTRAINT suggested_request_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE public.comment_votes
  ADD CONSTRAINT comment_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Fix the sync_clerk_user function to work with TEXT type IDs
CREATE OR REPLACE FUNCTION sync_clerk_user(
  p_id TEXT,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS SETOF public.users AS $$
BEGIN
  -- First try to update an existing user (by email)
  UPDATE public.users
  SET 
    id = p_id,
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE email = p_email;
  
  -- If no rows were updated, try to insert a new user
  IF NOT FOUND THEN
    -- Check if a user with this ID already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_id) THEN
      INSERT INTO public.users (id, email, full_name, avatar_url)
      VALUES (p_id, p_email, p_full_name, p_avatar_url);
    END IF;
  END IF;
  
  -- Return the user
  RETURN QUERY SELECT * FROM public.users WHERE id = p_id OR email = p_email LIMIT 1;
END;
$$ LANGUAGE plpgsql; 