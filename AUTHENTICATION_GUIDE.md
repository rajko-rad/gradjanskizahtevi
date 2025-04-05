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

## Cloudflare Workers Integration

The application runs on Cloudflare Workers, which affects how authentication and data operations work:

### Token Management

1. **Token Storage**
   - Tokens are stored in memory within the Worker's context
   - Each Worker instance maintains its own token cache
   - Tokens are not persisted between Worker restarts

2. **Token Refresh**
   - The `useSupabaseAuth` hook handles token refresh automatically
   - When a token expires, the hook requests a new one from Clerk
   - The new token is then used for subsequent Supabase requests

### Voting Component Implementation

The voting system is implemented with Cloudflare Workers in mind:

1. **Client-Side Voting**
   ```typescript
   // In src/services/votes.ts
   export async function castVote(
     userId: string, 
     requestId: string, 
     value: number,
     authToken?: string | null
   ): Promise<Vote | null> {
     // Get appropriate client based on auth token
     const client = getSupabaseClient(authToken);
     
     // Check if user already voted
     const existingVote = await getUserVote(userId, requestId, authToken);
     
     if (existingVote) {
       // Update existing vote
       const { data, error } = await client
         .from('votes')
         .update({ value })
         .eq('user_id', userId)
         .eq('request_id', requestId);
     } else {
       // Create new vote
       const { data, error } = await client
         .from('votes')
         .insert({ user_id: userId, request_id: requestId, value });
     }
   }
   ```

2. **Error Handling**
   - Special handling for auth errors (PGRST301, 42501)
   - Token expiration checks
   - Network error recovery

3. **Performance Considerations**
   - Minimal token validation overhead
   - Efficient client caching
   - Optimized database queries

## JWT Template Configuration

The Clerk JWT template for Supabase must be configured exactly as follows for authentication to work properly:

1. **Template name**: `supabase`

2. **Claims**:
   ```json
   {
     "role": "authenticated",
     "aud": "authenticated"
   }
   ```
   
   IMPORTANT: 
   - Clerk automatically adds the `sub` claim with the user's ID
   - Both `sub` and `aud` claims are REQUIRED for Supabase authentication
   - The `aud` claim MUST be set to "authenticated"
   - The `role` should be set to "authenticated" (or a custom role if using RBAC)

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
6. **Verify Supabase session** using browser tools:
   - Check Network tab for API calls to Supabase
   - Look for the Authorization header to confirm token is being sent
   - Use a tool like jwt.io to decode and verify your tokens

## Cloudflare Workers Specific Issues

When running on Cloudflare Workers, watch out for:

1. **Token Expiration**
   - Workers may cache tokens longer than expected
   - Implement proper token refresh logic
   - Use the `getFreshToken` function from `useSupabaseAuth`

2. **Network Latency**
   - Workers may experience higher latency to Supabase
   - Implement retry logic for failed requests
   - Consider using connection pooling

3. **Cold Starts**
   - New Worker instances start with empty token cache
   - Handle token revalidation on cold starts
   - Consider warming up frequently used routes

4. **Memory Limits**
   - Workers have memory constraints
   - Keep token cache size reasonable
   - Implement cache eviction policies

## Next Steps

1. Implement RLS policies for all tables
2. Add admin role and policies for admin actions
3. Test all authenticated operations thoroughly
4. Monitor Worker performance and token management
5. Implement proper error handling for network issues

## Common Authentication Issues and Solutions

### 1. JWT Token Handling

When working with Supabase and Clerk authentication, proper JWT token handling is crucial:

```typescript
// In src/hooks/use-supabase-auth.ts
const getCurrentAuthToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
  // Check if current token is expired
  if (authToken.current && isTokenExpired(authToken.current)) {
    forceRefresh = true;
  }
  
  if (forceRefresh || !authToken.current) {
    const token = await getFreshToken(forceRefresh);
    if (token) {
      authToken.current = token;
    }
  }
  
  return authToken.current;
}, [getFreshToken]);
```

