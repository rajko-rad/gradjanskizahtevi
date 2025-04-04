-- Create or replace the sync_clerk_user function
CREATE OR REPLACE FUNCTION sync_clerk_user(
  p_id TEXT,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS SETOF public.users AS $$
BEGIN
  -- First try to update an existing user by email (for ID changes)
  UPDATE public.users
  SET 
    id = p_id,
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE email = p_email AND id != p_id;
  
  -- Then, check if a user with the correct ID exists
  -- If they do, update their info
  UPDATE public.users
  SET 
    email = p_email,
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE id = p_id;
  
  -- If no rows were updated in either query, insert a new user
  IF NOT FOUND THEN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (p_id, p_email, p_full_name, p_avatar_url)
    ON CONFLICT (email) DO UPDATE 
    SET 
      id = p_id,
      full_name = COALESCE(p_full_name, public.users.full_name),
      avatar_url = COALESCE(p_avatar_url, public.users.avatar_url),
      updated_at = NOW();
  END IF;
  
  -- Return the user
  RETURN QUERY SELECT * FROM public.users WHERE id = p_id OR email = p_email LIMIT 1;
END;
$$ LANGUAGE plpgsql; 