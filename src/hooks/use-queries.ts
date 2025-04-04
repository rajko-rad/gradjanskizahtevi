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

// Debug mode toggle - only in development
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Debugging utility
function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, ...args);
  }
}

// Also add a throttled debug logger for high-frequency events
const throttledDebugLogs = new Map<string, number>();
function throttledDebugLog(key: string, message: string, ...args: any[]) {
  if (!DEBUG_MODE) return;
  
  const now = Date.now();
  const lastTime = throttledDebugLogs.get(key) || 0;
  const MIN_LOG_INTERVAL = 5000; // 5 seconds
  
  if (now - lastTime > MIN_LOG_INTERVAL) {
    console.log(`DEBUG: ${message}`, ...args);
    throttledDebugLogs.set(key, now);
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
  const { supabaseUser, getCurrentAuthToken, isSyncedWithSupabase } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      value
    }: { 
      requestId: string; 
      value: number;
    }) => {
      // Get user ID - prefer Supabase user ID if available, otherwise use Clerk ID
      let userId = supabaseUser?.id || user?.id;
      const isSynced = !!supabaseUser?.id || isSyncedWithSupabase;
      
      if (!userId) {
        throw new Error('User not authenticated. Please sign in to vote.');
      }
      
      if (!user) {
        throw new Error('Clerk user not available. Please try again.');
      }
      
      // Get a fresh token directly from Clerk or cache
      debugLog("Getting token for castVote");
      let authToken: string | null = null;
      
      try {
        // Try to get token from auth hook cache first
        authToken = await getCurrentAuthToken(false);
        
        // Fall back to direct token request if needed
        if (!authToken) {
          debugLog("No cached token, getting fresh token from Clerk");
          authToken = await getToken({ template: 'supabase' });
          
          if (!authToken && retryCount < MAX_RETRIES) {
            debugLog(`No token returned, retrying (${retryCount + 1}/${MAX_RETRIES})`);
            setRetryCount(count => count + 1);
            
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 500));
            authToken = await getToken({ template: 'supabase' });
          }
        } else {
          debugLog("Using cached token for castVote");
        }
      } catch (tokenError) {
        console.error("Error getting token for voting:", tokenError);
      }
      
      if (!authToken) {
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      // If user is not synced yet, we need to sync before proceeding
      if (!isSynced && !!user.primaryEmailAddress?.emailAddress) {
        debugLog("User not synced with Supabase yet, syncing before casting vote");
        try {
          const { syncUserWithSupabase } = await import('@/services/users');
          const syncedUser = await syncUserWithSupabase(
            user.id, 
            user.primaryEmailAddress.emailAddress,
            user.fullName,
            user.imageUrl,
            authToken
          );
          
          if (syncedUser) {
            debugLog("User sync completed before casting vote, using synced ID");
            // Use the synced user ID if available
            userId = syncedUser.id;
          } else {
            debugLog("User sync failed, proceeding with original ID");
          }
        } catch (syncError) {
          console.error("Error syncing user before casting vote:", syncError);
        }
      }
      
      debugLog(`Calling castVote with token: ${authToken ? 'present' : 'missing'}`);
      const result = await votesService.castVote(userId, requestId, value, authToken);
      
      if (result === null) {
        throw new Error('Failed to cast vote. You may not have permission or there may be an authentication issue.');
      }
      
      // Reset retry count on success
      if (retryCount > 0) {
        setRetryCount(0);
      }
      
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', requestId] });
      queryClient.invalidateQueries({ queryKey: ['votes', 'user', userId, requestId] });
      
      return result;
    },
  });
}

export function useRemoveVote() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { supabaseUser, getCurrentAuthToken, isSyncedWithSupabase } = useSupabaseAuth();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      // Get user ID - prefer Supabase user ID if available, otherwise use Clerk ID
      let userId = supabaseUser?.id || user?.id;
      const isSynced = !!supabaseUser?.id || isSyncedWithSupabase;
      
      if (!userId) {
        throw new Error('User not authenticated. Please sign in to remove your vote.');
      }
      
      if (!user) {
        throw new Error('Clerk user not available. Please try again.');
      }
      
      // Get a fresh token directly from Clerk or cache
      debugLog("Getting token for removeVote");
      let authToken: string | null = null;
      
      try {
        // Try to get token from auth hook cache first
        authToken = await getCurrentAuthToken(false);
        
        // Fall back to direct token request if needed
        if (!authToken) {
          debugLog("No cached token, getting fresh token from Clerk");
          authToken = await getToken({ template: 'supabase' });
          
          if (!authToken && retryCount < MAX_RETRIES) {
            debugLog(`No token returned, retrying (${retryCount + 1}/${MAX_RETRIES})`);
            setRetryCount(count => count + 1);
            
            // Wait a bit and try again
            await new Promise(resolve => setTimeout(resolve, 500));
            authToken = await getToken({ template: 'supabase' });
          }
        } else {
          debugLog("Using cached token for removeVote");
        }
      } catch (tokenError) {
        console.error("Error getting token for vote removal:", tokenError);
      }
      
      if (!authToken) {
        throw new Error('Authentication error. Please try signing out and in again.');
      }
      
      // If user is not synced yet, we need to sync before proceeding
      if (!isSynced && !!user.primaryEmailAddress?.emailAddress) {
        debugLog("User not synced with Supabase yet, syncing before removing vote");
        try {
          const { syncUserWithSupabase } = await import('@/services/users');
          const syncedUser = await syncUserWithSupabase(
            user.id, 
            user.primaryEmailAddress.emailAddress,
            user.fullName,
            user.imageUrl,
            authToken
          );
          
          if (syncedUser) {
            debugLog("User sync completed before removing vote, using synced ID");
            // Use the synced user ID if available
            userId = syncedUser.id;
          } else {
            debugLog("User sync failed, proceeding with original ID");
          }
        } catch (syncError) {
          console.error("Error syncing user before removing vote:", syncError);
        }
      }
      
      debugLog(`Calling removeVote with token: ${authToken ? 'present' : 'missing'}`);
      const success = await votesService.removeVote(userId, requestId, authToken);
      
      if (!success) {
        throw new Error('Failed to remove vote. You may not have permission or there may be an authentication issue.');
      }
      
      // Reset retry count on success
      if (retryCount > 0) {
        setRetryCount(0);
      }
      
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['votes', 'stats', requestId] });
      queryClient.invalidateQueries({ queryKey: ['votes', 'user', userId, requestId] });
      
      return { success };
    },
  });
}

