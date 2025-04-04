import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Create a single anonymous client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Store authenticated client
let authClientInstance: ReturnType<typeof createClient<Database>> | null = null;
// Track current token to avoid unnecessary updates
let currentAuthToken: string | null = null;

/**
 * Get or create an authenticated Supabase client with the user's JWT token
 * This implements a singleton pattern to prevent multiple client instances
 * @param authToken - The JWT token from Clerk
 * @returns Authenticated Supabase client
 */
export function getAuthClient(authToken: string | null) {
  // If no token is provided, return the anonymous client
  if (!authToken) {
    return supabase;
  }

  // If the token hasn't changed and we already have a client, just return it
  if (authToken === currentAuthToken && authClientInstance) {
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
      });
      
      // Update the current token
      currentAuthToken = authToken;
      
      return authClientInstance;
    } else {
      // Create a new auth client if it doesn't exist yet
      console.log('Creating new authenticated Supabase client');
      authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      });
      
      // Store the current token
      currentAuthToken = authToken;
      
      return authClientInstance;
    }
  } catch (error) {
    console.error('Error managing Supabase client:', error);
    
    // In case of errors, recreate the client as a fallback
    console.log('Recreating authenticated Supabase client after error');
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });
    
    // Store the current token
    currentAuthToken = authToken;
    
    return authClientInstance;
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
  // If the token hasn't changed, don't do anything
  if (token === currentAuthToken) {
    console.log('Token unchanged, skipping setSupabaseToken operation');
    return;
  }
  
  if (token) {
    try {
      console.log('Setting Supabase token:', token.substring(0, 10) + '...');
      
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
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: '',
      });
      
      // Update the client using getAuthClient to use the singleton pattern
      getAuthClient(token);
      
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