-- Create a function to handle user upsert properly
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