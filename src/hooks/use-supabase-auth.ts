import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, getAuthClient, clearAuthClient, setSupabaseToken } from '@/lib/supabase';

// Minimum time between auth sync attempts in milliseconds
const MIN_SYNC_INTERVAL = 5000;
// Maximum retries for token acquisition
const MAX_TOKEN_RETRIES = 3;
// Global flag to prevent multiple hook instances from syncing simultaneously
let GLOBAL_SYNC_IN_PROGRESS = false;

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
  // Track if the component is mounted
  const isMounted = useRef(true);

  const syncUserWithClerk = useCallback(async (forceRefresh = false) => {
    // Skip if already syncing (either in this hook instance or globally)
    if (syncInProgress.current || GLOBAL_SYNC_IN_PROGRESS) {
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
      // Set both local and global sync flags
      syncInProgress.current = true;
      GLOBAL_SYNC_IN_PROGRESS = true;
      
      setIsLoading(true);
      
      // Handle sign out case
      if (!isSignedIn || !user) {
        console.log('User not signed in, clearing auth state');
        setCanVote(false);
        setSupabaseUser(null);
        setTokenVerified(false);
        
        if (authToken.current) {
          // Clear supabase session if we had one
          await setSupabaseToken(null);
          authToken.current = null;
        }
        
        // Update state and flags
        lastSyncTime.current = now;
        isInitialized.current = true;
        retryAttempts.current = 0;
        setIsLoading(false);
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
                // Set a timeout to retry but reset sync flags first
                syncInProgress.current = false;
                GLOBAL_SYNC_IN_PROGRESS = false;
                if (isMounted.current) {
                  setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
                }
                return;
              } else {
                console.error("Max token retry attempts reached, giving up");
                setTokenVerified(false);
                setCanVote(false);
              }
            } else {
              // Reset retry counter on success
              retryAttempts.current = 0;
              
              try {
                // Set the token in Supabase session
                await setSupabaseToken(token);
                authToken.current = token;
                setTokenVerified(true);
              } catch (tokenSetError) {
                console.error("Error setting Supabase token:", tokenSetError);
                // Continue with user sync even if token setting fails
              }
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
              // Set a timeout to retry but reset sync flags first
              syncInProgress.current = false;
              GLOBAL_SYNC_IN_PROGRESS = false;
              if (isMounted.current) {
                setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
              }
              return;
            } else {
              console.error("Max token retry attempts reached, giving up");
              if (authToken.current) {
                await setSupabaseToken(null);
                authToken.current = null;
              }
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
            // Set a timeout to retry but reset sync flags first
            syncInProgress.current = false;
            GLOBAL_SYNC_IN_PROGRESS = false;
            if (isMounted.current) {
              setTimeout(() => syncUserWithClerk(true), 1000); // Retry after 1 second
            }
            return;
          } else {
            console.error("Max token retry attempts reached, giving up");
            if (authToken.current) {
              await setSupabaseToken(null);
              authToken.current = null;
            }
            setTokenVerified(false);
            setCanVote(false);
          }
        }
      }

      // Sync user data with Supabase regardless of JWT status
      if (user) {
        const primaryEmail = user.primaryEmailAddress?.emailAddress;
        
        if (!primaryEmail) {
          console.warn("No primary email found for user");
        } else {
          console.log("Syncing user data with Supabase");
          try {
            const syncedUser = await syncUserWithSupabase(
              user.id,
              primaryEmail,
              user.fullName,
              user.imageUrl
            );
            
            if (syncedUser && isMounted.current) {
              console.log("Successfully synced user with Supabase:", syncedUser);
              setSupabaseUser(syncedUser);
            } else {
              console.warn("User sync returned no data");
            }
          } catch (syncError) {
            console.error("Error syncing user data:", syncError);
            // Continue with auth verification even if sync fails
          }
        }
      }
      
      // Verify Supabase session if we have a token
      if (authToken.current && isMounted.current) {
        try {
          const client = getAuthClient(authToken.current);
          const { data, error } = await client.auth.getSession();
          
          if (error || !data.session) {
            console.warn("Supabase session verification failed:", error?.message);
            
            // If verification fails with a specific token, try to refresh it
            if (error?.message?.includes("JWT") || error?.message?.includes("token")) {
              console.log("JWT validation error detected, attempting to refresh token");
              // Clear existing token to force refresh
              authToken.current = null;
              
              // Only schedule a refresh if we haven't exceeded retry limits
              if (retryAttempts.current < MAX_TOKEN_RETRIES) {
                retryAttempts.current += 1;
                // Reset sync flags before scheduling a retry
                syncInProgress.current = false;
                GLOBAL_SYNC_IN_PROGRESS = false;
                if (isMounted.current) {
                  setTimeout(() => syncUserWithClerk(true), 1000);
                  return;
                }
              }
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
      } else if (isMounted.current) {
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
      if (isMounted.current) {
        setError(e as Error);
        setCanVote(false);
        setTokenVerified(false);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      syncInProgress.current = false;
      GLOBAL_SYNC_IN_PROGRESS = false;
    }
  }, [isSignedIn, user, getToken]);

  // Initial sync after mount and when auth state changes
  useEffect(() => {
    isMounted.current = true;
    
    // Only perform sync if not already initialized or in progress
    if (!isInitialized.current && !syncInProgress.current && !GLOBAL_SYNC_IN_PROGRESS) {
      syncUserWithClerk(true); // Force refresh on first load
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [isSignedIn, syncUserWithClerk]);

  // Add periodic token refresher when user is signed in
  useEffect(() => {
    if (!isSignedIn) return;
    
    // Refresh the token every 55 minutes (before the 1-hour expiry)
    const refreshInterval = setInterval(() => {
      // Only refresh if not already in progress
      if (!syncInProgress.current && !GLOBAL_SYNC_IN_PROGRESS) {
        syncUserWithClerk(true); // Force refresh
      }
    }, 55 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [isSignedIn, syncUserWithClerk]);

  // Function to manually refresh auth if needed
  const refreshAuth = useCallback(async () => {
    console.log("Manual auth refresh requested");
    // Only refresh if not already in progress
    if (syncInProgress.current || GLOBAL_SYNC_IN_PROGRESS) {
      console.log("Sync already in progress, skipping manual refresh");
      return Promise.resolve(); // Return a resolved promise
    }
    
    retryAttempts.current = 0; // Reset retry counter for manual refresh
    return syncUserWithClerk(true);
  }, [syncUserWithClerk]);

  // Get current auth token - moved outside of supabaseClient for direct access
  const getCurrentAuthToken = useCallback(() => {
    return authToken.current;
  }, []);

  // Memoized client provider to prevent unnecessary renders
  const supabaseClient = useCallback(() => {
    // Only create a new client if we have a token
    if (authToken.current) {
      return getAuthClient(authToken.current);
    }
    return supabase; // Use the anonymous client if no token is available
  }, []);

  return {
    isLoading,
    supabaseUser,
    canVote,
    tokenVerified,
    // Return appropriate client based on auth state
    supabase: supabaseClient(),
    error,
    refreshAuth,
    authToken: authToken.current,
    getCurrentAuthToken // Expose a method to get the current token
  };
} 