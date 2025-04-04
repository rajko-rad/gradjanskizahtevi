-- First, check if the target user already exists
DO $$ 
DECLARE
  target_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS') INTO target_exists;
  
  IF NOT target_exists THEN
    -- Create a temporary copy of the user with the new ID
    INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
    SELECT 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS', email, full_name, avatar_url, created_at, NOW()
    FROM public.users
    WHERE email = 'nolefp@gmail.com';
  END IF;
END $$;

-- Now update all the foreign key references to point to the new ID
-- Note: Store the old ID first
DO $$
DECLARE
  old_user_id TEXT;
BEGIN
  -- Get the old user ID
  SELECT id INTO old_user_id FROM public.users WHERE email = 'nolefp@gmail.com' AND id != 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS';

  IF old_user_id IS NOT NULL THEN
    -- Update references in votes table
    UPDATE public.votes SET user_id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS' WHERE user_id = old_user_id;
    
    -- Update references in comments table (if it exists)
    UPDATE public.comments SET user_id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS' WHERE user_id = old_user_id;
    
    -- Update references in comment_votes table (if it exists)
    UPDATE public.comment_votes SET user_id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS' WHERE user_id = old_user_id;
    
    -- Update references in suggested_requests table (if it exists)
    UPDATE public.suggested_requests SET user_id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS' WHERE user_id = old_user_id;
    
    -- Update references in suggested_request_votes table (if it exists)
    UPDATE public.suggested_request_votes SET user_id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS' WHERE user_id = old_user_id;
    
    -- Finally, delete the old user record
    DELETE FROM public.users WHERE id = old_user_id;
  END IF;
END $$;

-- Verify the update
SELECT * FROM public.users WHERE id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS'; 