'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPhoneNumber } from '@/lib/utils';
import { getAuthHeaders, getAuthPassword, isAuthenticated } from '@/lib/client-auth';

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
  const [allCalls, setAllCalls] = useState<Call[]>([]); // Store all calls from SSE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extension, setExtension] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [updateFlash, setUpdateFlash] = useState(false);
  
  // Search and filter state
  const [searchPhone, setSearchPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterExtension, setFilterExtension] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Check auth and load extension from localStorage
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
      return;
    }
    
    const savedExtension = localStorage.getItem('userExtension');
    if (savedExtension) {
      setExtension(savedExtension);
    }
  }, []);
  
  // Fetch initial calls
  useEffect(() => {
    if (!isAuthenticated()) return;
    
    async function fetchCalls() {
      try {
        const password = getAuthPassword();
        if (!password) {
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        // Fetch last 20 calls by default, regardless of expiration
        const res = await fetch('/api/calls?limit=20', {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        
        console.log('Frontend: Response status:', res.status);
        console.log('Frontend: Response ok:', res.ok);
        
        if (res.status === 401) {
          console.log('Frontend: Unauthorized, redirecting to login');
          // Session expired or invalid, redirect to obscure login URL
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Frontend: Response not ok:', res.status, errorText);
          throw new Error('Failed to fetch calls');
        }
        
        const data = await res.json();
        console.log('Frontend: Received data:', data);
        console.log('Frontend: Data type:', typeof data);
        console.log('Frontend: Is array:', Array.isArray(data));
        console.log('Frontend: Number of calls:', Array.isArray(data) ? data.length : 'NOT AN ARRAY');
        if (Array.isArray(data) && data.length > 0) {
          console.log('Frontend: First call:', data[0]);
          console.log('Frontend: First call keys:', Object.keys(data[0]));
        } else if (!Array.isArray(data)) {
          console.error('Frontend: Data is not an array!', data);
        }
        
        // Ensure we're setting an array
        if (Array.isArray(data)) {
          setCalls(data);
        } else {
          console.error('Frontend: Setting empty array because data is not an array');
          setCalls([]);
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Frontend: Error fetching calls:', err);
        setError('Failed to load calls: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    }
    
    fetchCalls();
  }, []);
  
  // Set up SSE connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated()) return;
    
    const password = getAuthPassword();
    if (!password) return;
    
    // EventSource doesn't support custom headers, so use query param
    const eventSource = new EventSource(`/api/calls/stream?password=${encodeURIComponent(password)}`);
    
    eventSource.onopen = () => {
      console.log('Frontend: SSE connection opened');
      setConnectionStatus('connected');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Frontend: SSE message received:', data.type);
        
        if (data.type === 'update' && data.calls) {
          console.log('Frontend: SSE update with', data.calls.length, 'calls');
          // Check if calls actually changed
          const prevCount = allCalls.length;
          const newCount = data.calls.length;
          
          // Store all calls from SSE
          setAllCalls(data.calls);
          setLastUpdate(new Date());
          
          // Check for new missed calls and trigger notifications
          if (prevCount > 0) {
            const prevMissed = allCalls.filter((c: Call) => c.status === 'missed').map((c: Call) => c.phone_norm);
            const newMissed = data.calls.filter((c: Call) => c.status === 'missed').map((c: Call) => c.phone_norm);
            const newMissedCalls = newMissed.filter((phone: string) => !prevMissed.includes(phone));
            
            if (newMissedCalls.length > 0) {
              // Trigger browser notification and sound
              newMissedCalls.forEach((phone: string) => {
                showBrowserNotification(phone);
                playNotificationSound();
              });
            }
          }
          
          // Flash indicator if calls changed
          if (prevCount !== newCount || JSON.stringify(allCalls) !== JSON.stringify(data.calls)) {
            setUpdateFlash(true);
            setTimeout(() => setUpdateFlash(false), 500);
          }
        } else if (data.type === 'connected') {
          console.log('Frontend: SSE connected');
          setConnectionStatus('connected');
        } else if (data.type === 'heartbeat') {
          // Heartbeat received, connection is alive
          console.log('Frontend: SSE heartbeat');
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Frontend: Error parsing SSE message:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('Frontend: SSE error:', err);
      console.error('Frontend: SSE readyState:', eventSource.readyState);
      
      // Check if connection is closed (might be auth issue)
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error('Frontend: SSE connection closed, redirecting to login');
        setConnectionStatus('disconnected');
        // Connection closed, likely auth issue - redirect to obscure login URL
        eventSource.close();
        window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
        return;
      }
      
      // Connection error but not closed - mark as disconnected temporarily
      if (eventSource.readyState === EventSource.CONNECTING) {
        setConnectionStatus('connecting');
      }
      
      // For other errors, try to reconnect after a delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.error('Frontend: SSE still closed after delay, redirecting to login');
          setConnectionStatus('disconnected');
          // Connection still closed, redirect to obscure login URL
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
        }
      }, 3000);
    };
    
    return () => {
      eventSource.close();
    };
  }, [allCalls]);
  
  // Filter calls based on search and filters
  useEffect(() => {
    let filtered = [...allCalls];
    
    // Search by phone number
    if (searchPhone) {
      const normalizedSearch = searchPhone.replace(/\D/g, '');
      filtered = filtered.filter(call => 
        call.phone_norm.includes(normalizedSearch)
      );
    }
    
    // Filter by status
    if (filterStatus) {
      filtered = filtered.filter(call => call.status === filterStatus);
    }
    
    // Filter by extension
    if (filterExtension) {
      filtered = filtered.filter(call => 
        call.handled_by_ext?.toLowerCase().includes(filterExtension.toLowerCase())
      );
    }
    
    setCalls(filtered);
  }, [allCalls, searchPhone, filterStatus, filterExtension]);
  
  // Browser notification function
  const showBrowserNotification = (phone: string): void => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Missed Call', {
        body: `Call from ${formatPhoneNumber(phone)}`,
        icon: '/favicon.ico',
        tag: phone, // Prevent duplicate notifications
        requireInteraction: false,
      });
    }
  };
  
  // Request notification permission
  const requestNotificationPermission = async (): Promise<void> => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showBrowserNotification(''); // Test notification
      }
    }
  };
  
  // Play notification sound
  const playNotificationSound = (): void => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  };
  
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
          ...getAuthHeaders(),
        },
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
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
  
  const handleLogout = () => {
    localStorage.removeItem('authPassword');
    localStorage.removeItem('userExtension');
    window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };
  
  const getTimeUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMs < 0) return 'expired';
    if (diffMins < 60) return `expires in ${diffMins}m`;
    return `expires in ${diffHours}h`;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'missed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'claimed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'handled':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
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
    <div className={`min-h-screen bg-gray-50 pb-4 transition-colors ${updateFlash ? 'bg-blue-50' : ''}`}>
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">Calls</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} title={connectionStatus}></div>
              {lastUpdate && (
                <span className="text-xs text-gray-500">
                  Updated {formatTimeAgo(lastUpdate.toISOString())}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium active:bg-purple-700"
            >
              History
            </Link>
            <Link
              href="/mappings"
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium active:bg-gray-700"
            >
              Mappings
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium active:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Extension input and filters */}
        <div className="px-4 pb-3 border-t border-gray-200 space-y-3">
          <div className="pt-3">
            <label htmlFor="extension" className="block text-xs font-medium text-gray-700 mb-1">
              Your Extension
            </label>
            <input
              id="extension"
              type="text"
              value={extension}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const newExt = e.target.value;
                setExtension(newExt);
                localStorage.setItem('userExtension', newExt);
              }}
              placeholder="Enter your extension"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {!extension.trim() && (
              <p className="text-xs text-amber-600 mt-1">Extension is required to claim calls</p>
            )}
          </div>
          
          {/* Search and Filter Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchPhone(e.target.value)}
                placeholder="Search by phone number..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 active:bg-gray-300"
              >
                {showFilters ? 'Hide' : 'Filters'}
              </button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="missed">Missed</option>
                    <option value="claimed">Claimed</option>
                    <option value="handled">Handled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Extension</label>
                  <input
                    type="text"
                    value={filterExtension}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterExtension(e.target.value)}
                    placeholder="Filter by extension..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}
            
            {(searchPhone || filterStatus || filterExtension) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSearchPhone('');
                    setFilterStatus('');
                    setFilterExtension('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear filters
                </button>
                <span className="text-xs text-gray-500">
                  Showing {calls.length} of {allCalls.length} calls
                </span>
              </div>
            )}
          </div>
          
          {/* Notification permission button */}
          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <button
              onClick={requestNotificationPermission}
              className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 active:bg-blue-300"
            >
              Enable Browser Notifications
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4 py-3">
        {calls.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No calls found</p>
            <p className="text-sm text-gray-400">New missed calls will appear here automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div 
                key={call.phone_norm} 
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${getStatusColor(call.status).split(' ')[2] || 'border-gray-200'} transition-all`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900 mb-2">
                      {formatPhoneNumber(call.phone_norm)}
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(call.status)}`}>
                        {call.status.toUpperCase()}
                      </span>
                      {call.handled_by_ext && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          Handled by {call.handled_by_ext}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        Updated: {formatTime(call.updated_at)} ({formatTimeAgo(call.updated_at)})
                      </div>
                      <div className={`text-xs ${new Date(call.expires_at) < new Date() ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {getTimeUntilExpiry(call.expires_at)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  {call.status === 'missed' && (
                    <button
                      onClick={() => handleClaim(call.phone_norm)}
                      disabled={claiming === call.phone_norm || !extension.trim()}
                      className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-blue-700"
                    >
                      {claiming === call.phone_norm ? 'Claiming...' : 'Claim Call'}
                    </button>
                  )}
                  {call.status === 'claimed' && (
                    <button
                      onClick={() => handleMarkHandled(call.phone_norm)}
                      disabled={claiming === call.phone_norm || !extension.trim()}
                      className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg font-medium text-sm active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-green-700"
                    >
                      {claiming === call.phone_norm ? 'Updating...' : 'Mark as Handled'}
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

