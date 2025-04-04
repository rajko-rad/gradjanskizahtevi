import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, getAuthClient, clearAuthClient, setSupabaseToken } from '@/lib/supabase';

// Minimum time between auth sync attempts in milliseconds
const MIN_SYNC_INTERVAL = 5000;
// Maximum retries for token acquisition
const MAX_TOKEN_RETRIES = 3;

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
  // Track retry attempts
  const retryAttempts = useRef(0);

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
        retryAttempts.current = 0;
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
            
            // Validate token format before using it
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
              console.error("Invalid JWT token format - token should have 3 parts");
              
              // Increment retry attempts
              retryAttempts.current += 1;
              
              if (retryAttempts.current <= MAX_TOKEN_RETRIES) {
                console.log(`Token validation failed, retry attempt ${retryAttempts.current}/${MAX_TOKEN_RETRIES}`);
                setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
                return;
              } else {
                console.error("Max token retry attempts reached, giving up");
                setTokenVerified(false);
                setCanVote(false);
              }
            } else {
              // Reset retry counter on success
              retryAttempts.current = 0;
              
              // Set the token in Supabase session
              await setSupabaseToken(token);
              authToken.current = token;
              setTokenVerified(true);
            }
          } else {
            console.warn("No JWT token returned from Clerk");
            console.log("Clerk user state:", {
              id: user.id,
              primaryEmail: user.primaryEmailAddress?.emailAddress,
              isSignedIn
            });
            
            // Increment retry counter
            retryAttempts.current += 1;
            
            if (retryAttempts.current <= MAX_TOKEN_RETRIES) {
              console.log(`Token retrieval failed, retry attempt ${retryAttempts.current}/${MAX_TOKEN_RETRIES}`);
              setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
              return;
            } else {
              console.error("Max token retry attempts reached, giving up");
              await setSupabaseToken(null);
              authToken.current = null;
              setTokenVerified(false);
              setCanVote(false);
            }
          }
        } catch (e) {
          console.error("Error getting Supabase JWT from Clerk:", e);
          console.error("Error details:", e instanceof Error ? e.message : String(e));
          
          // Increment retry counter
          retryAttempts.current += 1;
          
          if (retryAttempts.current <= MAX_TOKEN_RETRIES) {
            console.log(`Token error, retry attempt ${retryAttempts.current}/${MAX_TOKEN_RETRIES}`);
            setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
            return;
          } else {
            console.error("Max token retry attempts reached, giving up");
            await setSupabaseToken(null);
            authToken.current = null;
            setTokenVerified(false);
            setCanVote(false);
          }
        }
      }

      // Sync user data with Supabase regardless of JWT status
      const primaryEmail = user.primaryEmailAddress?.emailAddress;
      
      if (!primaryEmail) {
        throw new Error("No primary email found for user");
      }

      console.log("Syncing user data with Supabase");
      try {
        const syncedUser = await syncUserWithSupabase(
          user.id,
          primaryEmail,
          user.fullName,
          user.imageUrl
        );
        
        if (syncedUser) {
          console.log("Successfully synced user with Supabase:", syncedUser);
          setSupabaseUser(syncedUser);
        } else {
          console.warn("User sync returned no data");
        }
      } catch (syncError) {
        console.error("Error syncing user data:", syncError);
        // Continue with auth verification even if sync fails
      }
      
      // Verify Supabase session if we have a token
      if (authToken.current) {
        try {
          const client = getAuthClient(authToken.current);
          const { data, error } = await client.auth.getSession();
          
          if (error || !data.session) {
            console.warn("Supabase session verification failed:", error?.message);
            
            // If verification fails with a specific token, try to refresh it
            if (error?.message.includes("JWT") || error?.message.includes("token")) {
              console.log("JWT validation error detected, attempting to refresh token");
              authToken.current = null; // Force token refresh on next sync
              setTimeout(() => syncUserWithClerk(true), 100);
              return;
            }
            
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
      if (e instanceof Error) {
        console.error("Error details:", e.message, e.stack);
      }
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
    console.log("Manual auth refresh requested");
    retryAttempts.current = 0; // Reset retry counter for manual refresh
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