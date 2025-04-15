# Supabase Integration Guide for Građanski Zahtevi

This guide explains how to use Supabase in the Građanski Zahtevi project, including authentication with Clerk, data access patterns, and common operations.

## Table of Contents

- [Setup and Configuration](#setup-and-configuration)
- [Authentication](#authentication)
- [Data Access Patterns](#data-access-patterns)
- [Common Operations](#common-operations)
- [Database Schema](#database-schema)
- [Limitations and Gotchas](#limitations-and-gotchas)
- [Troubleshooting](#troubleshooting)
- [Database Operations and Error Handling](#database-operations-and-error-handling)
- [Common Database Operations](#common-database-operations)
- [Error Handling Patterns](#error-handling-patterns)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Setup and Configuration

### Environment Variables

Make sure you have the following environment variables in your `.env` file:

```
SUPABASE_URL=https://jlrkiwnmissvmiupaena.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Client

The Supabase client is initialized in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
```

### Database Types

Database types are defined in `src/types/supabase.ts` and are generated based on the database schema. These types provide type safety when interacting with Supabase.

## Authentication

### Authentication Flow (Centralized)

The project uses Clerk for authentication. The synchronization and state management with Supabase are handled centrally by the `SupabaseAuthProvider` component in `src/App.tsx`.

1.  Clerk manages frontend sign-in/out.
2.  `SupabaseAuthProvider` detects auth changes.
3.  It fetches a Supabase-compatible JWT from Clerk.
4.  It ensures the user exists in the `public.users` table (sync).
5.  It fetches the `public.users` profile.
6.  It provides the token, profile (`supabaseUser`), and auth status (`isAuthenticated`, `isLoadingAuth`) via React Context.
7.  Components use this context (often via the simplified `useSupabaseAuth` hook) to get the token and authenticated Supabase client for RLS-protected requests.

Refer to `GUIDE_AUTHENTICATION_GUIDE.md` for full details.

### Using Authentication in Components (Updated Example)

Components should use the `useSupabaseAuth` hook to access the centrally managed auth state and Supabase client.

```tsx
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

function MyComponent() {
  const { 
    supabase, 
    supabaseUser, 
    isLoading, 
    isAuthenticated 
  } = useSupabaseAuth();
  
  if (isLoading) {
    return <div>Loading authentication...</div>;
  }
  
  if (!isAuthenticated || !supabaseUser) {
    return <div>Please sign in</div>;
  }
  
  // Now you can use the authenticated `supabase` client
  // and access profile data like `supabaseUser.full_name`
  
  return <div>Hello, {supabaseUser.full_name}</div>;
}
```

## Data Access Patterns

### React Query Hooks (Optimized)

We use React Query hooks defined in `src/hooks/use-queries.ts`.

*   **Standard Fetching:** Hooks like `useCategories`, `useRequests` wrap service calls for fetching lists or single items.
*   **Optimized User-Specific Data:** For fetching data specific to the current user across multiple items (like votes), use bulk-fetching hooks like `useUserVotesForRequests`. This avoids the N+1 query problem.

#### Example - Fetching Requests and User Votes (Bulk): 

```tsx
// In a component like src/pages/CategoryDetail.tsx
import { useRequests, useUserVotesForRequests } from '@/hooks/use-queries';
import { useMemo } from 'react';

function RequestList({ categoryId }) {
  const { data: requests = [], isLoading: requestsLoading } = useRequests(categoryId);
  
  // Get all request IDs on the page
  const requestIds = useMemo(() => requests.map(req => req.id), [requests]);
  
  // Fetch all user votes for these requests in ONE query
  const { data: userVotesMap = {}, isLoading: userVotesLoading } = useUserVotesForRequests(requestIds);
  
  // ... pass individual request data and userVotesMap[request.id] down to VoteCard
}
```

#### Example - Casting a Vote (Remains Similar):

*(Mutation hooks like `useCastVote` still work similarly, obtaining the necessary token/user ID from the central auth state via `useSupabaseAuth`)*

```tsx
// In a component like VoteCard.tsx
import { useCastVote } from '@/hooks/use-queries';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

function VoteButton({ requestId, value }) {
  const { toast } = useToast();
  const { mutate: castVote, isPending } = useCastVote();
  const { isAuthenticated } = useSupabaseAuth(); // Get auth status
  
  const handleVote = () => {
    if (!isAuthenticated) { /* show login prompt */ return; }
    
    castVote(
      { requestId, value }, // userId is handled within the hook now
      { onSuccess: () => { /* ... */ }, onError: (error) => { /* ... */ } }
    );
  };
  // ... button render ...
}
```

### Direct Supabase Client Usage

Use `getSupabaseClient(token)` from `lib/clerk-supabase.ts`, obtaining the `token` from `useSupabaseAuth` if authenticated access is needed.

## Common Operations

### Fetching Data

```typescript
// Fetch a single item by ID
const { data: category } = useCategory('education');

// Fetch a list with filters
const { data: requests } = useRequests(categoryId);

// Fetch with relationships
const { data: requestWithOptions } = useRequestById(requestId);
```

### Creating or Updating Data

```typescript
// Create data
const { mutate: createRequest } = useCreateRequest();
createRequest({ 
  id: 'new-request',
  title: 'My New Request',
  category_id: 'education',
  // ... other fields
});

// Update data
const { mutate: updateRequest } = useUpdateRequest();
updateRequest({
  id: 'existing-request',
  title: 'Updated Title'
});
```

## Database Schema

The database schema includes the following tables:

- `users` - User profiles synced from Clerk
- `categories` - Categories for requests
- `resources` - Resources linked to categories
- `requests` - Voting requests
- `options` - Options for multiple-choice requests
- `votes` - User votes on requests
- `comments` - User comments on requests
- `comment_votes` - Votes on comments
- `suggested_requests` - User-suggested requests
- `suggested_request_votes` - Votes on suggested requests
- `timeline_events` - Timeline events for requests

Each table has appropriate relationships and constraints defined.

## Limitations and Gotchas

### 1. Authentication Sync Delays

When a user signs in with Clerk, there may be a brief delay before the Supabase token is set. During this time, any operations that require authentication might fail. Consider adding appropriate loading states or retries.

### 2. Deeply Nested Queries

Supabase has limitations with deeply nested queries. For complex data relationships, you might need to make multiple queries and combine the results client-side.

### 3. Real-time Subscription Limitations

Real-time subscriptions have limits on the number of concurrent connections and event throughput. For high-traffic applications, consider implementing polling for critical updates.

### 4. Row-Level Security (RLS)

Supabase uses PostgreSQL's Row-Level Security to control access to data. Make sure your RLS policies are correctly defined to prevent unauthorized access. By default, our setup restricts sensitive operations to authenticated users.

### 5. Type Safety Gaps

While we use TypeScript for type safety, there might be gaps where runtime type validation is needed, especially for user-submitted data.

## Troubleshooting

### Authentication Issues

If you encounter authentication issues:

1. Check that the Clerk JWT token is being properly generated and set in Supabase
2. Verify that the user exists in the Supabase `users` table
3. Check for console errors related to JWT validation

```typescript
// Debug Supabase auth
const { getToken } = useAuth();
const token = await getToken({ template: 'supabase' });
console.log('Supabase token:', token);
```

### Database Query Errors

For database query errors:

1. Check the error message and code for clues
2. Verify that the table and columns exist and match your query
3. Check for type mismatches in your query parameters

```typescript
// Debug a Supabase query
try {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('categories')
    .select('*');
  
  if (error) {
    console.error('Supabase error:', error);
    // Handle the error
  }
} catch (err) {
  console.error('Unexpected error:', err);
}
```

### Performance Issues

If you experience performance issues:

1. Check that you're using appropriate indexes on your database tables
2. Review your React Query configuration for proper caching and invalidation
3. Consider implementing pagination for large data sets

### Deployment Issues

For deployment-related issues:

1. Verify that environment variables are correctly set in your deployment environment
2. Check that CORS settings in Supabase allow requests from your deployment domain
3. Ensure your build process correctly includes all necessary dependencies

## Database Operations and Error Handling

### Common Database Operations

1. **Voting Operations**
   ```typescript
   // In src/services/votes.ts
   export async function castVote(
     userId: string, 
     requestId: string, 
     value: string,
     authToken?: string | null
   ): Promise<Vote | null> {
     // Log detailed params to help with debugging
     debugLog("castVote called with:", { 
       userId, 
       requestId, 
       value,
       hasToken: !!authToken 
     });

     // Validate required parameters
     if (!userId || !requestId || value === undefined) {
       console.error("Missing required parameters for castVote:", { userId, requestId, value });
       return null;
     }

     // Use the appropriate client based on token availability
     const client = getSupabaseClient(authToken);

     try {
       // Check if user already voted for this request
       const existingVote = await getUserVote(userId, requestId, authToken);
       
       // If user already voted, update the vote
       if (existingVote) {
         const { data, error } = await client
           .from('votes')
           .update({ value, updated_at: new Date().toISOString() })
           .eq('user_id', userId)
           .eq('request_id', requestId)
           .select()
           .single();

         if (error) {
           // Special handling for auth errors
           if (error.code === 'PGRST301' || error.code === '42501' || 
               error.message?.includes('JWT') || error.message?.includes('token')) {
             console.warn("Authentication error updating vote:", error.message);
             return null;
           }
           
           console.error('Error updating vote:', error);
           return null;
         }

         return data;
       } 
       // Otherwise, insert a new vote
       else {
         const { data, error } = await client
           .from('votes')
           .insert({
             user_id: userId,
             request_id: requestId,
             value
           })
           .select()
           .single();

         if (error) {
           // Special handling for auth errors
           if (error.code === 'PGRST301' || error.code === '42501' || 
               error.message?.includes('JWT') || error.message?.includes('token')) {
             console.warn("Authentication error creating vote:", error.message);
             return null;
           }
           
           console.error('Error creating vote:', error);
           return null;
         }

         return data;
       }
     } catch (error) {
       console.error('Unexpected error in castVote:', error);
       return null;
     }
   }
   ```

2. **Comment Operations**
   ```typescript
   // In src/services/comments.ts
   export async function addComment(
     userId: string,
     requestId: string,
     content: string,
     parentId: string | null = null,
     authToken?: string | null
   ): Promise<Comment | null> {
     // Log detailed params to help with debugging
     debugLog("addComment called with:", { 
       userId, 
       requestId, 
       content,
       parentId,
       hasToken: !!authToken 
     });

     // Validate required parameters
     if (!userId || !requestId || !content) {
       console.error("Missing required parameters for addComment:", { userId, requestId, content });
       return null;
     }

     // Use the appropriate client based on token availability
     const client = getSupabaseClient(authToken);

     try {
       const { data, error } = await client
         .from('comments')
         .insert({
           user_id: userId,
           request_id: requestId,
           content,
           parent_id: parentId
         })
         .select()
         .single();

       if (error) {
         // Special handling for auth errors
         if (error.code === 'PGRST301' || error.code === '42501' || 
             error.message?.includes('JWT') || error.message?.includes('token')) {
           console.warn("Authentication error adding comment:", error.message);
           return null;
         }
         
         console.error('Error adding comment:', error);
         return null;
       }

       return data;
     } catch (error) {
       console.error('Unexpected error in addComment:', error);
       return null;
     }
   }
   ```

### Error Handling Patterns

1. **Authentication Errors**
   ```typescript
   // Common auth error codes
   const AUTH_ERROR_CODES = {
     JWT_EXPIRED: 'PGRST301',
     JWT_INVALID: '42501',
     TOKEN_MISSING: 'PGRST301'
   };

   // Handle auth errors
   if (error.code === AUTH_ERROR_CODES.JWT_EXPIRED || 
       error.code === AUTH_ERROR_CODES.JWT_INVALID ||
       error.message?.includes('JWT') || 
       error.message?.includes('token')) {
     console.warn("Authentication error:", error.message);
     // Attempt to refresh token or handle error
     return null;
   }
   ```

2. **Database Errors**
   ```typescript
   // Handle database errors
   if (error) {
     // Log error details
     console.error('Database error:', {
       code: error.code,
       message: error.message,
       details: error.details,
       hint: error.hint
     });

     // Return null or throw based on error type
     if (error.code === '23505') { // Unique violation
       return null;
     }
     throw error;
   }
   ```

3. **Type Validation**
   ```typescript
   // Validate types before database operations
   if (typeof value !== 'string') {
     console.error("Invalid value type:", typeof value);
     return null;
   }
   ```

### Common Patterns

1. **Token Management**
   ```typescript
   // Get token with retry logic
   async function getTokenWithRetry(maxRetries = 3) {
     let attempts = 0;
     while (attempts < maxRetries) {
       try {
         const token = await getCurrentAuthToken();
         if (token) return token;
         attempts++;
         await new Promise(resolve => setTimeout(resolve, 1000));
       } catch (error) {
         console.error("Error getting token:", error);
         attempts++;
       }
     }
     return null;
   }
   ```

2. **User Synchronization**
   ```typescript
   // Sync user with retry logic
   async function syncUserWithRetry(user: User, maxRetries = 3) {
     let attempts = 0;
     while (attempts < maxRetries) {
       try {
         const token = await getTokenWithRetry();
         if (!token) {
           attempts++;
           continue;
         }

         const syncedUser = await syncUserWithSupabase(
           user.id,
           user.primaryEmailAddress?.emailAddress,
           user.fullName,
           user.imageUrl,
           token
         );

         if (syncedUser) return syncedUser;
         attempts++;
       } catch (error) {
         console.error("Error syncing user:", error);
         attempts++;
       }
     }
     return null;
   }
   ```

3. **Query Invalidation**
   ```typescript
   // Invalidate queries after mutations
   const queryClient = useQueryClient();
   
   // After successful vote
   queryClient.invalidateQueries({ 
     queryKey: ['votes', 'user', userId, requestId] 
   });
   queryClient.invalidateQueries({ 
     queryKey: ['votes', 'stats', requestId] 
   });
   ```

### Best Practices

1. **Error Handling**
   - Always validate input parameters
   - Handle authentication errors gracefully
   - Implement proper error logging
   - Use appropriate error recovery strategies

2. **Type Safety**
   - Use TypeScript for type checking
   - Validate types before database operations
   - Use proper type casting in RLS policies

3. **Performance**
   - Cache tokens appropriately
   - Implement retry logic for failed operations
   - Use proper indexing for queries

4. **Security**
   - Never expose tokens in client-side code
   - Implement proper RLS policies
   - Validate all user input
   - Use prepared statements

## Conclusion

This guide covers the core aspects of using Supabase in the Građanski Zahtevi project. For more detailed information on specific services or components, refer to the corresponding files in the codebase.

For official Supabase documentation, visit [supabase.com/docs](https://supabase.com/docs). 