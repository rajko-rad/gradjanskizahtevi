import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import CategoryForm from '@/components/admin/CategoryForm';
import RequestForm from '@/components/admin/RequestForm';

type Category = Database['public']['Tables']['categories']['Row'];
type Request = Database['public']['Tables']['requests']['Row'];

export default function Admin() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      navigate('/');
      return;
    }

    const checkAdmin = async () => {
      try {
        const email = user.emailAddresses[0]?.emailAddress;
        if (!email) {
          console.error('No email found for user');
          return;
        }

        const { data, error } = await supabase
          .from('admins')
          .select('email')
          .eq('email', email)
          .single();

        if (error) {
          console.error('Admin check error:', error);
          return;
        }

        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdmin();
  }, [user, isLoaded, navigate]);

  const fetchData = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      setError(null);

      const [
        categoriesResponse,
        requestsResponse
      ] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('requests').select('*').order('created_at', { ascending: false })
      ]);

      if (categoriesResponse.error) throw categoriesResponse.error;
      if (requestsResponse.error) throw requestsResponse.error;

      setCategories(categoriesResponse.data || []);
      setRequests(requestsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return <div>Access denied. You must be an admin to view this page.</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Categories</h2>
          <button
            onClick={() => setShowNewCategory(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Category
          </button>
        </div>

        {showNewCategory && (
          <div className="mb-4 p-4 border rounded">
            <CategoryForm
              onSave={() => {
                setShowNewCategory(false);
                fetchData();
              }}
              onCancel={() => setShowNewCategory(false)}
            />
          </div>
        )}

        {editingCategory && (
          <div className="mb-4 p-4 border rounded">
            <CategoryForm
              category={editingCategory}
              onSave={() => {
                setEditingCategory(null);
                fetchData();
              }}
              onCancel={() => setEditingCategory(null)}
            />
          </div>
        )}

        <div className="grid gap-4">
          {categories.map(category => (
            <div key={category.id} className="border p-4 rounded">
              <h3 className="font-medium">{category.title}</h3>
              <p className="text-gray-600">{category.description}</p>
              <button 
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setEditingCategory(category)}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Requests</h2>
          <button
            onClick={() => setShowNewRequest(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add Request
          </button>
        </div>

        {showNewRequest && (
          <div className="mb-4 p-4 border rounded">
            <RequestForm
              categories={categories}
              onSave={() => {
                setShowNewRequest(false);
                fetchData();
              }}
              onCancel={() => setShowNewRequest(false)}
            />
          </div>
        )}

        {editingRequest && (
          <div className="mb-4 p-4 border rounded">
            <RequestForm
              request={editingRequest}
              categories={categories}
              onSave={() => {
                setEditingRequest(null);
                fetchData();
              }}
              onCancel={() => setEditingRequest(null)}
            />
          </div>
        )}

        <div className="grid gap-4">
          {requests.map(request => (
            <div key={request.id} className="border p-4 rounded">
              <h3 className="font-medium">{request.title}</h3>
              <p className="text-gray-600">{request.description}</p>
              <div className="mt-2 space-x-2">
                <button 
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setEditingRequest(request)}
                >
                  Edit
                </button>
                <button 
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={() => handleDeleteRequest(request.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 