export function useUserVote(requestId: string) {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { supabaseUser, getCurrentAuthToken, isSyncedWithSupabase } = useSupabaseAuth();
  const [authAttempts, setAuthAttempts] = useState(0);
  const queryClient = useQueryClient();
  const MAX_AUTH_ATTEMPTS = 2;
  const queryRefreshRef = useRef(false);
  
  // Get effective user ID, prefer Supabase user ID
  const effectiveUserId = supabaseUser?.id || user?.id || 'none';
  const isSynced = !!supabaseUser?.id || isSyncedWithSupabase;
  
  // Only log initialization once per mount
  useEffect(() => {
    debugLog("useUserVote hook initialized with:", {
      requestId,
      isSignedIn,
      hasUser: !!user,
      hasSupabaseUser: !!supabaseUser,
      effectiveUserId,
      isSynced
    });
  }, [requestId, isSignedIn, user, supabaseUser, effectiveUserId, isSynced]);
  
  // Query for user's vote on this request
  const voteQuery = useQuery({
    queryKey: ['votes', 'user', effectiveUserId, requestId],
    queryFn: async () => {
      // If user is not signed in, no need to query
      if (!isSignedIn || !user) {
        debugLog("User not signed in, skipping vote query");
        return null;
      }
      
      debugLog("Starting vote query for:", {
        requestId,
        userId: effectiveUserId,
        authAttempts,
        isSynced
      });
      
      // Get the token - first try the cached token
      let token: string | null = null;
      
      try {
        token = await getCurrentAuthToken(queryRefreshRef.current);
        queryRefreshRef.current = false;
        
        if (!token) {
          debugLog("No cached token, trying direct token fetch");
          token = await getToken({ template: 'supabase' });
        } else {
          debugLog("Using cached token for vote query");
        }
      } catch (tokenError) {
        console.error("Error getting token for vote query:", tokenError);
      }
      
      // Handle case where user is not synced with Supabase yet
      // Only trigger sync if we haven't synced globally yet
      if (isSignedIn && user && !isSynced && token && user.primaryEmailAddress?.emailAddress) {
        try {
          debugLog("User not synced with Supabase yet, syncing before vote query");
          
          // Check if another component might be syncing already
          // Use a single sync attempt per 2 seconds window
          const { syncUserWithSupabase } = await import('@/services/users');
          await syncUserWithSupabase(
            user.id,
            user.primaryEmailAddress.emailAddress,
            user.fullName,
            user.imageUrl,
            token
          );
          
          // Invalidate queries that depend on this user but don't trigger a refetch yet
          queryClient.invalidateQueries({
            queryKey: ['users', user.id],
            refetchType: 'none'
          });
        } catch (syncError) {
          console.error("Error syncing user in useUserVote:", syncError);
        }
      }
      
      try {
        // Get the vote with the token
        if (!token) {
          debugLog("No token available for vote query, will return null");
          return null;
        }

        debugLog("Fetching vote with token");
        const vote = await votesService.getUserVote(effectiveUserId, requestId, token);
        debugLog("Vote query result:", vote ? "found vote" : "no vote found");
        return vote;
      } catch (error: any) {
        // Handle token/auth errors by retrying once with forced refresh
        if (error?.message?.includes('JWT') || error?.message?.includes('auth') || error?.message?.includes('permission')) {
          if (authAttempts < MAX_AUTH_ATTEMPTS) {
            debugLog(`Auth error in vote query, retrying (${authAttempts + 1}/${MAX_AUTH_ATTEMPTS})`);
            setAuthAttempts(prev => prev + 1);
            
            // Mark for token refresh on next attempt
            queryRefreshRef.current = true;
            
            // Force a refetch of this query
            setTimeout(() => {
              queryClient.invalidateQueries({ 
                queryKey: ['votes', 'user', effectiveUserId, requestId],
                refetchType: 'active'
              });
            }, 100);
            
            // Return null for this attempt
            return null;
          }
        }
        
        // If all else fails, return null
        console.error("Error getting user vote:", error);
        return null;
      }
    },
    // Enable query only if user is signed in and we have a user ID
    enabled: !!isSignedIn && !!user && !!requestId && effectiveUserId !== 'none',
    // Short stale time because votes might change frequently
    staleTime: 30000,
    retry: false, // We handle retries manually
    // Add refetch interval to reduce redundant calls
    refetchInterval: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });
  
  return {
    ...voteQuery,
    // Add convenience properties
    hasVoted: !!voteQuery.data,
    voteValue: voteQuery.data?.value || null,
  };
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