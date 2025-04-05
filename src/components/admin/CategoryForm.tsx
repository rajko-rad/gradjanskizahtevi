import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryFormProps {
  category?: Category;
  onSave: () => void;
  onCancel: () => void;
}

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [title, setTitle] = useState(category?.title || '');
  const [description, setDescription] = useState(category?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({ title, description })
          .eq('id', category.id);

        if (error) throw error;
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({ title, description });

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