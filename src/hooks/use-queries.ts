import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import * as categoriesService from '@/services/categories';
import * as requestsService from '@/services/requests';
import * as votesService from '@/services/votes';
import * as commentsService from '@/services/comments';
import * as suggestedRequestsService from '@/services/suggestedRequests';
import * as usersService from '@/services/users';
import { useState, useRef } from 'react';

// ---------------------- Categories Queries ----------------------

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoriesService.getCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCategory(categoryId: string) {
  return useQuery({
    queryKey: ['categories', categoryId],
    queryFn: () => categoriesService.getCategoryById(categoryId),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCategoryStats(categoryId: string) {
  return useQuery({
    queryKey: ['categories', categoryId, 'stats'],
    queryFn: () => categoriesService.getCategoryStats(categoryId),
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ---------------------- Requests Queries ----------------------

export function useRequests(categoryId?: string) {
  return useQuery({
    queryKey: ['requests', { categoryId }],
    queryFn: () => categoryId 
      ? requestsService.getRequestsByCategory(categoryId)
      : requestsService.getRequests(),
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePopularRequests(limit = 10) {
  return useQuery({
    queryKey: ['requests', 'popular', { limit }],
    queryFn: () => requestsService.getPopularRequests(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRecentRequests(limit = 10) {
  return useQuery({
    queryKey: ['requests', 'recent', { limit }],
    queryFn: () => requestsService.getRecentRequests(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRequestById(id: string) {
  return useQuery({
    queryKey: ['requests', id],
    queryFn: () => requestsService.getRequestById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useVoteStats(requestId: string) {
  return useQuery({
    queryKey: ['votes', 'stats', requestId],
    queryFn: async () => {
      if (!requestId) {
        console.warn('Missing requestId for useVoteStats');
        return { total: 0, breakdown: {} };
      }
      
      try {
        return await votesService.getVoteStats(requestId);
      } catch (error) {
        console.error('Error fetching vote stats:', error);
        // Return empty stats instead of throwing to prevent UI breakage
        return { total: 0, breakdown: {} };
      }
    },
    enabled: !!requestId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// ---------------------- Votes Mutations ----------------------

export function useCastVote() {
  const queryClient = useQueryClient();
  const { supabaseUser, tokenVerified, refreshAuth, getCurrentAuthToken } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      value, 
      optionId 
    }: { 
      requestId: string; 
      value: string; 
      optionId?: string | null;
    }) => {
      // If we don't have a verified token, try to refresh auth once
      if (!tokenVerified && retryCount < MAX_RETRIES) {
        console.log("Token not verified, attempting to refresh auth before voting (attempt", retryCount + 1, ")");
        try {
          await refreshAuth();
          setRetryCount(count => count + 1);
        } catch (refreshError) {
          console.error("Failed to refresh auth before voting:", refreshError);
          // Continue to attempt the vote anyway
        }
      }
      
      if (!supabaseUser?.id) {
        console.error("Cannot cast vote: User not authenticated in Supabase");
        throw new Error('User not authenticated. Please sign in to vote.');
      }
      
      // Get the current auth token at execution time
      const currentAuthToken = getCurrentAuthToken();
      
      if (!currentAuthToken) {
        console.error("Cannot cast vote: Missing authentication token");
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      try {
        const result = await votesService.castVote(supabaseUser.id, requestId, value, optionId, currentAuthToken);
        // Reset retry count on success
        if (retryCount > 0) {
          setRetryCount(0);
        }
        return result;
      } catch (error) {
        // Format user-friendly error message
        let errorMessage = 'Failed to cast vote';
        if (error instanceof Error) {
          if (error.message.includes('authenticated') || error.message.includes('auth')) {
            errorMessage = 'Authentication error. Please sign in again.';
          } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. You may not have access to vote.';
          } else {
            errorMessage = error.message;
          }
        }
        
        // Rethrow with user-friendly message
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', supabaseUser?.id, variables.requestId] 
      });
    },
    onError: (error) => {
      console.error("Voting error:", error);
    }
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { supabaseUser, tokenVerified, refreshAuth, getCurrentAuthToken } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      // If we don't have a verified token, try to refresh auth once
      if (!tokenVerified && retryCount < MAX_RETRIES) {
        console.log("Token not verified, attempting to refresh auth before removing vote (attempt", retryCount + 1, ")");
        try {
          await refreshAuth();
          setRetryCount(count => count + 1);
        } catch (refreshError) {
          console.error("Failed to refresh auth before removing vote:", refreshError);
          // Continue to attempt the vote removal anyway
        }
      }
      
      if (!supabaseUser?.id) {
        console.error("Cannot remove vote: User not authenticated in Supabase");
        throw new Error('User not authenticated. Please sign in to remove your vote.');
      }
      
      // Get the current auth token at execution time
      const currentAuthToken = getCurrentAuthToken();
      
      if (!currentAuthToken) {
        console.error("Cannot remove vote: Missing authentication token");
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      try {
        await votesService.removeVote(supabaseUser.id, requestId, currentAuthToken);
        // Reset retry count on success
        if (retryCount > 0) {
          setRetryCount(0);
        }
      } catch (error) {
        // Format user-friendly error message
        let errorMessage = 'Failed to remove vote';
        if (error instanceof Error) {
          if (error.message.includes('authenticated') || error.message.includes('auth')) {
            errorMessage = 'Authentication error. Please sign in again.';
          } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied. You may not have access to remove this vote.';
          } else {
            errorMessage = error.message;
          }
        }
        
        // Rethrow with user-friendly message
        throw new Error(errorMessage);
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', supabaseUser?.id, variables.requestId] 
      });
    },
    onError: (error) => {
      console.error("Vote removal error:", error);
    }
  });
}

export function useUserVote(requestId: string) {
  const { supabaseUser, refreshAuth, tokenVerified, getCurrentAuthToken } = useSupabaseAuth();
  const { user } = useUser();
  const [lastErrorCount, setLastErrorCount] = useState(0);
  const refreshAttempted = useRef(false);
  
  // Use the Supabase user ID if available, otherwise fall back to Clerk user ID
  const effectiveUserId = supabaseUser?.id || user?.id;

  return useQuery({
    queryKey: ['votes', 'user', effectiveUserId, requestId, tokenVerified],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      
      // Get the current auth token at execution time, not at hook creation time
      const currentAuthToken = getCurrentAuthToken();
      
      // For debugging
      console.log('Fetching votes with: ', { 
        effectiveUserId, 
        clerkUserId: user?.id,
        supabaseUserId: supabaseUser?.id,
        requestId,
        hasAuthToken: !!currentAuthToken,
        tokenVerified
      });
      
      // If we have a user but no auth token or unverified token, try to refresh auth once
      if (effectiveUserId && (!currentAuthToken || !tokenVerified) && !refreshAttempted.current && lastErrorCount === 0) {
        console.log("Auth token missing or unverified, attempting to refresh before fetching votes");
        refreshAttempted.current = true;
        try {
          await refreshAuth();
          // Get the fresh token after refresh
          const refreshedToken = getCurrentAuthToken();
          console.log("Auth refresh completed, token present:", !!refreshedToken);
        } catch (e) {
          console.error("Auth refresh failed:", e);
        }
      }
      
      try {
        // Always get the most current token
        const tokenToUse = getCurrentAuthToken();
        const result = await votesService.getUserVote(effectiveUserId, requestId, tokenToUse);
        
        // Reset error count on success
        if (lastErrorCount > 0) {
          setLastErrorCount(0);
        }
        return result;
      } catch (error) {
        console.error("Error fetching user vote:", error);
        
        // Increment error count to prevent infinite refresh loops
        setLastErrorCount(prev => prev + 1);
        
        // For certain errors, try to refresh auth only if we haven't already tried
        if (lastErrorCount < 2 && !refreshAttempted.current && error instanceof Error && 
           (error.message.includes('auth') || error.message.includes('JWT') || error.message.includes('token'))) {
          console.log("Auth-related error detected, attempting to refresh auth");
          refreshAttempted.current = true;
          try {
            await refreshAuth();
            // Try once more with the fresh token
            const freshToken = getCurrentAuthToken();
            if (freshToken) {
              return votesService.getUserVote(effectiveUserId, requestId, freshToken);
            }
          } catch (e) {
            console.error("Auth refresh failed:", e);
          }
        }
        
        // Return null instead of throwing to prevent UI breakage
        return null;
      }
    },
    enabled: !!effectiveUserId && !!requestId,
    retry: false, // Disable automatic retries
    retryOnMount: false, // Don't retry on component mount
    staleTime: 30000, // Cache results for 30 seconds
  });
}

// ---------------------- Comments Queries & Mutations ----------------------

export function useComments(requestId: string, includeVotes: boolean = false) {
  return useQuery({
    queryKey: ['comments', requestId, { includeVotes }],
    queryFn: () => commentsService.getCommentsForRequest(requestId, includeVotes),
    enabled: !!requestId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      requestId, 
      content, 
      parentId 
    }: { 
      requestId: string; 
      content: string; 
      parentId?: string | null;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return commentsService.addComment(supabaseUser.id, requestId, content, parentId);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this request
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      commentId, 
      content, 
      requestId 
    }: { 
      commentId: string; 
      content: string;
      requestId: string;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return commentsService.updateComment(commentId, supabaseUser.id, content);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this request
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      commentId, 
      requestId 
    }: { 
      commentId: string;
      requestId: string;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return commentsService.deleteComment(commentId, supabaseUser.id);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this request
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId] });
    },
  });
}

export function useVoteOnComment() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      commentId, 
      value, 
      requestId 
    }: { 
      commentId: string; 
      value: -1 | 1;
      requestId: string;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return commentsService.voteOnComment(supabaseUser.id, commentId, value);
    },
    onSuccess: (_, variables) => {
      // Invalidate comments for this request
      queryClient.invalidateQueries({ queryKey: ['comments', variables.requestId, { includeVotes: true }] });
    },
  });
}

// ---------------------- Suggested Requests Queries & Mutations ----------------------

export function useSuggestedRequests(categoryId?: string) {
  const { supabaseUser, authToken } = useSupabaseAuth();

  return useQuery({
    queryKey: ['suggestedRequests', { categoryId }],
    queryFn: () => {
      if (categoryId) {
        return suggestedRequestsService.getSuggestedRequests(categoryId);
      }
      return suggestedRequestsService.getTopSuggestedRequests();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTopSuggestedRequests(limit = 10) {
  const { authToken } = useSupabaseAuth();

  return useQuery({
    queryKey: ['suggestedRequests', 'top', { limit }],
    queryFn: () => suggestedRequestsService.getTopSuggestedRequests(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useSuggestedRequestById(id: string) {
  const { authToken } = useSupabaseAuth();

  return useQuery({
    queryKey: ['suggestedRequests', id],
    queryFn: () => suggestedRequestsService.getSuggestedRequestById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateSuggestedRequest() {
  const queryClient = useQueryClient();
  const { supabaseUser } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      categoryId, 
      title, 
      description 
    }: { 
      categoryId: string; 
      title: string; 
      description: string;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return suggestedRequestsService.createSuggestedRequest(
        categoryId,
        supabaseUser.id,
        title,
        description
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['suggestedRequests'] });
      queryClient.invalidateQueries({ queryKey: ['suggestedRequests', { categoryId: variables.categoryId }] });
    },
  });
}

export function useVoteOnSuggestedRequest() {
  const queryClient = useQueryClient();
  const { supabaseUser, authToken } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      suggestedRequestId, 
      value = 1  // Default to upvote
    }: {
      suggestedRequestId: string;
      value?: number;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return suggestedRequestsService.voteOnSuggestedRequest(supabaseUser.id, suggestedRequestId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suggestedRequests'] });
      queryClient.invalidateQueries({ 
        queryKey: ['suggestedRequests', 'hasVoted', supabaseUser?.id, variables.suggestedRequestId] 
      });
    },
  });
}

export function useHasVotedForSuggestion(suggestionId: string) {
  const { supabaseUser, authToken } = useSupabaseAuth();
  
  // Use the Supabase user ID
  const effectiveUserId = supabaseUser?.id;

  return useQuery({
    queryKey: ['suggestedRequests', 'hasVoted', effectiveUserId, suggestionId],
    queryFn: () => {
      if (!effectiveUserId) return false;
      return suggestedRequestsService.hasUserVotedForSuggestion(effectiveUserId, suggestionId);
    },
    enabled: !!effectiveUserId && !!suggestionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ---------------------- User Queries ----------------------

export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => {
      if (!userId) return null;
      return usersService.getUserById(userId);
    },
    enabled: !!userId,
  });
}

export function useUserActivity(userId: string | null) {
  return useQuery({
    queryKey: ['users', 'activity', userId],
    queryFn: () => {
      if (!userId) return null;
      return usersService.getUserActivity(userId);
    },
    enabled: !!userId,
  });
}

export function useIsAdmin(userId: string | null) {
  return useQuery({
    queryKey: ['users', 'isAdmin', userId],
    queryFn: () => {
      if (!userId) return false;
      return usersService.isUserAdmin(userId);
    },
    enabled: !!userId,
  });
} 