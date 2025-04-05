import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { getSupabaseClient, anonClient, logTokenInfo, isTokenExpired } from '@/lib/clerk-supabase';

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debug logger function
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, ...args);
  }
}

// Minimum time between auth sync attempts in milliseconds
const MIN_SYNC_INTERVAL = 5000;
// Maximum retries for token acquisition
const MAX_TOKEN_RETRIES = 3;
// Token refresh threshold in milliseconds (50 minutes)
const TOKEN_REFRESH_THRESHOLD = 50 * 60 * 1000;

/**
 * Hook to handle authentication between Clerk and Supabase
 */
export function useSupabaseAuth() {
  const { isSignedIn } = useUser();
  const { user } = useUser();
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
  // Track retry attempts
  const retryAttempts = useRef(0);
  // Track if the component is mounted
  const isMounted = useRef(true);
  // Cache for user data
  const userCache = useRef<{ [key: string]: User }>({});

  // Get a fresh token
  const getFreshToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    try {
      // Check if we have a valid cached token
      if (!forceRefresh && authToken.current && !isTokenExpired(authToken.current)) {
        debugLog("Using cached token");
        return authToken.current;
      }

      debugLog("Getting fresh token from Clerk");
      const token = await getToken({ template: 'supabase' });
      
      if (token) {
        debugLog("Successfully obtained token from Clerk");
        authToken.current = token;
        return token;
      }
      
      debugLog("No token returned from Clerk");
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }, [getToken]);

  const syncUserWithClerk = useCallback(async (forceRefresh = false) => {
    debugLog(`syncUserWithClerk called with forceRefresh = ${forceRefresh}`);
    
    // Skip if already syncing
    if (syncInProgress.current) {
      console.log('Sync already in progress, skipping');
      return;
    }

    // Throttle sync attempts unless forced
    const now = Date.now();
    if (!forceRefresh && (now - lastSyncTime.current < MIN_SYNC_INTERVAL)) {
      console.log('Throttling sync attempt, last sync was too recent');
      return;
    }

    try {
      syncInProgress.current = true;
      lastSyncTime.current = now;
      setIsLoading(true);
      
      // Handle sign out case
      if (!isSignedIn || !user) {
        console.log('User not signed in, clearing auth state');
        setCanVote(false);
        setSupabaseUser(null);
        setTokenVerified(false);
        authToken.current = null;
        return;
      }

      // Check if we have cached user data
      if (!forceRefresh && userCache.current[user.id]) {
        debugLog("Using cached user data");
        setSupabaseUser(userCache.current[user.id]);
        setCanVote(true);
        setTokenVerified(true);
        return;
      }

      console.log("Syncing Clerk user with Supabase...");
      
      // Get JWT token from Clerk
      const token = await getFreshToken(forceRefresh);
      
      if (!token) {
        // Increment retry counter
        retryAttempts.current += 1;
        
        if (retryAttempts.current <= MAX_TOKEN_RETRIES) {
          console.log(`Token retrieval failed, retry attempt ${retryAttempts.current}/${MAX_TOKEN_RETRIES}`);
          // Set a timeout to retry
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
        setTokenVerified(true);
      }

      // Skip further processing if component unmounted during async operation
      if (!isMounted.current) return;

      // Sync user data with Supabase
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
              user.imageUrl,
              authToken.current
            );
            
            if (syncedUser && isMounted.current) {
              console.log("Successfully synced user with Supabase:", syncedUser);
              // Cache the user data
              userCache.current[user.id] = syncedUser;
              setSupabaseUser(syncedUser);
              setCanVote(true);
            } else {
              console.warn("User sync returned no data");
            }
          } catch (syncError) {
            console.error("Error syncing user data:", syncError);
          }
        }
      }
      
    } catch (e) {
      console.error("Error in Clerk-Supabase auth sync:", e);
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
    }
  }, [isSignedIn, user, getFreshToken]);

  // Initial sync after mount and when auth state changes
  useEffect(() => {
    isMounted.current = true;
    debugLog("Auth state changed - isSignedIn: " + isSignedIn);
    
    // Only perform sync if not already in progress
    if (!syncInProgress.current) {
      syncUserWithClerk(true); // Force refresh on first load
    }
    
    // Setup token refresh interval
    const tokenCheckInterval = setInterval(() => {
      if (authToken.current && isTokenExpired(authToken.current)) {
        debugLog("Token expired during interval check, triggering refresh");
        getFreshToken(true).then(newToken => {
          if (newToken && isMounted.current) {
            debugLog("Token refreshed successfully via interval");
          }
        });
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      isMounted.current = false;
      clearInterval(tokenCheckInterval);
    };
  }, [isSignedIn, syncUserWithClerk, getFreshToken]);

  // Function to manually refresh auth if needed
  const refreshAuth = useCallback(async () => {
    console.log("Manual auth refresh requested");
    // Only refresh if not already in progress
    if (syncInProgress.current) {
      console.log("Sync already in progress, skipping manual refresh");
      return Promise.resolve();
    }
    
    retryAttempts.current = 0; // Reset retry counter for manual refresh
    return syncUserWithClerk(true);
  }, [syncUserWithClerk]);

  // Get current auth token
  const getCurrentAuthToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    // Check if current token is expired
    if (authToken.current && isTokenExpired(authToken.current)) {
      debugLog("Current token is expired, forcing refresh");
      forceRefresh = true; 
    }
    
    if (forceRefresh || !authToken.current) {
      const token = await getFreshToken(forceRefresh);
      if (token) {
        authToken.current = token;
      }
    }
    
    return authToken.current;
  }, [getFreshToken]);

  // Memoized client provider to avoid recreating clients on each render
  const supabaseClient = useCallback(() => {
    // Only create a new client if we have a token
    if (authToken.current) {
      // Check if token is expired
      if (isTokenExpired(authToken.current)) {
        // Token is expired, but we'll use the anonymous client immediately
        // and trigger a refresh in the background
        debugLog("Auth token expired in supabaseClient, triggering background refresh");
        getCurrentAuthToken(true).catch(e => console.error("Error refreshing expired token:", e));
        return anonClient;
      }
      
      debugLog("supabaseClient using authenticated client");
      return getSupabaseClient(authToken.current);
    }
    
    debugLog("supabaseClient using anonymous client (no token)");
    return anonClient;
  }, [getCurrentAuthToken]);

  return {
    isLoading,
    supabaseUser,
    canVote,
    tokenVerified,
    supabase: supabaseClient(),
    error,
    refreshAuth,
    authToken: authToken.current,
    getCurrentAuthToken
  };
} 