import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Debug mode toggle
const DEBUG_MODE = true;

// Debug logger function
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`CLERK-SUPABASE: ${message}`, ...args);
  }
}

// Initialize the Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Create a single anonymous client instance for unauthenticated requests
export const anonClient = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Create a new Supabase client with the provided JWT token from Clerk
 * This approach creates a fresh client for each request to avoid stale tokens
 * 
 * @param token The JWT token from Clerk's getToken({ template: 'supabase' })
 * @returns A Supabase client with the authentication token
 */
export function createAuthClient(token: string | null | undefined) {
  if (!token) {
    debugLog('No token provided, returning anonymous client');
    return anonClient;
  }

  debugLog('Creating authenticated client with token');
  
  try {
    // Create fresh client with token
    return createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    return anonClient;
  }
}

/**
 * Safely log token information for debugging without revealing the entire token
 */
export function logTokenInfo(token: string | null | undefined) {
  if (!DEBUG_MODE) return;
  
  if (!token) {
    debugLog('Token is null or empty');
    return;
  }
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      debugLog('Invalid JWT format - not a valid token');
      return;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    debugLog('Token info:', {
      length: token.length,
      sub: payload.sub ? `${payload.sub.substring(0, 8)}...` : 'missing',
      role: payload.role || 'missing',
      aud: payload.aud || 'missing',
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'missing',
    });
  } catch (error) {
    debugLog('Error examining token:', error);
  }
}

/**
 * Get the appropriate Supabase client based on authentication status
 * If no token is provided, returns the anonymous client
 * 
 * @param token JWT token from Clerk
 * @returns The appropriate Supabase client
 */
export function getSupabaseClient(token?: string | null) {
  return token ? createAuthClient(token) : anonClient;
}

export default {
  anonClient,
  createAuthClient,
  getSupabaseClient,
  logTokenInfo
}; 