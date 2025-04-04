# Authentication Guide for Građanski Zahtevi

This document explains how authentication is set up between Clerk and Supabase, and provides guidance for implementing Row Level Security (RLS) policies.

## Authentication Flow

The application uses Clerk for authentication and Supabase for database operations. Here's how they work together:

1. **User signs in with Clerk**
   - User authenticates through Clerk's SignIn component
   - Clerk handles email verification, social logins, etc.

2. **Clerk-Supabase synchronization**
   - The `useSupabaseAuth` hook in `src/hooks/use-supabase-auth.ts` syncs the user with Supabase
   - It performs two main tasks:
     1. Gets a JWT token from Clerk using the "supabase" template
     2. Creates/updates the user record in Supabase's `users` table

3. **Token-based authentication**
   - The JWT token is used to authenticate Supabase requests
   - Supabase verifies the token using the shared JWT secret
   - This allows RLS policies to recognize the authenticated user

## JWT Template Configuration

The Clerk JWT template for Supabase must be configured as follows:

1. **Template name**: `supabase`

2. **Claims**:
   ```json
   {
     "role": "authenticated",
     "aud": "authenticated"
   }
   ```
   
   Note: Clerk automatically adds the `sub` claim with the user's ID

3. **Signing algorithm**: HS256 (HMAC with SHA-256)

4. **Signing key**: Your Supabase project's JWT secret
   - Found in Supabase Dashboard → Project Settings → API → JWT Settings

## Database Schema

The database schema has been updated to use TEXT type for user IDs instead of UUID to ensure compatibility with Clerk's IDs:

```sql
-- Example of user reference in tables
ALTER TABLE public.users 
  ALTER COLUMN id TYPE TEXT USING id::TEXT;

ALTER TABLE public.votes
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
```

## Implementing Row Level Security (RLS)

The next step is to implement Row Level Security policies in Supabase. Here's how:

### Basic RLS Setup

1. Go to Supabase dashboard → Authentication → Policies
2. Select a table to add policies to (e.g., `votes`)
3. Enable RLS for the table
4. Add policies based on authentication status and user ID

### Example RLS Policies

Here are examples for common RLS policies:

#### For `users` table:

```sql
-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

#### For `votes` table:

```sql
-- Users can read all votes (for statistics)
CREATE POLICY "Anyone can read votes" ON public.votes
  FOR SELECT USING (true);

-- Users can only insert votes as themselves
CREATE POLICY "Users can insert own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can only update/delete their own votes
CREATE POLICY "Users can update own votes" ON public.votes
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own votes" ON public.votes
  FOR DELETE USING (auth.uid()::text = user_id);
```

#### For `comments` table:

```sql
-- Anyone can read comments
CREATE POLICY "Anyone can read comments" ON public.comments
  FOR SELECT USING (true);

-- Users can insert comments as themselves
CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE USING (auth.uid()::text = user_id);
```

### RLS with auth.uid() and TEXT types

Since Clerk user IDs are stored as TEXT in Supabase but `auth.uid()` returns a UUID, you'll need to cast the `auth.uid()` to TEXT in your policies:

```sql
-- Example policy with type casting
CREATE POLICY "Type-safe policy" ON public.some_table
  FOR SELECT USING (auth.uid()::text = user_id);
```

## Troubleshooting Authentication

If you encounter issues with authentication:

1. **Check browser console** for error messages
2. **Verify JWT template** is correctly set up in Clerk
3. **Check Supabase logs** for auth errors
4. **Ensure your RLS policies** are correctly implemented
5. **Test the auth flow** step by step:
   - Is the user record being created in Supabase?
   - Is the JWT token being generated correctly?
   - Are the policy expressions evaluating as expected?

## Next Steps

1. Implement RLS policies for all tables
2. Add admin role and policies for admin actions
3. Test all authenticated operations thoroughly 