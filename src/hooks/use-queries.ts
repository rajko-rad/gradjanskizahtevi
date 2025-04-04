import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import * as categoriesService from '@/services/categories';
import * as requestsService from '@/services/requests';
import * as votesService from '@/services/votes';
import * as commentsService from '@/services/comments';
import * as suggestedRequestsService from '@/services/suggestedRequests';
import * as usersService from '@/services/users';

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
    queryFn: () => requestsService.getVoteCounts(requestId),
    enabled: !!requestId,
  });
}

// ---------------------- Votes Mutations ----------------------

export function useCastVote() {
  const queryClient = useQueryClient();
  const { supabaseUser, authToken } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ 
      requestId, 
      value, 
      optionId 
    }: { 
      requestId: string; 
      value: string; 
      optionId?: string | null;
    }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return votesService.castVote(supabaseUser.id, requestId, value, optionId, authToken);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', supabaseUser?.id || authToken, variables.requestId] 
      });
    },
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { supabaseUser, authToken } = useSupabaseAuth();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string }) => {
      if (!supabaseUser?.id) throw new Error('User not authenticated in Supabase');
      return votesService.removeVote(supabaseUser.id, requestId, authToken);
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', supabaseUser?.id || authToken, variables.requestId] 
      });
    },
  });
}

export function useUserVote(requestId: string) {
  const { authToken } = useSupabaseAuth();
  const { user } = useUser();
  
  // Use the Supabase user ID if available, otherwise fall back to Clerk user ID
  const effectiveUserId = authToken || user?.id;

  return useQuery({
    queryKey: ['votes', 'user', effectiveUserId, requestId],
    queryFn: () => {
      if (!effectiveUserId) return null;
      
      // For debugging
      console.log('Fetching votes with: ', { 
        effectiveUserId, 
        clerkUserId: user?.id,
        supabaseUserId: authToken,
        requestId,
      });
      
      return votesService.getUserVote(effectiveUserId, requestId, authToken);
    },
    enabled: !!effectiveUserId && !!requestId,
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