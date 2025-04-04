import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export type User = Database['public']['Tables']['users']['Row'];

/**
 * Sync a Clerk user with Supabase
 * This should be called after a user signs in with Clerk
 */
export async function syncUserWithSupabase(
  id: string,
  email: string,
  fullName: string | null = null,
  avatarUrl: string | null = null
): Promise<User> {
  console.log("Syncing user with Supabase:", { id, email });
  
  try {
    // Try to use the sync_clerk_user function
    const { data: syncedUser, error: syncError } = await supabase
      .rpc('sync_clerk_user', {
        p_id: id,
        p_email: email,
        p_full_name: fullName,
        p_avatar_url: avatarUrl
      })
      .single();
    
    if (!syncError && syncedUser) {
      console.log("Successfully synced user via database function");
      return syncedUser as User;
    }
    
    // If the function call fails, fall back to the upsert approach
    console.log("Sync function failed, falling back to direct operations");
    
    // Use upsert with email as the conflict detection
    const { data: upsertedUser, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select();
    
    if (upsertError) {
      console.error("Error upserting user:", upsertError);
      
      // Last attempt - try to retrieve the user
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${id},email.eq.${email}`)
        .maybeSingle();
      
      if (existingUser) {
        console.log("Found existing user as fallback");
        return existingUser as User;
      }
      
      throw new Error(`Failed to sync user: ${upsertError.message}`);
    }
    
    if (upsertedUser && upsertedUser.length > 0) {
      return upsertedUser[0] as User;
    }
    
    throw new Error("No user data returned after upsert");
  } catch (error) {
    console.error('Unexpected error in syncUserWithSupabase:', error);
    throw error;
  }
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
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
 * Check if a user exists
 */
export async function userExists(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  
  if (error && error.code !== 'PGRST116') {
    console.error(`Error checking if user ${id} exists:`, error);
    throw new Error(`Failed to check if user ${id} exists`);
  }
  
  return !!data;
}

/**
 * Get user's activity summary
 */
export async function getUserActivity(
  userId: string
): Promise<{
  voteCount: number;
  commentCount: number;
  suggestedRequestCount: number;
}> {
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