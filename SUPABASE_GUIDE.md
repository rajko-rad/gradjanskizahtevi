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

### Authentication Flow

The project uses Clerk for authentication and syncs Clerk's JWT tokens with Supabase. This is handled by the `useSupabaseAuth` hook:

```typescript
// In src/hooks/use-supabase-auth.ts
export function useSupabaseAuth() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  // Get a fresh token
  const getFreshToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        return token;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }, [getToken]);

  // Sync user with Supabase
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

  return {
    isLoading,
    supabaseUser,
    canVote,
    tokenVerified,
    supabase: supabaseClient(),
    error,
    refreshAuth,
    authToken: authToken.current,
    getCurrentAuthToken
  };
}
```

### Using Authentication in Components

To use authentication in your components:

```tsx
import { useUser } from '@clerk/clerk-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

function MyComponent() {
  const { supabase, canVote } = useSupabaseAuth();
  const { user, isSignedIn } = useUser();
  
  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }
  
  return <div>Hello, {user.fullName}</div>;
}
```

## Data Access Patterns

### React Query Hooks

We use React Query hooks for data fetching, caching, and state management. These hooks are defined in `src/hooks/use-queries.ts` and wrap the Supabase service functions.

#### Example - Fetching Categories:

```tsx
import { useCategories } from '@/hooks/use-queries';

function CategoriesList() {
  const { data: categories, isLoading, error } = useCategories();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading categories: {error.message}</div>;
  
  return (
    <ul>
      {categories.map(category => (
        <li key={category.id}>{category.title}</li>
      ))}
    </ul>
  );
}
```

#### Example - Casting a Vote:

```tsx
import { useCastVote } from '@/hooks/use-queries';
import { useUser } from '@clerk/clerk-react';
import { useToast } from '@/hooks/use-toast';

function VoteButton({ requestId, value }) {
  const { user, isSignedIn } = useUser();
  const { toast } = useToast();
  const { mutate: castVote, isPending } = useCastVote();
  
  const handleVote = () => {
    if (!isSignedIn) {
      toast({
        title: "Authentication required",
        description: "You must be signed in to vote",
        variant: "destructive",
      });
      return;
    }
    
    castVote(
      { userId: user.id, requestId, value },
      {
        onSuccess: () => {
          toast({
            title: "Vote recorded",
            description: "Your vote has been recorded",
          });
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };
  
  return (
    <button 
      onClick={handleVote} 
      disabled={isPending}
    >
      {isPending ? 'Voting...' : 'Vote'}
    </button>
  );
}
```

### Direct Supabase Client Usage

While React Query hooks are preferred, you can use the Supabase client directly when needed:

```typescript
import { getSupabaseClient } from '@/lib/clerk-supabase';

// Fetch data directly
async function fetchCategories() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('categories')
    .select('*');
    
  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  
  return data;
}
```

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

#### 1. Inserting Data

When inserting data that requires authentication:

```typescript
// In src/services/comments.ts
export async function addComment(
  userId: string,
  requestId: string,
  content: string,
  parentId?: string | null,
  authToken?: string | null
): Promise<Comment> {
  const { data, error } = await getSupabaseClient(authToken)
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
    console.error('Error adding comment:', error);
    throw new Error('Failed to add comment');
  }
  
  return data;
}
```

Key points:
- Always pass auth token for authenticated operations
- Use proper error handling
- Return typed data

#### 2. Updating Data

When updating data with authentication checks:

