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

  // Create a new auth client or reuse the existing one
  if (!authClientInstance) {
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });
    console.log('Created new authenticated Supabase client');
  } else {
    // For existing clients, recreate with the new token
    // This is more reliable than trying to update headers directly
    authClientInstance = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    });
    console.log('Updated authenticated Supabase client with new token');
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
    console.log('Setting Supabase token:', token.substring(0, 10) + '...');
    supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
    console.log('Supabase token set successfully');
  } else {
    // If the token is null, the user has signed out
    console.log('Clearing Supabase token (user signed out)');
    supabase.auth.signOut();
  }
} 