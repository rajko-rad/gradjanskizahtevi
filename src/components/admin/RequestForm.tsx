import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Request = Database['public']['Tables']['requests']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

interface RequestFormProps {
  request?: Request;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
}

export default function RequestForm({ request, categories, onSave, onCancel }: RequestFormProps) {
  const [title, setTitle] = useState(request?.title || '');
  const [description, setDescription] = useState(request?.description || '');
  const [categoryId, setCategoryId] = useState(request?.category_id || '');
  const [type, setType] = useState<Request['type']>(request?.type || 'yesno');
  const [status, setStatus] = useState<Request['status']>(request?.status || 'active');
  const [hasComments, setHasComments] = useState(request?.has_comments || false);
  const [deadline, setDeadline] = useState(request?.deadline || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        title,
        description,
        category_id: categoryId,
        type,
        status,
        has_comments: hasComments,
        deadline: deadline || null,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };

      if (request) {
        // Update existing request
        const { error } = await supabase
          .from('requests')
          .update(data)
          .eq('id', request.id);

        if (error) throw error;
      } else {
        // Create new request
        const { error } = await supabase
          .from('requests')
          .insert(data);

        if (error) throw error;
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-red-500">{error}</div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Request['type'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="yesno">Yes/No</option>
          <option value="multiple">Multiple Choice</option>
          <option value="range">Range</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Request['status'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="hasComments"
          checked={hasComments}
          onChange={(e) => setHasComments(e.target.checked)}
          className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="hasComments" className="ml-2 block text-sm text-gray-700">
          Allow Comments
        </label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
} 