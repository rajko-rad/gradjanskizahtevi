import { getSupabaseClient } from '@/lib/clerk-supabase';
import type { Database } from '@/types/supabase';

export type SuggestedRequest = Database['public']['Tables']['suggested_requests']['Row'];
export type SuggestionVote = Database['public']['Tables']['suggested_request_votes']['Row'];

// SuggestedRequest with additional properties
export type ExtendedSuggestedRequest = SuggestedRequest & {
  voteCount: number;
  user_vote?: number;
  categories?: { id: string; name: string }[];
};

/**
 * Get all suggested requests for a category
 */
export async function getSuggestedRequests(categoryId: string): Promise<(SuggestedRequest & { voteCount: number, hasVoted?: boolean })[]> {
  const { data, error } = await getSupabaseClient()
    .from('suggested_requests')
    .select('*')
    .eq('category_id', categoryId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(`Error fetching suggested requests for category ${categoryId}:`, error);
    throw new Error(`Failed to fetch suggested requests for category ${categoryId}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get vote counts for each suggestion
  const suggestionIds = data.map(suggestion => suggestion.id);
  
  // Note: We need to manually count votes for each suggestion since count aggregations
  // are more complex in Supabase
  const { data: votes, error: votesError } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('suggested_request_id')
    .in('suggested_request_id', suggestionIds);
  
  if (votesError) {
    console.error(`Error fetching vote counts for suggestions:`, votesError);
    throw new Error(`Failed to fetch vote counts for suggestions`);
  }

  // Create a map of suggestion ID to vote count by counting occurrences
  const voteCountMap: { [key: string]: number } = {};
  
  votes?.forEach(vote => {
    voteCountMap[vote.suggested_request_id] = (voteCountMap[vote.suggested_request_id] || 0) + 1;
  });

  // Return suggestions with vote counts
  return data.map(suggestion => ({
    ...suggestion,
    voteCount: voteCountMap[suggestion.id] || 0
  }));
}

/**
 * Get a single suggested request by ID
 */
export async function getSuggestedRequestById(id: string): Promise<SuggestedRequest & { voteCount: number }> {
  const { data: suggestion, error } = await getSupabaseClient()
    .from('suggested_requests')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching suggested request with ID ${id}:`, error);
    throw new Error(`Failed to fetch suggested request with ID ${id}`);
  }

  // Get vote count manually by counting votes
  const { data: votes, error: voteError } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('id')
    .eq('suggested_request_id', id);
  
  if (voteError) {
    console.error(`Error fetching vote count for suggestion ${id}:`, voteError);
    throw new Error(`Failed to fetch vote count for suggestion ${id}`);
  }

  return {
    ...suggestion,
    voteCount: votes?.length || 0
  };
}

/**
 * Create a new suggested request
 */
export async function createSuggestedRequest(
  categoryId: string,
  userId: string,
  title: string,
  description: string
): Promise<SuggestedRequest> {
  const { data, error } = await getSupabaseClient()
    .from('suggested_requests')
    .insert({
      category_id: categoryId,
      user_id: userId,
      title,
      description,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating suggested request:', error);
    throw new Error('Failed to create suggested request');
  }
  
  return data;
}

/**
 * Vote on a suggested request
 */
export async function voteOnSuggestedRequest(
  userId: string,
  suggestionId: string
): Promise<{ added: boolean }> {
  // Check if the user has already voted for this suggestion
  const { data: existingVote, error: checkError } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('*')
    .eq('user_id', userId)
    .eq('suggested_request_id', suggestionId)
    .maybeSingle();
  
  if (checkError) {
    console.error('Error checking for existing vote:', checkError);
    throw new Error('Failed to check for existing vote');
  }

  // If the user has already voted, remove their vote
  if (existingVote) {
    const { error: deleteError } = await getSupabaseClient()
      .from('suggested_request_votes')
      .delete()
      .eq('id', existingVote.id);
    
    if (deleteError) {
      console.error('Error removing vote:', deleteError);
      throw new Error('Failed to remove vote');
    }
    
    return { added: false };
  }

  // Otherwise, add their vote
  const { error: addError } = await getSupabaseClient()
    .from('suggested_request_votes')
    .insert({
      user_id: userId,
      suggested_request_id: suggestionId,
      value: 1
    });
  
  if (addError) {
    console.error('Error adding vote:', addError);
    throw new Error('Failed to add vote');
  }
  
  return { added: true };
}

/**
 * Check if a user has voted for a suggested request
 */
export async function hasUserVotedForSuggestion(
  userId: string,
  suggestionId: string
): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('*')
    .eq('user_id', userId)
    .eq('suggested_request_id', suggestionId)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking if user voted for suggestion:', error);
    throw new Error('Failed to check if user voted for suggestion');
  }
  
  return !!data;
}

/**
 * Approve a suggested request
 */
export async function approveSuggestedRequest(
  suggestionId: string,
  adminUserId: string
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('suggested_requests')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId);
  
  if (error) {
    console.error(`Error approving suggested request ${suggestionId}:`, error);
    throw new Error(`Failed to approve suggested request ${suggestionId}`);
  }
}

/**
 * Reject a suggested request
 */
export async function rejectSuggestedRequest(
  suggestionId: string,
  adminUserId: string
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('suggested_requests')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('id', suggestionId);
  
  if (error) {
    console.error(`Error rejecting suggested request ${suggestionId}:`, error);
    throw new Error(`Failed to reject suggested request ${suggestionId}`);
  }
}

/**
 * Get top suggested requests across all categories
 */
export async function getTopSuggestedRequests(
  limit: number = 5
): Promise<(SuggestedRequest & { voteCount: number })[]> {
  // Get all pending suggestions
  const { data: allSuggestions, error: suggestionsError } = await getSupabaseClient()
    .from('suggested_requests')
    .select('*')
    .eq('status', 'pending');
  
  if (suggestionsError) {
    console.error('Error fetching top suggested requests:', suggestionsError);
    throw new Error('Failed to fetch top suggested requests');
  }

  if (!allSuggestions || allSuggestions.length === 0) {
    return [];
  }

  // Get all votes
  const { data: allVotes, error: votesError } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('*');
  
  if (votesError) {
    console.error('Error fetching votes for top suggested requests:', votesError);
    throw new Error('Failed to fetch votes for top suggested requests');
  }

  // Count votes for each suggestion
  const suggestionVoteCounts: { [key: string]: number } = {};
  
  allVotes?.forEach(vote => {
    suggestionVoteCounts[vote.suggested_request_id] = (suggestionVoteCounts[vote.suggested_request_id] || 0) + 1;
  });

  // Add vote counts to suggestions
  const suggestionsWithVoteCounts = allSuggestions.map(suggestion => ({
    ...suggestion,
    voteCount: suggestionVoteCounts[suggestion.id] || 0
  }));

  // Sort by vote count (descending) and take the top N
  return suggestionsWithVoteCounts
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, limit);
}

/**
 * Get the user's vote on a suggested request
 */
export async function getUserVoteOnSuggestedRequest(
  userId: string, 
  suggestedRequestId: string
): Promise<number | null> {
  const { data, error } = await getSupabaseClient()
    .from('suggested_request_votes')
    .select('value')
    .eq('user_id', userId)
    .eq('suggested_request_id', suggestedRequestId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user vote:', error);
    throw new Error('Failed to fetch user vote');
  }
  
  return data ? data.value : null;
} 