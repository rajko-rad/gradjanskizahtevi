create table "public"."admins" (
    "id" uuid not null default uuid_generate_v4(),
    "email" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."admins" enable row level security;

create table "public"."categories" (
    "id" text not null,
    "title" text not null,
    "short_title" text not null,
    "description" text,
    "slug" text not null,
    "icon" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."categories" enable row level security;

create table "public"."comment_votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "comment_id" uuid not null,
    "value" integer not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."comment_votes" enable row level security;

create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "request_id" text not null,
    "parent_id" uuid,
    "content" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."comments" enable row level security;

create table "public"."options" (
    "id" uuid not null default gen_random_uuid(),
    "request_id" text not null,
    "text" text not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."options" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."requests" (
    "id" text not null,
    "category_id" text not null,
    "title" text not null,
    "description" text,
    "slug" text not null,
    "type" text not null,
    "status" text not null default 'active'::text,
    "min" integer,
    "max" integer,
    "has_comments" boolean default true,
    "deadline" timestamp with time zone,
    "progress" integer default 0,
    "vote_count" integer default 0,
    "comment_count" integer default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."requests" enable row level security;

create table "public"."resources" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" text not null,
    "title" text not null,
    "url" text not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."resources" enable row level security;

create table "public"."suggested_request_votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "suggested_request_id" uuid not null,
    "value" integer not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."suggested_request_votes" enable row level security;

create table "public"."suggested_requests" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" text not null,
    "user_id" text not null,
    "title" text not null,
    "description" text not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."suggested_requests" enable row level security;

create table "public"."timeline_events" (
    "id" uuid not null default gen_random_uuid(),
    "request_id" text,
    "date" text not null,
    "title" text not null,
    "description" text not null,
    "source" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."timeline_events" enable row level security;

create table "public"."users" (
    "id" text not null,
    "email" text not null,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."users" enable row level security;

create table "public"."votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" text not null,
    "request_id" text not null,
    "option_id" uuid,
    "value" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."votes" enable row level security;

CREATE UNIQUE INDEX admins_email_key ON public.admins USING btree (email);

CREATE UNIQUE INDEX admins_pkey ON public.admins USING btree (id);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE UNIQUE INDEX comment_votes_pkey ON public.comment_votes USING btree (id);

CREATE UNIQUE INDEX comment_votes_user_id_comment_id_key ON public.comment_votes USING btree (user_id, comment_id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX options_pkey ON public.options USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX requests_pkey ON public.requests USING btree (id);

CREATE UNIQUE INDEX requests_slug_key ON public.requests USING btree (slug);

CREATE UNIQUE INDEX resources_pkey ON public.resources USING btree (id);

CREATE UNIQUE INDEX suggested_request_votes_pkey ON public.suggested_request_votes USING btree (id);

CREATE UNIQUE INDEX suggested_request_votes_user_id_suggested_request_id_key ON public.suggested_request_votes USING btree (user_id, suggested_request_id);

CREATE UNIQUE INDEX suggested_requests_pkey ON public.suggested_requests USING btree (id);

CREATE UNIQUE INDEX timeline_events_pkey ON public.timeline_events USING btree (id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX votes_pkey ON public.votes USING btree (id);

CREATE UNIQUE INDEX votes_user_id_request_id_key ON public.votes USING btree (user_id, request_id);

alter table "public"."admins" add constraint "admins_pkey" PRIMARY KEY using index "admins_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."comment_votes" add constraint "comment_votes_pkey" PRIMARY KEY using index "comment_votes_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."options" add constraint "options_pkey" PRIMARY KEY using index "options_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."requests" add constraint "requests_pkey" PRIMARY KEY using index "requests_pkey";

alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY using index "resources_pkey";

alter table "public"."suggested_request_votes" add constraint "suggested_request_votes_pkey" PRIMARY KEY using index "suggested_request_votes_pkey";

alter table "public"."suggested_requests" add constraint "suggested_requests_pkey" PRIMARY KEY using index "suggested_requests_pkey";

alter table "public"."timeline_events" add constraint "timeline_events_pkey" PRIMARY KEY using index "timeline_events_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."votes" add constraint "votes_pkey" PRIMARY KEY using index "votes_pkey";

alter table "public"."admins" add constraint "admins_email_key" UNIQUE using index "admins_email_key";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."comment_votes" add constraint "comment_votes_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(id) not valid;

alter table "public"."comment_votes" validate constraint "comment_votes_comment_id_fkey";

alter table "public"."comment_votes" add constraint "comment_votes_user_id_comment_id_key" UNIQUE using index "comment_votes_user_id_comment_id_key";

alter table "public"."comment_votes" add constraint "comment_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."comment_votes" validate constraint "comment_votes_user_id_fkey";

alter table "public"."comment_votes" add constraint "comment_votes_value_check" CHECK ((value = ANY (ARRAY['-1'::integer, 1]))) not valid;

alter table "public"."comment_votes" validate constraint "comment_votes_value_check";

alter table "public"."comments" add constraint "comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES comments(id) not valid;

alter table "public"."comments" validate constraint "comments_parent_id_fkey";

alter table "public"."comments" add constraint "comments_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) not valid;

alter table "public"."comments" validate constraint "comments_request_id_fkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."options" add constraint "options_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) not valid;

alter table "public"."options" validate constraint "options_request_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."requests" add constraint "requests_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."requests" validate constraint "requests_category_id_fkey";

alter table "public"."requests" add constraint "requests_slug_key" UNIQUE using index "requests_slug_key";

alter table "public"."requests" add constraint "requests_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'pending'::text]))) not valid;

alter table "public"."requests" validate constraint "requests_status_check";

alter table "public"."requests" add constraint "requests_type_check" CHECK ((type = ANY (ARRAY['yesno'::text, 'multiple'::text, 'range'::text]))) not valid;

alter table "public"."requests" validate constraint "requests_type_check";

alter table "public"."resources" add constraint "resources_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."resources" validate constraint "resources_category_id_fkey";

alter table "public"."suggested_request_votes" add constraint "suggested_request_votes_suggested_request_id_fkey" FOREIGN KEY (suggested_request_id) REFERENCES suggested_requests(id) not valid;

alter table "public"."suggested_request_votes" validate constraint "suggested_request_votes_suggested_request_id_fkey";

alter table "public"."suggested_request_votes" add constraint "suggested_request_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."suggested_request_votes" validate constraint "suggested_request_votes_user_id_fkey";

alter table "public"."suggested_request_votes" add constraint "suggested_request_votes_user_id_suggested_request_id_key" UNIQUE using index "suggested_request_votes_user_id_suggested_request_id_key";

alter table "public"."suggested_request_votes" add constraint "suggested_request_votes_value_check" CHECK ((value = ANY (ARRAY['-1'::integer, 1]))) not valid;

alter table "public"."suggested_request_votes" validate constraint "suggested_request_votes_value_check";

alter table "public"."suggested_requests" add constraint "suggested_requests_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."suggested_requests" validate constraint "suggested_requests_category_id_fkey";

alter table "public"."suggested_requests" add constraint "suggested_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."suggested_requests" validate constraint "suggested_requests_status_check";

alter table "public"."suggested_requests" add constraint "suggested_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."suggested_requests" validate constraint "suggested_requests_user_id_fkey";

alter table "public"."timeline_events" add constraint "timeline_events_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) not valid;

alter table "public"."timeline_events" validate constraint "timeline_events_request_id_fkey";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."votes" add constraint "votes_option_id_fkey" FOREIGN KEY (option_id) REFERENCES options(id) not valid;

alter table "public"."votes" validate constraint "votes_option_id_fkey";

alter table "public"."votes" add constraint "votes_request_id_fkey" FOREIGN KEY (request_id) REFERENCES requests(id) not valid;

alter table "public"."votes" validate constraint "votes_request_id_fkey";

alter table "public"."votes" add constraint "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."votes" validate constraint "votes_user_id_fkey";

alter table "public"."votes" add constraint "votes_user_id_request_id_key" UNIQUE using index "votes_user_id_request_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_user_permissions(p_test_user_id text, p_request_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_jwt_sub TEXT;
  v_result jsonb;
BEGIN
  -- Get the current JWT sub claim
  v_jwt_sub := auth.jwt()->>'sub';
  
  v_result := jsonb_build_object(
    'auth_status', CASE WHEN v_jwt_sub IS NULL THEN 'anonymous' ELSE 'authenticated' END,
    'jwt_sub', v_jwt_sub,
    'test_user_id', p_test_user_id,
    'matches_jwt', v_jwt_sub = p_test_user_id,
    'user_exists', EXISTS (SELECT 1 FROM public.users WHERE id = p_test_user_id)
  );
  
  -- Add request-specific checks if a request ID was provided
  IF p_request_id IS NOT NULL THEN
    v_result := v_result || jsonb_build_object(
      'request_id', p_request_id,
      'request_exists', EXISTS (SELECT 1 FROM public.requests WHERE id = p_request_id),
      'has_vote', EXISTS (
        SELECT 1 FROM public.votes 
        WHERE user_id = p_test_user_id AND request_id = p_request_id
      )
    );
  END IF;
  
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN auth.uid()::text;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (new.id, new.email, '', '');
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_clerk_authenticated()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL;
END;
$function$
;

create or replace view "public"."jwt_test" as  SELECT (current_setting('request.jwt.claims'::text, true))::jsonb AS jwt_claims,
    (auth.jwt() -> 'role'::text) AS jwt_role,
    (auth.jwt() ->> 'sub'::text) AS jwt_sub,
    (auth.jwt() ->> 'aud'::text) AS jwt_aud,
        CASE
            WHEN ((auth.jwt() ->> 'sub'::text) IS NULL) THEN false
            ELSE (EXISTS ( SELECT 1
               FROM users
              WHERE (users.id = (auth.jwt() ->> 'sub'::text))))
        END AS user_exists;


CREATE OR REPLACE FUNCTION public.sync_clerk_user(p_id text, p_email text, p_full_name text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS SETOF users
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- First try to update an existing user (by email)
  UPDATE public.users
  SET 
    id = p_id,
    full_name = COALESCE(p_full_name, full_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    updated_at = NOW()
  WHERE email = p_email;
  
  -- If no rows were updated, try to insert a new user
  IF NOT FOUND THEN
    -- Check if a user with this ID already exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_id) THEN
      INSERT INTO public.users (id, email, full_name, avatar_url)
      VALUES (p_id, p_email, p_full_name, p_avatar_url);
    END IF;
  END IF;
  
  -- Return the user
  RETURN QUERY SELECT * FROM public.users WHERE id = p_id OR email = p_email LIMIT 1;
END;
$function$
;

grant delete on table "public"."admins" to "anon";

grant insert on table "public"."admins" to "anon";

grant references on table "public"."admins" to "anon";

grant select on table "public"."admins" to "anon";

grant trigger on table "public"."admins" to "anon";

grant truncate on table "public"."admins" to "anon";

grant update on table "public"."admins" to "anon";

grant delete on table "public"."admins" to "authenticated";

grant insert on table "public"."admins" to "authenticated";

grant references on table "public"."admins" to "authenticated";

grant select on table "public"."admins" to "authenticated";

grant trigger on table "public"."admins" to "authenticated";

grant truncate on table "public"."admins" to "authenticated";

grant update on table "public"."admins" to "authenticated";

grant delete on table "public"."admins" to "service_role";

grant insert on table "public"."admins" to "service_role";

grant references on table "public"."admins" to "service_role";

grant select on table "public"."admins" to "service_role";

grant trigger on table "public"."admins" to "service_role";

grant truncate on table "public"."admins" to "service_role";

grant update on table "public"."admins" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."comment_votes" to "anon";

grant insert on table "public"."comment_votes" to "anon";

grant references on table "public"."comment_votes" to "anon";

grant select on table "public"."comment_votes" to "anon";

grant trigger on table "public"."comment_votes" to "anon";

grant truncate on table "public"."comment_votes" to "anon";

grant update on table "public"."comment_votes" to "anon";

grant delete on table "public"."comment_votes" to "authenticated";

grant insert on table "public"."comment_votes" to "authenticated";

grant references on table "public"."comment_votes" to "authenticated";

grant select on table "public"."comment_votes" to "authenticated";

grant trigger on table "public"."comment_votes" to "authenticated";

grant truncate on table "public"."comment_votes" to "authenticated";

grant update on table "public"."comment_votes" to "authenticated";

grant delete on table "public"."comment_votes" to "service_role";

grant insert on table "public"."comment_votes" to "service_role";

grant references on table "public"."comment_votes" to "service_role";

grant select on table "public"."comment_votes" to "service_role";

grant trigger on table "public"."comment_votes" to "service_role";

grant truncate on table "public"."comment_votes" to "service_role";

grant update on table "public"."comment_votes" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."options" to "anon";

grant insert on table "public"."options" to "anon";

grant references on table "public"."options" to "anon";

grant select on table "public"."options" to "anon";

grant trigger on table "public"."options" to "anon";

grant truncate on table "public"."options" to "anon";

grant update on table "public"."options" to "anon";

grant delete on table "public"."options" to "authenticated";

grant insert on table "public"."options" to "authenticated";

grant references on table "public"."options" to "authenticated";

grant select on table "public"."options" to "authenticated";

grant trigger on table "public"."options" to "authenticated";

grant truncate on table "public"."options" to "authenticated";

grant update on table "public"."options" to "authenticated";

grant delete on table "public"."options" to "service_role";

grant insert on table "public"."options" to "service_role";

grant references on table "public"."options" to "service_role";

grant select on table "public"."options" to "service_role";

grant trigger on table "public"."options" to "service_role";

grant truncate on table "public"."options" to "service_role";

grant update on table "public"."options" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."requests" to "anon";

grant insert on table "public"."requests" to "anon";

grant references on table "public"."requests" to "anon";

grant select on table "public"."requests" to "anon";

grant trigger on table "public"."requests" to "anon";

grant truncate on table "public"."requests" to "anon";

grant update on table "public"."requests" to "anon";

grant delete on table "public"."requests" to "authenticated";

grant insert on table "public"."requests" to "authenticated";

grant references on table "public"."requests" to "authenticated";

grant select on table "public"."requests" to "authenticated";

grant trigger on table "public"."requests" to "authenticated";

grant truncate on table "public"."requests" to "authenticated";

grant update on table "public"."requests" to "authenticated";

grant delete on table "public"."requests" to "service_role";

grant insert on table "public"."requests" to "service_role";

grant references on table "public"."requests" to "service_role";

grant select on table "public"."requests" to "service_role";

grant trigger on table "public"."requests" to "service_role";

grant truncate on table "public"."requests" to "service_role";

grant update on table "public"."requests" to "service_role";

grant delete on table "public"."resources" to "anon";

grant insert on table "public"."resources" to "anon";

grant references on table "public"."resources" to "anon";

grant select on table "public"."resources" to "anon";

grant trigger on table "public"."resources" to "anon";

grant truncate on table "public"."resources" to "anon";

grant update on table "public"."resources" to "anon";

grant delete on table "public"."resources" to "authenticated";

grant insert on table "public"."resources" to "authenticated";

grant references on table "public"."resources" to "authenticated";

grant select on table "public"."resources" to "authenticated";

grant trigger on table "public"."resources" to "authenticated";

grant truncate on table "public"."resources" to "authenticated";

grant update on table "public"."resources" to "authenticated";

grant delete on table "public"."resources" to "service_role";

grant insert on table "public"."resources" to "service_role";

grant references on table "public"."resources" to "service_role";

grant select on table "public"."resources" to "service_role";

grant trigger on table "public"."resources" to "service_role";

grant truncate on table "public"."resources" to "service_role";

grant update on table "public"."resources" to "service_role";

grant delete on table "public"."suggested_request_votes" to "anon";

grant insert on table "public"."suggested_request_votes" to "anon";

grant references on table "public"."suggested_request_votes" to "anon";

grant select on table "public"."suggested_request_votes" to "anon";

grant trigger on table "public"."suggested_request_votes" to "anon";

grant truncate on table "public"."suggested_request_votes" to "anon";

grant update on table "public"."suggested_request_votes" to "anon";

grant delete on table "public"."suggested_request_votes" to "authenticated";

grant insert on table "public"."suggested_request_votes" to "authenticated";

grant references on table "public"."suggested_request_votes" to "authenticated";

grant select on table "public"."suggested_request_votes" to "authenticated";

grant trigger on table "public"."suggested_request_votes" to "authenticated";

grant truncate on table "public"."suggested_request_votes" to "authenticated";

grant update on table "public"."suggested_request_votes" to "authenticated";

grant delete on table "public"."suggested_request_votes" to "service_role";

grant insert on table "public"."suggested_request_votes" to "service_role";

grant references on table "public"."suggested_request_votes" to "service_role";

grant select on table "public"."suggested_request_votes" to "service_role";

grant trigger on table "public"."suggested_request_votes" to "service_role";

grant truncate on table "public"."suggested_request_votes" to "service_role";

grant update on table "public"."suggested_request_votes" to "service_role";

grant delete on table "public"."suggested_requests" to "anon";

grant insert on table "public"."suggested_requests" to "anon";

grant references on table "public"."suggested_requests" to "anon";

grant select on table "public"."suggested_requests" to "anon";

grant trigger on table "public"."suggested_requests" to "anon";

grant truncate on table "public"."suggested_requests" to "anon";

grant update on table "public"."suggested_requests" to "anon";

grant delete on table "public"."suggested_requests" to "authenticated";

grant insert on table "public"."suggested_requests" to "authenticated";

grant references on table "public"."suggested_requests" to "authenticated";

grant select on table "public"."suggested_requests" to "authenticated";

grant trigger on table "public"."suggested_requests" to "authenticated";

grant truncate on table "public"."suggested_requests" to "authenticated";

grant update on table "public"."suggested_requests" to "authenticated";

grant delete on table "public"."suggested_requests" to "service_role";

grant insert on table "public"."suggested_requests" to "service_role";

grant references on table "public"."suggested_requests" to "service_role";

grant select on table "public"."suggested_requests" to "service_role";

grant trigger on table "public"."suggested_requests" to "service_role";

grant truncate on table "public"."suggested_requests" to "service_role";

grant update on table "public"."suggested_requests" to "service_role";

grant delete on table "public"."timeline_events" to "anon";

grant insert on table "public"."timeline_events" to "anon";

grant references on table "public"."timeline_events" to "anon";

grant select on table "public"."timeline_events" to "anon";

grant trigger on table "public"."timeline_events" to "anon";

grant truncate on table "public"."timeline_events" to "anon";

grant update on table "public"."timeline_events" to "anon";

grant delete on table "public"."timeline_events" to "authenticated";

grant insert on table "public"."timeline_events" to "authenticated";

grant references on table "public"."timeline_events" to "authenticated";

grant select on table "public"."timeline_events" to "authenticated";

grant trigger on table "public"."timeline_events" to "authenticated";

grant truncate on table "public"."timeline_events" to "authenticated";

grant update on table "public"."timeline_events" to "authenticated";

grant delete on table "public"."timeline_events" to "service_role";

grant insert on table "public"."timeline_events" to "service_role";

grant references on table "public"."timeline_events" to "service_role";

grant select on table "public"."timeline_events" to "service_role";

grant trigger on table "public"."timeline_events" to "service_role";

grant truncate on table "public"."timeline_events" to "service_role";

grant update on table "public"."timeline_events" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."votes" to "anon";

grant insert on table "public"."votes" to "anon";

grant references on table "public"."votes" to "anon";

grant select on table "public"."votes" to "anon";

grant trigger on table "public"."votes" to "anon";

grant truncate on table "public"."votes" to "anon";

grant update on table "public"."votes" to "anon";

grant delete on table "public"."votes" to "authenticated";

grant insert on table "public"."votes" to "authenticated";

grant references on table "public"."votes" to "authenticated";

grant select on table "public"."votes" to "authenticated";

grant trigger on table "public"."votes" to "authenticated";

grant truncate on table "public"."votes" to "authenticated";

grant update on table "public"."votes" to "authenticated";

grant delete on table "public"."votes" to "service_role";

grant insert on table "public"."votes" to "service_role";

grant references on table "public"."votes" to "service_role";

grant select on table "public"."votes" to "service_role";

grant trigger on table "public"."votes" to "service_role";

grant truncate on table "public"."votes" to "service_role";

grant update on table "public"."votes" to "service_role";

create policy "Enable read access for all users"
on "public"."admins"
as permissive
for select
to public
using (true);


create policy "Enable read access for all users"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "Enable write access for admins"
on "public"."categories"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.email = (auth.jwt() ->> 'email'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));


create policy "Anyone can view comment votes"
on "public"."comment_votes"
as permissive
for select
to public
using (true);


create policy "Users can delete own comment votes"
on "public"."comment_votes"
as permissive
for delete
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can insert own comment votes"
on "public"."comment_votes"
as permissive
for insert
to public
with check (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can update own comment votes"
on "public"."comment_votes"
as permissive
for update
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Admins can read all comments"
on "public"."comments"
as permissive
for select
to authenticated
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "Anyone can view comments"
on "public"."comments"
as permissive
for select
to public
using (true);


create policy "Users can delete own comments"
on "public"."comments"
as permissive
for delete
to authenticated
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can insert own comments"
on "public"."comments"
as permissive
for insert
to authenticated
with check (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can update own comments"
on "public"."comments"
as permissive
for update
to authenticated
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Anyone can view options"
on "public"."options"
as permissive
for select
to public
using (true);


create policy "Profiles are viewable by everyone"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Profiles can be updated by their owners"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Enable read access for all users"
on "public"."requests"
as permissive
for select
to public
using (true);


create policy "Enable write access for admins"
on "public"."requests"
as permissive
for all
to public
using ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.email = (auth.jwt() ->> 'email'::text)))))
with check ((EXISTS ( SELECT 1
   FROM admins
  WHERE (admins.email = (auth.jwt() ->> 'email'::text)))));


create policy "Anyone can view resources"
on "public"."resources"
as permissive
for select
to public
using (true);


create policy "Anyone can view suggested request votes"
on "public"."suggested_request_votes"
as permissive
for select
to public
using (true);


create policy "Users can delete own suggested request votes"
on "public"."suggested_request_votes"
as permissive
for delete
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can insert own suggested request votes"
on "public"."suggested_request_votes"
as permissive
for insert
to public
with check (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can update own suggested request votes"
on "public"."suggested_request_votes"
as permissive
for update
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Anyone can view suggested requests"
on "public"."suggested_requests"
as permissive
for select
to public
using (true);


create policy "Users can delete own suggested requests"
on "public"."suggested_requests"
as permissive
for delete
to public
using ((((auth.jwt() ->> 'sub'::text) = user_id) AND (status = 'pending'::text)));


create policy "Users can insert own suggested requests"
on "public"."suggested_requests"
as permissive
for insert
to public
with check (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can update own suggested requests"
on "public"."suggested_requests"
as permissive
for update
to public
using ((((auth.jwt() ->> 'sub'::text) = user_id) AND (status = 'pending'::text)));


create policy "Anyone can view timeline events"
on "public"."timeline_events"
as permissive
for select
to public
using (true);


create policy "Allow user creation"
on "public"."users"
as permissive
for insert
to public
with check (true);


create policy "Anyone can view user profiles"
on "public"."users"
as permissive
for select
to public
using (true);


create policy "Users can update own profiles"
on "public"."users"
as permissive
for update
to public
using (((auth.jwt() ->> 'sub'::text) = id));


create policy "Admins can read all votes"
on "public"."votes"
as permissive
for select
to authenticated
using (((auth.jwt() ->> 'role'::text) = 'admin'::text));


create policy "Users can delete own votes"
on "public"."votes"
as permissive
for delete
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can insert own votes"
on "public"."votes"
as permissive
for insert
to public
with check (((auth.jwt() ->> 'sub'::text) = user_id));


create policy "Users can see all votes"
on "public"."votes"
as permissive
for select
to public
using (true);


create policy "Users can update own votes"
on "public"."votes"
as permissive
for update
to public
using (((auth.jwt() ->> 'sub'::text) = user_id));



