import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { syncUserWithSupabase, type User } from '@/services/users';
import { supabase, getAuthClient, clearAuthClient, setSupabaseToken } from '@/lib/supabase';

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
// Global flag to prevent multiple hook instances from syncing simultaneously
let GLOBAL_SYNC_IN_PROGRESS = false;

/**
 * Debugging function to safely log JWT information
 */
function logJwtDebug(token: string | null) {
  if (!DEBUG_MODE) return;
  
  if (!token) {
    console.log("DEBUG: Token is null or empty");
    return;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log("DEBUG: Invalid JWT format - doesn't have 3 parts");
      return;
    }
    
    // Decode the payload (middle part)
    const payloadBase64 = parts[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    // Log important JWT claims without revealing the whole token
    console.log("DEBUG: JWT token details:", {
      sub: payload.sub,
      aud: payload.aud,
      role: payload.role,
      exp: new Date(payload.exp * 1000).toISOString(),
      iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined,
      jti: payload.jti ? payload.jti.substring(0, 6) + '...' : undefined,
      length: token.length,
      format: 'header.payload.signature'
    });
  } catch (e) {
    console.error("DEBUG: Error parsing JWT:", e);
  }
}

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
          debugLog("Clerk user state:", {
            id: user.id,
            primaryEmail: user.primaryEmailAddress?.emailAddress,
            isSignedIn
          });
          
          const token = await getToken({ template: "supabase" });
          
          if (token) {
            console.log("Successfully obtained Supabase JWT from Clerk");
            logJwtDebug(token);
            
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
                debugLog("Setting Supabase token in session");
                await setSupabaseToken(token);
                authToken.current = token;
                debugLog("Token saved to authToken.current");
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
          debugLog("Verifying Supabase session with token...");
          const client = getAuthClient(authToken.current);
          debugLog("Got authenticated client");
          
          const { data, error } = await client.auth.getSession();
          debugLog("getSession result:", { 
            success: !error,
            hasSession: !!data?.session,
            errorCode: error?.code,
            errorMessage: error?.message
          });
          
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
            debugLog("Session user details:", {
              id: data.session.user.id,
              email: data.session.user.email,
              role: data.session.user.role
            });
            setCanVote(true);
            setTokenVerified(true);
          }
        } catch (e) {
          console.error("Error verifying Supabase session:", e);
          console.error("DEBUG: Full error details:", e);
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
      debugLog("Sync completed, state:", {
        hasToken: !!authToken.current,
        tokenVerified,
        canVote,
        supabaseUser: !!supabaseUser
      });
    }
  }, [isSignedIn, user, getToken]);

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

  // Add periodic token refresher when user is signed in
  useEffect(() => {
    if (!isSignedIn) return;
    
    // Refresh the token every 55 minutes (before the 1-hour expiry)
    const refreshInterval = setInterval(() => {
      // Only refresh if not already in progress
      if (!syncInProgress.current && !GLOBAL_SYNC_IN_PROGRESS) {
        debugLog("Periodic token refresh triggered");
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
    if (authToken.current) {
      debugLog("getCurrentAuthToken returning token");
    } else {
      debugLog("getCurrentAuthToken returning null token");
    }
    return authToken.current;
  }, []);

  // Memoized client provider to prevent unnecessary renders
  const supabaseClient = useCallback(() => {
    // Only create a new client if we have a token
    if (authToken.current) {
      debugLog("supabaseClient using authenticated client");
      return getAuthClient(authToken.current);
    }
    debugLog("supabaseClient using anonymous client (no token)");
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