Key points:
- Always check token expiration before use
- Implement token refresh logic
- Cache tokens appropriately
- Pass tokens to Supabase operations

### 2. Row Level Security (RLS) Policies

For tables that require authentication, ensure proper RLS policies:

```sql
-- For comments table
CREATE POLICY "Users can insert own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- For votes table
CREATE POLICY "Users can insert own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
```

Common RLS issues:
- Missing WITH CHECK clauses for INSERT operations
- Type mismatches between auth.uid() and user_id columns
- Incorrect policy permissions

### 3. Authentication State Management

Proper authentication state management is essential:

```typescript
// In src/hooks/use-supabase-auth.ts
const syncUserWithClerk = useCallback(async (forceRefresh = false) => {
  if (!isSignedIn || !user) {
    setCanVote(false);
    setSupabaseUser(null);
    setTokenVerified(false);
    return;
  }

  const token = await getFreshToken(forceRefresh);
  if (!token) {
    setTokenVerified(false);
    setCanVote(false);
    return;
  }

  setTokenVerified(true);
  
  // Sync user data with Supabase
  if (user) {
    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    if (primaryEmail) {
      const syncedUser = await syncUserWithSupabase(
        user.id,
        primaryEmail,
        user.fullName,
        user.imageUrl,
        token
      );
      
      if (syncedUser) {
        setSupabaseUser(syncedUser);
        setCanVote(true);
      }
    }
  }
}, [isSignedIn, user, getFreshToken]);
```

Key considerations:
- Handle sign-out cases
- Manage token verification state
- Sync user data with Supabase
- Implement proper error handling

### 4. Database Schema Considerations

When working with Clerk and Supabase:

1. **User ID Types**:
   - Clerk uses TEXT type for user IDs
   - Ensure consistent type usage across tables
   - Use proper type casting in RLS policies

2. **Table Relationships**:
   - Define proper foreign key constraints
   - Use appropriate cascade rules
   - Consider indexing for performance

3. **Common Tables Structure**:
   ```sql
   -- Users table
   CREATE TABLE public.users (
     id TEXT PRIMARY KEY,
     email TEXT,
     full_name TEXT,
     avatar_url TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Comments table
   CREATE TABLE public.comments (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id TEXT REFERENCES public.users(id),
     request_id TEXT REFERENCES public.requests(id),
     content TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Votes table
   CREATE TABLE public.votes (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id TEXT REFERENCES public.users(id),
     request_id TEXT REFERENCES public.requests(id),
     value INTEGER,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

### 5. Error Handling and Debugging

Common authentication errors and their solutions:

1. **401 Unauthorized Errors**:
   - Check if JWT token is being passed correctly
   - Verify token expiration
   - Ensure RLS policies are properly configured

2. **Type Mismatch Errors**:
   - Verify user ID types match between Clerk and Supabase
   - Use proper type casting in RLS policies
   - Check database schema for consistency

3. **Permission Denied Errors**:
   - Review RLS policies
   - Check user authentication state
   - Verify token claims

4. **Debugging Tips**:
   ```typescript
   // Add debug logging
   const DEBUG_MODE = process.env.NODE_ENV === 'development';
   
   function debugLog(message: string, ...args: any[]) {
     if (DEBUG_MODE) {
       console.log(`DEBUG: ${message}`, ...args);
     }
   }
   
   // Log token information
   debugLog("Token state:", {
     hasToken: !!authToken.current,
     isExpired: authToken.current ? isTokenExpired(authToken.current) : false
   });
   ```

### 6. Best Practices

1. **Token Management**:
   - Implement token refresh logic
   - Cache tokens appropriately
   - Handle token expiration gracefully

2. **User State**:
   - Keep authentication state in sync
   - Handle edge cases (sign-out, token expiration)
   - Implement proper error recovery

3. **Database Operations**:
   - Always pass auth token to Supabase operations
   - Use proper error handling
   - Implement retry logic for failed operations

4. **Security**:
   - Follow principle of least privilege
   - Implement proper RLS policies
   - Validate user input
   - Use prepared statements 