import { getSupabaseClient } from '@/lib/clerk-supabase';

// Define the TimelineEvent type based on the database schema
export interface TimelineEvent {
  id: string;
  request_id?: string | null;
  date: string;
  title: string;
  description: string;
  source?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all timeline events
 */
export async function getTimelineEvents(): Promise<TimelineEvent[]> {
  const { data: events, error } = await getSupabaseClient()
    .from('timeline_events')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching timeline events:', error);
    throw new Error('Failed to fetch timeline events');
  }

  return events;
}

/**
 * Fetch timeline events for a specific request
 */
export async function getTimelineEventsForRequest(requestId: string): Promise<TimelineEvent[]> {
  const { data: events, error } = await getSupabaseClient()
    .from('timeline_events')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(`Error fetching timeline events for request ${requestId}:`, error);
    throw new Error(`Failed to fetch timeline events for request ${requestId}`);
  }

  return events;
}

/**
 * Create a new timeline event
 */
export async function createTimelineEvent(
  event: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<TimelineEvent> {
  const { data, error } = await getSupabaseClient()
    .from('timeline_events')
    .insert(event)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating timeline event:', error);
    throw new Error('Failed to create timeline event');
  }
  
  return data;
}

/**
 * Update a timeline event
 */
export async function updateTimelineEvent(
  id: string,
  updates: Partial<Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>>
): Promise<TimelineEvent> {
  const { data, error } = await getSupabaseClient()
    .from('timeline_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating timeline event with ID ${id}:`, error);
    throw new Error(`Failed to update timeline event with ID ${id}`);
  }
  
  return data;
}

/**
 * Delete a timeline event
 */
export async function deleteTimelineEvent(id: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('timeline_events')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Error deleting timeline event with ID ${id}:`, error);
    throw new Error(`Failed to delete timeline event with ID ${id}`);
  }
} 