-- Create functions to help with authentication troubleshooting and maintenance

-- Check if a table has a specific column
CREATE OR REPLACE FUNCTION table_has_column(
  p_table_name TEXT,
  p_column_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

-- Get the data type of a column
CREATE OR REPLACE FUNCTION get_column_type(
  p_table_name TEXT,
  p_column_name TEXT
) RETURNS TEXT AS $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type
  INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name
    AND column_name = p_column_name;
    
  RETURN v_type;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a table has RLS enabled
CREATE OR REPLACE FUNCTION check_table_rls(
  table_name TEXT
) RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policies_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH policies AS (
    SELECT COUNT(*) AS count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = check_table_rls.table_name
  )
  SELECT 
    check_table_rls.table_name, 
    (SELECT relpolicies > 0 FROM pg_class WHERE relname = check_table_rls.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
    (SELECT count FROM policies);
END;
$$ LANGUAGE plpgsql;

-- Check if the auth schema is correctly set up
CREATE OR REPLACE FUNCTION check_auth_schema() RETURNS TABLE (
  table_name TEXT,
  id_type TEXT,
  user_id_type TEXT,
  rls_enabled BOOLEAN,
  issues TEXT[]
) AS $$
DECLARE
  r RECORD;
  issues TEXT[];
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('users', 'votes', 'comments', 'comment_votes', 'suggested_requests', 'suggested_request_votes')
  LOOP
    table_name := r.tablename;
    issues := ARRAY[]::TEXT[];
    
    -- Check if the table has an id column
    IF table_has_column(r.tablename, 'id') THEN
      id_type := get_column_type(r.tablename, 'id');
      
      IF r.tablename = 'users' AND id_type != 'text' THEN
        issues := array_append(issues, 'users.id should be TEXT type');
      END IF;
    ELSE
      id_type := NULL;
      issues := array_append(issues, 'id column missing');
    END IF;
    
    -- Check if the table has a user_id column
    IF r.tablename != 'users' AND table_has_column(r.tablename, 'user_id') THEN
      user_id_type := get_column_type(r.tablename, 'user_id');
      
      IF user_id_type != 'text' THEN
        issues := array_append(issues, 'user_id should be TEXT type');
      END IF;
    ELSE
      user_id_type := NULL;
      IF r.tablename != 'users' THEN
        issues := array_append(issues, 'user_id column missing');
      END IF;
    END IF;
    
    -- Check if RLS is enabled
    SELECT rls.rls_enabled INTO rls_enabled
    FROM check_table_rls(r.tablename) AS rls;
    
    IF NOT rls_enabled THEN
      issues := array_append(issues, 'RLS not enabled');
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fix auth schema issues 
CREATE OR REPLACE FUNCTION fix_auth_schema() RETURNS TEXT AS $$
DECLARE
  r RECORD;
  fixed_issues TEXT := '';
BEGIN
  -- Check and fix users table id column
  IF (SELECT get_column_type('users', 'id')) != 'text' THEN
    BEGIN
      EXECUTE 'ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::TEXT';
      fixed_issues := fixed_issues || 'Fixed users.id type to TEXT. ';
    EXCEPTION WHEN OTHERS THEN
      fixed_issues := fixed_issues || 'Error fixing users.id: ' || SQLERRM || '. ';
    END;
  END IF;
  
  -- Check and fix user_id columns in other tables
  FOR r IN 
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'user_id'
      AND data_type != 'text'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT', r.table_name);
      fixed_issues := fixed_issues || format('Fixed %s.user_id type to TEXT. ', r.table_name);
    EXCEPTION WHEN OTHERS THEN
      fixed_issues := fixed_issues || format('Error fixing %s.user_id: %s. ', r.table_name, SQLERRM);
    END;
  END LOOP;
  
  -- Enable RLS on tables that need it
  FOR r IN 
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('users', 'votes', 'comments', 'comment_votes', 'suggested_requests', 'suggested_request_votes')
      AND NOT EXISTS (
        SELECT 1 FROM check_table_rls(tablename) rls WHERE rls.rls_enabled
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);
      fixed_issues := fixed_issues || format('Enabled RLS on %s. ', r.tablename);
    EXCEPTION WHEN OTHERS THEN
      fixed_issues := fixed_issues || format('Error enabling RLS on %s: %s. ', r.tablename, SQLERRM);
    END;
  END LOOP;
  
  -- Check if users insert policy exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'INSERT'
  ) THEN
    BEGIN
      EXECUTE 'CREATE POLICY "Allow user creation" ON public.users FOR INSERT WITH CHECK (true)';
      fixed_issues := fixed_issues || 'Created insert policy for users table. ';
    EXCEPTION WHEN OTHERS THEN
      fixed_issues := fixed_issues || 'Error creating insert policy for users: ' || SQLERRM || '. ';
    END;
  END IF;
  
  -- Check if users select policy exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND cmd = 'SELECT'
  ) THEN
    BEGIN
      EXECUTE 'CREATE POLICY "Anyone can view user profiles" ON public.users FOR SELECT USING (true)';
      fixed_issues := fixed_issues || 'Created select policy for users table. ';
    EXCEPTION WHEN OTHERS THEN
      fixed_issues := fixed_issues || 'Error creating select policy for users: ' || SQLERRM || '. ';
    END;
  END IF;
  
  IF fixed_issues = '' THEN
    RETURN 'No issues found or fixed.';
  ELSE
    RETURN 'Fixed issues: ' || fixed_issues;
  END IF;
END;
$$ LANGUAGE plpgsql; 