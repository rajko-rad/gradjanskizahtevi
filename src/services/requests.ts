import { getSupabaseClient, anonClient } from '@/lib/clerk-supabase';
import { REQUEST_ORDER } from '@/config/mockDataOrder';
import type { Database } from '@/types/supabase';

// Request with additional properties
export type ExtendedRequest = Database['public']['Tables']['requests']['Row'] & {
  category?: {
    id: string;
    title: string;
    slug: string;
  };
  vote_count?: number;
  comment_count?: number;
};

export type Request = Database['public']['Tables']['requests']['Row'];
export type Option = Database['public']['Tables']['options']['Row'];

/**
 * Fetch all requests with their options
 */
export async function getRequests(): Promise<(Request & { options: Option[] })[]> {
  const supabase = getSupabaseClient();
  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('*')
    .order('id');
  
  if (requestsError) {
    console.error('Error fetching requests:', requestsError);
    throw new Error('Failed to fetch requests');
  }

  // Fetch options for all requests
  const { data: options, error: optionsError } = await supabase
    .from('options')
    .select('*');
  
  if (optionsError) {
    console.error('Error fetching options:', optionsError);
    throw new Error('Failed to fetch options');
  }

  // Group options by request
  return requests.map(request => ({
    ...request,
    options: options.filter(option => option.request_id === request.id)
  }));
}

/**
 * Get requests by category ID
 */
export async function getRequestsByCategory(categoryId: string): Promise<(Request & { options: Option[] })[]> {
  const supabase = getSupabaseClient();
  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('*')
    .eq('category_id', categoryId);
  
  if (requestsError) {
    console.error(`Error fetching requests for category ${categoryId}:`, requestsError);
    throw new Error(`Failed to fetch requests for category ${categoryId}`);
  }

  if (requests.length === 0) {
    return [];
  }

  // Sort requests based on the predefined order
  const sortedRequests = [...requests].sort((a, b) => {
    // Get order for current category
    const order = REQUEST_ORDER[categoryId] || [];
    
    const indexA = order.indexOf(a.id);
    const indexB = order.indexOf(b.id);
    
    // If both requests are in our order list, sort by that order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one is in our order list, put it first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Special handling for government category - keep new items at the end
    if (categoryId === 'government') {
      // For new government requests not in our predefined order, 
      // sort by creation date (newest last) to maintain stability
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    
    // For requests not in our order list in other categories, maintain their original order
    return 0;
  });

  // Get all request IDs
  const requestIds = sortedRequests.map(request => request.id);
  
  // Fetch options for these requests
  const { data: options, error: optionsError } = await supabase
    .from('options')
    .select('*')
    .in('request_id', requestIds);
  
  if (optionsError) {
    console.error(`Error fetching options for requests in category ${categoryId}:`, optionsError);
    throw new Error(`Failed to fetch options for requests in category ${categoryId}`);
  }

  // Group options by request
  return sortedRequests.map(request => ({
    ...request,
    options: options?.filter(option => option.request_id === request.id) || []
  }));
}

/**
 * Get a single request by ID with options
 */
export async function getRequestById(id: string): Promise<Request & { options: Option[] }> {
  const supabase = getSupabaseClient();
  const { data: request, error: requestError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single();
  
  if (requestError) {
    console.error(`Error fetching request with ID ${id}:`, requestError);
    throw new Error(`Failed to fetch request with ID ${id}`);
  }

  // Fetch options for this request
  const { data: options, error: optionsError } = await supabase
    .from('options')
    .select('*')
    .eq('request_id', id);
  
  if (optionsError) {
    console.error(`Error fetching options for request ${id}:`, optionsError);
    throw new Error(`Failed to fetch options for request ${id}`);
  }

  return {
    ...request,
    options: options || []
  };
}

/**
 * Create a new request with options
 */
export async function createRequest(
  request: Database['public']['Tables']['requests']['Insert'],
  options?: string[]
): Promise<Request & { options: Option[] }> {
  const supabase = getSupabaseClient();
  // Start a Supabase transaction
  const { data, error } = await supabase
    .from('requests')
    .insert(request)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating request:', error);
    throw new Error('Failed to create request');
  }

  // If there are options and this is a multiple-choice request, add the options
  let optionsData: Option[] = [];
  
  if (options && options.length > 0 && request.type === 'multiple') {
    const optionsToInsert = options.map(text => ({
      request_id: data.id,
      text
    }));

    const { data: insertedOptions, error: optionsError } = await supabase
      .from('options')
      .insert(optionsToInsert)
      .select();
    
    if (optionsError) {
      console.error(`Error adding options for request ${data.id}:`, optionsError);
      throw new Error(`Failed to add options for request ${data.id}`);
    }

    optionsData = insertedOptions;
  }
  
  return {
    ...data,
    options: optionsData
  };
}

/**
 * Update a request
 */
export async function updateRequest(
  id: string,
  updates: Database['public']['Tables']['requests']['Update']
): Promise<Request> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating request with ID ${id}:`, error);
    throw new Error(`Failed to update request with ID ${id}`);
  }
  
  return data;
}

/**
 * Delete a request and its options
 */
export async function deleteRequest(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  // Delete options first
  const { error: optionsError } = await supabase
    .from('options')
    .delete()
    .eq('request_id', id);
  
  if (optionsError) {
    console.error(`Error deleting options for request ${id}:`, optionsError);
    throw new Error(`Failed to delete options for request ${id}`);
  }

  // Then delete the request
  const { error: requestError } = await supabase
    .from('requests')
    .delete()
    .eq('id', id);
  
  if (requestError) {
    console.error(`Error deleting request with ID ${id}:`, requestError);
    throw new Error(`Failed to delete request with ID ${id}`);
  }
}

/**
 * Get vote counts for a request
 */
export async function getVoteCounts(requestId: string): Promise<{ [key: string]: number }> {
  try {
    const client = getSupabaseClient(null);

    const { data: votes, error } = await client
      .from('votes')
      .select('value')
      .eq('request_id', requestId);
    
    if (error) {
      console.error(`Error fetching votes for request ${requestId}:`, error);
      throw new Error(`Failed to fetch votes for request ${requestId}`);
    }

    // Count votes by value
    const counts: { [key: string]: number } = {};
    votes.forEach(vote => {
      counts[vote.value] = (counts[vote.value] || 0) + 1;
    });
    
    return counts;
  } catch (error) {
    console.error("Failed to get vote counts:", error);
    throw error;
  }
}

/**
 * Get popular requests sorted by vote count
 * @param limit The maximum number of requests to return
 * @returns Array of popular requests
 */
export async function getPopularRequests(limit: number = 10): Promise<ExtendedRequest[]> {
  try {
    const client = getSupabaseClient(null);
    
    const { data, error } = await client
      .from('requests')
      .select(`
        *,
        category:categories(id, title, slug)
      `)
      .order('vote_count', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get popular requests: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Failed to get popular requests:", error);
    throw error;
  }
}

/**
 * Get recent requests sorted by creation date
 * @param limit The maximum number of requests to return
 * @returns Array of recent requests
 */
export async function getRecentRequests(limit: number = 10): Promise<ExtendedRequest[]> {
  try {
    const client = getSupabaseClient(null);
    
    const { data, error } = await client
      .from('requests')
      .select(`
        *,
        category:categories(id, title, slug)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent requests: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Failed to get recent requests:", error);
    throw error;
  }
} 