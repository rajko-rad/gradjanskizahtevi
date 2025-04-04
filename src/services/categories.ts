import { getSupabaseClient } from '@/lib/clerk-supabase';
import { CATEGORY_ORDER } from '@/config/mockDataOrder';
import type { Database } from '@/types/supabase';

export type Category = Database['public']['Tables']['categories']['Row'];
export type Resource = Database['public']['Tables']['resources']['Row'];

/**
 * Fetch all categories with their resources
 */
export async function getCategories(): Promise<(Category & { resources: Resource[] })[]> {
  const { data: categories, error: categoriesError } = await getSupabaseClient()
    .from('categories')
    .select('*');
  
  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    throw new Error('Failed to fetch categories');
  }

  // Fetch resources for all categories
  const { data: resources, error: resourcesError } = await getSupabaseClient()
    .from('resources')
    .select('*');
  
  if (resourcesError) {
    console.error('Error fetching resources:', resourcesError);
    throw new Error('Failed to fetch resources');
  }

  // Sort categories to match the original mockData order
  const sortedCategories = [...categories].sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a.id);
    const indexB = CATEGORY_ORDER.indexOf(b.id);
    
    // If both categories are in our order list, sort by that order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one is in our order list, put it first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // For categories not in our order list, maintain their original order
    return 0;
  });

  // Group resources by category
  return sortedCategories.map(category => ({
    ...category,
    resources: resources.filter(resource => resource.category_id === category.id)
  }));
}

/**
 * Get a single category by ID with resources
 */
export async function getCategoryById(id: string): Promise<Category & { resources: Resource[] }> {
  const { data: category, error: categoryError } = await getSupabaseClient()
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  
  if (categoryError) {
    console.error(`Error fetching category with ID ${id}:`, categoryError);
    throw new Error(`Failed to fetch category with ID ${id}`);
  }

  // Fetch resources for this category
  const { data: resources, error: resourcesError } = await getSupabaseClient()
    .from('resources')
    .select('*')
    .eq('category_id', id);
  
  if (resourcesError) {
    console.error(`Error fetching resources for category ${id}:`, resourcesError);
    throw new Error(`Failed to fetch resources for category ${id}`);
  }

  return {
    ...category,
    resources: resources
  };
}

/**
 * Create a new category
 */
export async function createCategory(
  category: Database['public']['Tables']['categories']['Insert']
): Promise<Category> {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .insert(category)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating category:', error);
    throw new Error('Failed to create category');
  }
  
  return data;
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  updates: Database['public']['Tables']['categories']['Update']
): Promise<Category> {
  const { data, error } = await getSupabaseClient()
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating category with ID ${id}:`, error);
    throw new Error(`Failed to update category with ID ${id}`);
  }
  
  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting category with ID ${id}:`, error);
    throw new Error(`Failed to delete category with ID ${id}`);
  }
}

/**
 * Add a resource to a category
 */
export async function addResource(
  resource: Database['public']['Tables']['resources']['Insert']
): Promise<Resource> {
  const { data, error } = await getSupabaseClient()
    .from('resources')
    .insert(resource)
    .select()
    .single();
  
  if (error) {
    console.error('Error adding resource:', error);
    throw new Error('Failed to add resource');
  }
  
  return data;
}

/**
 * Remove a resource
 */
export async function deleteResource(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('resources')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting resource with ID ${id}:`, error);
    throw new Error(`Failed to delete resource with ID ${id}`);
  }
}

/**
 * Get statistics for a category
 * @param categoryId The ID of the category
 * @returns Stats for the category including total votes and requests
 */
export async function getCategoryStats(categoryId: string): Promise<{ totalVotes: number, totalRequests: number }> {
  try {
    const supabase = getSupabaseClient();

    // Get total requests in this category
    const { count: requestCount, error: requestError } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (requestError) {
      console.error("Error fetching request count:", requestError);
      throw new Error(`Failed to get request count: ${requestError.message}`);
    }

    // Count total votes across all requests in this category
    const { data: requests, error: requestsError } = await supabase
      .from('requests')
      .select('id')
      .eq('category_id', categoryId);

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw new Error(`Failed to get requests: ${requestsError.message}`);
    }

    let totalVotes = 0;

    if (requests.length > 0) {
      const requestIds = requests.map(req => req.id);
      
      const { count: voteCount, error: voteError } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .in('request_id', requestIds);

      if (voteError) {
        console.error("Error fetching vote count:", voteError);
        throw new Error(`Failed to get vote count: ${voteError.message}`);
      }

      totalVotes = voteCount || 0;
    }

    return {
      totalVotes,
      totalRequests: requestCount || 0
    };
  } catch (error) {
    console.error("Failed to get category stats:", error);
    throw error;
  }
} 