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

export default function HistoryPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterExtension, setFilterExtension] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [showFilters, setShowFilters] = useState(false);
  
  // Check auth
  useEffect(() => {
    if (!isAuthenticated()) {
      window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
      return;
    }
  }, []);
  
  // Fetch history calls
  useEffect(() => {
    if (!isAuthenticated()) return;
    
    async function fetchHistory() {
      try {
        const password = getAuthPassword();
        if (!password) {
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        // Build query params
        const params = new URLSearchParams({
          includeExpired: 'true',
          includeHandled: 'true',
          limit: '500',
        });
        
        if (searchPhone) {
          params.set('search', searchPhone);
        }
        if (filterStatus) {
          params.set('status', filterStatus);
        }
        if (filterExtension) {
          params.set('extension', filterExtension);
        }
        
        const res = await fetch(`/api/calls?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        
        if (res.status === 401) {
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        if (!res.ok) {
          throw new Error('Failed to fetch call history');
        }
        
        let data = await res.json();
        
        // Filter by date range
        if (dateRange !== 'all') {
          const now = new Date();
          const cutoff = new Date();
          
          switch (dateRange) {
            case 'today':
              cutoff.setHours(0, 0, 0, 0);
              break;
            case 'week':
              cutoff.setDate(cutoff.getDate() - 7);
              break;
            case 'month':
              cutoff.setMonth(cutoff.getMonth() - 1);
              break;
          }
          
          data = data.filter((call: Call) => {
            const updatedAt = new Date(call.updated_at);
            return updatedAt >= cutoff;
          });
        }
        
        setCalls(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching history:', err);
        setError('Failed to load call history: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [searchPhone, filterStatus, filterExtension, dateRange]);
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTime(dateString);
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
  
  const handleArchive = async (phoneNorm: string) => {
    if (confirm(`Archive call from ${formatPhoneNumber(phoneNorm)}?`)) {
      try {
        const password = getAuthPassword();
        if (!password) {
          window.location.href = '/a7f3b2c9d1e4f5g6h8i0j2k4';
          return;
        }
        
        const res = await fetch(`/api/calls/${encodeURIComponent(phoneNorm)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status: 'archived', extension: 'system' }),
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to archive call');
        }
        
        // Remove from list
        setCalls(calls.filter(call => call.phone_norm !== phoneNorm));
      } catch (err: any) {
        alert(err.message || 'Failed to archive call');
      }
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading call history...</div>
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
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/calls"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Call History</h1>
          </div>
          <Link
            href="/calls"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium active:bg-blue-700"
          >
            Active Calls
          </Link>
        </div>
        
        {/* Filters */}
        <div className="px-4 pb-3 border-t border-gray-200 space-y-3">
          <div className="pt-3 space-y-2">
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
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                {(['today', 'week', 'month', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      dateRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {(searchPhone || filterStatus || filterExtension) && (
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
            )}
          </div>
        </div>
      </div>
      
      <div className="px-4 py-3">
        {calls.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No call history found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">
              Showing {calls.length} call{calls.length !== 1 ? 's' : ''}
            </div>
            {calls.map((call: Call) => (
              <div 
                key={call.phone_norm} 
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${getStatusColor(call.status).split(' ')[2] || 'border-gray-200'}`}
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
                      {new Date(call.expires_at) < new Date() && (
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        Updated: {formatTime(call.updated_at)} ({formatTimeAgo(call.updated_at)})
                      </div>
                      <div className="text-xs text-gray-500">
                        Expired: {formatTime(call.expires_at)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleArchive(call.phone_norm)}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium active:bg-gray-700 hover:bg-gray-700"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
