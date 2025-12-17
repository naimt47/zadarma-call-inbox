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
      const res = await fetch('/api/mappings');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extension: editingData.extension,
          expires_at: editingData.expires_at,
        }),
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link href="/calls" className="text-blue-600 hover:text-blue-800">
            ← Back to Calls
          </Link>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Extension Mappings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage phone number to extension mappings
              </p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(true);
                setFormData({ phone_number: '', extension: '', expires_at: getDefaultExpiresAt() });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + Add Mapping
            </button>
          </div>
          
          {showAddForm && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold mb-4">Add New Mapping</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+1234567890"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Extension *
                    </label>
                    <input
                      type="text"
                      value={formData.extension}
                      onChange={(e) => setFormData({ ...formData, extension: e.target.value })}
                      placeholder="101"
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires At *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      required
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extension
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No mappings found
                    </td>
                  </tr>
                ) : (
                  mappings.map((mapping) => {
                    const isEditing = editing === mapping.phone_number;
                    
                    return (
                      <tr
                        key={mapping.phone_number}
                        className={`hover:bg-gray-50 ${isExpired(mapping.expires_at) ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatPhoneNumber(mapping.phone_number)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing && editingData ? (
                            <input
                              type="text"
                              value={editingData.extension}
                              onChange={(e) => setEditingData({ ...editingData, extension: e.target.value })}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            mapping.extension
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(mapping.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing && editingData ? (
                            <input
                              type="datetime-local"
                              value={editingData.expires_at}
                              onChange={(e) => setEditingData({ ...editingData, expires_at: e.target.value })}
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className={isExpired(mapping.expires_at) ? 'text-red-600 font-semibold' : ''}>
                              {formatTime(mapping.expires_at)}
                              {isExpired(mapping.expires_at) && ' (Expired)'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleEdit(mapping.phone_number)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(mapping)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(mapping.phone_number)}
                                disabled={deleting === mapping.phone_number}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleting === mapping.phone_number ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

