# Authentication Guide for Građanski Zahtevi

This document explains how authentication is set up between Clerk and Supabase, focusing on the centralized management within the application.

## Centralized Authentication Flow (`App.tsx`)

The application uses Clerk for frontend authentication and Supabase for database operations. The core logic coordinating these is centralized within the `SupabaseAuthProvider` component in `src/App.tsx`.

1.  **Clerk Authentication:**
    *   User authenticates via Clerk components (`SignIn`, `SignUp`).
    *   Clerk manages the frontend session and user object (`useAuth`, `useUser`).

2.  **`SupabaseAuthProvider` Initialization:**
    *   Detects changes in Clerk's authentication state (`isSignedIn`, `isUserLoaded`).
    *   When a user is signed in and loaded:
        *   **Fetches Supabase JWT:** Retrieves the specialized JWT from Clerk using `getToken({ template: 'supabase' })`. Handles caching and automatic refresh using `lib/clerk-supabase.ts`.
        *   **Syncs User:** Calls `syncUserWithSupabase` (from `services/users.ts`) to ensure a corresponding user record exists in the `public.users` table in Supabase. This uses the fetched JWT for authentication.
        *   **Fetches Supabase Profile:** After syncing, it fetches the full user profile from the `public.users` table.
        *   **Provides Context:** Makes the authentication state (`token`, `supabaseUser`, `isAuthenticated`, `isLoadingAuth`, `refreshToken`) available globally via React Context (`AuthContext`).

