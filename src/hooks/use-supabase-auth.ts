import { useEffect, useState, useCallback, useRef, useContext } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import type { User } from '@/services/users';
import { getSupabaseClient, anonClient, logTokenInfo, isTokenExpired } from '@/lib/clerk-supabase';
import { useAuthContext } from '@/App';

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debug logger function
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`useSupabaseAuth DEBUG: ${message}`, ...args);
  }
}

/**
 * Hook to provide access to Supabase user state and auth token,
 * relying on the central SupabaseAuthProvider for synchronization and profile fetching.
 */
export function useSupabaseAuth() {
  // Consume state directly from the central provider
  const { 
    token, 
    refreshToken, 
    isAuthenticated, // Get isAuthenticated directly from context
    supabaseUser, // Get user profile from context
    isLoadingAuth // Get loading state from context
  } = useAuthContext();
  
  // REMOVED: Internal state and useEffect for fetching profile
  // const [supabaseUser, setSupabaseUser] = useState<User | null>(null); 
  // const [isLoading, setIsLoading] = useState(true);
  // const [error, setError] = useState<Error | null>(null);
  // useEffect(() => { ... profile fetching logic ... }, [...]);

  // Provide a Supabase client instance using the context token
  const supabaseClient = useCallback(() => {
    // Ensure token is passed correctly
    debugLog(`useSupabaseAuth providing client with token: ${token ? 'present' : 'null'}`);
    return getSupabaseClient(token);
  }, [token]);

  return {
    isLoading: isLoadingAuth, // Use loading state from context
    supabaseUser, // Use user profile from context
    isAuthenticated, // Ensure isAuthenticated is returned
    tokenVerified: !!token, // Simpler verification based on token existence
    supabase: supabaseClient(), // Supabase client instance
    error: null, // Error state is now primarily handled in the provider
    authToken: token, // The auth token from context
    getCurrentAuthToken: refreshToken, // Provide the refresh token function from context
  };
} 