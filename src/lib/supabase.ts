import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Create a single anonymous client instance
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Store authenticated client
let authClientInstance: ReturnType<typeof createClient<Database>> | null = null;

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

  // Create a new auth client only if it doesn't exist yet
  if (!authClientInstance) {
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });
    console.log('Created new authenticated Supabase client');
    return authClientInstance;
  } 
  
  // For existing clients, use the auth.setSession method instead of recreating the client
  // This avoids the "Multiple GoTrueClient instances" warning
  try {
    // Set the auth header for subsequent requests
    authClientInstance.auth.setSession({
      access_token: authToken,
      refresh_token: '',
    });
    console.log('Updated existing authenticated Supabase client with new token');
  } catch (error) {
    console.error('Error updating auth token on existing client:', error);
    // If updating fails, recreate the client as a fallback
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });
    console.log('Recreated authenticated Supabase client after error');
  }

  return authClientInstance;
}

/**
 * Clear the authenticated client (useful for logout)
 */
export function clearAuthClient() {
  authClientInstance = null;
  console.log('Cleared authenticated Supabase client');
}

export default supabase;

/**
 * Create an authenticated Supabase client with the user's JWT token
 * @param authToken - The JWT token from Clerk
 * @returns Authenticated Supabase client
 */
export function createAuthClient(authToken: string) {
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
      
      // Clear any existing authenticated client to ensure we create a fresh one
      // This prevents stale auth state
      if (authClientInstance) {
        clearAuthClient();
      }
      
      console.log('Supabase token set successfully');
    } catch (error) {
      console.error('Error setting Supabase token:', error);
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