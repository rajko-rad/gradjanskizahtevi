import { getSupabaseClient } from '@/lib/clerk-supabase';
import type { Database } from '@/types/supabase';

export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentVote = Database['public']['Tables']['comment_votes']['Row'];

/**
 * Get comments for a request, with nested replies
 */
export async function getCommentsForRequest(
  requestId: string,
  includeVotes: boolean = false
): Promise<(Comment & { votes?: number, userVote?: -1 | 1 | null, replies?: (Comment & { votes?: number, userVote?: -1 | 1 | null })[] })[]> {
  const { data: allComments, error } = await getSupabaseClient()
    .from('comments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(`Error fetching comments for request ${requestId}:`, error);
    throw new Error(`Failed to fetch comments for request ${requestId}`);
  }

  // If no comments, return empty array
  if (!allComments || allComments.length === 0) {
    return [];
  }

  // Get all comment IDs
  const commentIds = allComments.map(comment => comment.id);

  // Fetch vote counts for all comments
  let voteData: { [key: string]: { total: number, userVote?: -1 | 1 | null } } = {};
  
  if (includeVotes) {
    const { data: votes, error: votesError } = await getSupabaseClient()
      .from('comment_votes')
      .select('*')
      .in('comment_id', commentIds);
      
    if (votesError) {
      console.error(`Error fetching comment votes for request ${requestId}:`, votesError);
      throw new Error(`Failed to fetch comment votes for request ${requestId}`);
    }
    
    // Calculate vote totals for each comment
    voteData = commentIds.reduce((acc, id) => {
      const commentVotes = votes.filter(vote => vote.comment_id === id);
      const total = commentVotes.reduce((sum, vote) => sum + vote.value, 0);
      
      acc[id] = { total };
      return acc;
    }, {} as { [key: string]: { total: number, userVote?: -1 | 1 | null } });
  }

  // Separate top-level comments and replies
  const topLevelComments = allComments.filter(comment => !comment.parent_id);
  const replies = allComments.filter(comment => comment.parent_id);

  // Group replies by parent ID
  const repliesByParent: { [key: string]: (Comment & { votes?: number, userVote?: -1 | 1 | null })[] } = {};
  
  replies.forEach(reply => {
    if (!reply.parent_id) return;
    
    if (!repliesByParent[reply.parent_id]) {
      repliesByParent[reply.parent_id] = [];
    }
    
    repliesByParent[reply.parent_id].push({
      ...reply,
      votes: includeVotes ? voteData[reply.id]?.total || 0 : undefined,
      userVote: includeVotes ? voteData[reply.id]?.userVote : undefined
    });
  });

  // Add replies to their parent comments
  return topLevelComments.map(comment => ({
    ...comment,
    votes: includeVotes ? voteData[comment.id]?.total || 0 : undefined,
    userVote: includeVotes ? voteData[comment.id]?.userVote : undefined,
    replies: repliesByParent[comment.id] || []
  }));
}

/**
 * Add a new comment
 */
export async function addComment(
  userId: string,
  requestId: string,
  content: string,
  parentId?: string | null
): Promise<Comment> {
  const { data, error } = await getSupabaseClient()
    .from('comments')
    .insert({
      user_id: userId,
      request_id: requestId,
      content,
      parent_id: parentId
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding comment:', error);
    throw new Error('Failed to add comment');
  }
  
  return data;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<Comment> {
  // First check if the user is the owner of the comment
  const { data: comment, error: fetchError } = await getSupabaseClient()
    .from('comments')
    .select('*')
    .eq('id', commentId)
    .single();
  
  if (fetchError) {
    console.error(`Error fetching comment ${commentId}:`, fetchError);
    throw new Error(`Failed to fetch comment ${commentId}`);
  }
  
  if (comment.user_id !== userId) {
    throw new Error('You do not have permission to edit this comment');
  }
  
  // Update the comment
  const { data, error } = await getSupabaseClient()
    .from('comments')
    .update({
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', commentId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating comment ${commentId}:`, error);
    throw new Error(`Failed to update comment ${commentId}`);
  }
  
  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  // First check if the user is the owner of the comment or an admin
  if (!isAdmin) {
    const { data: comment, error: fetchError } = await getSupabaseClient()
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    if (fetchError) {
      console.error(`Error fetching comment ${commentId}:`, fetchError);
      throw new Error(`Failed to fetch comment ${commentId}`);
    }
    
    if (comment.user_id !== userId) {
      throw new Error('You do not have permission to delete this comment');
    }
  }
  
  // Delete all comment votes first
  const { error: voteDeleteError } = await getSupabaseClient()
    .from('comment_votes')
    .delete()
    .eq('comment_id', commentId);
  
  if (voteDeleteError) {
    console.error(`Error deleting votes for comment ${commentId}:`, voteDeleteError);
    throw new Error(`Failed to delete votes for comment ${commentId}`);
  }
  
  // Delete the comment
  const { error } = await getSupabaseClient()
    .from('comments')
    .delete()
    .eq('id', commentId);
  
  if (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    throw new Error(`Failed to delete comment ${commentId}`);
  }
}

/**
 * Vote on a comment
 */
export async function voteOnComment(
  userId: string,
  commentId: string,
  value: -1 | 1
): Promise<CommentVote> {
  // Check if the user has already voted for this comment
  const { data: existingVote, error: existingVoteError } = await getSupabaseClient()
    .from('comment_votes')
    .select('*')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle();
  
  if (existingVoteError) {
    console.error('Error checking for existing comment vote:', existingVoteError);
    throw new Error('Failed to check for existing comment vote');
  }
  
  if (existingVote) {
    // If the user is voting the same way, remove the vote
    if (existingVote.value === value) {
      const { error } = await getSupabaseClient()
        .from('comment_votes')
        .delete()
        .eq('id', existingVote.id);
        
      if (error) {
        console.error('Error removing comment vote:', error);
        throw new Error('Failed to remove comment vote');
      }
      
      return { ...existingVote, value: 0 as any }; // Return with 0 value to indicate removed vote
    }
    
    // Otherwise, update the vote value
    const { data, error } = await getSupabaseClient()
      .from('comment_votes')
      .update({ value })
      .eq('id', existingVote.id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating comment vote:', error);
      throw new Error('Failed to update comment vote');
    }
    
    return data;
  } else {
    // Create a new vote
    const { data, error } = await getSupabaseClient()
      .from('comment_votes')
      .insert({
        user_id: userId,
        comment_id: commentId,
        value
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating comment vote:', error);
      throw new Error('Failed to create comment vote');
    }
    
    return data;
  }
}

/**
 * Get a user's vote on a comment
 */
export async function getUserCommentVote(
  userId: string,
  commentId: string
): Promise<number> {
  const { data, error } = await getSupabaseClient()
    .from('comment_votes')
    .select('value')
    .eq('user_id', userId)
    .eq('comment_id', commentId)
    .maybeSingle();
    
  if (error) {
    console.error('Error fetching user comment vote:', error);
    throw new Error('Failed to fetch user comment vote');
  }
  
  return data ? data.value : 0;
} 