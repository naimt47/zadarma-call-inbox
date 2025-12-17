'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPhoneNumber } from '@/lib/utils';

interface Call {
  phone_norm: string;
  last_pbx_call_id: string | null;
  status: 'missed' | 'claimed' | 'answered' | 'callback_started' | 'callback_done' | 'handled';
  handled_by_ext: string | null;
  updated_at: string;
  expires_at: string;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extension, setExtension] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  
  // Load extension from localStorage
  useEffect(() => {
    const savedExtension = localStorage.getItem('userExtension');
    if (savedExtension) {
      setExtension(savedExtension);
    }
  }, []);
  
  // Fetch initial calls
  useEffect(() => {
    async function fetchCalls() {
      try {
        const res = await fetch('/api/calls', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (res.status === 401) {
          // Session expired or invalid, redirect to obscure login URL
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        if (!res.ok) {
          throw new Error('Failed to fetch calls');
        }
        
        const data = await res.json();
        setCalls(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load calls');
        setLoading(false);
      }
    }
    
    fetchCalls();
  }, []);
  
  // Set up SSE connection for real-time updates
  useEffect(() => {
    // EventSource automatically sends cookies (including session cookie)
    const eventSource = new EventSource('/api/calls/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update' && data.calls) {
          // Update calls list with new data
          setCalls(data.calls);
        } else if (data.type === 'connected') {
          console.log('SSE connected');
        } else if (data.type === 'heartbeat') {
          // Heartbeat received, connection is alive
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      
      // Check if connection is closed (might be auth issue)
      if (eventSource.readyState === EventSource.CLOSED) {
        // Connection closed, likely auth issue - redirect to obscure login URL
        eventSource.close();
        window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
        return;
      }
      
      // For other errors, try to reconnect after a delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection still closed, redirect to obscure login URL
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
        }
      }, 3000);
    };
    
    return () => {
      eventSource.close();
    };
  }, []);
  
  const handleClaim = async (phoneNorm: string) => {
    if (!extension.trim()) {
      alert('Please enter your extension');
      return;
    }
    
    setClaiming(phoneNorm);
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(phoneNorm)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'claimed', extension: extension.trim() }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to claim call');
      }
      
      // The SSE stream will update the UI automatically
    } catch (err: any) {
      alert(err.message || 'Failed to claim call');
    } finally {
      setClaiming(null);
    }
  };
  
  const handleMarkHandled = async (phoneNorm: string) => {
    if (!extension.trim()) {
      alert('Please enter your extension');
      return;
    }
    
    setClaiming(phoneNorm);
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(phoneNorm)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'handled', extension: extension.trim() }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark as handled');
      }
      
      // The SSE stream will update the UI automatically
    } catch (err: any) {
      alert(err.message || 'Failed to mark as handled');
    } finally {
      setClaiming(null);
    }
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'missed':
        return 'bg-red-100 text-red-800';
      case 'claimed':
        return 'bg-yellow-100 text-yellow-800';
      case 'handled':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading calls...</div>
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
        <h1 className="text-lg font-bold text-gray-900">Calls</h1>
        <Link
          href="/mappings"
          className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium active:bg-gray-700"
        >
          Mappings
        </Link>
      </div>
      
      <div className="px-4 py-3">
        {!extension && (
          <div className="mb-4 bg-white rounded-lg shadow p-4">
            <label htmlFor="extension" className="block text-sm font-medium text-gray-700 mb-2">
              Your Extension
            </label>
            <input
              id="extension"
              type="text"
              value={extension}
              onChange={(e) => {
                const value = e.target.value;
                setExtension(value);
                // Save to localStorage
                if (value.trim()) {
                  localStorage.setItem('userExtension', value.trim());
                } else {
                  localStorage.removeItem('userExtension');
                }
              }}
              placeholder="Enter your extension"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        
        {calls.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No calls found
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div key={call.phone_norm} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-base text-gray-900 mb-1">
                      {formatPhoneNumber(call.phone_norm)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                      {call.handled_by_ext && (
                        <span className="text-xs text-gray-500">by {call.handled_by_ext}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(call.updated_at)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {call.status === 'missed' && (
                    <button
                      onClick={() => handleClaim(call.phone_norm)}
                      disabled={claiming === call.phone_norm || !extension.trim()}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claiming === call.phone_norm ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                  {call.status === 'claimed' && (
                    <button
                      onClick={() => handleMarkHandled(call.phone_norm)}
                      disabled={claiming === call.phone_norm || !extension.trim()}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium text-sm active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {claiming === call.phone_norm ? 'Updating...' : 'Mark Handled'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

