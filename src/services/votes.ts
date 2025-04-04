import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

export type Vote = Database['public']['Tables']['votes']['Row'];

/**
 * Cast a vote on a request
 */
export async function castVote(
  userId: string,
  requestId: string,
  value: string,
  optionId?: string | null
): Promise<Vote> {
  console.log("Casting vote with params:", { userId, requestId, value, optionId });
  
  if (!requestId) {
    console.error("Invalid requestId provided to castVote:", requestId);
    throw new Error("Invalid request ID");
  }

  if (!userId) {
    console.error("Invalid userId provided to castVote:", userId);
    throw new Error("User not authenticated");
  }

  // Check if the user is authenticated with Supabase
  const { data: authUser, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser.user) {
    console.error("Authentication error in castVote:", authError);
    throw new Error("User not authenticated in Supabase");
  }

  try {
    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error finding Supabase user:', userError);
      console.log('Will try to use the provided userId as is for voting');
    }

    // If user exists in the database, use their ID, otherwise use the provided ID
    const effectiveUserId = userData?.id || userId;
    
    // Check if the user has already voted for this request
    const { data: existingVote, error: existingVoteError } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (existingVoteError) {
      console.error('Error checking for existing vote:', existingVoteError);
      console.error('Query parameters:', { userId: effectiveUserId, requestId });
      throw new Error('Failed to check for existing vote');
    }

    if (existingVote) {
      // Update the existing vote
      console.log("Updating existing vote:", existingVote.id);
      const { data: updatedVote, error: updateError } = await supabase
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
        throw new Error('Failed to update vote');
      }

      return updatedVote;
    } else {
      // Create a new vote
      console.log("Creating new vote for user:", effectiveUserId);
      const { data: newVote, error: insertError } = await supabase
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
        throw new Error('Failed to cast vote');
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
export async function removeVote(userId: string, requestId: string): Promise<void> {
  try {
    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error finding Supabase user:', userError);
      console.log('Will try to use the provided userId as is for removing vote');
    }

    // If user exists in the database, use their ID, otherwise use the provided ID
    const effectiveUserId = userData?.id || userId;

    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId);

    if (error) {
      console.error('Error removing vote:', error);
      throw new Error('Failed to remove vote');
    }
  } catch (error) {
    console.error('Unexpected error in removeVote:', error);
    throw new Error('Failed to remove vote');
  }
}

/**
 * Get a user's vote for a specific request
 */
export async function getUserVote(userId: string, requestId: string): Promise<Vote | null> {
  try {
    // Get the user from Supabase first to handle Clerk-to-Supabase ID mapping
    // This is necessary because Clerk IDs don't match the UUID format expected by Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error finding Supabase user:', userError);
      console.log('Will try the query anyway with the provided userId');
    }

    // If user exists in the database, use their ID, otherwise use the provided ID
    const effectiveUserId = userData?.id || userId;

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', effectiveUserId)
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user vote:', error);
      throw new Error('Failed to fetch user vote');
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getUserVote:', error);
    throw new Error('Failed to fetch user vote');
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
export async function getUserVotes(userId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching votes for user ${userId}:`, error);
    throw new Error(`Failed to fetch votes for user ${userId}`);
  }

  return data;
} 