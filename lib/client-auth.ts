/**
 * Client-side auth helper - gets password from localStorage
 */

export function getAuthHeaders(): HeadersInit {
  const password = localStorage.getItem('authPassword');
  
  if (!password) {
    return {};
  }
  
  return {
    'x-auth-password': password,
  };
}

export function getAuthPassword(): string | null {
  return localStorage.getItem('authPassword');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authPassword');
}

