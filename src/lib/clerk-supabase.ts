import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Setting to control frequency of anonymous client debug messages
const VERBOSE_ANONYMOUS_LOGS = false;

// Last time we logged an anonymous client message
let lastAnonLogTime = 0;
// Minimum gap between anonymous client logs (in ms)
const MIN_ANON_LOG_INTERVAL = 5000; // Increase to 5 seconds to reduce console spam

// Throttled log function for high-frequency operations
const throttledLogs = new Map<string, number>();
function throttledDebugLog(key: string, message: string, ...args: any[]) {
  if (!DEBUG_MODE) return;
  
  const now = Date.now();
  const lastTime = throttledLogs.get(key) || 0;
  
  if (now - lastTime > MIN_ANON_LOG_INTERVAL) {
    console.log(`CLERK-SUPABASE: ${message}`, ...args);
    throttledLogs.set(key, now);
    
    // Clean up old entries
    if (throttledLogs.size > 20) {
      const keys = Array.from(throttledLogs.keys());
      const oldestKey = keys.reduce((oldest, current) => 
        (throttledLogs.get(oldest) || 0) < (throttledLogs.get(current) || 0) ? oldest : current
      );
      throttledLogs.delete(oldestKey);
    }
  }
}

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

// Cache for authenticated clients to reduce number of client instances
const authClientCache = new Map<string, ReturnType<typeof createClient<Database>>>();

/**
 * Create a new Supabase client with the provided JWT token from Clerk
 * This approach creates a fresh client for each request to avoid stale tokens
 * and bypasses Supabase Auth's session management
 * 
 * @param token The JWT token from Clerk's getToken({ template: 'supabase' })
 * @returns A Supabase client with the authentication token
 */
export function createAuthClient(token: string | null | undefined) {
  if (!token) {
    debugLog('No token provided, returning anonymous client');
    return anonClient;
  }

  // Generate a key for caching (first 8 chars of token plus last 8 chars)
  const cacheKey = `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  
  // Check if we already have a client for this token
  if (authClientCache.has(cacheKey)) {
    debugLog('Reusing existing auth client from cache');
    return authClientCache.get(cacheKey)!;
  }
  
  debugLog('Creating new authenticated client with token');
  
  try {
    // Create fresh client with token as Authorization header
    // This bypasses Supabase Auth and directly uses the JWT for RLS
    const client = createClient<Database>(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        // Disable auth features to prevent conflicts
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    // Cache the client
    authClientCache.set(cacheKey, client);
    
    // Limit cache size to prevent memory leaks
    if (authClientCache.size > 5) {
      // Remove oldest entry (first key)
      const firstKey = authClientCache.keys().next().value;
      authClientCache.delete(firstKey);
    }
    
    return client;
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
 * This is the main function you should use throughout the application
 * 
 * @param token JWT token from Clerk
 * @returns The appropriate Supabase client
 */
export function getSupabaseClient(token?: string | null) {
  if (!token) {
    // Only log anonymous client usage if verbose logging is enabled
    // or if enough time has passed since the last log
    const now = Date.now();
    if (VERBOSE_ANONYMOUS_LOGS || (now - lastAnonLogTime > MIN_ANON_LOG_INTERVAL)) {
      throttledDebugLog('anon-client', 'supabaseClient using anonymous client (no token)');
      lastAnonLogTime = now;
    }
    return anonClient;
  }
  
  debugLog('supabaseClient using authenticated client');
  return createAuthClient(token);
}

/**
 * Test function to check if a token is working correctly
 * This can be used for debugging authentication issues
 */
export async function testJwtToken(token: string) {
  try {
    const client = getSupabaseClient(token);
    
    // Try to query the jwt_test view we created
    const { data, error } = await client
      .from('jwt_test')
      .select('*')
      .single();
      
    if (error) {
      debugLog('JWT test failed:', error);
      return { success: false, error };
    }
    
    debugLog('JWT test succeeded:', data);
    return { success: true, data };
  } catch (error) {
    debugLog('JWT test exception:', error);
    return { success: false, error };
  }
}

export default {
  anonClient,
  createAuthClient,
  getSupabaseClient,
  logTokenInfo,
  testJwtToken
}; 