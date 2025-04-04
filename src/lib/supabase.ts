import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Debug mode toggle - set to true to enable detailed logging
const DEBUG_MODE = true;

// Debug logger function that only logs when debug mode is enabled
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, ...args);
  }
}

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

debugLog("Supabase configuration:", {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseKey?.length
});

// Create a single anonymous client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
debugLog("Created anonymous Supabase client");

// Store authenticated client
let authClientInstance: ReturnType<typeof createClient<Database>> | null = null;
// Track current token to avoid unnecessary updates
let currentAuthToken: string | null = null;

/**
 * Debug function to safely log token information
 */
function logTokenInfo(token: string | null, prefix: string = "") {
  if (!DEBUG_MODE) return;
  
  if (!token) {
    console.log(`${prefix} Token is null or empty`);
    return;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log(`${prefix} Token doesn't have 3 parts (not a valid JWT)`);
      return;
    }
    
    console.log(`${prefix} Token length: ${token.length}, format: header.payload.signature`);
  } catch (e) {
    console.error(`${prefix} Error examining token:`, e);
  }
}

/**
 * Get or create an authenticated Supabase client with the user's JWT token
 * This implements a singleton pattern to prevent multiple client instances
 * @param authToken - The JWT token from Clerk
 * @returns Authenticated Supabase client
 */
export function getAuthClient(authToken: string | null) {
  // If no token is provided or it's empty, return the anonymous client
  if (!authToken || authToken.trim() === '') {
    debugLog("getAuthClient called with empty token, returning anonymous client");
    return supabase;
  }

  // Log token info but not the actual token
  logTokenInfo(authToken, "DEBUG: getAuthClient called with token:");

  // If the token hasn't changed and we already have a client, just return it
  if (authToken === currentAuthToken && authClientInstance) {
    debugLog("Reusing existing authenticated client (token unchanged)");
    return authClientInstance;
  }

  try {
    // If we have an existing client, update its session instead of creating a new one
    if (authClientInstance) {
      console.log('Updating existing authenticated Supabase client with new token');
      
      // Set the auth header for subsequent requests
      authClientInstance.auth.setSession({
        access_token: authToken,
        refresh_token: '',
      }).then(() => {
        debugLog("Successfully updated session on existing client");
      }).catch(error => {
        console.error('Error updating session:', error);
        console.error('Details:', {
          errorMessage: error?.message,
          errorCode: error?.code,
          errorStatus: error?.status
        });
        // If updating fails, we'll recreate the client below
        authClientInstance = null;
      });
      
      // If the client is still valid, update token and return it
      if (authClientInstance) {
        // Update the current token
        debugLog("Updating current token reference");
        currentAuthToken = authToken;
        return authClientInstance;
      }
    }
    
    // Create a new auth client if it doesn't exist yet or needed recreation
    console.log('Creating new authenticated Supabase client');
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Store the current token
    debugLog("Setting current token reference for new client");
    currentAuthToken = authToken;
    
    return authClientInstance;
  } catch (error) {
    console.error('Error managing Supabase client:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // In case of errors, recreate the client as a fallback
    console.log('Recreating authenticated Supabase client after error');
    try {
      authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      
      // Store the current token
      currentAuthToken = authToken;
      debugLog("Successfully created fallback client");
      
      return authClientInstance;
    } catch (innerError) {
      console.error('Failed to create client even as fallback, using anonymous client:', innerError);
      console.error('Inner error details:', {
        message: innerError instanceof Error ? innerError.message : String(innerError),
        stack: innerError instanceof Error ? innerError.stack : undefined
      });
      // If all else fails, use the anonymous client
      return supabase;
    }
  }
}

/**
 * Clear the authenticated client (useful for logout)
 */
export function clearAuthClient() {
  if (authClientInstance) {
    // Don't create new instances if already null
    console.log('Clearing authenticated Supabase client');
    authClientInstance = null;
    currentAuthToken = null;
  }
}

export default supabase;

/**
 * Create an authenticated Supabase client with the user's JWT token
 * @deprecated Use getAuthClient instead to prevent multiple instances
 * @param authToken - The JWT token from Clerk
 * @returns Authenticated Supabase client
 */
export function createAuthClient(authToken: string) {
  console.warn('Deprecated: createAuthClient called. Use getAuthClient instead to prevent multiple instances');
  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }
  });
}

/**
 * This function gets the Supabase token from Clerk and sets it for the Supabase client.
 * Call this function after a user signs in with Clerk.
 */
export async function setSupabaseToken(token: string | null) {
  debugLog("setSupabaseToken called");
  
  // If the token hasn't changed, don't do anything
  if (token === currentAuthToken) {
    console.log('Token unchanged, skipping setSupabaseToken operation');
    return;
  }
  
  if (token) {
    try {
      // Log token info but not the actual token for security
      logTokenInfo(token, "DEBUG: Setting Supabase token:");
      
      // Add debugging to check token validity
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.warn('Warning: JWT token does not have the expected format (header.payload.signature)');
        } else {
          const payload = JSON.parse(atob(parts[1]));
          console.log('Token contains required claims:', {
            sub: !!payload.sub,
            aud: payload.aud,
            role: payload.role,
            exp: new Date(payload.exp * 1000).toISOString()
          });
        }
      } catch (parseError) {
        console.error('Error parsing JWT token:', parseError);
      }
      
      // Set the authentication session for the anonymous client
      debugLog("Setting session on anonymous client");
      try {
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: '',
        });
        debugLog("Session set successfully on anonymous client");
      } catch (sessionError) {
        console.error("Error setting session:", sessionError);
        throw sessionError;
      }
      
      // Update the client using getAuthClient to use the singleton pattern
      debugLog("Getting auth client with new token");
      const client = getAuthClient(token);
      debugLog("Got auth client: " + !!client);
      
      // Verify the session was set correctly
      try {
        debugLog("Verifying session was set correctly");
        const { data, error } = await client.auth.getSession();
        if (error) {
          console.error("DEBUG: Session verification failed:", error);
        } else {
          debugLog("Session verified, user: " + data.session?.user?.id);
        }
      } catch (verifyError) {
        console.error("DEBUG: Error verifying session:", verifyError);
      }
      
      console.log('Supabase token set successfully');
    } catch (error) {
      console.error('Error setting Supabase token:', error);
      clearAuthClient();
      throw error;
    }
  } else {
    // If the token is null, the user has signed out
    console.log('Clearing Supabase token (user signed out)');
    try {
      await supabase.auth.signOut();
      clearAuthClient();
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  }
} 