-- Create a public test view to check JWT claims
CREATE OR REPLACE VIEW public.jwt_test AS
  SELECT 
    current_setting('request.jwt.claims', true)::jsonb as jwt_claims,
    auth.jwt()->'role' as jwt_role,
    auth.jwt()->>'sub' as jwt_sub,
    auth.jwt()->>'aud' as jwt_aud,
    CASE 
      WHEN auth.jwt()->>'sub' IS NULL THEN false
      ELSE EXISTS (SELECT 1 FROM public.users WHERE id = auth.jwt()->>'sub')
    END as user_exists;

-- Create a helper function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permissions(
  p_test_user_id TEXT,
  p_request_id TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$; 