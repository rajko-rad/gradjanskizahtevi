import { getSupabaseClient, logTokenInfo, anonClient } from '@/lib/clerk-supabase';
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
 * 
 * This function requires a valid authentication token to work properly
 * as it needs to verify the user's identity through Supabase RLS.
 */
export async function castVote(
  userId: string, 
  requestId: string, 
  value: string,
  authToken?: string | null
): Promise<Vote | null> {
  // Log detailed params to help with debugging
  debugLog("castVote called with:", { 
    userId, 
    requestId, 
    value,
    hasToken: !!authToken 
  });

  // Validate required parameters
  if (!userId || !requestId || value === undefined) {
    console.error("Missing required parameters for castVote:", { userId, requestId, value });
    return null;
  }

  // Use the appropriate client based on token availability
  const client = getSupabaseClient(authToken);

  try {
    // Check if user already voted for this request
    const existingVote = await getUserVote(userId, requestId, authToken);
    
    debugLog("Existing vote check:", { 
      hasExistingVote: !!existingVote,
      value: existingVote?.value
    });

    // If user already voted, update the vote
    if (existingVote) {
      debugLog("Updating existing vote");
      
      const { data, error } = await client
        .from('votes')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('request_id', requestId)
        .select()
        .single();

      if (error) {
        // Special handling for auth errors
        if (error.code === 'PGRST301' || error.code === '42501' || 
            error.message?.includes('JWT') || error.message?.includes('token')) {
          console.warn("Authentication error updating vote:", error.message);
          return null;
        }
        
        console.error('Error updating vote:', error);
        return null;
      }

      debugLog("Vote updated successfully:", { id: data.id, value: data.value });
      return data;
    } 
    // Otherwise, insert a new vote
    else {
      debugLog("Creating new vote");
      
      const { data, error } = await client
        .from('votes')
        .insert({
          user_id: userId,
          request_id: requestId,
          value
        })
        .select()
        .single();

      if (error) {
        // Special handling for auth errors
        if (error.code === 'PGRST301' || error.code === '42501' || 
            error.message?.includes('JWT') || error.message?.includes('token')) {
          console.warn("Authentication error creating vote:", error.message);
          return null;
        }
        
        console.error('Error creating vote:', error);
        return null;
      }

      debugLog("Vote created successfully:", { id: data.id, value: data.value });
      return data;
    }
  } catch (error) {
    console.error('Unexpected error in castVote:', error);
    return null;
  }
}

/**
 * Remove a vote for a request
 * 
 * This function requires a valid authentication token to work properly
 * as it needs to verify the user's identity through Supabase RLS.
 */
export async function removeVote(
  userId: string, 
  requestId: string,
  authToken?: string | null
): Promise<boolean> {
  // Log detailed params to help with debugging
  debugLog("removeVote called with:", {
    userId: userId ? `${userId.substring(0, 8)}...` : 'missing',
    requestId: requestId || 'missing',
    hasToken: !!authToken,
    tokenLength: authToken?.length
  });

  // Validate required parameters
  if (!userId || !requestId) {
    console.warn('Missing required parameters for removeVote:', { 
      hasUserId: !!userId, 
      hasRequestId: !!requestId
    });
    return false;
  }

  // Get appropriate client based on auth token
  const client = getSupabaseClient(authToken);
  
  if (authToken) {
    logTokenInfo(authToken);
  } else {
    console.warn("No auth token provided to removeVote - this may cause permission issues");
  }

  try {
    // Check if user already voted for this request
    const existingVote = await getUserVote(userId, requestId, authToken);
    
    if (!existingVote) {
      debugLog("No vote found to remove");
      return false;
    }
    
    debugLog("Found vote to remove:", { 
      value: existingVote.value,
      id: existingVote.id
    });

    // Remove the vote
    const { error } = await client
      .from('votes')
      .delete()
      .eq('user_id', userId)
      .eq('request_id', requestId);

    if (error) {
      // Special handling for auth errors
      if (error.code === 'PGRST301' || error.code === '42501' || 
          error.message?.includes('JWT') || error.message?.includes('token')) {
        console.warn("Authentication error removing vote:", error.message);
        return false;
      }
      
      console.error('Error removing vote:', error);
      return false;
    }

    debugLog("Vote removed successfully");
    return true;
  } catch (error) {
    console.error('Unexpected error in removeVote:', error);
    return false;
  }
}

