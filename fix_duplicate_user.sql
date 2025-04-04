-- First, let's check if the user with email nolefp@gmail.com exists
WITH existing_user AS (
  SELECT id, email FROM public.users WHERE email = 'nolefp@gmail.com'
)
-- If the user exists, update their ID to match the Clerk ID
UPDATE public.users
SET id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS',
    updated_at = NOW()
FROM existing_user
WHERE users.email = existing_user.email;

-- Now check if any rows with user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS ID exist
SELECT * FROM public.users WHERE id = 'user_2vFxI1O2KPaBAIT7kMCTmiJ0SzS'; 