```typescript
// In src/services/comments.ts
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<Comment> {
  // First check if the user is the owner of the comment
  const { data: comment, error: fetchError } = await getSupabaseClient()
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .single();
  
  if (fetchError) {
    console.error(`Error fetching comment ${commentId}:`, fetchError);
    throw new Error(`Failed to fetch comment ${commentId}`);
  }
  
  if (comment.user_id !== userId) {
    throw new Error('You do not have permission to edit this comment');
  }
  
  // Update the comment
  const { data, error } = await getSupabaseClient()
    .from('comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating comment ${commentId}:`, error);
    throw new Error(`Failed to update comment ${commentId}`);
  }
  
  return data;
}
```

Key points:
- Verify ownership before updates
- Handle errors appropriately
- Update timestamps

#### 3. Deleting Data

When deleting data with proper cleanup:

```typescript
// In src/services/comments.ts
export async function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  // First check if the user is the owner of the comment or an admin
  if (!isAdmin) {
    const { data: comment, error: fetchError } = await getSupabaseClient()
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching comment ${commentId}:`, fetchError);
      throw new Error(`Failed to fetch comment ${commentId}`);
    }
    
    if (comment.user_id !== userId) {
      throw new Error('You do not have permission to delete this comment');
    }
  }
  
  // Delete all comment votes first
  const { error: voteDeleteError } = await getSupabaseClient()
    .from('comment_votes')
    .delete()
    .eq('comment_id', commentId);
  
  if (voteDeleteError) {
    console.error(`Error deleting votes for comment ${commentId}:`, voteDeleteError);
    throw new Error(`Failed to delete votes for comment ${commentId}`);
  }
  
  // Delete the comment
  const { error } = await getSupabaseClient()
    .from('comments')
    .delete()
    .eq('id', commentId);
  
  if (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    throw new Error(`Failed to delete comment ${commentId}`);
  }
}
```

Key points:
- Handle cascading deletes
- Check permissions
- Clean up related data

### Error Handling Patterns

#### 1. Common Error Types

```typescript
// In src/lib/errors.ts
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export function handleSupabaseError(error: any): never {
  if (error.code === 'PGRST301') {
    throw new SupabaseError(
      'Authentication required',
      'AUTH_REQUIRED',
      { status: 401 }
    );
  }
  
  if (error.code === '42501') {
    throw new SupabaseError(
      'Permission denied',
      'PERMISSION_DENIED',
      { status: 403 }
    );
  }
  
  throw new SupabaseError(
    error.message || 'Unknown error',
    error.code || 'UNKNOWN_ERROR',
    { status: 500 }
  );
}
```

#### 2. Error Recovery

```typescript
// In src/hooks/use-queries.ts
export function useAddComment() {
  const queryClient = useQueryClient();
  const { supabaseUser, getCurrentAuthToken } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      content, 
      parentId 
    }: { 
      requestId: string; 
      content: string; 
      parentId?: string | null;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      
      try {
        const authToken = await getCurrentAuthToken();
        return commentsService.addComment(supabaseUser.id, requestId, content, parentId, authToken);
      } catch (error) {
        if (error instanceof SupabaseError && 
            error.code === 'AUTH_REQUIRED' && 
            retryCount < MAX_RETRIES) {
          setRetryCount(count => count + 1);
          // Force token refresh and retry
          const authToken = await getCurrentAuthToken(true);
          return commentsService.addComment(supabaseUser.id, requestId, content, parentId, authToken);
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
}
```

### Common Patterns

#### 1. Data Fetching with Authentication

```typescript
// In src/hooks/use-queries.ts
export function useComments(requestId: string, includeVotes: boolean = false) {
  return useQuery({
    queryKey: ['comments', requestId, { includeVotes }],
    queryFn: () => commentsService.getCommentsForRequest(requestId, includeVotes),
    enabled: !!requestId,
  });
}
```

#### 2. Mutations with Error Handling

```typescript
// In src/hooks/use-queries.ts
export function useVoteOnComment() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      commentId, 
      value, 
      requestId 
    }: { 
      commentId: string; 
      value: -1 | 1;
      requestId: string;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return commentsService.voteOnComment(supabaseUser.id, commentId, value);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['comments', variables.requestId, { includeVotes: true }] 
      });
    },
  });
}
```

#### 3. Type Safety

```typescript
// In src/types/supabase.ts
export type Database = {
  public: {
    Tables: {
      comments: {
        Row: {
          id: string;
          user_id: string;
          request_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          request_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ... other tables
    };
  };
};
```

### Best Practices

1. **Error Handling**:
   - Use custom error classes
   - Implement proper error recovery
   - Log errors appropriately

2. **Authentication**:
   - Always pass auth tokens
   - Handle token expiration
   - Implement retry logic

3. **Data Operations**:
   - Use proper types
   - Implement proper validation
   - Handle edge cases

4. **Performance**:
   - Use appropriate indexes
   - Implement caching
   - Optimize queries

5. **Security**:
   - Use RLS policies
   - Validate input
   - Handle permissions properly

## Conclusion

This guide covers the core aspects of using Supabase in the Građanski Zahtevi project. For more detailed information on specific services or components, refer to the corresponding files in the codebase.

For official Supabase documentation, visit [supabase.com/docs](https://supabase.com/docs). 