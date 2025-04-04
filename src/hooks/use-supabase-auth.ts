import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { getSupabaseClient, anonClient, logTokenInfo } from '@/lib/clerk-supabase';

// Debug mode toggle - set to true to enable detailed logging
const DEBUG_MODE = true;

// Debug logger function that only logs when debug mode is enabled
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
// Global flag to prevent multiple hook instances from syncing simultaneously
let GLOBAL_SYNC_IN_PROGRESS = false;

/**
 * Token cache to reduce redundant token fetching
 * This is separate from the hook to persist across hook instances
 */
const tokenCache = {
  token: null as string | null,
  timestamp: 0,
  isValid: () => {
    // Token is valid if it exists and was fetched less than TOKEN_REFRESH_THRESHOLD ago
    return !!tokenCache.token && (Date.now() - tokenCache.timestamp < TOKEN_REFRESH_THRESHOLD);
  },
  set: (token: string | null) => {
    tokenCache.token = token;
    tokenCache.timestamp = token ? Date.now() : 0;
    debugLog(token ? `Token cached (length: ${token.length})` : 'Token cache cleared');
  },
};

// Update token handling to use clerk-supabase methods
const setSupabaseToken = async (token: string | null) => {
  debugLog("setSupabaseToken replacement called");
  
  // If the token is null, we're clearing the auth state
  if (!token) {
    debugLog("Clearing token (user signed out)");
    tokenCache.set(null);
    return;
  }
  
  // Cache the token
  tokenCache.set(token);
  
  // Just log token info, the token will be used directly by getSupabaseClient
  logTokenInfo(token);
};

/**
 * Detect if the app is running on the client-side in a browser environment
 * Used to avoid attempting to access browser-only APIs during SSR
 */
function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Try to load a cached token from localStorage if available
 * This helps reduce flashing of anonymous clients on page load
 */
function tryLoadCachedToken() {
  if (!isBrowser()) return null;
  
  try {
    const cachedTokenData = localStorage.getItem('auth_token_cache');
    if (!cachedTokenData) return null;
    
    const { token, timestamp, expiry } = JSON.parse(cachedTokenData);
    
    // Check if token is expired
    const now = Date.now();
    if (timestamp && expiry && now < expiry) {
      debugLog("Loaded cached token from localStorage");
      return token;
    }
    
    // Remove expired token
    localStorage.removeItem('auth_token_cache');
    return null;
  } catch (error) {
    console.error("Error loading cached token:", error);
    return null;
  }
}

