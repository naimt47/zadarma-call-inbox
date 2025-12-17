'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [extension, setExtension] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Load saved extension
  useEffect(() => {
    const saved = localStorage.getItem('userExtension');
    if (saved) {
      setExtension(saved);
    }
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!extension.trim()) {
      setError('Extension is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        // Save extension
        localStorage.setItem('userExtension', extension.trim());
        
        // Check if cookie was set by checking response headers
        const setCookieHeader = res.headers.get('set-cookie');
        console.log('Login response - Set-Cookie header:', setCookieHeader);
        
        // Wait a brief moment to ensure cookie is processed by browser
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force a hard navigation to ensure cookies are set
        window.location.href = '/calls';
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Call Inbox Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="extension" className="block text-sm font-medium text-gray-700 mb-2">
              Your Extension
            </label>
            <input
              id="extension"
              type="text"
              value={extension}
              onChange={(e) => setExtension(e.target.value)}
              placeholder="Enter your extension"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim() || !extension.trim()}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

