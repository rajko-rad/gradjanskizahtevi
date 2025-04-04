-- First we need to drop all foreign key constraints that reference user_id
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.suggested_requests DROP CONSTRAINT IF EXISTS suggested_requests_user_id_fkey;
ALTER TABLE public.suggested_request_votes DROP CONSTRAINT IF EXISTS suggested_request_votes_user_id_fkey;
ALTER TABLE public.comment_votes DROP CONSTRAINT IF EXISTS comment_votes_user_id_fkey;

-- Now update the users table to use TEXT IDs instead of UUIDs
ALTER TABLE public.users 
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Update foreign key references in the votes table
ALTER TABLE public.votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Update foreign key references in the comments table
ALTER TABLE public.comments
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Update foreign key references in the suggested_requests table
ALTER TABLE public.suggested_requests
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Update foreign key references in the suggested_request_votes table
ALTER TABLE public.suggested_request_votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Update foreign key references in the comment_votes table
ALTER TABLE public.comment_votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Now recreate the foreign key constraints
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

-- Add a comment to explain the change
COMMENT ON TABLE public.users IS 'Modified to use TEXT for user IDs to accommodate Clerk authentication';
