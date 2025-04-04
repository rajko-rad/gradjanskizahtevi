-- Reset Database Script for Građanski Zahtevi
-- This script will drop all existing tables and recreate them according to our schema

-- Drop existing tables if they exist (in reverse order of dependency)
DROP TABLE IF EXISTS public.timeline_events CASCADE;
DROP TABLE IF EXISTS public.comment_votes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.suggested_request_votes CASCADE;
DROP TABLE IF EXISTS public.suggested_requests CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.options CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create Users Table
CREATE TABLE public.users (
  id uuid primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create Categories Table
CREATE TABLE public.categories (
  id text primary key,
  title text not null,
  short_title text not null,
  description text,
  slug text unique not null,
  icon text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create Resources Table
CREATE TABLE public.resources (
  id uuid default gen_random_uuid() primary key,
  category_id text references public.categories not null,
  title text not null,
  url text not null,
  created_at timestamp with time zone default now() not null
);

-- Create Requests Table
CREATE TABLE public.requests (
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

-- Create Options Table
CREATE TABLE public.options (
  id uuid default gen_random_uuid() primary key,
  request_id text references public.requests not null,
  text text not null,
  created_at timestamp with time zone default now() not null
);

-- Create Votes Table
CREATE TABLE public.votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  request_id text references public.requests not null,
  option_id uuid references public.options,
  value text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, request_id)
);

-- Create Suggested Requests Table
CREATE TABLE public.suggested_requests (
  id uuid default gen_random_uuid() primary key,
  category_id text references public.categories not null,
  user_id uuid references public.users not null,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create Suggested Request Votes Table
CREATE TABLE public.suggested_request_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  suggested_request_id uuid references public.suggested_requests not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamp with time zone default now() not null,
  unique(user_id, suggested_request_id)
);

-- Create Comments Table
CREATE TABLE public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  request_id text references public.requests not null,
  parent_id uuid references public.comments,
  content text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create Comment Votes Table
CREATE TABLE public.comment_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  comment_id uuid references public.comments not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamp with time zone default now() not null,
  unique(user_id, comment_id)
);

-- Create Timeline Events Table
CREATE TABLE public.timeline_events (
  id uuid default gen_random_uuid() primary key,
  request_id text references public.requests,
  date text not null,
  title text not null,
  description text not null,
  source text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create indexes for performance
CREATE INDEX idx_requests_category_id ON public.requests(category_id);
CREATE INDEX idx_votes_request_id ON public.votes(request_id);
CREATE INDEX idx_votes_user_id ON public.votes(user_id);
CREATE INDEX idx_comments_request_id ON public.comments(request_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_suggested_requests_category_id ON public.suggested_requests(category_id);
CREATE INDEX idx_suggested_requests_user_id ON public.suggested_requests(user_id);
CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user_id ON public.comment_votes(user_id);
CREATE INDEX idx_suggested_request_votes_suggested_request_id ON public.suggested_request_votes(suggested_request_id);
CREATE INDEX idx_suggested_request_votes_user_id ON public.suggested_request_votes(user_id);
CREATE INDEX idx_resources_category_id ON public.resources(category_id);
CREATE INDEX idx_timeline_events_request_id ON public.timeline_events(request_id); 