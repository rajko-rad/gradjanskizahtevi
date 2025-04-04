import { getSupabaseClient, logTokenInfo, anonClient } from '@/lib/clerk-supabase';
import type { Database } from '@/types/supabase';

export type User = Database['public']['Tables']['users']['Row'];

// Debug mode toggle
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debug logger function
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`USERS-SERVICE: ${message}`, ...args);
  }
}

// Track ongoing sync requests by user ID
const pendingSyncs = new Map<string, Promise<User | null>>();

/**
 * Sync a Clerk user with Supabase
 * This should be called after a user signs in with Clerk
 * @param id - The Clerk user ID
 * @param email - The user's email
 * @param fullName - The user's full name (optional)
 * @param avatarUrl - The user's avatar URL (optional)
 * @param authToken - Auth token to use an authenticated client (recommended)
 */
export async function syncUserWithSupabase(
  id: string,
  email: string,
  fullName: string | null = null,
  avatarUrl: string | null = null,
  authToken?: string | null
): Promise<User | null> {
  debugLog("Syncing Clerk user with Supabase:", { 
    id: id ? id.substring(0, 8) + '...' : 'missing', 
    email: email || 'missing',
    hasToken: !!authToken
  });
  
  if (!id || !email) {
    console.error("Missing required parameters for user sync", { id, email });
    return null;
  }
  
  // Check if there's already a sync in progress for this user
  if (pendingSyncs.has(id)) {
    debugLog(`Sync already in progress for user ${id.substring(0, 8)}..., reusing promise`);
    return pendingSyncs.get(id)!;
  }
  
  // Create a new sync promise
  const syncPromise = syncUserWithSupabaseInternal(id, email, fullName, avatarUrl, authToken);
  
  // Store the promise in the map
  pendingSyncs.set(id, syncPromise);
  
  // When the promise resolves, remove it from the map
  syncPromise.then(
    () => pendingSyncs.delete(id),
    () => pendingSyncs.delete(id)
  );
  
  return syncPromise;
}

// Internal implementation of user sync
async function syncUserWithSupabaseInternal(
  id: string,
  email: string,
  fullName?: string | null,
  avatarUrl?: string | null,
  token?: string | null
): Promise<User | null> {
  // Get the appropriate client based on token availability
  const client = getSupabaseClient(token);
  
  if (token) {
    debugLog("Using authenticated client for user sync");
    logTokenInfo(token);
  } else {
    debugLog("Using anonymous client for user sync (no token provided)");
  }
  
  try {
    // First try using the RPC function if available
    try {
      debugLog("Attempting to use sync_clerk_user RPC function");
      const { data: syncedUser, error: syncError } = await client
        .rpc('sync_clerk_user', {
          p_id: id,
          p_email: email,
          p_full_name: fullName,
          p_avatar_url: avatarUrl
        })
        .single();
      
      if (!syncError && syncedUser) {
        debugLog("Successfully synced user via database function");
        return syncedUser as User;
      }
      
      if (syncError) {
        debugLog("Database function failed with error:", syncError.message);
      }
    } catch (rpcError) {
      debugLog("RPC function call failed:", rpcError instanceof Error ? rpcError.message : String(rpcError));
    }
    
    // Fall back to upsert operation if the RPC function fails
    debugLog("Falling back to direct upsert operation");
    
    // Check for existing user first by ID
    const { data: existingUserById, error: lookupError } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (existingUserById) {
      debugLog("Found existing user by ID, updating fields");
      
      // Update the existing user
      const { data: updatedUser, error: updateError } = await client
        .from('users')
        .update({
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Error updating existing user:", updateError);
      } else if (updatedUser) {
        debugLog("Successfully updated existing user");
        return updatedUser;
      }
    } else {
      // Check for existing user by email
      const { data: existingUserByEmail } = await client
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (existingUserByEmail) {
        debugLog("Found existing user by email, updating ID and fields");
        
        // Update the existing user with the new ID
        const { data: updatedUser, error: updateError } = await client
          .from('users')
          .update({
            id, // Update to use the Clerk ID
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single();
        
        if (updateError) {
          console.error("Error updating existing user by email:", updateError);
        } else if (updatedUser) {
          debugLog("Successfully updated existing user's ID and fields");
          return updatedUser;
        }
      } else {
        debugLog("No existing user found, creating new user");
        
        // Insert new user
        const { data: newUser, error: insertError } = await client
          .from('users')
          .insert({
            id,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("Error inserting new user:", insertError);
        } else if (newUser) {
          debugLog("Successfully created new user");
          return newUser;
        }
      }
    }
    
    // Final fallback - try to retrieve the user one more time
    debugLog("Attempting final fallback retrieval of user");
    const { data: finalUser } = await client
      .from('users')
      .select('*')
      .or(`id.eq.${id},email.eq.${email}`)
      .maybeSingle();
    
    if (finalUser) {
      debugLog("Retrieved user in final fallback");
      return finalUser;
    }
    
    console.error("Failed to sync user after all attempts");
    return null;
  } catch (error) {
    console.error('Unexpected error in syncUserWithSupabase:', error);
    return null;
  }
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    throw new Error(`Failed to fetch user with ID ${id}`);
  }
  
  return data;
}

/**
 * Check if a user exists by their ID
 */
export async function userExists(id: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    console.error(`Error checking if user ${id} exists:`, error);
    throw new Error(`Failed to check if user ${id} exists`);
  }
  
  return !!data;
}

/**
 * Get a user's activity summary
 */
export async function getUserActivity(userId: string): Promise<{
  voteCount: number;
  commentCount: number;
  suggestedRequestCount: number;
}> {
  // Get appropriate database client
  const supabase = getSupabaseClient();
  
  // Get vote count
  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', userId);
  
  if (votesError) {
    console.error(`Error fetching vote count for user ${userId}:`, votesError);
    throw new Error(`Failed to fetch vote count for user ${userId}`);
  }
  
  // Get comment count
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id')
    .eq('user_id', userId);
  
  if (commentsError) {
    console.error(`Error fetching comment count for user ${userId}:`, commentsError);
    throw new Error(`Failed to fetch comment count for user ${userId}`);
  }
  
  // Get suggested request count
  const { data: suggestedRequests, error: suggestedRequestsError } = await supabase
    .from('suggested_requests')
    .select('id')
    .eq('user_id', userId);
  
  if (suggestedRequestsError) {
    console.error(`Error fetching suggested request count for user ${userId}:`, suggestedRequestsError);
    throw new Error(`Failed to fetch suggested request count for user ${userId}`);
  }
  
  return {
    voteCount: votes?.length || 0,
    commentCount: comments?.length || 0,
    suggestedRequestCount: suggestedRequests?.length || 0
  };
}

/**
 * Check if a user is an admin
 * Note: For a real application, you would have an admins table or a role field
 * This is just a placeholder for demonstration purposes
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  // This is a placeholder. In a real application, you would check
  // against an admins table or a role field on the user
  return false;
} 