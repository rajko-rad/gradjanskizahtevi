import { supabase, getAuthClient } from '@/lib/supabase';
import { getSupabaseClient, logTokenInfo } from '@/lib/clerk-supabase';
import type { Database } from '@/types/supabase';

export type Vote = Database['public']['Tables']['votes']['Row'];

// Debug mode toggle - set to true to enable detailed logging
const DEBUG_MODE = true;

// Debug logger function that only logs when debug mode is enabled
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, ...args);
  }
}

/**
 * Cast a vote for a request
 */
export async function castVote(
  userId: string, 
  requestId: string, 
  value: string,
  optionId: string | null = null,
  authToken?: string | null
): Promise<Vote> {
  // Log parameters for debugging
  console.log('Casting vote with params:', { 
    userId: userId ? `${userId.substring(0, 8)}...` : 'undefined', 
    requestId,
    value,
    optionId,
    hasToken: !!authToken
  });

  // Validate required parameters
  if (!requestId) {
    const error = 'Missing required parameter requestId';
    console.error(error);
    throw new Error(error);
  }

  if (!userId) {
    const error = 'Missing required parameter userId';
    console.error(error);
    throw new Error(error);
  }

  if (!authToken) {
    const error = 'Authentication token is required to vote';
    console.error(error);
    throw new Error(error);
  }

  // Log token info if in debug mode
  logTokenInfo(authToken);
  
  // Get a fresh client for this operation
  const client = getSupabaseClient(authToken);
  
  try {
    // Check if user exists in Supabase
    let effectiveUserId = userId;
    
    try {
      debugLog("Looking up user in Supabase");
      const { data: userData, error: userError } = await client
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.warn('Error finding user in Supabase:', userError.message);
      } else if (userData?.id) {
        debugLog(`Found user in Supabase: ${userData.id}`);
        effectiveUserId = userData.id;
      } else {
        debugLog("User not found in Supabase, using original userId");
      }
    } catch (error) {
      console.warn('Error during user lookup:', error);
      // Continue with original userId
    }

    // Check if user has already voted for this request
    try {
      debugLog("Checking for existing vote");
      const { data: existingVote, error: checkError } = await client
        .from('votes')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('request_id', requestId)
        .maybeSingle();

      if (checkError) {
        // Special handling for JWT/auth errors
        if (checkError.code === 'PGRST301' || 
            checkError.code === '42501' || 
            checkError.message?.includes('JWT') || 
            checkError.message?.includes('token')) {
          const error = 'Authentication error. Please sign in again.';
          console.error(error, checkError.message);
          throw new Error(error);
        }
        
        console.error('Error checking existing vote:', checkError);
        throw new Error(`Failed to check existing vote: ${checkError.message}`);
      }

      // If the user has already voted, update the vote
      if (existingVote) {
        debugLog("Updating existing vote");
        const { data: updatedVote, error: updateError } = await client
          .from('votes')
          .update({ 
            value, 
            option_id: optionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingVote.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating vote:', updateError);
          throw new Error(`Failed to update vote: ${updateError.message}`);
        }

        console.log('Vote updated successfully');
        return updatedVote;
      } else {
        // If the user hasn't voted yet, insert a new vote
        debugLog("Creating new vote");
        const { data: newVote, error: insertError } = await client
          .from('votes')
          .insert({
            user_id: effectiveUserId,
            request_id: requestId,
            value,
            option_id: optionId
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting vote:', insertError);
          throw new Error(`Failed to insert vote: ${insertError.message}`);
        }

        console.log('Vote cast successfully');
        return newVote;
      }
    } catch (error) {
      console.error('Error in voting process:', error);
      throw error; // Re-throw to be handled by the caller
    }
  } catch (error) {
    console.error('Error in castVote:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Remove a vote for a request
 */
export async function removeVote(
  userId: string, 
  requestId: string,
  authToken?: string | null
): Promise<void> {
  // Log parameters for debugging
  console.log('Removing vote with params:', { 
    userId: userId ? `${userId.substring(0, 8)}...` : 'undefined', 
    requestId,
    hasToken: !!authToken
  });

  // Validate required parameters
  if (!requestId) {
    const error = 'Missing required parameter requestId';
    console.error(error);
    throw new Error(error);
  }

  if (!userId) {
    const error = 'Missing required parameter userId';
    console.error(error);
    throw new Error(error);
  }

  if (!authToken) {
    const error = 'Authentication token is required to remove a vote';
    console.error(error);
    throw new Error(error);
  }

  // Log token info if in debug mode
  logTokenInfo(authToken);
  
  // Get a fresh client for this operation
  const client = getSupabaseClient(authToken);
  
  try {
    // Check if user exists in Supabase
    let effectiveUserId = userId;
    
    try {
      debugLog("Looking up user in Supabase");
      const { data: userData, error: userError } = await client
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.warn('Error finding user in Supabase:', userError.message);
      } else if (userData?.id) {
        debugLog(`Found user in Supabase: ${userData.id}`);
        effectiveUserId = userData.id;
      } else {
        debugLog("User not found in Supabase, using original userId");
      }
    } catch (error) {
      console.warn('Error during user lookup:', error);
      // Continue with original userId
    }

    // Log delete parameters
    console.log('Removing vote for:', { 
      effectiveUserId, 
      requestId, 
      originalUserId: userId
    });

    // Delete the vote
    const { error: deleteError } = await client
      .from('votes')
      .delete()
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId);

    if (deleteError) {
      // Special handling for JWT/auth errors
      if (deleteError.code === 'PGRST301' || 
          deleteError.code === '42501' || 
          deleteError.message?.includes('JWT') || 
          deleteError.message?.includes('token')) {
        const error = 'Authentication error. Please sign in again.';
        console.error(error, deleteError.message);
        throw new Error(error);
      }
      
      console.error('Error removing vote:', deleteError);
      throw new Error(`Failed to remove vote: ${deleteError.message}`);
    }

    console.log('Vote removed successfully');
  } catch (error) {
    console.error('Error in removeVote:', error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Get a user's vote for a specific request
 */
export async function getUserVote(
  userId: string, 
  requestId: string,
  authToken?: string | null
): Promise<Vote | null> {
  if (!userId || !requestId) {
    console.warn('Missing required parameters for getUserVote:', { userId, requestId });
    return null;
  }

  // Check if auth token is actually present
  const isAuthenticated = !!authToken && authToken.length > 0;
  
  debugLog("getUserVote called with:", { 
    userId: userId ? `${userId.substring(0, 8)}...` : 'undefined', 
    requestId,
    hasToken: isAuthenticated,
    tokenLength: authToken ? authToken.length : 0
  });
  
  if (isAuthenticated) {
    logTokenInfo(authToken);
  }
  
  // Get a fresh client for this operation using the new utility
  const client = getSupabaseClient(authToken);
  
  try {
    // Check if the ID is a Clerk ID (starting with "user_")
    const isClerkId = userId.startsWith('user_');
    
    debugLog("Processing user ID:", {
      isClerkId,
      idPrefix: userId.substring(0, 5) + '...'
    });
    
    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    // This is necessary because Clerk IDs don't match the UUID format expected by Supabase
    let supabaseUserId = userId;
    let userFound = false;
    
    try {
      if (isAuthenticated && isClerkId) {
        debugLog("Looking up Supabase user ID for Clerk user");
        const { data: userData, error: userError } = await client
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
          console.warn('Error finding Supabase user:', userError?.message || userError);
          debugLog('Will try the query anyway with the provided userId');
        } else if (userData?.id) {
          debugLog(`Found Supabase user: ${userData.id}`);
          supabaseUserId = userData.id;
          userFound = true;
        } else {
          debugLog("No matching Supabase user found, may need to sync user first");
          
          // If this is a Clerk ID and no Supabase user was found, 
          // we should try to sync the user if possible
          debugLog("User may not be synced yet, will proceed with original ID");
        }
      } else {
        debugLog(isAuthenticated 
          ? "Using provided ID (not a Clerk ID)" 
          : "Skipping user lookup (not authenticated)");
      }
    } catch (error) {
      console.warn('Error during user lookup:', error);
      debugLog("Error details:", error instanceof Error ? error.message : String(error));
      // Continue with original userId
    }

    // Log query parameters
    console.log('Querying votes with:', { 
      supabaseUserId, 
      requestId, 
      originalUserId: userId,
      isAuthenticated,
      userFound,
      isClerkId
    });

    try {
      const { data, error } = await client
        .from('votes')
        .select('*')
        .eq('user_id', supabaseUserId)
        .eq('request_id', requestId)
        .maybeSingle();

      if (error) {
        // Check specifically for JWT-related errors
        if (error.code === 'PGRST301' || 
            error.code === '42501' || 
            error.message?.includes('JWT') || 
            error.message?.includes('token')) {
          console.warn('Authentication error fetching user vote:', error.message);
          debugLog("JWT/Auth error details:", {
            code: error.code,
            message: error.message,
            hint: error.hint
          });
          // Return null instead of throwing for auth errors
          return null;
        }
        
        console.error('Error fetching user vote:', error);
        debugLog("Query error details:", {
          code: error.code,
          message: error.message,
          hint: error.hint
        });
        throw new Error(`Failed to fetch user vote: ${error.message}`);
      }

      debugLog(`Vote query result: ${data ? 'found vote' : 'no vote found'}`);
      
      // If we didn't find a vote and the ID is a Clerk ID, 
      // try using a different approach for the query
      if (!data && isClerkId && !userFound) {
        debugLog("No vote found with Clerk ID, trying to find user by email");
        
        // Unable to implement this without access to user email
        // This is a limitation we should handle in the UI
        debugLog("Note: For complete functionality, user sync should happen before vote queries");
      }
      
      return data;
    } catch (queryError) {
      console.error('Error executing votes query:', queryError);
      if (queryError instanceof Error) {
        debugLog("Query execution error:", queryError.message);
      }
      // Re-throw to be consistent with other error handling
      throw queryError;
    }
  } catch (error) {
    console.error('Unexpected error in getUserVote:', error);
    // Don't throw to prevent UI breaking, just return null
    return null;
  }
}

/**
 * Get all votes for a request
 */
export async function getVotesForRequest(requestId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('request_id', requestId);

  if (error) {
    console.error(`Error fetching votes for request ${requestId}:`, error);
    throw new Error(`Failed to fetch votes for request ${requestId}`);
  }

  return data;
}

/**
 * Get vote statistics for a request
 */
export async function getVoteStats(requestId: string): Promise<{ total: number, breakdown: { [key: string]: number } }> {
  const { data, error } = await supabase
    .from('votes')
    .select('value')
    .eq('request_id', requestId);

  if (error) {
    console.error(`Error fetching vote stats for request ${requestId}:`, error);
    throw new Error(`Failed to fetch vote stats for request ${requestId}`);
  }

  // Calculate the breakdown of votes
  const breakdown: { [key: string]: number } = {};
  data.forEach(vote => {
    breakdown[vote.value] = (breakdown[vote.value] || 0) + 1;
  });

  return {
    total: data.length,
    breakdown
  };
}

/**
 * Get all votes by a user
 */
export async function getUserVotes(
  userId: string,
  authToken?: string | null
): Promise<Vote[]> {
  // Use the authenticated client if a token is provided
  const client = authToken ? getAuthClient(authToken) : supabase;
  
  const { data, error } = await client
    .from('votes')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching votes for user ${userId}:`, error);
    throw new Error(`Failed to fetch votes for user ${userId}`);
  }

  return data;
} 