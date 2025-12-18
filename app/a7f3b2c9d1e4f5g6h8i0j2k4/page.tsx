'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [extension, setExtension] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Load saved extension and check if already logged in
  useEffect(() => {
    const savedExtension = localStorage.getItem('userExtension');
    const savedPassword = localStorage.getItem('authPassword');
    
    if (savedExtension) {
      setExtension(savedExtension);
    }
    
    // If password exists, try to validate it
    if (savedPassword) {
      // Check if password is still valid by making a test request
      fetch('/api/calls', {
        headers: {
          'x-auth-password': savedPassword,
        },
      }).then(res => {
        if (res.ok) {
          // Password is valid, redirect to calls
          router.push('/calls');
        } else {
          // Password invalid, clear it
          localStorage.removeItem('authPassword');
        }
      }).catch(() => {
        // Error, clear password
        localStorage.removeItem('authPassword');
      });
    }
  }, [router]);
  
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
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        // Save password and extension to localStorage (persists across tabs/restarts)
        localStorage.setItem('authPassword', password);
        localStorage.setItem('userExtension', extension.trim());
        
        // Redirect to calls
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
