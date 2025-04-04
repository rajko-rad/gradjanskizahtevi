# Građanski Zahtevi - Implementation Roadmap

This document outlines the functionality and tasks needed to complete the Građanski Zahtevi platform with production-ready database integration and key features.

## Database Schema and Setup (Supabase)

### Authentication Integration
- [x] Set up Clerk authentication integration with Supabase
- [ ] Configure Supabase Row Level Security (RLS) policies for protected resources
- [x] Implement user profile synchronization between Clerk and Supabase

### Database Schema
- [x] Create database schema with all required tables
- [x] Set up database migrations using Supabase CLI
- [x] Insert sample data for testing
- [x] Document database schema and management process

### Database Tables
All database tables have been implemented through migrations. Below is the schema for reference:

#### Users Table
```sql
create table public.users (
  id uuid primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

#### Categories Table
```sql
create table public.categories (
  id text primary key,
  title text not null,
  short_title text not null,
  description text,
  slug text unique not null,
  icon text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

#### Resources Table
```sql
create table public.resources (
  id uuid default gen_random_uuid() primary key,
  category_id text references public.categories not null,
  title text not null,
  url text not null,
  created_at timestamp with time zone default now() not null
);
```

#### Requests Table
```sql
create table public.requests (
  id text primary key,
  category_id text references public.categories not null,
  title text not null,
  description text,
  slug text unique not null,
  type text not null check (type in ('yesno', 'multiple', 'range')),
  status text not null check (status in ('active', 'closed', 'pending')) default 'active',
  min integer,
  max integer,
  has_comments boolean default true,
  deadline timestamp with time zone,
  progress integer default 0,
  vote_count integer default 0,
  comment_count integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

#### Options Table (for multiple choice requests)
```sql
create table public.options (
  id uuid default gen_random_uuid() primary key,
  request_id text references public.requests not null,
  text text not null,
  created_at timestamp with time zone default now() not null
);
```

#### Votes Table
```sql
create table public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  request_id text references public.requests not null,
  option_id uuid references public.options,
  value text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, request_id)
);
```

#### Suggested Requests Table
```sql
create table public.suggested_requests (
  id uuid default gen_random_uuid() primary key,
  category_id text references public.categories not null,
  user_id uuid references public.users not null,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

#### Suggested Request Votes Table
```sql
create table public.suggested_request_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  suggested_request_id uuid references public.suggested_requests not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamp with time zone default now() not null,
  unique(user_id, suggested_request_id)
);
```

#### Comments Table
```sql
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  request_id text references public.requests not null,
  parent_id uuid references public.comments,
  content text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

#### Comment Votes Table
```sql
create table public.comment_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  comment_id uuid references public.comments not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamp with time zone default now() not null,
  unique(user_id, comment_id)
);
```

#### Timeline Events Table
```sql
create table public.timeline_events (
  id uuid default gen_random_uuid() primary key,
  request_id text references public.requests,
  date text not null,
  title text not null,
  description text not null,
  source text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
```

## Feature Implementation Tasks

### Authentication & User Management
- [x] Complete Clerk integration for authentication
- [ ] Create protected routes that require authentication
- [x] Implement user profile synchronization with Supabase
- [ ] Implement user profile page with voting history
- [ ] Add user settings page for profile management

### Voting System
- [x] Replace mock voting with real database operations
- [x] Implement create/update/delete vote functionality
- [x] Ensure users can only vote once per request
- [x] Add vote analytics and visualization (total votes, percentages)
- [x] Implement "remove vote" functionality

### Comments System
- [x] Replace mock comments with real database operations
- [x] Implement create/update/delete comment functionality
- [x] Implement reply functionality for nested comments
- [x] Add upvote/downvote system for comments with database integration
- [ ] Implement comment sorting (newest, oldest, most upvoted)
- [ ] Add pagination for comments (load more)
- [ ] Add comment moderation for administrators

### Suggested Requests
- [x] Replace mock data with database integration
- [ ] Implement form validation for new suggestions
- [x] Add voting system for suggested requests
- [ ] Implement approval workflow for suggestions
- [ ] Add notification when a suggestion is approved/rejected

### Admin Features
- [ ] Create admin dashboard for content management
- [ ] Implement moderation for comments and suggestions
- [ ] Add ability to create/edit/delete requests and categories
- [ ] Add analytics for user engagement and voting patterns

### API Integration
- [x] Create React Query hooks for data fetching
- [x] Implement error handling and loading states
- [x] Add optimistic updates for better UX
- [x] Create API service layer to interact with Supabase

### General UI/UX Improvements
- [x] Implement responsive design improvements
- [x] Add proper loading and error states
- [x] Implement toast notifications for user actions
- [ ] Add accessibility improvements
- [ ] Implement animations for better interactivity

### Performance & Optimization
- [x] Implement query caching for improved performance
- [ ] Add pagination for large data sets
- [ ] Optimize components to prevent unnecessary rerenders
- [ ] Implement code splitting for better load times

### Deployment
- [ ] Set up Cloudflare Pages for hosting
- [ ] Configure environment variables
- [ ] Set up CI/CD pipeline
- [ ] Configure custom domain (gradjanskizahtevi.org)

## Components Needing Migration from Mock Data to Supabase

Based on a code review, the following components or features need to be migrated from mock data to Supabase:

### Already Migrated to Supabase
- ✅ **Voting System** - VoteCard component is properly integrated with Supabase for database operations
- ✅ **Comments System** - CommentSystem component is properly fetching and storing data in Supabase
- ✅ **Categories** - CategoryCard and related components use data from Supabase
- ✅ **Requests** - RequestCard and related components use data from Supabase
- ✅ **Suggested Requests** - SuggestedRequestsSection is using Supabase for data

### Still Using Mock Data / Needs Migration
1. **Admin Dashboard** - Create admin components for content management
   - Needs appropriate permissions and RLS policies
   - Dashboard UI for managing content
   - Moderation tools for comments and suggestions

2. **User Profile Page**
   - User activity history (votes, comments, suggestions)
   - Profile management features
   - Settings and preferences

3. **Timeline Events**
   - Events component for request detail pages
   - Admin interface for adding/editing timeline events

4. **Analytics Components**
   - Dashboard for voting patterns
   - User engagement metrics
   - Request popularity tracking

5. **Resource Management**
   - Components for displaying and managing resources
   - Admin interface for adding/editing resources for categories

### Missing UI Components
1. **Detailed Request Pages**
   - Full request view with all metadata
   - Timeline integration
   - Enhanced comment functionality

2. **Category Detail Pages**
   - Complete listing of category requests
   - Category-specific statistics
   - Resource section

3. **User Settings Page**
   - Profile editing
   - Notification preferences
   - Account management

4. **Search Functionality**
   - Search component for finding requests
   - Advanced filtering options
   - Search results display

## Next Implementation Steps
1. Implement Row Level Security (RLS) policies for Supabase to protect resources
2. Create missing UI components listed above
3. Develop admin dashboard and moderation tools
4. Add search functionality and filtering options
5. Enhance user profiles with activity history

## Next Steps

1. ✅ **Fix database schema to align with UI needs** (DONE)
   - ✅ Update tables to include all required fields (slug, status, etc.)
   - ✅ Add necessary indexes for performance

2. ✅ **Fix type definitions** (DONE)
   - ✅ Ensure type definitions match database schema
   - ✅ Update ExtendedRequest and other types with missing properties

3. **Implement missing pages**
   - Category detail page
   - Request detail page
   - Suggestion submission form
   - User profile page

4. **Complete the admin section**
   - Admin dashboard
   - Content moderation tools
   - Analytics dashboard 

## Database Management

### Making Database Changes

All database changes should be implemented through migrations using the Supabase CLI. The process is:

1. Create a new migration file in `supabase/migrations`
2. Write the SQL changes in the migration file
3. Push the changes using `supabase db push`

See the complete guide in [SUPABASE_GUIDE.md](SUPABASE_GUIDE.md) for detailed instructions.

### Current Database Status

- Database schema created and populated with sample data
- Migrations set up and versioned in Git
- Supabase project linked with local development configuration

### Future Database Tasks

- Implement Row Level Security (RLS) policies
- Set up backup and restore procedures
- Optimize indexes based on query patterns
- Implement soft delete where appropriate 