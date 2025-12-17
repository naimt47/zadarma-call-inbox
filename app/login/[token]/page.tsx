'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [extension, setExtension] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/validate-login-token?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
        }
      } catch (err) {
        setTokenValid(false);
      }
    }
    
    if (token) {
      validateToken();
    } else {
      setTokenValid(false);
    }
  }, [token]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!extension.trim()) {
      setError('Extension is required');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/login?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, extension: extension.trim() }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Store session token in localStorage as backup (mobile browsers sometimes clear cookies)
        if (data.sessionToken) {
          localStorage.setItem('session_token_backup', data.sessionToken);
          localStorage.setItem('session_expires', data.expires);
        }
        // Store extension
        localStorage.setItem('userExtension', extension.trim());
        // Force full page reload to ensure cookie is sent
        window.location.href = '/calls';
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Validating access...</div>
      </div>
    );
  }
  
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Invalid or missing access token.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            placeholder="Extension"
            required
            autoComplete="username"
            className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="current-password"
            className="block w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          {error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-800 text-center">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Confirm'}
          </button>
        </form>
      </div>
    </div>
  );
}

