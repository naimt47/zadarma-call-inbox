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
  
  // Load extension and restore session from localStorage if cookie is missing (mobile browser fix)
  useEffect(() => {
    function getCookie(name: string) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    }
    
    // Check if session cookie exists
    const sessionCookie = getCookie('call_inbox_session');
    
    // If no cookie but localStorage has backup, restore it
    if (!sessionCookie) {
      const backupToken = localStorage.getItem('session_token_backup');
      const expiresStr = localStorage.getItem('session_expires');
      
      if (backupToken && expiresStr) {
        const expires = new Date(expiresStr);
        // Only restore if not expired
        if (expires > new Date()) {
          // Restore session cookie from localStorage backup
          fetch('/api/restore-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: backupToken }),
          }).catch(err => {
            console.error('Failed to restore session:', err);
            // Clear invalid backup
            localStorage.removeItem('session_token_backup');
            localStorage.removeItem('session_expires');
          });
        } else {
          // Expired, clear it
          localStorage.removeItem('session_token_backup');
          localStorage.removeItem('session_expires');
        }
      }
    }
    
    // Load extension
    const savedExtension = getCookie('user_extension') || localStorage.getItem('userExtension');
    if (savedExtension) {
      setExtension(savedExtension);
    }
  }, []);
  
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
        {extension && (
          <div className="mb-3 text-sm text-gray-600">
            Extension: <span className="font-semibold">{extension}</span>
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

