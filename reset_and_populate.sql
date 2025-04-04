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
CREATE INDEX idx_timeline_events_request_id ON public.timeline_events(request_id); -- Sample Data for Građanski Zahtevi
-- This script will insert sample data into the database

-- Categories
INSERT INTO public.categories (id, title, short_title, description, slug, icon) VALUES
('education', 'Obrazovanje', 'Obrazovanje', 'Obrazovanje, nauka, kultura i omladinska politika', 'obrazovanje', 'https://img.icons8.com/ios/50/graduation-cap--v1.png'),
('health', 'Zdravstvo', 'Zdravstvo', 'Zdravstvo, socijalna zaštita i demografija', 'zdravstvo', 'https://img.icons8.com/ios/50/heart-health.png'),
('economy', 'Ekonomija', 'Ekonomija', 'Ekonomija, finansije i javna uprava', 'ekonomija', 'https://img.icons8.com/ios/50/money-bag.png'),
('environment', 'Ekologija', 'Ekologija', 'Zaštita životne sredine i održivi razvoj', 'ekologija', 'https://img.icons8.com/ios/50/forest.png'),
('infrastructure', 'Infrastruktura', 'Infrastruktura', 'Saobraćaj, energetika i građevinarstvo', 'infrastruktura', 'https://img.icons8.com/ios/50/bridge.png'),
('justice', 'Pravosuđe', 'Pravosuđe', 'Pravosuđe, ljudska prava i bezbednost', 'pravosude', 'https://img.icons8.com/ios/50/scales.png');

-- Resources
INSERT INTO public.resources (category_id, title, url) VALUES
('education', 'Ministarstvo prosvete', 'https://mpn.gov.rs/'),
('education', 'Zakon o obrazovanju', 'https://www.paragraf.rs/propisi/zakon_o_osnovama_sistema_obrazovanja_i_vaspitanja.html'),
('health', 'Ministarstvo zdravlja', 'https://www.zdravlje.gov.rs/'),
('health', 'Zakon o zdravstvenoj zaštiti', 'https://www.paragraf.rs/propisi/zakon_o_zdravstvenoj_zastiti.html'),
('economy', 'Ministarstvo finansija', 'https://www.mfin.gov.rs/'),
('environment', 'Ministarstvo zaštite životne sredine', 'https://www.ekologija.gov.rs/'),
('infrastructure', 'Ministarstvo građevinarstva', 'https://www.mgsi.gov.rs/'),
('justice', 'Ministarstvo pravde', 'https://www.mpravde.gov.rs/');

-- Requests
INSERT INTO public.requests (id, category_id, title, description, slug, type, status, min, max, has_comments, progress, vote_count, comment_count) VALUES
('digital-education', 'education', 'Digitalizacija obrazovnog sistema', 'Uvođenje digitalnih udžbenika i online nastave u sve škole na teritoriji Republike Srbije', 'digitalizacija-obrazovnog-sistema', 'yesno', 'active', NULL, NULL, true, 45, 0, 0),
('medical-equipment', 'health', 'Nabavka nove medicinske opreme', 'Nabavka savremene medicinske opreme za zdravstvene ustanove', 'nabavka-nove-medicinske-opreme', 'yesno', 'active', NULL, NULL, true, 70, 0, 0),
('tax-reform', 'economy', 'Reforma poreskog sistema', 'Predlog za reformu poreskog sistema i smanjenje nameta za mala preduzeća', 'reforma-poreskog-sistema', 'multiple', 'active', NULL, NULL, true, 30, 0, 0),
('recycling-system', 'environment', 'Unapređenje sistema reciklaže', 'Predlog za unapređenje sistema prikupljanja i reciklaže otpada u Srbiji', 'unapredjenje-sistema-reciklaze', 'multiple', 'active', NULL, NULL, true, 20, 0, 0),
('road-infrastructure', 'infrastructure', 'Obnova putne infrastrukture', 'Predlog za obnovu i modernizaciju putne infrastrukture u ruralnim područjima', 'obnova-putne-infrastrukture', 'range', 'active', 1, 10, true, 65, 0, 0),
('judiciary-reform', 'justice', 'Reforma pravosuđa', 'Predlog za reformu pravosudnog sistema i ubrzanje sudskih procesa', 'reforma-pravosudja', 'yesno', 'active', NULL, NULL, true, 40, 0, 0);

-- Options for multiple choice requests
INSERT INTO public.options (request_id, text) VALUES
('tax-reform', 'Smanjenje poreza na dobit'),
('tax-reform', 'Smanjenje PDV-a'),
('tax-reform', 'Uvođenje poreskih olakšica za nova zapošljavanja'),
('tax-reform', 'Pojednostavljenje poreske administracije'),
('recycling-system', 'Uvođenje sistema depozita za ambalažu'),
('recycling-system', 'Izgradnja više reciklažnih centara'),
('recycling-system', 'Edukacija građana o reciklaži'),
('recycling-system', 'Strože kazne za nepropisno odlaganje otpada');

-- Suggested Requests
-- Note: You'll need to insert actual user IDs when you have users in the system
-- INSERT INTO public.suggested_requests (category_id, user_id, title, description) VALUES
-- Commented out until users are available

-- Timeline Events
INSERT INTO public.timeline_events (request_id, date, title, description, source) VALUES
('digital-education', '2023-01-15', 'Pokretanje inicijative', 'Pokrenuta inicijativa za digitalizaciju obrazovnog sistema', 'Ministarstvo prosvete'),
('digital-education', '2023-03-20', 'Javna rasprava', 'Održana javna rasprava o predlogu za digitalizaciju', 'Vlada Republike Srbije'),
('digital-education', '2023-06-10', 'Usvajanje strategije', 'Usvojena strategija za digitalizaciju obrazovnog sistema', 'Službeni glasnik'),
('medical-equipment', '2023-02-05', 'Analiza potreba', 'Sprovedena analiza potreba zdravstvenih ustanova za novom opremom', 'Ministarstvo zdravlja'),
('medical-equipment', '2023-04-15', 'Izdvajanje sredstava', 'Iz budžeta izdvojena sredstva za nabavku nove opreme', 'Ministarstvo finansija'),
('tax-reform', '2023-03-10', 'Inicijalna studija', 'Predstavljena inicijalna studija o reformi poreskog sistema', 'Ministarstvo finansija'),
('recycling-system', '2023-01-20', 'Analiza stanja', 'Sprovedena analiza trenutnog stanja sistema reciklaže', 'Ministarstvo zaštite životne sredine'),
('road-infrastructure', '2023-02-12', 'Mapiranje potreba', 'Mapirane kritične tačke putne infrastrukture', 'Ministarstvo građevinarstva'),
('judiciary-reform', '2023-01-30', 'Pokretanje inicijative', 'Pokrenuta inicijativa za reformu pravosuđa', 'Ministarstvo pravde'); 