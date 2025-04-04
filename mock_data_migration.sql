-- Reset Database Script for Građanski Zahtevi with exact mock data from mockData.ts
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

-- Create Options Table (for multiple choice requests)
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

-- Insert data from mockData.ts (without votes)

-- Insert Categories
INSERT INTO public.categories (id, title, short_title, description, slug, icon) VALUES
('media', 'Mediji', 'Mediji', 'Zahtevi vezani za medije i slobodu informisanja', 'mediji', null),
('elections', 'Izborni uslovi', 'Izborni Uslovi', 'Zahtevi za unapređenje i čišćenje biračkih spiskova', 'izborni-uslovi', null),
('security', 'Službe Bezbednosti', 'Bezbednost', 'Zahtevi vezani za reforme službi bezbednosti', 'sluzbe-bezbednosti', null),
('judiciary', 'Pravosuđe', 'Pravosuđe', 'Zahtevi za reformu pravosuđa', 'pravosudje', null),
('government', 'Prelazna Vlada i Opozicija', 'Vlada', 'Predlozi za formiranje prelazne vlade i opoziciono delovanje', 'prelazna-vlada', null);

-- Insert Resources for Categories
INSERT INTO public.resources (category_id, title, url) VALUES
-- Media resources
('media', 'Izveštaj o medijskim slobodama', '#'),
('media', 'Analiza REM regulativa', '#'),
-- Elections resources
('elections', 'Izborni zakoni', '#'),
('elections', 'Birački spiskovi - analiza', '#'),
-- Security resources
('security', 'Zakon o službama bezbednosti', '#'),
('security', 'Reforma BIA - predlozi', '#'),
-- Judiciary resources
('judiciary', 'Status pravosuđa u Srbiji', '#'),
('judiciary', 'Nezavisnost tužilaštva', '#'),
-- Government resources
('government', 'Modeli tehničke vlade', '#'),
('government', 'Primeri prelaznih vlada u regionu', '#'),
('government', 'Analiza opozicionih lista', '#');

-- Insert Requests
INSERT INTO public.requests (id, category_id, title, description, slug, type, min, max, has_comments) VALUES
-- Media requests
('rts', 'media', 'Smena čelnika RTS', 'Glasanje o zahtevu za smenu rukovodstva Radio-televizije Srbije', 'smena-celnika-rts', 'yesno', null, null, true),
('rem', 'media', 'Smena čelnika REM', 'Glasanje o zahtevu za smenu rukovodstva Regulatornog tela za elektronske medije', 'smena-celnika-rem', 'yesno', null, null, true),
-- Elections request
('voter-lists', 'elections', 'Čišćenje biračkih spiskova', 'Podržavamo zahtev za čišćenje biračkih spiskova i poboljšanje izbornih uslova', 'ciscenje-birackih-spiskova', 'yesno', null, null, true),
-- Security request
('bia', 'security', 'Smena čelnika BIA', 'Glasanje o zahtevu za smenu rukovodstva Bezbednosno-informativne agencije', 'smena-celnika-bia', 'yesno', null, null, true),
-- Judiciary request
('zagorka', 'judiciary', 'Smena Zagorke Dolovac', 'Glasanje o zahtevu za smenu javnog tužioca', 'smena-zagorke-dolovac', 'yesno', null, null, true),
-- Government requests
('transition-gov', 'government', 'Prelazna/Ekspertska/Tehnička Vlada', 'Podržavamo prelaznu/ekspertsku/tehničku vladu pred slobodne izbore', 'prelazna-tehnicka-vlada', 'yesno', null, null, true),
('transition-period', 'government', 'Termin trajanja pred slobodne izbore', 'Glasanje o optimalnom trajanju prelazne vlade pre slobodnih izbora', 'termin-trajanja-prelazne-vlade', 'range', 3, 18, true),
('transition-composition', 'government', 'Sastav prelazne vlade', 'Koji sastav prelazne vlade bi bio optimalan pred slobodne izbore', 'sastav-prelazne-vlade', 'multiple', null, null, true),
('opposition-list', 'government', 'Sastav opozicione liste za slobodne izbore', 'Kako bi opozicione liste trebale da se organizuju za izbore', 'sastav-opozicione-liste', 'multiple', null, null, true);

-- Insert Options for multiple-choice Requests
INSERT INTO public.options (request_id, text) VALUES
-- Options for transition-composition
('transition-composition', 'Ekspertska izabrana od strane studenata'),
('transition-composition', 'Prelazna, opozicija + nestranačka lica i eksperti'),
('transition-composition', 'Prelazna, zajedno sa SNS'),
-- Options for opposition-list
('opposition-list', 'Jedna lista: svi zajedno'),
('opposition-list', 'Dve liste: jedna levica, jedna desnica');

-- Insert a mock user for future comments
INSERT INTO public.users (id, email, full_name, avatar_url) VALUES
('d0fc7ee9-a72d-4bd7-8abb-c321cc4e7f51', 'mock@user.com', 'Mock User', null);

-- Insert timeline events
INSERT INTO public.timeline_events (request_id, date, title, description, source) VALUES
(null, '15. april 2023.', 'Protest studenata', 'Studenti Univerziteta u Beogradu organizovali protest i postavili zahteve za reformu obrazovnog sistema.', 'Studentski parlament'),
(null, '23. maj 2023.', 'Građanski protest ''Srbija protiv nasilja''', 'Masovni protesti širom Srbije nakon tragičnih događaja, sa zahtevima za promene u društvu.', 'Građanske organizacije'),
(null, '7. jul 2023.', 'Zahtevi akademske zajednice', 'Grupa profesora i akademika objavila dokument sa zahtevima za reformu javnih institucija.', 'Akademska zajednica'),
(null, '12. decembar 2023.', 'Predlog izmena izbornog zakona', 'Opozicione partije predstavile predlog izmena izbornog zakona za fer i slobodne izbore.', 'Opozicione partije');