3.  **Token-Based Supabase Requests:**
    *   Components needing to make authenticated Supabase requests retrieve the current token via the `useAuthContext` hook or the simplified `useSupabaseAuth` hook.
    *   The token is included in the `Authorization: Bearer <token>` header (handled by `lib/clerk-supabase.ts`'s `getSupabaseClient`).
    *   Supabase verifies the token using the shared JWT secret configured in its dashboard.
    *   RLS policies in Supabase use `auth.uid()` (which corresponds to the Clerk user ID in the token) to authorize data access.

## Simplified `useSupabaseAuth` Hook (`src/hooks/use-supabase-auth.ts`)

The `useSupabaseAuth` hook has been simplified. It no longer manages the synchronization process itself. Instead, it acts as a convenient way to **consume** the centralized authentication state provided by `SupabaseAuthProvider` via `AuthContext`.

*   It returns the current `authToken`, `supabaseUser` profile, loading state (`isLoading`), authentication status (`isAuthenticated`), and a `refreshToken` function from the context.
*   It also provides a pre-configured Supabase client instance (`supabase`) ready for making authenticated requests using the current token.

```tsx
// Example usage in a component
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

function MyComponent() {
  const { 
    supabase,        // Authenticated Supabase client instance
    supabaseUser,    // User profile data from public.users table
    isLoading,       // Is auth state still loading?
    isAuthenticated, // Is the user considered authenticated?
    authToken        // The raw JWT token (use with caution)
  } = useSupabaseAuth(); 

  if (isLoading) {
    return <p>Loading auth...</p>;
  }

  if (!isAuthenticated || !supabaseUser) {
    return <p>Please sign in.</p>;
  }

  // Use supabase client for authenticated requests
  // Access supabaseUser.full_name, etc.

  return <p>Welcome, {supabaseUser.full_name}!</p>;
}
```

## Cloudflare Workers Integration

The application runs on Cloudflare Workers. The centralized authentication model works well here:

*   **Token Management:** The `SupabaseAuthProvider` manages token fetching, caching (`cachedTokenRef`), and refresh logic within the client-side React application context. The Worker primarily serves the application files.
*   **Client-Side Operations:** Authentication checks, user synchronization, and Supabase data requests originate from the user's browser, using the token managed by the provider.

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

If you encounter issues:

1.  **Check Browser Console:** Look for errors from `APP:`, `useSupabaseAuth DEBUG:`, `CLERK-SUPABASE:`, Clerk, or Supabase.
2.  **Verify JWT Template:** Ensure it's correctly set up in Clerk dashboard.
3.  **Check Supabase Logs:** Look for auth errors (Dashboard -> Logs -> Database / PostgREST).
4.  **Verify `SupabaseAuthProvider` Logic:** Ensure the provider in `App.tsx` correctly fetches tokens, syncs the user, and fetches the profile. Add debug logs there if needed.
5.  **Inspect Context Value:** Use React DevTools to inspect the value provided by `AuthContext` to see if the `token` and `supabaseUser` are being populated correctly.
6.  **Check RLS Policies:** Ensure policies use `auth.uid()::text` and are correctly implemented.
7.  **Test Token Directly:** Use `lib/clerk-supabase.ts`'s `testJwtToken` function (if needed, via browser console) to verify a token against Supabase RLS.

## Common Authentication Issues and Solutions (Updated)

### 1. JWT Token Handling & Synchronization
*   **Problem:** Repeated "Syncing user..." logs or slow loading due to multiple auth checks.
*   **Solution:** Ensure all components rely on the central state provided by `SupabaseAuthProvider` via `AuthContext` or `useSupabaseAuth`. Avoid independent token fetching or user sync calls within individual components. `App.tsx` now handles this centrally.

### 2. Row Level Security (RLS) Policies
*   **Type Mismatches:** Ensure `auth.uid()::text = user_id` casting.
*   **Missing Policies:** Verify policies exist for SELECT, INSERT, UPDATE, DELETE as needed.
*   **Policy Debugging:** Use Supabase logs and direct SQL queries.

### 3. Authentication State Management
*   **Problem:** Inconsistent state between components.
*   **Solution:** Rely solely on the state provided by `AuthContext` (`token`, `supabaseUser`, `isAuthenticated`, `isLoadingAuth`). `SupabaseAuthProvider` in `App.tsx` is the single source of truth.

### 4. Database Schema Considerations
*   **User ID Types:** Use TEXT.
*   **Table Relationships:** Use foreign keys correctly.

### 5. Error Handling and Debugging
*   **Check Error Codes:** 401, 403, etc.
*   **Validate Data:** Ensure correct types and non-null values.
*   **Use Logging:** Add `console.log` or `debugLog` statements strategically.

## Next Steps

1. Implement RLS policies for all tables
2. Add admin role and policies for admin actions
3. Test all authenticated operations thoroughly
4. Monitor Worker performance and token management
5. Implement proper error handling for network issues

## Common Authentication Issues and Solutions

### 1. JWT Token Handling

When working with JWT tokens between Clerk and Supabase:

1. **Token Expiration and Refresh**
   ```typescript
   // In useSupabaseAuth hook
   const getCurrentAuthToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
     // Check if current token is expired
     if (authToken.current && isTokenExpired(authToken.current)) {
       debugLog("Current token is expired, forcing refresh");
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

2. **Token Validation**
   - Always check token availability before making authenticated requests
   - Implement retry logic for token acquisition
   - Cache tokens in memory to reduce Clerk API calls

3. **Error Handling**
   ```typescript
   try {
     const token = await getCurrentAuthToken();
     if (!token) {
       throw new Error('Authentication token not available');
     }
     // Proceed with authenticated request
   } catch (error) {
     if (error instanceof Error && error.message.includes('JWT')) {
       // Handle JWT-specific errors
       await refreshAuth();
     }
     throw error;
   }
   ```

### 2. Row Level Security (RLS) Policies

Common RLS policy issues and solutions:

1. **Type Mismatches**
   ```sql
   -- Clerk IDs are TEXT, but auth.uid() returns UUID
   CREATE POLICY "Users can update own votes" ON public.votes
     FOR UPDATE USING (auth.uid()::text = user_id);
   ```

2. **Missing Policies**
   ```sql
   -- Ensure all necessary operations are covered
   CREATE POLICY "Users can insert own votes" ON public.votes
     FOR INSERT WITH CHECK (auth.uid()::text = user_id);
   
   CREATE POLICY "Users can update own votes" ON public.votes
     FOR UPDATE USING (auth.uid()::text = user_id);
   
   CREATE POLICY "Users can delete own votes" ON public.votes
     FOR DELETE USING (auth.uid()::text = user_id);
   ```

3. **Policy Debugging**
   - Use Supabase logs to check policy evaluation
   - Test policies with direct SQL queries
   - Verify user IDs match between Clerk and Supabase

### 3. Authentication State Management

Best practices for managing auth state:

1. **User Synchronization**
   ```typescript
   // In useSupabaseAuth hook
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

     // Sync user data with Supabase
     if (user) {
       const syncedUser = await syncUserWithSupabase(
         user.id,
         user.primaryEmailAddress?.emailAddress,
         user.fullName,
         user.imageUrl,
         token
       );
       
       if (syncedUser) {
         setSupabaseUser(syncedUser);
         setCanVote(true);
       }
     }
   }, [isSignedIn, user, getFreshToken]);
   ```

2. **State Consistency**
   - Keep Clerk and Supabase user states in sync
   - Handle sign-out cases properly
   - Implement proper error recovery

### 4. Database Schema Considerations

Important schema design patterns:

1. **User ID Types**
   ```sql
   -- Use TEXT for user IDs to match Clerk
   CREATE TABLE public.votes (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id TEXT NOT NULL,
     request_id UUID NOT NULL,
     value TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
   );
   ```

2. **Table Relationships**
   ```sql
   -- Foreign key constraints with proper types
   ALTER TABLE public.votes
     ADD CONSTRAINT votes_user_id_fkey
     FOREIGN KEY (user_id)
     REFERENCES public.users(id)
     ON DELETE CASCADE;
   ```

### 5. Error Handling and Debugging

Common error patterns and solutions:

1. **Authentication Errors**
   - 401 Unauthorized: Check token validity and RLS policies
   - 403 Forbidden: Verify user permissions and policy expressions
   - 400 Bad Request: Validate request parameters and types

2. **Database Errors**
   - Null value violations: Ensure required fields are provided
   - Type mismatches: Verify data types match schema
   - Foreign key violations: Check referenced records exist

3. **Debugging Tips**
   ```typescript
   // Add detailed logging for debugging
   debugLog("Vote operation:", {
     userId,
     requestId,
     value,
     hasToken: !!authToken,
     isSynced: !!supabaseUser?.id
   });
   ```

### 6. Best Practices

1. **Token Management**
   - Cache tokens in memory
   - Implement proper refresh logic
   - Handle token expiration gracefully

2. **User State**
   - Keep Clerk and Supabase states in sync
   - Handle sign-out cases properly
   - Implement proper error recovery

3. **Database Operations**
   - Use proper types for all operations
   - Implement proper error handling
   - Add detailed logging for debugging

4. **Security**
   - Never expose tokens in client-side code
   - Implement proper RLS policies
   - Validate all user input
   - Use prepared statements 