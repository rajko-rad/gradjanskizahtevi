-- First, delete any existing policies on the users table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view user profiles" ON public.users;
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;

-- Then create new, more permissive policies

-- Allow anyone to view user profiles
CREATE POLICY "Anyone can view user profiles" 
ON public.users FOR SELECT 
USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id);

-- Allow users to be created (this is the key policy we're missing)
CREATE POLICY "Allow user creation" 
ON public.users FOR INSERT 
WITH CHECK (true);

-- Add a policy for deleting users (optional)
CREATE POLICY "Users can delete their own profile" 
ON public.users FOR DELETE 
TO authenticated 
USING (auth.uid()::text = id); 