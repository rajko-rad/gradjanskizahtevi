import { supabase, getAuthClient } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export type Vote = Database['public']['Tables']['votes']['Row'];

/**
 * Cast a vote on a request
 */
export async function castVote(
  userId: string,
  requestId: string,
  value: string,
  optionId?: string | null,
  authToken?: string | null
): Promise<Vote> {
  console.log("Casting vote with params:", { 
    userId, 
    requestId, 
    value, 
    optionId, 
    hasToken: !!authToken 
  });
  
  if (!requestId) {
    console.error("Invalid requestId provided to castVote:", requestId);
    throw new Error("Invalid request ID");
  }

  if (!userId) {
    console.error("Invalid userId provided to castVote:", userId);
    throw new Error("User not authenticated");
  }

  if (!authToken) {
    console.error("Missing auth token for castVote - authentication required");
    throw new Error("Authentication required for voting");
  }

  // Get the authenticated client - this is crucial for RLS policies to work
  try {
    const client = getAuthClient(authToken);
    
    // Verify authentication
    const { data: authData, error: sessionError } = await client.auth.getSession();
    
    if (sessionError || !authData.session) {
      console.error("Authentication error in castVote:", sessionError || "No session found");
      throw new Error("User not authenticated in Supabase");
    }
    
    console.log("User authenticated in Supabase, proceeding with vote");

    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    let effectiveUserId = userId;
    try {
      const { data: userData, error: userError } = await client
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.warn('Error finding Supabase user:', userError.message || userError);
        console.log('Will try to use the provided userId as is for voting');
      } else if (userData?.id) {
        effectiveUserId = userData.id;
        console.log("Using Supabase user ID:", effectiveUserId);
      }
    } catch (userQueryError) {
      console.warn('Error during user lookup:', userQueryError);
      // Continue with original userId
    }
    
    // Check if the user has already voted for this request
    const { data: existingVote, error: existingVoteError } = await client
      .from('votes')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (existingVoteError) {
      // Handle JWT/auth errors specifically
      if (existingVoteError.code === 'PGRST301' || 
          existingVoteError.message?.includes('JWT') || 
          existingVoteError.message?.includes('auth')) {
        console.error('Authentication error checking for existing vote:', existingVoteError.message);
        throw new Error('Authentication error: Please sign in again');
      }
      
      console.error('Error checking for existing vote:', existingVoteError);
      console.error('Query parameters:', { userId: effectiveUserId, requestId });
      throw new Error('Failed to check for existing vote');
    }

    if (existingVote) {
      // Update the existing vote
      console.log("Updating existing vote:", existingVote.id);
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
        throw new Error('Failed to update vote: ' + updateError.message);
      }

      return updatedVote;
    } else {
      // Create a new vote
      console.log("Creating new vote for user:", effectiveUserId);
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
        console.error('Error casting vote:', insertError);
        throw new Error('Failed to cast vote: ' + insertError.message);
      }

      return newVote;
    }
  } catch (error) {
    console.error('Unexpected error in castVote:', error);
    throw error;
  }
}

/**
 * Remove a vote
 */
export async function removeVote(
  userId: string, 
  requestId: string,
  authToken?: string | null
): Promise<void> {
  if (!userId || !requestId) {
    console.error("Missing required parameters for removeVote:", { userId, requestId });
    throw new Error("Invalid parameters");
  }

  if (!authToken) {
    console.error("Missing auth token for removeVote - authentication required");
    throw new Error("Authentication required for removing votes");
  }

  // Use the authenticated client if a token is provided
  const client = getAuthClient(authToken);
  
  try {
    // Verify authentication
    const { data: authData, error: sessionError } = await client.auth.getSession();
    
    if (sessionError || !authData.session) {
      console.error("Authentication error in removeVote:", sessionError || "No session found");
      throw new Error("User not authenticated in Supabase");
    }

    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    let effectiveUserId = userId;
    try {
      const { data: userData, error: userError } = await client
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.warn('Error finding Supabase user:', userError.message || userError);
        console.log('Will try to use the provided userId as is for removing vote');
      } else if (userData?.id) {
        effectiveUserId = userData.id;
        console.log("Using Supabase user ID for vote removal:", effectiveUserId);
      }
    } catch (userQueryError) {
      console.warn('Error during user lookup:', userQueryError);
      // Continue with original userId
    }

    console.log("Removing vote with params:", { effectiveUserId, requestId, originalUserId: userId });
    const { error } = await client
      .from('votes')
      .delete()
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId);

    if (error) {
      if (error.code === 'PGRST301' || 
          error.message?.includes('JWT') || 
          error.message?.includes('auth')) {
        console.error('Authentication error removing vote:', error.message);
        throw new Error('Authentication error: Please sign in again');
      }
      
      console.error('Error removing vote:', error);
      throw new Error('Failed to remove vote: ' + error.message);
    }
  } catch (error) {
    console.error('Unexpected error in removeVote:', error);
    throw error;
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

  // Check if auth token is actually present to set isAuthenticated correctly
  const isAuthenticated = !!authToken && authToken.length > 0;
  
  // Use the authenticated client if a valid token is provided
  const client = isAuthenticated ? getAuthClient(authToken) : supabase;
  
  try {
    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    // This is necessary because Clerk IDs don't match the UUID format expected by Supabase
    let effectiveUserId = userId;
    
    try {
      if (isAuthenticated) {
        const { data: userData, error: userError } = await client
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (userError) {
          console.warn('Error finding Supabase user:', userError?.message || userError);
          console.log('Will try the query anyway with the provided userId');
        } else if (userData?.id) {
          effectiveUserId = userData.id;
        }
      }
    } catch (error) {
      console.warn('Error during user lookup:', error);
      // Continue with original userId
    }

    // Log query parameters
    console.log('Querying votes with:', { 
      effectiveUserId, 
      requestId, 
      originalUserId: userId,
      isAuthenticated 
    });

    const { data, error } = await client
      .from('votes')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      if ((error.code === 'PGRST301' || error.message?.includes('JWT')) && isAuthenticated) {
        console.warn('Authentication error fetching user vote:', error.message);
        // Return null instead of throwing for auth errors
        return null;
      }
      console.error('Error fetching user vote:', error);
      throw new Error(`Failed to fetch user vote: ${error.message}`);
    }

    return data;
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