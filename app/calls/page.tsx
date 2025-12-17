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
  
  // Fetch initial calls
  useEffect(() => {
    async function fetchCalls() {
      try {
        const res = await fetch('/api/calls');
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
      // Reconnect after 3 seconds
      setTimeout(() => {
        eventSource.close();
        // The useEffect will re-run and create a new connection
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'claimed', extension: extension.trim() }),
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'handled', extension: extension.trim() }),
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Call Inbox</h1>
              <p className="mt-1 text-sm text-gray-500">
                View and manage missed calls in real-time
              </p>
            </div>
            <Link
              href="/mappings"
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
            >
              Manage Mappings
            </Link>
          </div>
          
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <label htmlFor="extension" className="block text-sm font-medium text-gray-700 mb-2">
              Your Extension
            </label>
            <input
              id="extension"
              type="text"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder="Enter your extension"
              className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handled By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No calls found
                    </td>
                  </tr>
                ) : (
                  calls.map((call) => (
                    <tr key={call.phone_norm} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPhoneNumber(call.phone_norm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(call.status)}`}>
                          {call.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {call.handled_by_ext || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(call.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {call.status === 'missed' && (
                          <button
                            onClick={() => handleClaim(call.phone_norm)}
                            disabled={claiming === call.phone_norm || !extension.trim()}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {claiming === call.phone_norm ? 'Claiming...' : 'Claim'}
                          </button>
                        )}
                        {call.status === 'claimed' && (
                          <button
                            onClick={() => handleMarkHandled(call.phone_norm)}
                            disabled={claiming === call.phone_norm || !extension.trim()}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {claiming === call.phone_norm ? 'Updating...' : 'Mark Handled'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

