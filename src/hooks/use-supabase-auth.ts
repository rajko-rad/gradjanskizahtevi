import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, createAuthClient } from '@/lib/supabase';

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
  const [supabaseAnonClient] = useState(() => supabase);
  const [authClient, setAuthClient] = useState(supabase);
  
  // Add a ref to track if sync is in progress to prevent loops
  const syncInProgress = useRef(false);
  // Add a ref to track last sync time
  const lastSyncTime = useRef(0);
  // Store the auth token
  const authToken = useRef<string | null>(null);

  const syncUserWithClerk = useCallback(async (forceRefresh = false) => {
    // Skip sync if it's already in progress or if we synced recently (within 5 seconds)
    const now = Date.now();
    if (syncInProgress.current || (!forceRefresh && (now - lastSyncTime.current < 5000))) {
      return;
    }

    if (!isSignedIn || !user) {
      setCanVote(false);
      setSupabaseUser(null);
      setIsLoading(false);
      authToken.current = null;
      setAuthClient(supabase); // Reset to anon client
      return;
    }

    try {
      syncInProgress.current = true;
      setIsLoading(true);
      console.log("Attempting to sync Clerk user with Supabase...");
      
      // Track if we successfully got a token
      let tokenSucceeded = false;
      
      try {
        // Get a JWT token from Clerk for Supabase
        console.log("Attempting to get Supabase JWT from Clerk...");
        const token = await getToken({ template: "supabase" });
        authToken.current = token;
        console.log("Successfully obtained Supabase JWT from Clerk");
        
        // Create a new authenticated client
        const newAuthClient = createAuthClient(token);
        setAuthClient(newAuthClient);
        
        // Also set the auth token in the default client
        const { data, error } = await supabaseAnonClient.auth.setSession({
          access_token: token,
          refresh_token: '',
        });
        
        if (error) {
          console.error("Error setting Supabase session:", error);
        } else {
          console.log("Successfully set Supabase auth session");
          tokenSucceeded = true;
        }
        
      } catch (e) {
        console.error("Error getting Supabase JWT from Clerk:", e);
        console.log("Will continue with user sync using the public client without JWT");
        authToken.current = null;
      }

      // Always try to sync the user data, even if JWT failed
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      
      if (!primaryEmail) {
        console.error("No primary email found for Clerk user");
        throw new Error("No primary email found for user");
      }

      console.log("Syncing user data with Supabase");
      const syncedUser = await syncUserWithSupabase(
        user.id,
        primaryEmail,
        user.fullName,
        user.imageUrl
      );
      
      console.log("Successfully synced user with Supabase:", syncedUser);
      setSupabaseUser(syncedUser);
      
      // Only set canVote to true if we have both a synced user and a token
      if (tokenSucceeded && syncedUser) {
        setCanVote(true);
        console.log("User can vote - fully authenticated");
      } else {
        setCanVote(false);
        console.warn("User synced but JWT auth failed - voting functionality will be limited");
      }
      
      // Verify Supabase authentication with the authClient
      if (authToken.current) {
        try {
          const { data: authData } = await authClient.auth.getUser();
          if (authData?.user) {
            console.log("Supabase authentication confirmed:", authData.user.id);
            setCanVote(true);
          } else {
            console.warn("Supabase authentication failed - JWT token may be invalid");
          }
        } catch (authError) {
          console.error("Error verifying Supabase auth:", authError);
        }
      }
      
      // Update last sync time
      lastSyncTime.current = Date.now();
      
    } catch (e) {
      console.error("Error in Clerk-Supabase auth sync:", e);
      setError(e as Error);
      setCanVote(false);
    } finally {
      setIsLoading(false);
      syncInProgress.current = false;
    }
  }, [isSignedIn, user, supabaseAnonClient, getToken]);

  useEffect(() => {
    // Only sync if user state changed and we have a user
    if (isSignedIn && user) {
      syncUserWithClerk();
    } else if (!isSignedIn) {
      // Clear Supabase session when signed out
      supabaseAnonClient.auth.signOut();
      setSupabaseUser(null);
      setCanVote(false);
      setIsLoading(false);
      setAuthClient(supabase); // Reset to anon client
      authToken.current = null;
    }
  }, [isSignedIn, user, syncUserWithClerk]);

  // Add a function to manually refresh auth if needed
  const refreshAuth = useCallback(() => {
    return syncUserWithClerk(true);
  }, [syncUserWithClerk]);

  return {
    isLoading,
    supabaseUser,
    canVote,
    supabase: authToken.current ? authClient : supabaseAnonClient, // Use auth client if we have a token
    error,
    refreshUser: refreshAuth,
    authToken: authToken.current
  };
} 