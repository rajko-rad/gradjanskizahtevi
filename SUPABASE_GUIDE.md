# Supabase Integration Guide for Građanski Zahtevi

This guide explains how to use Supabase in the Građanski Zahtevi project, including authentication with Clerk, data access patterns, and common operations.

## Table of Contents

- [Setup and Configuration](#setup-and-configuration)
- [Authentication](#authentication)
- [Data Access Patterns](#data-access-patterns)
- [Common Operations](#common-operations)
- [Database Schema](#database-schema)
- [Database Management with CLI](#database-management-with-cli)
- [Limitations and Gotchas](#limitations-and-gotchas)
- [Troubleshooting](#troubleshooting)

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

export function getSupabaseClient() {
  return supabase;
}

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Function to sync the token with Supabase
    const syncToken = async () => {
      if (isSignedIn && user) {
        // Get the JWT from Clerk for Supabase
        const token = await getToken({ template: 'supabase' });
        
        // Set the token in Supabase
        await setSupabaseToken(token);
        
        // Sync user data with Supabase
        await syncUserWithSupabase(
          user.id,
          user.primaryEmailAddress?.emailAddress || '',
          user.fullName || null,
          user.imageUrl || null
        );
      } else {
        // User is signed out, clear the Supabase session
        await setSupabaseToken(null);
      }
    };

    // Call the sync function
    syncToken();
  }, [isLoaded, isSignedIn, getToken, user]);

  // Return user data for convenience
  return { isLoaded, isSignedIn, user };
}
```

### Using Authentication in Components

To use authentication in your components:

```tsx
import { useUser } from '@clerk/clerk-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';

function MyComponent() {
  // Call useSupabaseAuth at the top level to ensure auth is synced
  useSupabaseAuth();
  
  // Use useUser hook to access user data
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
import { supabase } from '@/lib/supabase';

// Fetch data directly
async function fetchCategories() {
  const { data, error } = await supabase
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

### Handling Real-time Updates

Supabase supports real-time updates, but this requires additional setup:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function RealtimeVotes({ requestId }) {
  const [voteCount, setVoteCount] = useState(0);
  
  useEffect(() => {
    // Fetch initial count
    const fetchVotes = async () => {
      const { data } = await supabase
        .from('votes')
        .select('id')
        .eq('request_id', requestId);
      
      setVoteCount(data?.length || 0);
    };
    
    fetchVotes();
    
    // Subscribe to changes
    const subscription = supabase
      .channel('public:votes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'votes',
        filter: `request_id=eq.${requestId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVoteCount(count => count + 1);
        } else if (payload.eventType === 'DELETE') {
          setVoteCount(count => count - 1);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [requestId]);
  
  return <div>Votes: {voteCount}</div>;
}
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

## Database Management with CLI

We use the Supabase CLI to manage database changes in a structured and version-controlled way.

### Installing the Supabase CLI

```bash
# On macOS
brew install supabase/tap/supabase

# Using npm
npm install -g supabase
```

### Initial Setup

The project already has a Supabase configuration. If you're setting up a new project:

```bash
# Initialize Supabase configuration
supabase init

# Link to your remote project (after creating it in the Supabase dashboard)
supabase link --project-ref <project-reference-id>
```

### Making Database Changes

All database changes should be implemented as migrations. Here's how:

1. **Create a migration file**:

   Create a new SQL file in the `supabase/migrations` directory with a timestamp prefix:
   
   ```bash
   mkdir -p supabase/migrations
   touch supabase/migrations/$(date +%Y%m%d%H%M%S)_my_migration_name.sql
   ```

2. **Write your SQL changes**:

   Edit the migration file to include your database changes:
   
   ```sql
   -- Example migration
   CREATE TABLE IF NOT EXISTS public.my_new_table (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     name text NOT NULL,
     created_at timestamp with time zone DEFAULT now() NOT NULL
   );
   
   -- Create indexes
   CREATE INDEX IF NOT EXISTS my_new_table_name_idx ON public.my_new_table (name);
   ```

3. **Apply the migration**:

   Push the migration to your Supabase project:
   
   ```bash
   supabase db push
   ```

### How We Set Up the Database

In our initial setup, we:

1. Created a complete SQL script (`setup_full.sql`) that contained:
   - Table definitions
   - Indexes
   - Sample data

2. Created a migration directory and added our script:
   ```bash
   mkdir -p supabase/migrations
   cp setup_full.sql supabase/migrations/20240604000000_initial_setup.sql
   ```

3. Initialized the Supabase project:
   ```bash
   supabase init
   ```

4. Linked to our remote Supabase project:
   ```bash
   supabase link --project-ref jlrkiwnmissvmiupaena
   ```

5. Pushed our migration to apply the changes:
   ```bash
   supabase db push
   ```

### Best Practices for Future Changes

1. **Always use migrations**:
   - Never make direct changes to the database schema
   - All changes should be applied through migration files

2. **One change per migration**:
   - Keep migrations focused on a single logical change
   - This makes it easier to revert if needed

3. **Use idempotent statements**:
   - Use `IF NOT EXISTS` and `IF EXISTS` clauses
   - This prevents errors if migrations are run multiple times

4. **Version control your migrations**:
   - Commit all migration files to your Git repository
   - This serves as a history of your database schema

5. **Test migrations locally first**:
   - Use `supabase start` to run a local Supabase instance
   - Apply migrations locally before pushing to production

### Common CLI Commands

```bash
# Link to your remote project
supabase link --project-ref <project-reference-id>

# Create a new migration (manual method)
mkdir -p supabase/migrations
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_migration_name.sql

# Push migrations to remote
supabase db push

# Start a local development environment
supabase start

# Stop the local development environment
supabase stop

# Check for differences between local and remote schemas
supabase db diff

# Reset the local database (caution!)
supabase db reset
```

### Checking Database State

You can use the REST API to verify your schema and data:

```bash
# Check if tables exist and are correctly structured
curl -s "https://your-project-ref.supabase.co/rest/v1/categories?select=*" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key"
```

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
  const { data, error } = await supabase
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

## Conclusion

This guide covers the core aspects of using Supabase in the Građanski Zahtevi project. For more detailed information on specific services or components, refer to the corresponding files in the codebase.

For official Supabase documentation, visit [supabase.com/docs](https://supabase.com/docs). 