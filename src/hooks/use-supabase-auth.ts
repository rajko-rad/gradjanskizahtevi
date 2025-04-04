import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, getAuthClient, clearAuthClient, setSupabaseToken } from '@/lib/supabase';

// Minimum time between auth sync attempts in milliseconds
const MIN_SYNC_INTERVAL = 5000;

/**
 * Hook to handle authentication between Clerk and Supabase
 */
export function useSupabaseAuth() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [canVote, setCanVote] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  
  // Add a ref to track if sync is in progress to prevent loops
  const syncInProgress = useRef(false);
  // Add a ref to track last sync time
  const lastSyncTime = useRef(0);
  // Store the auth token
  const authToken = useRef<string | null>(null);
  // Track initialized state
  const isInitialized = useRef(false);

  const syncUserWithClerk = useCallback(async (forceRefresh = false) => {
    // Skip if already syncing
    if (syncInProgress.current) {
      console.log('Sync already in progress, skipping');
      return;
    }

    // Throttle sync attempts unless forced
    const now = Date.now();
    if (!forceRefresh && isInitialized.current && (now - lastSyncTime.current < MIN_SYNC_INTERVAL)) {
      console.log('Throttling sync attempt, last sync was too recent');
      return;
    }

    try {
      syncInProgress.current = true;
      setIsLoading(true);
      
      // Handle sign out case
      if (!isSignedIn || !user) {
        console.log('User not signed in, clearing auth state');
        setCanVote(false);
        setSupabaseUser(null);
        setTokenVerified(false);
        setIsLoading(false);
        if (authToken.current) {
          // Clear supabase session if we had one
          await setSupabaseToken(null);
          authToken.current = null;
        }
        clearAuthClient();
        lastSyncTime.current = now;
        isInitialized.current = true;
        return;
      }

      console.log("Syncing Clerk user with Supabase...");
      
      // Get JWT token from Clerk only if needed or forced
      if (forceRefresh || !authToken.current) {
        try {
          console.log("Getting Supabase JWT from Clerk...");
          const token = await getToken({ template: "supabase" });
          
          if (token) {
            console.log("Successfully obtained Supabase JWT from Clerk");
            // Set the token in Supabase session
            await setSupabaseToken(token);
            authToken.current = token;
            setTokenVerified(true);
          } else {
            console.warn("No JWT token returned from Clerk");
            await setSupabaseToken(null);
            authToken.current = null;
            setTokenVerified(false);
          }
        } catch (e) {
          console.error("Error getting Supabase JWT from Clerk:", e);
          await setSupabaseToken(null);
          authToken.current = null;
          setTokenVerified(false);
        }
      }

      // Sync user data with Supabase regardless of JWT status
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      
      if (!primaryEmail) {
        throw new Error("No primary email found for user");
      }

      console.log("Syncing user data with Supabase");
      const syncedUser = await syncUserWithSupabase(
        user.id,
        primaryEmail,
        user.fullName,
        user.imageUrl
      );
      
      if (syncedUser) {
        console.log("Successfully synced user with Supabase:", syncedUser);
        setSupabaseUser(syncedUser);
      }
      
      // Verify Supabase session if we have a token
      if (authToken.current) {
        try {
          const client = getAuthClient(authToken.current);
          const { data, error } = await client.auth.getSession();
          
          if (error || !data.session) {
            console.warn("Supabase session verification failed:", error?.message);
            setCanVote(false);
            setTokenVerified(false);
          } else {
            console.log("Supabase session verified successfully");
            setCanVote(true);
            setTokenVerified(true);
          }
        } catch (e) {
          console.error("Error verifying Supabase session:", e);
          setCanVote(false);
          setTokenVerified(false);
        }
      } else {
        setCanVote(false);
        setTokenVerified(false);
      }
      
      // Update last sync time
      lastSyncTime.current = now;
      isInitialized.current = true;
      
    } catch (e) {
      console.error("Error in Clerk-Supabase auth sync:", e);
      setError(e as Error);
      setCanVote(false);
      setTokenVerified(false);
    } finally {
      setIsLoading(false);
      syncInProgress.current = false;
    }
  }, [isSignedIn, user, getToken]);

  // Initial sync after mount and when auth state changes
  useEffect(() => {
    if (!isInitialized.current || !syncInProgress.current) {
      syncUserWithClerk(true); // Force refresh on first load
    }
  }, [isSignedIn, user, syncUserWithClerk]);

  // Add periodic token refresher when user is signed in
  useEffect(() => {
    if (!isSignedIn) return;
    
    // Refresh the token every 55 minutes (before the 1-hour expiry)
    const refreshInterval = setInterval(() => {
      syncUserWithClerk(true); // Force refresh
    }, 55 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [isSignedIn, syncUserWithClerk]);

  // Function to manually refresh auth if needed
  const refreshAuth = useCallback(() => {
    return syncUserWithClerk(true);
  }, [syncUserWithClerk]);

  // Get appropriate client based on auth state
  const getClient = useCallback(() => {
    return getAuthClient(authToken.current);
  }, []);

  return {
    isLoading,
    supabaseUser,
    canVote,
    tokenVerified,
    // Return appropriate client based on auth state
    supabase: getClient(),
    error,
    refreshAuth,
    authToken: authToken.current
  };
} 