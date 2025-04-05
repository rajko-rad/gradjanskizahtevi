import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

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
 * Extract expiry time from JWT token
 */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return null;
    
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    debugLog('Error extracting token expiry:', error);
    return null;
  }
}

/**
 * Check if a token is expired or about to expire soon
 * Returns true if token is within 30 seconds of expiration or already expired
 */
export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true; // No expiry time found, assume expired
  
  // Consider token expired if it's within 30 seconds of expiration
  const now = Date.now();
  const hasExpired = now > (expiry - 30000); // 30 second buffer
  
  if (hasExpired) {
    debugLog('Token expired or about to expire', {
      expiresAt: new Date(expiry).toISOString(),
      now: new Date().toISOString(),
      timeLeft: (expiry - now) / 1000 + ' seconds'
    });
  }
  
  return hasExpired;
}

/**
 * Create a new Supabase client with the provided JWT token from Clerk
 * This approach creates a fresh client for each request to avoid stale tokens
 * and bypasses Supabase Auth's session management
 */
export function createAuthClient(token: string | null | undefined) {
  if (!token) {
    debugLog('No token provided, returning anonymous client');
    return anonClient;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    debugLog('Token is expired, returning anonymous client');
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
 * Get the appropriate Supabase client based on authentication status
 * If no token is provided, returns the anonymous client
 */
export function getSupabaseClient(token?: string | null) {
  if (!token) {
    return anonClient;
  }
  
  // Check if token is about to expire or has expired
  if (isTokenExpired(token)) {
    debugLog('Token expired, using anonymous client');
    return anonClient;
  }
  
  return createAuthClient(token);
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
    const expiry = payload.exp ? new Date(payload.exp * 1000) : null;
    const now = new Date();
    const timeToExpiry = expiry ? (expiry.getTime() - now.getTime()) / 1000 : 'unknown';
    
    debugLog('Token info:', {
      length: token.length,
      sub: payload.sub ? `${payload.sub.substring(0, 8)}...` : 'missing',
      role: payload.role || 'missing',
      aud: payload.aud || 'missing',
      exp: expiry ? expiry.toISOString() : 'missing',
      timeToExpiry: timeToExpiry + ' seconds',
      isValid: typeof timeToExpiry === 'number' && timeToExpiry > 0 ? 'valid' : 'EXPIRED'
    });
  } catch (error) {
    debugLog('Error examining token:', error);
  }
}

export default {
  anonClient,
  createAuthClient,
  getSupabaseClient,
  logTokenInfo,
  isTokenExpired
}; 