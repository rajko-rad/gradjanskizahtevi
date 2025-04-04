import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { setSupabaseToken } from '@/lib/supabase';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase } from '@/lib/supabase';

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
  
  // Add a ref to track if sync is in progress to prevent loops
  const syncInProgress = useRef(false);
  // Add a ref to track last sync time
  const lastSyncTime = useRef(0);

  const syncUserWithClerk = useCallback(async () => {
    // Skip sync if it's already in progress or if we synced recently (within 5 seconds)
    const now = Date.now();
    if (syncInProgress.current || (now - lastSyncTime.current < 5000)) {
      return;
    }

    if (!isSignedIn || !user) {
      setCanVote(false);
      setSupabaseUser(null);
      setIsLoading(false);
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
        console.log("Successfully obtained Supabase JWT from Clerk");
        
        // Set the auth token in the Supabase client
        await supabaseAnonClient.auth.setSession({
          access_token: token,
          refresh_token: '',
        });
        
        tokenSucceeded = true;
        
      } catch (e) {
        console.error("Error getting Supabase JWT from Clerk:", e);
        console.log("Will continue with user sync using the public client without JWT");
        // Don't throw here - continue with user sync using the public client
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
      setCanVote(tokenSucceeded && !!syncedUser);
      if (!tokenSucceeded) {
        console.warn("User synced but JWT auth failed - voting functionality will be limited");
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
    }
  }, [isSignedIn, user, syncUserWithClerk]);

  return {
    isLoading,
    supabaseUser,
    canVote,
    supabase: supabaseAnonClient,
    error,
    refreshUser: syncUserWithClerk
  };
} 