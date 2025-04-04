import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, getAuthClient, clearAuthClient } from '@/lib/supabase';

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
        setIsLoading(false);
        authToken.current = null;
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
            authToken.current = token;
          } else {
            console.warn("No JWT token returned from Clerk");
            authToken.current = null;
          }
        } catch (e) {
          console.error("Error getting Supabase JWT from Clerk:", e);
          authToken.current = null;
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
      
      // Set canVote based on token status
      setCanVote(!!authToken.current);
      
      if (authToken.current) {
        console.log("User is fully authenticated with Supabase");
      } else {
        console.warn("User synced but JWT auth not available - voting will be limited");
      }
      
      // Update last sync time
      lastSyncTime.current = now;
      isInitialized.current = true;
      
    } catch (e) {
      console.error("Error in Clerk-Supabase auth sync:", e);
      setError(e as Error);
      setCanVote(false);
    } finally {
      setIsLoading(false);
      syncInProgress.current = false;
    }
  }, [isSignedIn, user, getToken]);

  // Initial sync after mount and when auth state changes
  useEffect(() => {
    if (!isInitialized.current || !syncInProgress.current) {
      syncUserWithClerk();
    }
  }, [isSignedIn, user, syncUserWithClerk]);

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
    // Return appropriate client based on auth state
    supabase: getClient(),
    error,
    refreshAuth,
    authToken: authToken.current
  };
} 