// Try to restore token from cache
const initialCachedToken = tryLoadCachedToken();
if (initialCachedToken) {
  tokenCache.set(initialCachedToken);
}

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
  const authToken = useRef<string | null>(initialCachedToken);
  // Track initialized state
  const isInitialized = useRef(false);
  // Track retry attempts
  const retryAttempts = useRef(0);
  // Track if the component is mounted
  const isMounted = useRef(true);

  // Get a fresh token with priority given to token cache
  const getFreshToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    // If we have a valid cached token and aren't forcing a refresh, use it
    if (!forceRefresh && tokenCache.isValid()) {
      debugLog("Using cached token");
      return tokenCache.token;
    }
    
    try {
      debugLog("Getting fresh token from Clerk");
      const token = await getToken({ template: 'supabase' });
      
      if (token) {
        debugLog("Successfully obtained token from Clerk in", Date.now() - lastSyncTime.current, "ms");
        tokenCache.set(token);
        
        // Also update our local reference
        authToken.current = token;
        
        // Store in localStorage for persistence
        if (isBrowser()) {
          try {
            // Calculate expiry time (50 minutes from now)
            const expiry = Date.now() + TOKEN_REFRESH_THRESHOLD;
            
            localStorage.setItem('auth_token_cache', JSON.stringify({
              token,
              timestamp: Date.now(),
              expiry
            }));
          } catch (storageError) {
            console.error("Error storing token in localStorage:", storageError);
          }
        }
        
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
    debugLog("Current state:", { 
      inProgress: syncInProgress.current, 
      globalInProgress: GLOBAL_SYNC_IN_PROGRESS,
      initialized: isInitialized.current,
      currentToken: authToken.current ? 'exists' : 'missing',
      retryAttempts: retryAttempts.current
    });
    
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
      lastSyncTime.current = now;
      
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
          
          // Clear localStorage cache
          if (isBrowser()) {
            localStorage.removeItem('auth_token_cache');
          }
        }
        
        // Update state and flags
        isInitialized.current = true;
        retryAttempts.current = 0;
        setIsLoading(false);
        return;
      }

      console.log("Syncing Clerk user with Supabase...");
      
      // Get JWT token from Clerk only if needed or forced
      if (forceRefresh || !authToken.current) {
        const token = await getFreshToken(forceRefresh);
        
        if (!token) {
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
        } else {
          // Reset retry counter on success
          retryAttempts.current = 0;
          authToken.current = token;
          setTokenVerified(true);
        }
      }

      // Skip further processing if component unmounted during async operation
      if (!isMounted.current) return;

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
              user.imageUrl,
              authToken.current
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
      
      // Skip further processing if component unmounted
      if (!isMounted.current) return;
      
      // Verify Supabase session if we have a token
      if (authToken.current && isMounted.current) {
        try {
          debugLog("Verifying Supabase session with token...");
          const client = getSupabaseClient(authToken.current);
          debugLog("Got authenticated client");
          
          // Simple test query to verify RLS works
          const { data, error } = await client.from('jwt_test').select('*').limit(1);
          
          debugLog("JWT test result:", { 
            success: !error,
            hasData: !!data,
            errorCode: error?.code,
            errorMessage: error?.message
          });
          
          if (error) {
            console.warn("JWT verification failed:", error?.message);
            
            // Token verification failed, flag token as invalid
            setTokenVerified(false);
            setCanVote(false);
            
            // Try refreshing token if we haven't exceeded retry limits
            if (retryAttempts.current < MAX_TOKEN_RETRIES) {
              retryAttempts.current += 1;
              
              // Force a token refresh
              const freshToken = await getFreshToken(true);
              
              if (freshToken) {
                authToken.current = freshToken;
                setTokenVerified(true);
                setCanVote(true);
              }
            }
          } else {
            console.log("JWT verification succeeded");
            setCanVote(true);
            setTokenVerified(true);
          }
        } catch (e) {
          console.error("Error verifying JWT:", e);
          setCanVote(false);
          setTokenVerified(false);
        }
      } else if (isMounted.current) {
        debugLog("No token to verify session with", {
          hasToken: !!authToken.current
        });
        setCanVote(false);
        setTokenVerified(false);
      }
      
      // Update initialization state
      isInitialized.current = true;
      
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
      GLOBAL_SYNC_IN_PROGRESS = false;
      debugLog("Sync completed, state:", {
        hasToken: !!authToken.current,
        tokenVerified,
        canVote,
        supabaseUser: !!supabaseUser
      });
    }
  }, [isSignedIn, user, getFreshToken]);

  // Initial sync after mount and when auth state changes
  useEffect(() => {
    isMounted.current = true;
    debugLog("Auth state changed - isSignedIn: " + isSignedIn);
    
    // Only perform sync if not already initialized or in progress
    if (!isInitialized.current && !syncInProgress.current && !GLOBAL_SYNC_IN_PROGRESS) {
      syncUserWithClerk(true); // Force refresh on first load
    }
    
    return () => {
      isMounted.current = false;
    };
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

  // Get current auth token
  const getCurrentAuthToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (forceRefresh || !authToken.current) {
      const token = await getFreshToken(forceRefresh);
      if (token) {
        authToken.current = token;
      }
    }
    
    debugLog("getCurrentAuthToken returning", authToken.current ? "token" : "null");
    return authToken.current;
  }, [getFreshToken]);

  // Memoized client provider to avoid recreating clients on each render
  const supabaseClient = useCallback(() => {
    // Only create a new client if we have a token
    if (authToken.current) {
      debugLog("supabaseClient using authenticated client");
      return getSupabaseClient(authToken.current);
    }
    
    // If we might have a token in the cache but not in our ref, check it
    if (tokenCache.isValid()) {
      debugLog("supabaseClient using cached token client");
      authToken.current = tokenCache.token;
      return getSupabaseClient(tokenCache.token);
    }
    
    debugLog("supabaseClient using anonymous client (no token)");
    return anonClient; // Use the anonymous client if no token is available
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
    getCurrentAuthToken
  };
} 