'use client';

import { useEffect, useState } from 'react';
import { formatPhoneNumber } from '@/lib/utils';
import Link from 'next/link';

interface Mapping {
  phone_number: string;
  extension: string;
  created_at: string;
  expires_at: string;
}

export default function MappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ extension: string; expires_at: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phone_number: '',
    extension: '',
    expires_at: '',
  });
  
  // Fetch mappings
  const fetchMappings = async () => {
    try {
      const res = await fetch('/api/mappings', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (res.status === 401) {
        window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch mappings');
      }
      const data = await res.json();
      setMappings(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load mappings');
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchMappings();
  }, []);
  
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone_number || !formData.extension || !formData.expires_at) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      const res = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create mapping');
      }
      
      setShowAddForm(false);
      setFormData({ phone_number: '', extension: '', expires_at: '' });
      fetchMappings();
    } catch (err: any) {
      alert(err.message || 'Failed to create mapping');
    }
  };
  
  const startEdit = (mapping: Mapping) => {
    setEditing(mapping.phone_number);
    setEditingData({
      extension: mapping.extension,
      expires_at: new Date(mapping.expires_at).toISOString().slice(0, 16),
    });
  };
  
  const cancelEdit = () => {
    setEditing(null);
    setEditingData(null);
  };
  
  const handleEdit = async (phoneNumber: string) => {
    if (!editingData) return;
    
    try {
      const res = await fetch(`/api/mappings/${encodeURIComponent(phoneNumber)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extension: editingData.extension,
          expires_at: editingData.expires_at,
        }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update mapping');
      }
      
      setEditing(null);
      setEditingData(null);
      fetchMappings();
    } catch (err: any) {
      alert(err.message || 'Failed to update mapping');
    }
  };
  
  const handleDelete = async (phoneNumber: string) => {
    if (!confirm(`Are you sure you want to delete the mapping for ${formatPhoneNumber(phoneNumber)}?`)) {
      return;
    }
    
    setDeleting(phoneNumber);
    try {
      const res = await fetch(`/api/mappings/${encodeURIComponent(phoneNumber)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete mapping');
      }
      
      fetchMappings();
    } catch (err: any) {
      alert(err.message || 'Failed to delete mapping');
    } finally {
      setDeleting(null);
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };
  
  const getDefaultExpiresAt = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading mappings...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/calls" className="text-blue-600 font-medium">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Mappings</h1>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setFormData({ phone_number: '', extension: '', expires_at: getDefaultExpiresAt() });
          }}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium active:bg-blue-700"
        >
          + Add
        </button>
      </div>
      
      <div className="px-4 py-3">
        <div className="bg-white shadow rounded-lg">
          
          {showAddForm && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleAdd} className="space-y-3">
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="Phone Number"
                  required
                  className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  value={formData.extension}
                  onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                  placeholder="Extension"
                  required
                  className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  required
                  className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium text-base active:bg-green-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-3 px-4 bg-gray-300 text-gray-700 rounded-lg font-medium text-base active:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {mappings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No mappings found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {mappings.map((mapping) => {
                const isEditing = editing === mapping.phone_number;
                
                return (
                  <div
                    key={mapping.phone_number}
                    className={`p-4 ${isExpired(mapping.expires_at) ? 'bg-red-50' : ''}`}
                  >
                    <div className="mb-3">
                      <div className="font-semibold text-base text-gray-900 mb-1">
                        {formatPhoneNumber(mapping.phone_number)}
                      </div>
                      {isEditing && editingData ? (
                        <div className="space-y-2 mt-2">
                          <input
                            type="text"
                            value={editingData.extension}
                            onChange={(e) => setEditingData({ ...editingData, extension: e.target.value })}
                            placeholder="Extension"
                            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg"
                          />
                          <input
                            type="datetime-local"
                            value={editingData.expires_at}
                            onChange={(e) => setEditingData({ ...editingData, expires_at: e.target.value })}
                            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-600 mb-1">
                            Extension: <span className="font-medium">{mapping.extension}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Created: {formatTime(mapping.created_at)}
                          </div>
                          <div className={`text-xs ${isExpired(mapping.expires_at) ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            Expires: {formatTime(mapping.expires_at)}
                            {isExpired(mapping.expires_at) && ' (Expired)'}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleEdit(mapping.phone_number)}
                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium text-sm active:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg font-medium text-sm active:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(mapping)}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm active:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(mapping.phone_number)}
                            disabled={deleting === mapping.phone_number}
                            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium text-sm active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === mapping.phone_number ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

