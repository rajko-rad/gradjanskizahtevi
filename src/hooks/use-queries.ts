import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSupabaseAuth } from '@/hooks/use-supabase-auth';
import * as categoriesService from '@/services/categories';
import * as requestsService from '@/services/requests';
import * as votesService from '@/services/votes';
import * as commentsService from '@/services/comments';
import * as suggestedRequestsService from '@/services/suggestedRequests';
import * as usersService from '@/services/users';
import { useState, useRef, useEffect } from 'react';

// Debug mode toggle - set to true to enable detailed logging
const DEBUG_MODE = true;

// Debug logger function that only logs when debug mode is enabled
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, ...args);
  }
}

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
  const { getToken } = useAuth();
  const { user } = useUser();
  const { supabaseUser } = useSupabaseAuth();
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
      // Get user ID - prefer Supabase user ID if available, otherwise use Clerk ID
      const userId = supabaseUser?.id || user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated. Please sign in to vote.');
      }
      
      // Get a fresh token directly from Clerk
      debugLog("Getting fresh token for castVote");
      let authToken: string | null = null;
      
      try {
        authToken = await getToken({ template: 'supabase' });
        
        if (!authToken && retryCount < MAX_RETRIES) {
          debugLog(`No token returned, retrying (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(count => count + 1);
          
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          authToken = await getToken({ template: 'supabase' });
        }
      } catch (tokenError) {
        console.error("Error getting token for voting:", tokenError);
      }
      
      if (!authToken) {
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      try {
        debugLog(`Calling castVote with token: ${authToken ? 'present' : 'missing'}`);
        const result = await votesService.castVote(userId, requestId, value, optionId, authToken);
        
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
      const userId = supabaseUser?.id || user?.id;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', userId, variables.requestId] 
      });
    },
    onError: (error) => {
      console.error("Voting error:", error);
    }
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { supabaseUser } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      // Get user ID - prefer Supabase user ID if available, otherwise use Clerk ID
      const userId = supabaseUser?.id || user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated. Please sign in to remove your vote.');
      }
      
      // Get a fresh token directly from Clerk
      debugLog("Getting fresh token for removeVote");
      let authToken: string | null = null;
      
      try {
        authToken = await getToken({ template: 'supabase' });
        
        if (!authToken && retryCount < MAX_RETRIES) {
          debugLog(`No token returned, retrying (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(count => count + 1);
          
          // Wait a bit and try again
          await new Promise(resolve => setTimeout(resolve, 500));
          authToken = await getToken({ template: 'supabase' });
        }
      } catch (tokenError) {
        console.error("Error getting token for removing vote:", tokenError);
      }
      
      if (!authToken) {
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      try {
        debugLog(`Calling removeVote with token: ${authToken ? 'present' : 'missing'}`);
        await votesService.removeVote(userId, requestId, authToken);
        
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
      const userId = supabaseUser?.id || user?.id;
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', variables.requestId] });
      queryClient.invalidateQueries({ 
        queryKey: ['votes', 'user', userId, variables.requestId] 
      });
    },
    onError: (error) => {
      console.error("Vote removal error:", error);
    }
  });
}

export function useUserVote(requestId: string) {
  // We'll use Clerk's useAuth instead of the Supabase wrapper to get tokens directly
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { supabaseUser } = useSupabaseAuth();
  const [lastErrorCount, setLastErrorCount] = useState(0);
  const authAttemptsRef = useRef(0);
  const maxAuthAttempts = 3;
  
  // Use the Supabase user ID if available, otherwise fall back to Clerk user ID
  const effectiveUserId = supabaseUser?.id || user?.id;

  // Log initial state for debugging
  useEffect(() => {
    debugLog("useUserVote hook initialized with:", {
      requestId,
      isSignedIn,
      hasUser: !!user,
      hasSupabaseUser: !!supabaseUser,
      effectiveUserId: effectiveUserId ? `${effectiveUserId.substring(0, 8)}...` : 'none'
    });
  }, [requestId, user, supabaseUser, effectiveUserId, isSignedIn]);

  return useQuery({
    queryKey: ['votes', 'user', effectiveUserId, requestId],
    queryFn: async () => {
      if (!effectiveUserId) {
        debugLog("useUserVote - No user ID available");
        return null;
      }
      
      if (!user) {
        debugLog("useUserVote - No Clerk user available");
        return null;
      }
      
      // For debugging
      debugLog('Starting vote query for:', { 
        requestId,
        userId: effectiveUserId ? `${effectiveUserId.substring(0, 8)}...` : 'undefined',
        authAttempts: authAttemptsRef.current
      });
      
      // Try to get a fresh token directly from Clerk
      let currentAuthToken: string | null = null;
      
      try {
        debugLog("Getting fresh token from Clerk");
        const tokenStartTime = Date.now();
        currentAuthToken = await getToken({ template: "supabase" });
        const tokenTime = Date.now() - tokenStartTime;
        
        if (currentAuthToken) {
          debugLog(`Successfully obtained token from Clerk in ${tokenTime}ms`);
        } else {
          debugLog(`No token returned from Clerk getToken after ${tokenTime}ms`);
          
          // If we're already at max attempts, just proceed without a token
          if (authAttemptsRef.current >= maxAuthAttempts) {
            debugLog(`Max auth attempts (${maxAuthAttempts}) reached, proceeding without token`);
          } 
          // Otherwise increment counter and try again after a delay
          else if (authAttemptsRef.current < maxAuthAttempts) {
            authAttemptsRef.current++;
            
            // Artificial delay to avoid rapid retries
            const delayMs = 500;
            debugLog(`Waiting ${delayMs}ms before retry`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Try once more to get a token
            debugLog(`Retry attempt ${authAttemptsRef.current}/${maxAuthAttempts} for token`);
            const retryStartTime = Date.now();
            currentAuthToken = await getToken({ template: "supabase" });
            const retryTime = Date.now() - retryStartTime;
            
            if (currentAuthToken) {
              debugLog(`Successfully obtained token on retry in ${retryTime}ms`);
            } else {
              debugLog(`Still no token after retry (${retryTime}ms)`);
            }
          }
        }
      } catch (tokenError) {
        console.error("Error getting Clerk token:", tokenError);
        debugLog("Token error details:", tokenError instanceof Error ? tokenError.message : String(tokenError));
        authAttemptsRef.current++;
      }
      
      // Execute the query with whatever token we have (or null)
      try {
        debugLog(`Executing vote query with token: ${currentAuthToken ? 'present' : 'missing'}`);
        const queryStartTime = Date.now();
        const result = await votesService.getUserVote(effectiveUserId, requestId, currentAuthToken);
        const queryTime = Date.now() - queryStartTime;
        
        debugLog(`Vote query completed in ${queryTime}ms with result: ${result ? 'found vote' : 'no vote'}`);
        
        // Reset error count and auth attempts on success
        if (lastErrorCount > 0 || authAttemptsRef.current > 0) {
          setLastErrorCount(0);
          authAttemptsRef.current = 0;
        }
        return result;
      } catch (error) {
        console.error("Error fetching user vote:", error);
        debugLog("Query error details:", error instanceof Error ? error.message : String(error));
        
        // Increment error count to prevent infinite refresh loops
        setLastErrorCount(prev => prev + 1);
        
        // Return null instead of throwing to prevent UI breakage
        return null;
      }
    },
    enabled: !!requestId && !!effectiveUserId && !!user,
    staleTime: 30 * 1000, // 30 seconds
    retry: false // Disable automatic retries, we handle them manually
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