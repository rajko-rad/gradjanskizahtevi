import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

/**
 * Gets the Supabase client instance
 * @returns The Supabase client
 */
export function getSupabaseClient() {
  return supabase;
}

export default supabase;

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