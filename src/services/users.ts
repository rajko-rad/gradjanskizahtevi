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
    // Check if the user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 means no rows returned, which is fine for a new user
      console.error('Error checking for existing user:', fetchError);
      console.log('Will try to create/update the user anyway');
      // Don't throw here - continue to try to create/update the user
    }
    
    const now = new Date().toISOString();
    
    if (existingUser) {
      // Update the existing user
      console.log("Updating existing user:", id);
      const { data, error } = await supabase
        .from('users')
        .update({
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        throw new Error('Failed to update user');
      }
      
      return data;
    } else {
      // Create a new user
      console.log("Creating new user:", id);
      
      // If the Clerk ID isn't a valid UUID, it's fine now since we've updated the schema to use TEXT
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            id,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating user:', error);
          // Special handling for unique constraint violations - the user might exist but we couldn't detect it
          if (error.code === '23505') { // unique_violation
            console.log('User might already exist. Attempting to fetch again...');
            const { data: refetchedUser, error: refetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', id)
              .single();
              
            if (refetchError) {
              console.error('Error re-fetching user after insert failed:', refetchError);
              throw new Error('Failed to create user and could not retrieve existing user');
            }
            
            return refetchedUser;
          }
          
          throw new Error('Failed to create user');
        }
        
        return data;
      } catch (insertError) {
        console.error('Unexpected error creating user:', insertError);
        
        // Last resort - try a direct upsert
        console.log('Attempting upsert as a fallback...');
        const { data: upsertData, error: upsertError } = await supabase
          .from('users')
          .upsert({
            id,
            email,
            full_name: fullName,
            avatar_url: avatarUrl,
            created_at: now,
            updated_at: now
          })
          .select()
          .single();
          
        if (upsertError) {
          console.error('Error during upsert fallback:', upsertError);
          throw new Error('All attempts to create user failed');
        }
        
        return upsertData;
      }
    }
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