/**
 * Get a user's vote for a request
 * 
 * This function can handle both Clerk and Supabase user IDs
 * and will attempt to find the corresponding vote in the database.
 */
export async function getUserVote(
  userId: string, 
  requestId: string,
  authToken?: string | null
): Promise<Vote | null> {
  // Log detailed params to help with debugging
  debugLog("getUserVote called with:", {
    userId: userId ? `${userId.substring(0, 8)}...` : 'missing',
    requestId: requestId || 'missing',
    hasToken: !!authToken,
    tokenLength: authToken?.length
  });

  // Validate required parameters
  if (!requestId) {
    console.warn('Missing required parameter requestId');
    return null;
  }

  if (!userId) {
    console.warn('Missing required parameter userId');
    return null;
  }

  // Track if userId is a Clerk ID (starts with "user_") for debugging
  const isClerkId = userId.startsWith('user_');
  debugLog("Processing user ID:", { 
    isClerkId, 
    idPrefix: userId.substring(0, 5)
  });

  // Get appropriate client based on auth token
  const client = getSupabaseClient(authToken);
  
  if (authToken) {
    logTokenInfo(authToken);
  }

  try {
    // Try to find the Supabase user ID
    let supabaseUserId = userId;
    
    // Try to find user in Supabase if authenticated
    if (isClerkId) {
      try {
        const { data: userData, error: userError } = await client
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
          if (DEBUG_MODE) console.warn("Error looking up user:", userError.message);
        } else if (userData) {
          debugLog("Found Supabase user:", userData.id);
          supabaseUserId = userData.id;
        } else {
          // User not found - this is expected for first-time logins
          debugLog("User not found in database yet. This is normal for first logins.");
        }
      } catch (userLookupError) {
        console.warn("Error during user lookup:", userLookupError);
        // Continue with original ID
      }
    }

    // Fetch the vote
    debugLog("Querying votes with:", { 
      supabaseUserId, 
      requestId, 
      originalUserId: userId,
      isAuthenticated: !!authToken,
      userFound: supabaseUserId === userId
    });

    const { data, error } = await client
      .from('votes')
      .select('*')
      .eq('user_id', supabaseUserId)
      .eq('request_id', requestId)
      .maybeSingle();

    // Handle any query errors
    if (error) {
      // Special handling for common JWT errors
      if (error.code === 'PGRST301' || error.code === '42501' || 
          error.message?.includes('JWT') || error.message?.includes('token')) {
        debugLog("Authentication error while fetching vote:", error.message);
        return null; // Don't throw for auth errors to prevent UI disruption
      }
      
      console.error(`Error fetching vote for user ${supabaseUserId} and request ${requestId}:`, error);
      
      // Try to provide helpful debug information for JWT issues
      if (error.code && error.message) {
        debugLog(`Error code: ${error.code}, message: ${error.message}`);
      }
      
      return null; // Return null instead of throwing to prevent UI disruption
    }

    // Log results for debugging
    if (data) {
      debugLog("Vote query result: vote found", { value: data.value });
    } else {
      debugLog("Vote query result: no vote found");
    }

    return data;
  } catch (error) {
    console.error("Unexpected error in getUserVote:", error);
    return null; // Return null to prevent UI disruption
  }
}

/**
 * Get all votes for a request
 */
export async function getVotesForRequest(requestId: string): Promise<Vote[]> {
  const { data, error } = await getSupabaseClient()
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
  const { data, error } = await getSupabaseClient()
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
  // Use the appropriate client based on token availability
  const client = getSupabaseClient(authToken);
  
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